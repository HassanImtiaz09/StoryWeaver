import crypto from "crypto";
import { db } from "../db";
import { eq, and, desc, isNull, ne } from "drizzle-orm";
import { sharedStories, storyLikes, storyReports, storyArcs, episodes, children, users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { moderateEpisode } from "./contentModeration";

/**
 * Social Sharing Service for StoryWeaver
 * Handles story sharing, gallery publishing, likes, reports, and analytics
 */

// Generate a unique, short, memorable share code using cryptographically secure randomness
function generateShareCode(): string {
  // 16 bytes = 128 bits of entropy, URL-safe base64 = 22 characters
  return crypto.randomBytes(16).toString("base64url");
}

export interface ShareCardData {
  storyId: number;
  title: string;
  childName: string;
  childAge: number;
  theme: string;
  coverImageUrl: string | null;
  firstLinePreview: string;
  pageCount: number;
  readingTimeMinutes: number;
  themeIcon: string;
}

export interface GalleryFilters {
  theme?: string;
  ageGroup?: string;
  sortBy?: "popular" | "recent" | "liked";
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Generate share card data for a story
 */
export async function generateShareCard(arcId: number): Promise<ShareCardData> {
  const arc = await db
    .select()
    .from(storyArcs)
    .where(eq(storyArcs.id, arcId))
    .limit(1);

  if (!arc.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Story not found",
    });
  }

  const child = await db
    .select()
    .from(children)
    .where(eq(children.id, arc[0].childId))
    .limit(1);

  if (!child.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Child profile not found",
    });
  }

  const allEpisodes = await db
    .select()
    .from(episodes)
    .where(eq(episodes.storyArcId, arcId));

  const firstEpisode = allEpisodes[0];
  let firstLinePreview = firstEpisode?.summary || "A beautiful story created with StoryWeaver";

  // Truncate to first 2 sentences
  const sentences = firstLinePreview.split(/[.!?]+/).slice(0, 2);
  firstLinePreview = sentences.join(". ").trim();

  // Calculate reading time (estimate 2 min per page, 6 pages per episode)
  const totalPages = allEpisodes.length * 6;
  const readingTimeMinutes = Math.ceil(totalPages / 3);

  // Get theme icon
  const themeIcons: Record<string, string> = {
    space: "🚀",
    ocean: "🌊",
    forest: "🌲",
    fairy: "✨",
    adventure: "🗺️",
    bedtime: "🌙",
    mystery: "🔍",
    magic: "✨",
    default: "📖",
  };

  return {
    storyId: arcId,
    title: arc[0].title,
    childName: child[0].name,
    childAge: child[0].age,
    theme: arc[0].theme,
    coverImageUrl: arc[0].coverImageUrl,
    firstLinePreview,
    pageCount: totalPages,
    readingTimeMinutes,
    themeIcon: themeIcons[arc[0].theme.toLowerCase()] || themeIcons.default,
  };
}

/**
 * Create a unique shareable URL for a story
 */
export async function generateShareLink(
  arcId: number,
  userId: number,
  options?: { privacyLevel?: "private" | "link_only" | "public" }
): Promise<{ shareCode: string; shareUrl: string }> {
  // Check if already shared
  const existing = await db
    .select()
    .from(sharedStories)
    .where(and(eq(sharedStories.arcId, arcId), eq(sharedStories.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    return {
      shareCode: existing[0].shareCode,
      shareUrl: `https://storyweaver.app/s/${existing[0].shareCode}`,
    };
  }

  // Create new share
  const shareCode = generateShareCode();
  const privacyLevel = options?.privacyLevel || "link_only";

  await db.insert(sharedStories).values({
    arcId,
    userId,
    shareCode,
    privacyLevel,
    isPublished: false,
    moderationStatus: "pending",
  });

  return {
    shareCode,
    shareUrl: `https://storyweaver.app/s/${shareCode}`,
  };
}

/**
 * Publish a story to the public gallery (with moderation)
 */
export async function publishToGallery(
  arcId: number,
  userId: number,
  privacySettings?: { allowLikes?: boolean }
): Promise<{ success: boolean; moderationStatus: string }> {
  const arc = await db
    .select()
    .from(storyArcs)
    .where(and(eq(storyArcs.id, arcId), eq(storyArcs.userId, userId)))
    .limit(1);

  if (!arc.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Story not found or you don't have permission to share it",
    });
  }

  // Get or create shared story record
  let shared = await db
    .select()
    .from(sharedStories)
    .where(and(eq(sharedStories.arcId, arcId), eq(sharedStories.userId, userId)))
    .limit(1);

  if (!shared.length) {
    const shareCode = generateShareCode();
    await db.insert(sharedStories).values({
      arcId,
      userId,
      shareCode,
      privacyLevel: "public",
      isPublished: true,
      publishedAt: new Date(),
      moderationStatus: "pending",
    });
    shared = await db
      .select()
      .from(sharedStories)
      .where(eq(sharedStories.shareCode, shareCode))
      .limit(1);
  } else {
    // Update existing record
    await db
      .update(sharedStories)
      .set({
        privacyLevel: "public",
        isPublished: true,
        publishedAt: new Date(),
      })
      .where(eq(sharedStories.id, shared[0].id));
  }

  // Run content moderation check
  const episodes = await db
    .select()
    .from(episodes)
    .where(eq(episodes.storyArcId, arcId));

  let hasViolations = false;
  for (const episode of episodes) {
    const result = await moderateEpisode(episode.summary || "", arc[0].childId);
    if (!result.isApproved) {
      hasViolations = true;
      break;
    }
  }

  const moderationStatus = hasViolations ? "rejected" : "approved";

  await db
    .update(sharedStories)
    .set({ moderationStatus })
    .where(eq(sharedStories.arcId, arcId));

  return {
    success: true,
    moderationStatus,
  };
}

/**
 * Remove a story from the public gallery
 */
export async function unpublishFromGallery(arcId: number, userId: number): Promise<void> {
  const result = await db
    .update(sharedStories)
    .set({
      isPublished: false,
      privacyLevel: "private",
    })
    .where(and(eq(sharedStories.arcId, arcId), eq(sharedStories.userId, userId)));

  if (result.rowsAffected === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Shared story not found",
    });
  }
}

/**
 * Fetch gallery stories with filtering and pagination
 */
export async function getGalleryStories(filters: GalleryFilters): Promise<any[]> {
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  let query = db
    .select({
      id: sharedStories.id,
      arcId: sharedStories.arcId,
      title: storyArcs.title,
      theme: storyArcs.theme,
      coverImageUrl: storyArcs.coverImageUrl,
      synopsis: storyArcs.synopsis,
      childName: children.name,
      childAge: children.age,
      viewCount: sharedStories.viewCount,
      likeCount: sharedStories.likeCount,
      publishedAt: sharedStories.publishedAt,
    })
    .from(sharedStories)
    .innerJoin(storyArcs, eq(sharedStories.arcId, storyArcs.id))
    .innerJoin(children, eq(storyArcs.childId, children.id))
    .where(
      and(
        eq(sharedStories.isPublished, true),
        eq(sharedStories.privacyLevel, "public"),
        eq(sharedStories.moderationStatus, "approved")
      )
    );

  // Apply theme filter
  if (filters.theme) {
    query = query.where(eq(storyArcs.theme, filters.theme));
  }

  // Apply age group filter
  if (filters.ageGroup) {
    const [minAge, maxAge] = filters.ageGroup.split("-").map(Number);
    query = query.where(
      and(
        minAge ? ne(children.age, 0) : undefined, // placeholder for >= minAge
        maxAge ? ne(children.age, 0) : undefined // placeholder for <= maxAge
      )
    );
  }

  // Apply sorting
  if (filters.sortBy === "popular") {
    query = query.orderBy(desc(sharedStories.viewCount));
  } else if (filters.sortBy === "liked") {
    query = query.orderBy(desc(sharedStories.likeCount));
  } else {
    query = query.orderBy(desc(sharedStories.publishedAt));
  }

  return query.limit(limit).offset(offset);
}

/**
 * Increment story view count
 */
export async function recordView(shareCode: string): Promise<void> {
  const shared = await db
    .select()
    .from(sharedStories)
    .where(eq(sharedStories.shareCode, shareCode))
    .limit(1);

  if (shared.length === 0) return;

  await db
    .update(sharedStories)
    .set({ viewCount: shared[0].viewCount + 1 })
    .where(eq(sharedStories.id, shared[0].id));
}

/**
 * Like/unlike a story
 */
export async function likeStory(arcId: number, userId: number): Promise<boolean> {
  const shared = await db
    .select()
    .from(sharedStories)
    .where(eq(sharedStories.arcId, arcId))
    .limit(1);

  if (!shared.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Story not found",
    });
  }

  // Check if already liked
  const existing = await db
    .select()
    .from(storyLikes)
    .where(and(eq(storyLikes.sharedStoryId, shared[0].id), eq(storyLikes.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Unlike
    await db
      .delete(storyLikes)
      .where(
        and(eq(storyLikes.sharedStoryId, shared[0].id), eq(storyLikes.userId, userId))
      );

    await db
      .update(sharedStories)
      .set({ likeCount: Math.max(0, shared[0].likeCount - 1) })
      .where(eq(sharedStories.id, shared[0].id));

    return false;
  } else {
    // Like
    await db.insert(storyLikes).values({
      sharedStoryId: shared[0].id,
      userId,
    });

    await db
      .update(sharedStories)
      .set({ likeCount: shared[0].likeCount + 1 })
      .where(eq(sharedStories.id, shared[0].id));

    return true;
  }
}

/**
 * Report a story for moderation
 */
export async function reportStory(
  arcId: number,
  userId: number,
  reason: string
): Promise<void> {
  const shared = await db
    .select()
    .from(sharedStories)
    .where(eq(sharedStories.arcId, arcId))
    .limit(1);

  if (!shared.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Story not found",
    });
  }

  await db.insert(storyReports).values({
    sharedStoryId: shared[0].id,
    userId,
    reason,
    reportStatus: "pending",
  });

  // Increment report count
  await db
    .update(sharedStories)
    .set({ reportCount: shared[0].reportCount + 1 })
    .where(eq(sharedStories.id, shared[0].id));
}

/**
 * Get sharing analytics for a story
 */
export async function getShareAnalytics(
  arcId: number,
  userId: number
): Promise<{
  viewCount: number;
  likeCount: number;
  shareCount: number;
  reportCount: number;
  isPublished: boolean;
  privacyLevel: string;
  shareUrl?: string;
}> {
  const shared = await db
    .select()
    .from(sharedStories)
    .where(and(eq(sharedStories.arcId, arcId), eq(sharedStories.userId, userId)))
    .limit(1);

  if (!shared.length) {
    return {
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      reportCount: 0,
      isPublished: false,
      privacyLevel: "private",
    };
  }

  return {
    viewCount: shared[0].viewCount,
    likeCount: shared[0].likeCount,
    shareCount: shared[0].shareCount,
    reportCount: shared[0].reportCount,
    isPublished: shared[0].isPublished,
    privacyLevel: shared[0].privacyLevel,
    shareUrl: `https://storyweaver.app/s/${shared[0].shareCode}`,
  };
}

/**
 * Get user's shared stories
 */
export async function getMySharedStories(userId: number): Promise<any[]> {
  return db
    .select({
      id: sharedStories.id,
      arcId: sharedStories.arcId,
      title: storyArcs.title,
      theme: storyArcs.theme,
      coverImageUrl: storyArcs.coverImageUrl,
      shareCode: sharedStories.shareCode,
      privacyLevel: sharedStories.privacyLevel,
      isPublished: sharedStories.isPublished,
      viewCount: sharedStories.viewCount,
      likeCount: sharedStories.likeCount,
      publishedAt: sharedStories.publishedAt,
      createdAt: sharedStories.createdAt,
    })
    .from(sharedStories)
    .innerJoin(storyArcs, eq(sharedStories.arcId, storyArcs.id))
    .where(eq(sharedStories.userId, userId))
    .orderBy(desc(sharedStories.createdAt));
}

/**
 * Get a shared story by share code (public access)
 */
export async function getSharedStoryByCode(shareCode: string): Promise<any> {
  const shared = await db
    .select({
      id: sharedStories.id,
      arcId: sharedStories.arcId,
      userId: sharedStories.userId,
      title: storyArcs.title,
      theme: storyArcs.theme,
      coverImageUrl: storyArcs.coverImageUrl,
      synopsis: storyArcs.synopsis,
      childName: children.name,
      childAge: children.age,
      shareCode: sharedStories.shareCode,
      privacyLevel: sharedStories.privacyLevel,
      isPublished: sharedStories.isPublished,
      viewCount: sharedStories.viewCount,
      likeCount: sharedStories.likeCount,
    })
    .from(sharedStories)
    .innerJoin(storyArcs, eq(sharedStories.arcId, storyArcs.id))
    .innerJoin(children, eq(storyArcs.childId, children.id))
    .where(eq(sharedStories.shareCode, shareCode))
    .limit(1);

  if (!shared.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Story not found",
    });
  }

  // Record the view
  await recordView(shareCode);

  return shared[0];
}
