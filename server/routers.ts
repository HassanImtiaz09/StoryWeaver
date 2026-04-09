import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, coppaProtectedProcedure, adminProcedure } from "./_core/trpc";
import { db } from "./db";

/**
 * Sanitizes user prompts to prevent prompt injection attacks.
 * Removes common injection patterns and excessive special characters.
 */
function sanitizePrompt(input: string | undefined): string | undefined {
  if (!input) return input;

  let sanitized = input;

  // Remove prompt injection patterns (case-insensitive)
  const injectionPatterns = [
    /ignore\s+previous/gi,
    /ignore\s+instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /you\s+are\s+now/gi,
    /pretend\s+to\s+be/gi,
    /forget\s+your\s+rules/gi,
  ];

  injectionPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove excessive special characters and control sequences
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Truncate to 200 characters
  return sanitized.slice(0, 200);
}
import { eq, and, desc, isNull, asc, sql, lt, inArray } from "drizzle-orm";
import {
  users,
  children,
  storyArcs,
  episodes,
  pages,
  storyRecommendations,
  bookProducts,
  shippingAddresses,
  printOrders,
  contentModerationLog,
  generationCosts,
  readingStreaks,
  achievements,
  readingActivity,
  customStoryElements,
  parentVoiceRecordings,
  storyApprovalQueue,
  mediaAssets,
  mediaQueue,
  characterAvatars,
  sharedStories,
  storyLikes,
  storyReports,
  storySegments,
} from "../drizzle/schema";
import { characterRouter } from "./_core/characterRouter";
import { languageRouter } from "./_core/language-router";
import { educatorRouter } from "./_core/educatorRouter";
import { grandparentRouter } from "./_core/grandparentRouter";
import { selRouter } from "./_core/selRouter";
import { smartHomeRouter } from "./_core/smartHomeRouter";
import { diversityRouter } from "./_core/diversityRouter";
import { checkParentalConsent, recordParentalConsent, requireConsent, getConsentStatus } from "./_core/coppaConsent";
import { moderateEpisode, validateChildAge } from "./_core/contentModeration";
import {
  generateEpisodeWithClaude,
  generateStoryArcWithClaude,
  generateRecommendations,
  generatePageImagePrompt,
  type ChildProfile,
} from "./_core/claudeStoryEngine";
import { storyEngine, type StoryContext } from "./_core/storyEngine";
import { getEpisodeContext, updateArcProgress } from "./_core/narrativeArc";
import { scoreStory, passesQualityThreshold } from "./_core/storyQuality";
import { generatePageAudio, generateSpeech, generateEpisodeAudio, VOICE_PRESETS, type VoiceRole } from "./_core/elevenlabs";
import { generateImage } from "./_core/imageGeneration";
import { generateEpisodeMusic, generatePageSoundEffect } from "./_core/sunoMusic";
import {
  calculateBookPrice,
  getShippingRates,
  createPrintfulOrder,
  confirmPrintfulOrder,
  getPrintfulOrderStatus,
  generateBookInteriorPdf,
  isPrintfulConfigured,
  type BookSpec,
  type PrintfulShippingAddress,
} from "./_core/printful";
import {
  generateBookLayout,
  estimatePageCount,
  validatePrintReady,
} from "./_core/bookLayout";
import {
  calculatePrice,
  getAvailableFormats,
} from "./_core/printPricing";
import { SUBSCRIPTION_TIERS } from "../constants/assets";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { cache, recommendationsCacheKey, voicePreviewCacheKey, generateProfileHash, generateTextHash, CACHE_CONFIG } from "./_core/cache";
import { checkRateLimit, getRateLimitKey } from "./_core/rateLimit";
import { costTracker, COST_ESTIMATES } from "./_core/costTracker";
import {
  recordActivity,
  updateStreak,
  checkAndUnlockAchievements,
  getChildProgress,
} from "./_core/gamification";
import { ACHIEVEMENTS } from "../constants/gamification";
import {
  createCustomElement,
  getCustomElements,
  deleteCustomElement,
  updateCustomElement,
  submitForApproval,
  reviewEpisode,
  getPendingApprovals,
  getChildStoryPreferences,
  createVoiceRecording,
  getVoiceRecordings,
  updateVoiceRecordingStatus,
} from "./_core/parentCoCreation";
import { mediaPipeline } from "./_core/mediaPipeline";
import { assetManager } from "./_core/assetManager";

// ─── Shared Zod Schemas ──────────────────────────────────────
const shippingAddressSchema = z.object({
  name: z.string().min(1).max(255),
  address1: z.string().min(1).max(500),
  address2: z.string().max(500).optional(),
  city: z.string().min(1).max(255),
  stateCode: z.string().max(10).optional(),
  zip: z.string().min(1).max(20),
  countryCode: z.string().min(1).max(10),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
});
import { imageOptimizer } from "./_core/imageOptimizer";
import { audioProcessor } from "./_core/audioProcessor";

function toChildProfile(child: any): ChildProfile {
  return {
    name: child.name,
    age: child.age,
    gender: child.gender ?? undefined,
    interests: child.interests ?? [],
    personalityTraits: child.personalityTraits ?? undefined,
    fears: child.fears ?? undefined,
    favoriteColor: child.favoriteColor ?? undefined,
    readingLevel: child.readingLevel ?? undefined,
    language: child.language ?? undefined,
    hairColor: child.hairColor ?? undefined,
    skinTone: child.skinTone ?? undefined,
    nickname: child.nickname ?? undefined,
    favoriteCharacter: child.favoriteCharacter ?? undefined,
    isNeurodivergent: child.isNeurodivergent ?? false,
    neurodivergentProfiles: child.neurodivergentProfiles ?? undefined,
    sensoryPreferences: child.sensoryPreferences ?? undefined,
    communicationStyle: child.communicationStyle ?? undefined,
    storyPacing: child.storyPacing ?? undefined,
  };
}

async function checkStoryLimit(userId: number): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  const plan = user.subscriptionPlan ?? "free";
  const tier = SUBSCRIPTION_TIERS[plan as keyof typeof SUBSCRIPTION_TIERS];
  if (!tier) return;
  if (tier.maxStories !== -1 && (user.storiesUsed ?? 0) >= tier.maxStories) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've used all ${tier.maxStories} free stories. Upgrade to continue creating stories!`,
    });
  }
}

async function checkChildLimit(userId: number): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new TRPCError({ code: "NOT_FOUND" });
  const plan = user.subscriptionPlan ?? "free";
  const tier = SUBSCRIPTION_TIERS[plan as keyof typeof SUBSCRIPTION_TIERS];
  if (!tier) return;
  if (tier.maxChildren !== -1) {
    const childList = await db.select().from(children).where(eq(children.userId, userId));
    if (childList.length >= tier.maxChildren) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your plan supports up to ${tier.maxChildren} child profiles. Upgrade for more!`,
      });
    }
  }
}

export const appRouter = router({
  system: router({
    ping: publicProcedure.query(() => {
      return { message: "pong" };
    }),
  }),

  character: characterRouter,

  language: languageRouter,

  educator: educatorRouter,

  grandparent: grandparentRouter,

  sel: selRouter,

  smartHome: smartHomeRouter,

  diversity: diversityRouter,

  analytics: router({
    /**
     * Get reading summary statistics
     */
    getReadingSummary: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          period: z.enum(["week", "month", "all"]).default("week"),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getReadingSummary } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getReadingSummary(input.childId, userId, input.period);
      }),

    /**
     * Get reading trends data for charts
     */
    getReadingTrends: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          days: z.number().min(1).max(365).default(30),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getReadingTrends } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getReadingTrends(input.childId, userId, input.days);
      }),

    /**
     * Get theme breakdown for pie chart
     */
    getThemeBreakdown: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getThemeBreakdown } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getThemeBreakdown(input.childId, userId);
      }),

    /**
     * Get vocabulary growth data
     */
    getVocabularyGrowth: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          days: z.number().min(1).max(365).default(90),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getVocabularyGrowth } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getVocabularyGrowth(input.childId, userId, input.days);
      }),

    /**
     * Get reading heatmap data
     */
    getReadingHeatmap: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          weeks: z.number().min(1).max(52).default(12),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getReadingHeatmap } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getReadingHeatmap(input.childId, userId, input.weeks);
      }),

    /**
     * Get milestone data
     */
    getMilestones: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getMilestones } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getMilestones(input.childId, userId);
      }),

    /**
     * Get engagement score
     */
    getEngagementScore: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getEngagementScore } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getEngagementScore(input.childId, userId);
      }),

    /**
     * Get weekly report
     */
    getWeeklyReport: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getWeeklyReport } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await getWeeklyReport(input.childId, userId);
      }),

    /**
     * Compare child's metrics with peers (anonymous)
     */
    compareWithPeers: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { compareWithPeers } = await import("./_core/analyticsService");
        const userId = ctx.userId!;
        return await compareWithPeers(input.childId, userId);
      }),

    /**
     * Generate weekly digest
     */
    generateWeeklyDigest: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          childName: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { generateWeeklyDigest } = await import("./_core/reportGenerator");
        const userId = ctx.userId!;
        return await generateWeeklyDigest(input.childId, userId, input.childName);
      }),

    /**
     * Generate monthly report
     */
    generateMonthlyReport: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          childName: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { generateMonthlyReport } = await import("./_core/reportGenerator");
        const userId = ctx.userId!;
        return await generateMonthlyReport(input.childId, userId, input.childName);
      }),

    /**
     * Generate custom progress report
     */
    generateProgressReport: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          childName: z.string(),
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { generateProgressReport } = await import("./_core/reportGenerator");
        const userId = ctx.userId!;
        return await generateProgressReport(
          input.childId,
          userId,
          input.childName,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
  }),

  auth: router({
    // NOTE: signUp and login are handled by the OAuth flow (registerOAuthRoutes).
    // These stubs exist only to provide a clear error if clients call them directly.
    signUp: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ ctx }) => {
        checkRateLimit(getRateLimitKey(ctx, "auth"), 5, 60_000); // 5 attempts per minute
        throw new TRPCError({
          code: "METHOD_NOT_SUPPORTED",
          message: "Direct sign-up is not supported. Please use OAuth authentication.",
        });
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .query(async ({ ctx }) => {
        checkRateLimit(getRateLimitKey(ctx, "auth"), 5, 60_000); // 5 attempts per minute
        throw new TRPCError({
          code: "METHOD_NOT_SUPPORTED",
          message: "Direct login is not supported. Please use OAuth authentication.",
        });
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const req = (ctx as any).req;
      const res = (ctx as any).res;
      if (req && res) {
        try {
          const cookieOptions = getSessionCookieOptions(req);
          res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        } catch {
          // Fallback: clear cookie with safe defaults if hostname is unavailable
          res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            path: "/",
            sameSite: "none" as const,
            secure: true,
            maxAge: -1,
          });
        }
      }
      return { success: true };
    }),
  }),

  consent: router({
    /**
     * Get current parental consent status for the authenticated user
     */
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      return await getConsentStatus(ctx.user.id);
    }),

    /**
     * Verify email for parental consent (email_plus method)
     * In production, this would send a verification email
     */
    verifyEmail: protectedProcedure
      .input(z.object({ parentEmail: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        // In a real implementation, send verification email to parentEmail
        // For now, record consent with "email_plus" method
        await recordParentalConsent(ctx.user.id, "email_plus", {
          email: input.parentEmail,
          verifiedAt: new Date(),
        });
        return { success: true, message: "Email verification completed" };
      }),

    /**
     * Confirm parental consent using specified method
     */
    confirmConsent: protectedProcedure
      .input(
        z.object({
          method: z.enum(["email_plus", "credit_card", "knowledge_based"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await recordParentalConsent(ctx.user.id, input.method);
        return { success: true, message: "Parental consent recorded successfully" };
      }),
  }),

  children: router({
    list: coppaProtectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }).optional().default({})
      )
      .query(async ({ input, ctx }) => {
        return await db
          .select()
          .from(children)
          .where(eq(children.userId, ctx.user.id))
          .limit(input.limit)
          .offset(input.offset);
      }),

    get: coppaProtectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        return child;
      }),

    create: coppaProtectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          age: z.number().int().min(1).max(18),
          gender: z.string().max(50).optional(),
          interests: z.array(z.string()).optional(),
          personalityTraits: z.array(z.string()).optional(),
          fears: z.array(z.string()).optional(),
          favoriteColor: z.string().max(50).optional(),
          readingLevel: z.string().max(50).optional(),
          language: z.string().max(50).optional(),
          hairColor: z.string().max(50).optional(),
          skinTone: z.string().max(50).optional(),
          nickname: z.string().max(255).optional(),
          favoriteCharacter: z.string().max(255).optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.string().max(255).optional(),
          sensoryPreferences: z.array(z.string()).optional(),
          communicationStyle: z.string().max(255).optional(),
          storyPacing: z.string().max(50).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // COPPA Compliance: Check parental consent before creating child profile
        const ageValidation = validateChildAge(input.age);
        if (!ageValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ageValidation.message,
          });
        }

        if (ageValidation.requiresConsent) {
          await requireConsent(ctx.user.id);
        }

        await checkChildLimit(ctx.user.id);
        const result = await db
          .insert(children)
          .values({
            userId: ctx.user.id,
            name: input.name,
            age: input.age,
            gender: input.gender,
            interests: input.interests ?? [],
            personalityTraits: input.personalityTraits,
            fears: input.fears,
            favoriteColor: input.favoriteColor,
            readingLevel: input.readingLevel,
            language: input.language,
            hairColor: input.hairColor,
            skinTone: input.skinTone,
            nickname: input.nickname,
            favoriteCharacter: input.favoriteCharacter,
            isNeurodivergent: input.isNeurodivergent,
            sensoryPreferences: input.sensoryPreferences,
            communicationStyle: input.communicationStyle,
            storyPacing: input.storyPacing,
          })
          .$returningId();
        const newId = result[0].id;
        const [newChild] = await db.select().from(children).where(eq(children.id, newId)).limit(1);
        return newChild;
      }),

    update: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          name: z.string().min(1).max(255).optional(),
          age: z.number().int().optional(),
          gender: z.string().max(50).optional(),
          interests: z.array(z.string()).optional(),
          personalityTraits: z.array(z.string()).optional(),
          fears: z.array(z.string()).optional(),
          favoriteColor: z.string().max(50).optional(),
          readingLevel: z.string().max(50).optional(),
          language: z.string().max(50).optional(),
          hairColor: z.string().max(50).optional(),
          skinTone: z.string().max(50).optional(),
          nickname: z.string().max(255).optional(),
          favoriteCharacter: z.string().max(255).optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.string().max(255).optional(),
          sensoryPreferences: z.array(z.string()).optional(),
          communicationStyle: z.string().max(255).optional(),
          storyPacing: z.string().max(50).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { childId, ...updateData } = input;
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        // Build type-safe update object
        const safeUpdate: Record<string, unknown> = {};
        if (updateData.name !== undefined) safeUpdate.name = updateData.name;
        if (updateData.age !== undefined) safeUpdate.age = updateData.age;
        if (updateData.gender !== undefined) safeUpdate.gender = updateData.gender;
        if (updateData.interests !== undefined) safeUpdate.interests = updateData.interests;
        if (updateData.personalityTraits !== undefined) safeUpdate.personalityTraits = updateData.personalityTraits;
        if (updateData.fears !== undefined) safeUpdate.fears = updateData.fears;
        if (updateData.favoriteColor !== undefined) safeUpdate.favoriteColor = updateData.favoriteColor;
        if (updateData.readingLevel !== undefined) safeUpdate.readingLevel = updateData.readingLevel;
        if (updateData.language !== undefined) safeUpdate.language = updateData.language;
        if (updateData.hairColor !== undefined) safeUpdate.hairColor = updateData.hairColor;
        if (updateData.skinTone !== undefined) safeUpdate.skinTone = updateData.skinTone;
        if (updateData.nickname !== undefined) safeUpdate.nickname = updateData.nickname;
        if (updateData.favoriteCharacter !== undefined) safeUpdate.favoriteCharacter = updateData.favoriteCharacter;
        if (updateData.isNeurodivergent !== undefined) safeUpdate.isNeurodivergent = updateData.isNeurodivergent;
        if (updateData.neurodivergentProfiles !== undefined) safeUpdate.neurodivergentProfiles = updateData.neurodivergentProfiles;
        if (updateData.sensoryPreferences !== undefined) safeUpdate.sensoryPreferences = updateData.sensoryPreferences;
        if (updateData.communicationStyle !== undefined) safeUpdate.communicationStyle = updateData.communicationStyle;
        if (updateData.storyPacing !== undefined) safeUpdate.storyPacing = updateData.storyPacing;

        if (Object.keys(safeUpdate).length > 0) {
          await db
            .update(children)
            .set(safeUpdate)
            .where(and(eq(children.id, childId), eq(children.userId, ctx.user.id)));
        }
        const [updated] = await db.select().from(children).where(eq(children.id, childId)).limit(1);
        return updated;
      }),
  }),

  // ─── Helper Functions ───────────────────────────────────────

  /**
   * Shared helper function to create a story arc and update user story count
   * Eliminates duplication between create and generate mutations
   */
  async function createStoryArcHelper(
    userId: number,
    childId: number,
    theme: string,
    educationalValue: string,
    totalEpisodes: number,
    arcData: Awaited<ReturnType<typeof generateStoryArcWithClaude>>
  ) {
    const result = await db
      .insert(storyArcs)
      .values({
        userId,
        childId,
        theme,
        title: arcData.title,
        synopsis: arcData.synopsis,
        educationalValue,
        totalEpisodes,
      })
      .$returningId();
    const newId = result[0].id;

    // Atomic check-and-increment: prevents race condition where concurrent requests bypass story limit
    await db
      .update(users)
      .set({ storiesUsed: sql`${users.storiesUsed} + 1` })
      .where(
        and(
          eq(users.id, userId),
          sql`${users.storiesUsed} < COALESCE((SELECT CASE ${users.subscriptionPlan} WHEN 'free' THEN 5 WHEN 'monthly' THEN 50 WHEN 'yearly' THEN 50 WHEN 'family' THEN 200 ELSE 5 END), 5)`
        )
      );

    const [newArc] = await db.select().from(storyArcs).where(eq(storyArcs.id, newId)).limit(1);
    return newArc;
  }

  storyArcs: router({
    list: coppaProtectedProcedure
      .input(z.object({
        childId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input, ctx }) => {
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        return await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.childId, input.childId))
          .limit(input.limit)
          .offset(input.offset);
      }),

    get: coppaProtectedProcedure
      .input(z.object({ arcId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, input.arcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });
        return arc;
      }),

    // Alias: "create" maps to "generate" for client compatibility
    create: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string().min(1).max(200),
          customPrompt: z.string().max(500).optional(),
          educationalValue: z.string().max(500).optional(),
          totalEpisodes: z.number().int().min(1).max(20).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await checkStoryLimit(ctx.user.id);

          const [child] = await db
            .select()
            .from(children)
            .where(
              and(
                eq(children.id, input.childId),
                eq(children.userId, ctx.user.id)
              )
            )
            .limit(1);
          if (!child) throw new TRPCError({ code: "NOT_FOUND" });

          const childProfile = toChildProfile(child);
          const educationalValue = input.educationalValue ?? "general learning";
          const totalEpisodes = input.totalEpisodes ?? 5;
          const sanitizedCustomPrompt = input.customPrompt ? sanitizePrompt(input.customPrompt) : undefined;
          const arcData = await generateStoryArcWithClaude(childProfile, input.theme, educationalValue, totalEpisodes);

          return await createStoryArcHelper(ctx.user.id, input.childId, input.theme, educationalValue, totalEpisodes, arcData);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[storyArcs.create] Unexpected error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Story creation failed. Please try again.",
          });
        }
      }),

    generate: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string().min(1).max(200),
          customPrompt: z.string().max(500).optional(),
          educationalValue: z.string().max(500).optional(),
          totalEpisodes: z.number().int().min(1).max(20).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await checkStoryLimit(ctx.user.id);

          const [child] = await db
            .select()
            .from(children)
            .where(
              and(
                eq(children.id, input.childId),
                eq(children.userId, ctx.user.id)
              )
            )
            .limit(1);
          if (!child) throw new TRPCError({ code: "NOT_FOUND" });

          const childProfile = toChildProfile(child);
          const educationalValue = input.educationalValue ?? "general learning";
          const totalEpisodes = input.totalEpisodes ?? 5;
          const sanitizedCustomPrompt = input.customPrompt ? sanitizePrompt(input.customPrompt) : undefined;
          const arcData = await generateStoryArcWithClaude(childProfile, input.theme, educationalValue, totalEpisodes);

          return await createStoryArcHelper(ctx.user.id, input.childId, input.theme, educationalValue, totalEpisodes, arcData);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[storyArcs.generate] Unexpected error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Story creation failed. Please try again.",
          });
        }
      }),
  }),

  stories: router({
    /**
     * Generate a new story with optional moral lessons (array support)
     * Maps to storyArcs.generate but with enhanced IMPROVEMENT 2 support
     */
    generateStory: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string().min(1).max(200),
          storyLength: z.string().max(50).optional(),
          tone: z.string().max(50).optional(),
          moralLessons: z.array(z.string()).optional(),
          customElements: z.string().max(500).optional(),
          totalEpisodes: z.number().int().min(1).max(20).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          checkRateLimit(getRateLimitKey(ctx, "story_gen"), 10, 5 * 60_000);
          await checkStoryLimit(ctx.user.id);

          const [child] = await db
            .select()
            .from(children)
            .where(
              and(
                eq(children.id, input.childId),
                eq(children.userId, ctx.user.id)
              )
            )
            .limit(1);
          if (!child) throw new TRPCError({ code: "NOT_FOUND" });

          const childProfile = toChildProfile(child);
          const educationalValue = input.moralLessons?.join(", ") ?? "general learning";
          const totalEpisodes = input.totalEpisodes ?? 5;
          const arcData = await generateStoryArcWithClaude(childProfile, input.theme, educationalValue, totalEpisodes);

          // Create storyArcs entry with moral lessons support
          const result = await db
            .insert(storyArcs)
            .values({
              userId: ctx.user.id,
              childId: input.childId,
              theme: input.theme,
              title: arcData.title,
              synopsis: arcData.synopsis,
              educationalValue: educationalValue,
              totalEpisodes,
            })
            .$returningId();
          const newId = result[0].id;

          // Atomic check-and-increment: prevents race condition where concurrent requests bypass story limit
          const updateResult = await db
            .update(users)
            .set({ storiesUsed: sql`${users.storiesUsed} + 1` })
            .where(
              and(
                eq(users.id, ctx.user.id),
                sql`${users.storiesUsed} < COALESCE((SELECT CASE ${users.subscriptionPlan} WHEN 'free' THEN 5 WHEN 'monthly' THEN 50 WHEN 'yearly' THEN 50 WHEN 'family' THEN 200 ELSE 5 END), 5)`
              )
            );

          const [newArc] = await db.select().from(storyArcs).where(eq(storyArcs.id, newId)).limit(1);
          return {
            arcId: newArc.id,
            serverArcId: newArc.id,
            title: newArc.title,
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[stories.generateStory] Unexpected error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Story creation failed. Please try again.",
          });
        }
      }),
  }),

  episodes: router({
    list: coppaProtectedProcedure
      .input(z.object({ arcId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, input.arcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });
        return await db
          .select()
          .from(episodes)
          .where(eq(episodes.storyArcId, input.arcId))
          .orderBy(asc(episodes.episodeNumber))
          .limit(100);
      }),

    get: coppaProtectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });
        return episode;
      }),

    generate: coppaProtectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          episodeNumber: z.number().int(),
          customPrompt: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // Rate limit: max 10 story generations per 5 minutes per user
          checkRateLimit(getRateLimitKey(ctx, "story_gen"), 10, 5 * 60_000);
          const [arc] = await db
            .select()
            .from(storyArcs)
            .where(eq(storyArcs.id, input.arcId))
            .limit(1);
          if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
          const [child] = await db
            .select()
            .from(children)
            .where(
              and(
                eq(children.id, arc.childId),
                eq(children.userId, ctx.user.id)
              )
            )
            .limit(1);
          if (!child) throw new TRPCError({ code: "FORBIDDEN" });

          // Get episode context for narrative continuity (pass preloaded arc to avoid duplicate query)
          const episodeContext = await getEpisodeContext(input.arcId, input.episodeNumber, arc);

          // Parse educational value (moral lessons) from arc
          const moralLessons = arc.educationalValue
            ? arc.educationalValue.split(",").map((m) => m.trim())
            : undefined;

          // Build story context for new StoryEngine
          const storyContext: StoryContext = {
            child: {
              name: child.nickname ?? child.name,
              age: child.age,
              interests: child.interests ?? [],
              personality: child.personalityTraits?.join(", "),
              fears: child.fears,
            },
            theme: arc.theme,
            storyArc: {
              title: arc.title,
              totalEpisodes: arc.totalEpisodes ?? 5,
              currentEpisode: input.episodeNumber,
            },
            previousEpisodes: episodeContext.previousEpisodes,
            preferences: {
              readingLevel: child.readingLevel,
              tone: "bedtime-friendly",
            },
            // IMPROVEMENT 2: Add moral lessons support
            customElements: moralLessons ? { morals: moralLessons } : undefined,
          };

          // Generate episode using new StoryEngine
          const episodeData = await storyEngine.generateEpisode(storyContext);

          // Track cost for episode generation
          costTracker.trackCost(ctx.user.id, input.arcId, {
            service: "claude",
            operation: "episode_generation",
            estimatedCost: COST_ESTIMATES.storyGeneration,
          });

          // Score story quality
          const qualityScore = await scoreStory(episodeData, child.age);
          if (!passesQualityThreshold(qualityScore)) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Episode quality score too low: ${qualityScore.overall}/100. Please regenerate.`,
            });
          }

          // Content moderation — screen generated content before saving
          const moderationResult = moderateEpisode(
            {
              title: episodeData.title,
              summary: episodeData.summary,
              pages: episodeData.pages.map((p: any) => ({ text: p.text })),
            },
            child.fears ?? undefined
          );
          if (!moderationResult.approved) {
            // Log the flagged content for review
            await db.insert(contentModerationLog).values({
              userId: ctx.user.id,
              childId: child.id,
              contentType: "episode",
              approved: false,
              flaggedItems: moderationResult.flaggedContent.map((f) => ({
                text: f.text,
                reason: f.reason,
                severity: f.severity,
              })),
              overallSeverity: moderationResult.overallSeverity,
            });
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Generated story content did not pass safety review. Please try generating again with different settings.",
            });
          }

          // Use transaction for atomic episode + pages insert
          const newEpisodeId = await db.transaction(async (tx) => {
            const epResult = await tx
              .insert(episodes)
              .values({
                storyArcId: input.arcId,
                episodeNumber: input.episodeNumber,
                title: episodeData.title,
                summary: episodeData.summary,
                musicMood: episodeData.musicMood ?? null,
              })
              .$returningId();
            const episodeId = epResult[0].id;

            // Insert all pages in the same transaction
            for (let pageIdx = 0; pageIdx < episodeData.pages.length; pageIdx++) {
              const pageData = episodeData.pages[pageIdx];
              await tx.insert(pages).values({
                episodeId,
                pageNumber: pageData.pageNumber ?? pageIdx + 1,
                storyText: pageData.text,
                imagePrompt: pageData.imagePrompt,
                mood: pageData.mood ?? null,
                sceneDescription: null,
                soundEffectHint: null,
              });
            }

            // Log successful moderation within transaction
            await tx.insert(contentModerationLog).values({
              episodeId,
              userId: ctx.user.id,
              childId: child.id,
              contentType: "episode",
              approved: true,
              flaggedItems: null,
              overallSeverity: "safe",
            });

            return episodeId;
          });

          // Update arc progress
          await updateArcProgress(input.arcId, newEpisodeId);

          const [newEpisode] = await db.select().from(episodes).where(eq(episodes.id, newEpisodeId)).limit(1);
          return newEpisode;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[episodes.generate] Unexpected error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Episode generation failed. Please try again.",
          });
        }
      }),

    generateFullAudio: protectedProcedure
      .input(z.object({
        episodeId: z.number(),
        childName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        // Fetch all pages for the episode
        const pageList = await db
          .select()
          .from(pages)
          .where(eq(pages.episodeId, input.episodeId));

        // Build pagesData in the format generateEpisodeAudio expects
        const pagesData = pageList.map((p) => ({
          pageNumber: p.pageNumber,
          storyText: p.storyText ?? "",
          characters: (p.characters ?? []).map((c) => ({
            name: c.name,
            traits: Array.isArray(c.traits) ? c.traits.join(", ") : String(c.traits ?? ""),
          })),
          mood: p.mood ?? undefined,
        }));

        const { audioUrl, totalDurationMs, pageTimings } = await generateEpisodeAudio(
          pagesData,
          input.episodeId,
        );

        // Track cost for audio generation (per page)
        const pageCount = pageList.length;
        costTracker.trackCost(ctx.user.id, arc.id, {
          service: "elevenlabs",
          operation: "episode_audio_generation",
          estimatedCost: COST_ESTIMATES.audioNarration * pageCount,
        });

        // Update episode record with audio data
        await db
          .update(episodes)
          .set({
            fullAudioUrl: audioUrl,
            fullAudioDurationMs: totalDurationMs,
            pageTimings,
          })
          .where(eq(episodes.id, input.episodeId));

        return { audioUrl, totalDurationMs, pageTimings };
      }),

    generateMusic: protectedProcedure
      .input(z.object({
        episodeId: z.number(),
        mood: z.string().max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limit: max 10 music generations per 5 minutes per user
        checkRateLimit(getRateLimitKey(ctx, "music_gen"), 10, 5 * 60_000);
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        // Fetch pages to get moods
        const pageList = await db
          .select()
          .from(pages)
          .where(eq(pages.episodeId, input.episodeId));

        const pageMoods = pageList.map((p) => p.mood ?? "warm");
        const estimatedDurationSeconds = pageList.length * 30; // ~30s per page

        const { musicUrl, durationMs, title } = await generateEpisodeMusic(
          arc.theme,
          pageMoods,
          estimatedDurationSeconds,
        );

        // Track cost for music generation
        costTracker.trackCost(ctx.user.id, arc.id, {
          service: "suno",
          operation: "episode_music_generation",
          estimatedCost: COST_ESTIMATES.musicGeneration,
        });

        // Update episode with music data
        await db
          .update(episodes)
          .set({
            musicUrl,
            musicDurationMs: durationMs,
          })
          .where(eq(episodes.id, input.episodeId));

        return { musicUrl, durationMs, title };
      }),
  }),

  pages: router({
    list: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });
        return await db
          .select()
          .from(pages)
          .where(eq(pages.episodeId, input.episodeId))
          .orderBy(asc(pages.pageNumber))
          .limit(100);
      }),

    get: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [page] = await db
          .select()
          .from(pages)
          .where(eq(pages.id, input.pageId))
          .limit(1);
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, page.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });
        return page;
      }),

    generateImage: protectedProcedure
      .input(z.object({
        pageId: z.number(),
        prompt: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limit: max 20 image generations per 5 minutes per user
        checkRateLimit(getRateLimitKey(ctx, "image_gen"), 20, 5 * 60_000);
        const [page] = await db
          .select()
          .from(pages)
          .where(eq(pages.id, input.pageId))
          .limit(1);
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, page.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        const imagePrompt = input.prompt ?? page.imagePrompt ?? "A magical storybook illustration";
        const imageResult = await generateImage({ prompt: imagePrompt });
        const imageUrl = imageResult.url ?? null;

        // Track cost for image generation
        costTracker.trackCost(ctx.user.id, arc.id, {
          service: "forge",
          operation: "page_image_generation",
          estimatedCost: COST_ESTIMATES.imageGeneration,
        });

        await db
          .update(pages)
          .set({ imageUrl })
          .where(eq(pages.id, input.pageId));
        const [updated] = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
        return updated;
      }),

    generateAudio: protectedProcedure
      .input(z.object({ pageId: z.number(), voiceRole: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Rate limit: max 30 audio generations per 5 minutes per user
        checkRateLimit(getRateLimitKey(ctx, "audio_gen"), 30, 5 * 60_000);
        const [page] = await db
          .select()
          .from(pages)
          .where(eq(pages.id, input.pageId))
          .limit(1);
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, page.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        const characters = (page.characters ?? []).map((c) => ({
          name: c.name,
          traits: Array.isArray(c.traits) ? c.traits.join(", ") : String(c.traits ?? ""),
        }));

        const audioResult = await generatePageAudio(
          page.storyText ?? "",
          characters,
          page.id,
        );

        // Track cost for page audio generation
        costTracker.trackCost(ctx.user.id, arc.id, {
          service: "elevenlabs",
          operation: "page_audio_generation",
          estimatedCost: COST_ESTIMATES.audioNarration,
        });

        await db
          .update(pages)
          .set({ audioUrl: audioResult.audioUrl, audioDurationMs: audioResult.durationMs })
          .where(eq(pages.id, input.pageId));
        const [updated] = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
        return updated;
      }),

    generateSoundEffect: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [page] = await db
          .select()
          .from(pages)
          .where(eq(pages.id, input.pageId))
          .limit(1);
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });

        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, page.episodeId))
          .limit(1);
        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, arc.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        const { effectUrl, durationMs } = await generatePageSoundEffect(
          arc.theme,
          page.mood ?? "warm",
          page.sceneDescription ?? page.storyText ?? "A magical scene",
        );

        // Track cost for sound effect generation
        costTracker.trackCost(ctx.user.id, arc.id, {
          service: "suno",
          operation: "page_sound_effect_generation",
          estimatedCost: COST_ESTIMATES.musicGeneration / 5, // Sound effects are cheaper
        });

        await db
          .update(pages)
          .set({ soundEffectUrl: effectUrl })
          .where(eq(pages.id, input.pageId));

        return { effectUrl, durationMs };
      }),
  }),

  recommendations: router({
    list: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        return await db
          .select()
          .from(storyRecommendations)
          .where(eq(storyRecommendations.childId, input.childId));
      }),

    generate: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const childProfile = toChildProfile(child);

        // Generate profile hash for cache key
        const profileHash = generateProfileHash({
          age: child.age,
          interests: child.interests ?? [],
          personalityTraits: child.personalityTraits ?? [],
        });
        const cacheKey = recommendationsCacheKey(input.childId, profileHash);

        // Try to get recommendations from cache, fall back to generation
        const recommendations = await cache.getOrSet(
          cacheKey,
          CACHE_CONFIG.recommendations.ttl,
          () => generateRecommendations(childProfile)
        );

        for (const rec of recommendations) {
          await db.insert(storyRecommendations).values({
            userId: ctx.user.id,
            childId: input.childId,
            title: rec.title,
            theme: rec.theme,
            educationalValue: rec.educationalValue,
            synopsis: rec.synopsis,
            imagePrompt: rec.imagePrompt,
            whyRecommended: rec.whyRecommended,
            estimatedEpisodes: rec.estimatedEpisodes,
          });
        }

        // Track cost
        costTracker.trackCost(ctx.user.id, null, {
          service: "claude",
          operation: "recommendations_generation",
          estimatedCost: COST_ESTIMATES.storyGeneration,
        });

        return { count: recommendations.length };
      }),

    generateCovers: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        // Fetch recommendations without imageUrl
        const recs = await db
          .select()
          .from(storyRecommendations)
          .where(
            and(
              eq(storyRecommendations.childId, input.childId),
              isNull(storyRecommendations.imageUrl),
            )
          );

        let generated = 0;

        for (const rec of recs) {
          try {
            const imageResult = await generateImage({ prompt: rec.imagePrompt ?? "A magical storybook cover" });
            if (imageResult.url) {
              await db
                .update(storyRecommendations)
                .set({ imageUrl: imageResult.url })
                .where(eq(storyRecommendations.id, rec.id));
              generated++;
            }
          } catch (error) {
            console.error(`Failed to generate image for recommendation ${rec.id}:`, error);
          }
        }

        return { generated };
      }),
  }),

  printOrders: router({
    list: protectedProcedure
      .input(z.object({ childId: z.number().optional(), arcId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        // Filter by userId (printOrders doesn't have childId column)
        return await db
          .select()
          .from(printOrders)
          .where(eq(printOrders.userId, ctx.user.id));
      }),

    get: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(
            and(
              eq(printOrders.id, input.orderId),
              eq(printOrders.userId, ctx.user.id),
            )
          )
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        return order;
      }),

    create: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          arcId: z.number(),
          format: z.enum(["hardcover", "paperback", "ebook"]),
          quantity: z.number().int().min(1).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, input.arcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        // Map client format to printful format
        const formatMap: Record<string, string> = {
          hardcover: "hardcover_8x8",
          paperback: "softcover_8x8",
          ebook: "softcover_8x8",
        };
        const bookFormat = formatMap[input.format] ?? "softcover_8x8";

        // Get pages for the arc's episodes (single query, no N+1)
        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, input.arcId));
        const episodeIds = arcEpisodes.map((ep) => ep.id);
        const allPages = episodeIds.length > 0
          ? await db.select().from(pages).where(inArray(pages.episodeId, episodeIds))
          : [];

        const result = await db
          .insert(printOrders)
          .values({
            userId: ctx.user.id,
            storyArcId: input.arcId,
            bookFormat,
            pageCount: allPages.length,
            coverImageUrl: arc.coverImageUrl,
            status: "draft",
          })
          .$returningId();
        const newId = result[0].id;
        const [order] = await db.select().from(printOrders).where(eq(printOrders.id, newId)).limit(1);
        return order;
      }),

    shippingRates: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        address: shippingAddressSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(
            and(
              eq(printOrders.id, input.orderId),
              eq(printOrders.userId, ctx.user.id),
            )
          )
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        const rates = await getShippingRates(input.address, order.bookFormat);
        const price = calculateBookPrice(order.bookFormat, order.pageCount ?? 0);
        return { rates, price };
      }),

    confirm: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        shippingRateId: z.string(),
        address: shippingAddressSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        // Guard: Check if Printful is configured
        if (!isPrintfulConfigured()) {
          throw new TRPCError({
            code: "UNAVAILABLE",
            message: "Print-on-demand service is not configured. Please contact support.",
          });
        }

        const [order] = await db
          .select()
          .from(printOrders)
          .where(
            and(
              eq(printOrders.id, input.orderId),
              eq(printOrders.userId, ctx.user.id),
            )
          )
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        // Get arc and pages for BookSpec
        const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, order.storyArcId)).limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db.select().from(children).where(eq(children.id, arc.childId)).limit(1);

        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, order.storyArcId));
        const confirmEpIds = arcEpisodes.map((ep) => ep.id);
        const allPages = confirmEpIds.length > 0
          ? await db.select().from(pages).where(inArray(pages.episodeId, confirmEpIds))
          : [];

        const bookSpec: BookSpec = {
          title: arc.title,
          authorName: "StoryWeaver",
          childName: child?.name ?? "Little Reader",
          coverImageUrl: arc.coverImageUrl ?? "",
          pages: allPages.map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl ?? "",
            text: p.storyText ?? undefined,
          })),
          format: order.bookFormat as BookSpec["format"],
        };

        const interiorPdfUrl = await generateBookInteriorPdf(bookSpec);
        const printfulOrder = await createPrintfulOrder(bookSpec, input.address, input.shippingRateId, interiorPdfUrl);

        await db
          .update(printOrders)
          .set({
            status: "submitted",
            printfulOrderId: printfulOrder.orderId,
            interiorPdfUrl,
            shippingName: input.address.name,
            shippingCity: input.address.city,
            shippingState: input.address.stateCode,
            shippingZip: input.address.zip,
            shippingCountry: input.address.countryCode,
            subtotal: String(printfulOrder.costs.subtotal),
            shippingCost: String(printfulOrder.costs.shipping),
            discount: String(printfulOrder.costs.discount),
            total: String(printfulOrder.costs.total),
          })
          .where(eq(printOrders.id, input.orderId));

        const [updated] = await db.select().from(printOrders).where(eq(printOrders.id, input.orderId)).limit(1);
        return updated;
      }),

    initiateCheckout: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(
            and(
              eq(printOrders.id, input.orderId),
              eq(printOrders.userId, ctx.user.id),
            )
          )
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        const price = calculateBookPrice(order.bookFormat, order.pageCount ?? 0);
        return { price };
      }),

    confirmPayment: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          shippingAddress: z.object({
            name: z.string(),
            email: z.string().email(),
            phone: z.string(),
            street: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string(),
            country: z.string(),
          }),
          shippingMethod: z.string(),
          paymentMethodId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(
            and(
              eq(printOrders.id, input.orderId),
              eq(printOrders.userId, ctx.user.id),
            )
          )
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        // Get arc and pages for BookSpec
        const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, order.storyArcId)).limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db.select().from(children).where(eq(children.id, arc.childId)).limit(1);

        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, order.storyArcId));
        const allPages = [];
        for (const ep of arcEpisodes) {
          const epPages = await db.select().from(pages).where(eq(pages.episodeId, ep.id));
          allPages.push(...epPages);
        }

        const bookSpec: BookSpec = {
          title: arc.title,
          authorName: "StoryWeaver",
          childName: child?.name ?? "Little Reader",
          coverImageUrl: arc.coverImageUrl ?? "",
          pages: allPages.map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl ?? "",
            text: p.storyText ?? undefined,
          })),
          format: order.bookFormat as BookSpec["format"],
        };

        const shippingAddr: PrintfulShippingAddress = {
          name: input.shippingAddress.name,
          address1: input.shippingAddress.street,
          city: input.shippingAddress.city,
          stateCode: input.shippingAddress.state,
          zip: input.shippingAddress.zip,
          countryCode: input.shippingAddress.country,
          email: input.shippingAddress.email,
          phone: input.shippingAddress.phone,
        };

        const interiorPdfUrl = await generateBookInteriorPdf(bookSpec);
        const printfulOrder = await createPrintfulOrder(bookSpec, shippingAddr, input.shippingMethod, interiorPdfUrl);

        await db
          .update(printOrders)
          .set({
            status: "submitted",
            printfulOrderId: printfulOrder.orderId,
            interiorPdfUrl,
            shippingName: input.shippingAddress.name,
            shippingCity: input.shippingAddress.city,
            shippingState: input.shippingAddress.state,
            shippingZip: input.shippingAddress.zip,
            shippingCountry: input.shippingAddress.country,
            subtotal: String(printfulOrder.costs.subtotal),
            shippingCost: String(printfulOrder.costs.shipping),
            discount: String(printfulOrder.costs.discount),
            total: String(printfulOrder.costs.total),
          })
          .where(eq(printOrders.id, input.orderId));

        const [updated] = await db.select().from(printOrders).where(eq(printOrders.id, input.orderId)).limit(1);
        return updated;
      }),

    getStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(
            and(
              eq(printOrders.id, input.orderId),
              eq(printOrders.userId, ctx.user.id),
            )
          )
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        if (!order.printfulOrderId) {
          return { status: order.status };
        }

        const printfulStatus = await getPrintfulOrderStatus(order.printfulOrderId);
        return { status: printfulStatus.status, tracking: printfulStatus.tracking };
      }),

    // ─── New Procedures for Print-on-Demand Engine ──────────────

    getFormats: publicProcedure.query(() => {
      return getAvailableFormats().map((fmt) => ({
        id: fmt.id,
        label: fmt.label,
        description: fmt.description,
        basePrice: fmt.basePrice,
        perPagePrice: fmt.perPagePrice,
      }));
    }),

    createBookProduct: protectedProcedure
      .input(
        z.object({
          storyArcId: z.number(),
          childId: z.number(),
          format: z.string(),
          size: z.string(),
          dedication: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, input.storyArcId))
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND", message: "Story arc not found" });

        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, input.storyArcId));
        const allPages = [];
        for (const ep of arcEpisodes) {
          const epPages = await db.select().from(pages).where(eq(pages.episodeId, ep.id));
          allPages.push(...epPages);
        }

        const pageCount = allPages.length + 2; // +2 for front/back cover

        const layout = generateBookLayout(
          arc.title,
          (await db.select().from(children).where(eq(children.id, input.childId)).limit(1))[0]?.name ?? "Little Reader",
          arc.coverImageUrl ?? "",
          allPages.map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl ?? undefined,
            text: p.storyText ?? undefined,
          })),
          input.dedication,
          (input.format === "hardcover" ? "hardcover" : "softcover") as "softcover" | "hardcover",
          (input.size as "6x9" | "8x10" | "8.5x11") ?? "8x10"
        );

        const validation = validatePrintReady(layout);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Book is not print-ready: " + validation.issues.join(", "),
          });
        }

        const result = await db
          .insert(bookProducts)
          .values({
            storyArcId: input.storyArcId,
            userId: ctx.user.id,
            childId: input.childId,
            title: arc.title,
            format: input.format,
            size: input.size,
            pageCount,
            coverImageUrl: arc.coverImageUrl,
            status: "ready",
          })
          .$returningId();

        const newId = result[0].id;
        const [product] = await db.select().from(bookProducts).where(eq(bookProducts.id, newId)).limit(1);
        return product;
      }),

    getBookPreview: protectedProcedure
      .input(z.object({ bookProductId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [product] = await db
          .select()
          .from(bookProducts)
          .where(
            and(
              eq(bookProducts.id, input.bookProductId),
              eq(bookProducts.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, product.storyArcId)).limit(1);
        const [child] = await db.select().from(children).where(eq(children.id, product.childId)).limit(1);

        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, product.storyArcId));
        const previewEpIds = arcEpisodes.map((ep) => ep.id);
        const allPages = previewEpIds.length > 0
          ? await db.select().from(pages).where(inArray(pages.episodeId, previewEpIds))
          : [];

        const price = calculatePrice(product.format + "_" + product.size, product.pageCount, "US", undefined, 1, 0);

        return {
          product,
          arc,
          child,
          price,
          pageCount: allPages.length,
        };
      }),

    estimateShipping: protectedProcedure
      .input(
        z.object({
          bookProductId: z.number(),
          address: shippingAddressSchema,
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [product] = await db
          .select()
          .from(bookProducts)
          .where(
            and(
              eq(bookProducts.id, input.bookProductId),
              eq(bookProducts.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        const rates = await getShippingRates(input.address, product.format + "_" + product.size);
        const price = calculatePrice(product.format + "_" + product.size, product.pageCount, input.address.countryCode, input.address.stateCode);

        return { rates, price };
      }),

    placeOrder: protectedProcedure
      .input(
        z.object({
          bookProductId: z.number(),
          shippingAddressId: z.number().optional(),
          shippingAddress: shippingAddressSchema,
          shippingRateId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [product] = await db
          .select()
          .from(bookProducts)
          .where(
            and(
              eq(bookProducts.id, input.bookProductId),
              eq(bookProducts.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, product.storyArcId)).limit(1);
        const [child] = await db.select().from(children).where(eq(children.id, product.childId)).limit(1);

        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, product.storyArcId));
        const placeEpIds = arcEpisodes.map((ep) => ep.id);
        const allPages = placeEpIds.length > 0
          ? await db.select().from(pages).where(inArray(pages.episodeId, placeEpIds))
          : [];

        const bookSpec: BookSpec = {
          title: arc?.title ?? product.title,
          authorName: "StoryWeaver",
          childName: child?.name ?? "Little Reader",
          coverImageUrl: product.coverImageUrl ?? "",
          pages: allPages.map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl ?? "",
            text: p.storyText ?? undefined,
          })),
          format: (product.format + "_" + product.size) as any,
        };

        const interiorPdfUrl = await generateBookInteriorPdf(bookSpec);
        const printfulOrder = await createPrintfulOrder(bookSpec, input.shippingAddress, input.shippingRateId, interiorPdfUrl);

        const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const subscriptionDiscount = user?.subscriptionPlan === "family" ? 30 : user?.subscriptionPlan === "yearly" ? 20 : user?.subscriptionPlan === "monthly" ? 10 : 0;
        const price = calculatePrice(product.format + "_" + product.size, product.pageCount, input.shippingAddress.countryCode, input.shippingAddress.stateCode, 1, subscriptionDiscount);

        const result = await db
          .insert(printOrders)
          .values({
            userId: ctx.user.id,
            storyArcId: product.storyArcId,
            printfulOrderId: printfulOrder.orderId,
            bookFormat: product.format + "_" + product.size,
            pageCount: product.pageCount,
            coverImageUrl: product.coverImageUrl,
            interiorPdfUrl,
            status: "submitted",
            shippingName: input.shippingAddress.name,
            shippingCity: input.shippingAddress.city,
            shippingState: input.shippingAddress.stateCode,
            shippingZip: input.shippingAddress.zip,
            shippingCountry: input.shippingAddress.countryCode,
            subtotal: String(price.baseCost * (1 + 0.4)),
            shippingCost: String(price.shippingEstimate),
            total: String(price.total),
          })
          .$returningId();

        const newOrderId = result[0].id;
        const [order] = await db.select().from(printOrders).where(eq(printOrders.id, newOrderId)).limit(1);
        return order;
      }),

    saveAddress: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          city: z.string(),
          stateCode: z.string().optional(),
          countryCode: z.string(),
          zip: z.string(),
          phone: z.string().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // If setting as default, unset other defaults
        if (input.isDefault) {
          await db
            .update(shippingAddresses)
            .set({ isDefault: false })
            .where(eq(shippingAddresses.userId, ctx.user.id));
        }

        const result = await db
          .insert(shippingAddresses)
          .values({
            userId: ctx.user.id,
            name: input.name,
            address1: input.address1,
            address2: input.address2,
            city: input.city,
            stateCode: input.stateCode,
            countryCode: input.countryCode,
            zip: input.zip,
            phone: input.phone,
            isDefault: input.isDefault ?? false,
          })
          .$returningId();

        const newId = result[0].id;
        const [address] = await db.select().from(shippingAddresses).where(eq(shippingAddresses.id, newId)).limit(1);
        return address;
      }),

    getAddresses: protectedProcedure.query(async ({ ctx }) => {
      return await db
        .select()
        .from(shippingAddresses)
        .where(eq(shippingAddresses.userId, ctx.user.id))
        .orderBy(shippingAddresses.isDefault ? desc(shippingAddresses.isDefault) : undefined);
    }),
  }),

  voice: router({
    getVoices: publicProcedure.query(() => {
      return Object.entries(VOICE_PRESETS).map(([key, preset]) => ({
        id: key,
        name: preset.name,
        voiceId: preset.voiceId,
      }));
    }),

    generateSpeech: protectedProcedure
      .input(z.object({ text: z.string(), voiceId: z.string() }))
      .mutation(async ({ input }) => {
        // Find the voice config by voiceId
        const voiceEntry = Object.entries(VOICE_PRESETS).find(([, v]) => v.voiceId === input.voiceId);
        const voiceConfig = voiceEntry ? voiceEntry[1] : VOICE_PRESETS.narrator;
        const audioBuffer = await generateSpeech({ text: input.text, voiceConfig });
        // Return base64 encoded audio
        return { audioUrl: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}` };
      }),
  }),

  subscription: router({
    getCurrentPlan: protectedProcedure.query(async ({ ctx }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const plan = user.subscriptionPlan ?? "free";
      const tier = SUBSCRIPTION_TIERS[plan as keyof typeof SUBSCRIPTION_TIERS];
      return {
        plan,
        tier,
        status: user.subscriptionStatus ?? "none",
        expiresAt: user.subscriptionExpiresAt,
      };
    }),

    createCheckoutSession: protectedProcedure
      .input(z.object({ planId: z.enum(["monthly", "yearly", "family"]) }))
      .mutation(async ({ input, ctx }) => {
        // Guard: Check if Stripe is configured
        const { isStripeConfigured } = await import("./_core/stripe");
        if (!isStripeConfigured()) {
          throw new TRPCError({
            code: "UNAVAILABLE",
            message: "Payment service is not configured. Please contact support.",
          });
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });
        if (!user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "User email not available" });

        const { getOrCreateCustomer, createCheckoutSession: createSession } = await import("./_core/stripe");

        // Get or create Stripe customer
        const customerId = await getOrCreateCustomer(ctx.user.id, user.email, user.name || undefined);

        // Map plan to Stripe price ID
        const priceIdMap = {
          monthly: process.env.STRIPE_PRICE_MONTHLY || "",
          yearly: process.env.STRIPE_PRICE_ANNUAL || "",
          family: process.env.STRIPE_PRICE_FAMILY || "",
        };

        const priceId = priceIdMap[input.planId];
        if (!priceId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Price ID not configured" });
        }

        // Create checkout session with 7-day trial
        const checkoutUrl = await createSession(
          customerId,
          priceId,
          ctx.user.id,
          7, // trialDays
          `${process.env.FRONTEND_URL || "http://localhost:8081"}/subscription-success`,
          `${process.env.FRONTEND_URL || "http://localhost:8081"}/subscription-cancel`
        );

        return { checkoutUrl };
      }),

    createBillingPortal: protectedProcedure.mutation(async ({ ctx }) => {
      // Guard: Check if Stripe is configured
      const { isStripeConfigured } = await import("./_core/stripe");
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "UNAVAILABLE",
          message: "Payment service is not configured. Please contact support.",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (!user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a Stripe customer ID",
        });
      }

      const { createBillingPortalSession } = await import("./_core/stripe");
      const portalUrl = await createBillingPortalSession(
        user.stripeCustomerId,
        `${process.env.FRONTEND_URL || "http://localhost:8081"}/settings`
      );

      return { portalUrl };
    }),

    syncSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      // Guard: Check if Stripe is configured
      const { isStripeConfigured } = await import("./_core/stripe");
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "UNAVAILABLE",
          message: "Payment service is not configured. Please contact support.",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (!user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a Stripe customer ID",
        });
      }

      const { getSubscriptionStatus } = await import("./_core/stripe");
      const status = await getSubscriptionStatus(user.stripeCustomerId);

      if (status) {
        await db
          .update(users)
          .set({
            subscriptionPlan: status.plan,
            subscriptionExpiresAt: status.currentPeriodEnd,
            stripeSubscriptionId: status.subscriptionId,
            subscriptionStatus: status.status,
          })
          .where(eq(users.id, ctx.user.id));
      }

      const [updated] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      return {
        plan: updated?.subscriptionPlan ?? "free",
        status: updated?.subscriptionStatus ?? "none",
        expiresAt: updated?.subscriptionExpiresAt,
      };
    }),

    upgradePlan: protectedProcedure
      .input(z.object({ newPlan: z.enum(["free", "monthly", "yearly", "family"]) }))
      .mutation(async ({ input, ctx }) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        await db
          .update(users)
          .set({ subscriptionPlan: input.newPlan })
          .where(eq(users.id, ctx.user.id));

        const [updated] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const tier = SUBSCRIPTION_TIERS[input.newPlan as keyof typeof SUBSCRIPTION_TIERS];
        return { plan: input.newPlan, tier };
      }),
  }),

  voices: router({
    list: publicProcedure.query(() => {
      return Object.entries(VOICE_PRESETS).map(([key, preset]) => ({
        id: key,
        name: preset.name,
        voiceId: preset.voiceId,
      }));
    }),

    listPresets: publicProcedure.query(() => {
      return Object.entries(VOICE_PRESETS).map(([key, preset]) => ({
        id: key,
        name: preset.name,
        voiceId: preset.voiceId,
        description: preset.description,
        role: key as VoiceRole,
      }));
    }),

    preview: protectedProcedure
      .input(z.object({ voiceId: z.string(), text: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const voiceEntry = Object.entries(VOICE_PRESETS).find(([, v]) => v.voiceId === input.voiceId);
        const voiceConfig = voiceEntry ? voiceEntry[1] : VOICE_PRESETS.narrator;
        const sampleText = input.text ?? "Once upon a time, in a land far away, there lived a brave little explorer.";

        // Generate hash for the text to cache the preview
        const textHash = generateTextHash(sampleText);
        const cacheKey = voicePreviewCacheKey(input.voiceId, textHash);

        // Try to get from cache, fall back to generation
        const audioUrl = await cache.getOrSet(
          cacheKey,
          CACHE_CONFIG.voicePreviews.ttl,
          async () => {
            const audioBuffer = await generateSpeech({ text: sampleText, voiceConfig });
            return `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
          }
        );

        // Track cost
        costTracker.trackCost(ctx.user.id, null, {
          service: "elevenlabs",
          operation: "voice_preview",
          estimatedCost: COST_ESTIMATES.audioNarration / 10, // Previews are shorter
        });

        return { audioUrl };
      }),
  }),

  costs: router({
    /**
     * Get cost usage for the current user
     */
    getMyUsage: protectedProcedure.query(async ({ ctx }) => {
      const costs = costTracker.getUserCosts(ctx.user.id);
      const costEntries = costTracker.getAllUserEntries(ctx.user.id);

      return {
        totalCents: costs.total,
        totalUSD: (costs.total / 100).toFixed(2),
        byService: costs.byService,
        operationCount: costs.count,
        entries: costEntries.map((e) => ({
          service: e.service,
          operation: e.operation,
          estimatedCostCents: e.estimatedCost,
          tokensUsed: e.tokensUsed,
          timestamp: e.timestamp.toISOString(),
        })),
      };
    }),

    /**
     * Get costs for a specific story (admin/owner only)
     */
    getStoryCost: protectedProcedure
      .input(z.object({ storyArcId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify user owns this story
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, input.storyArcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        const costData = costTracker.getStoryCost(ctx.user.id, input.storyArcId);
        return {
          storyArcId: input.storyArcId,
          totalCents: costData.total,
          totalUSD: (costData.total / 100).toFixed(2),
          breakdown: costData.breakdown.map((e) => ({
            service: e.service,
            operation: e.operation,
            estimatedCostCents: e.estimatedCost,
            timestamp: e.timestamp.toISOString(),
          })),
        };
      }),

    /**
     * Get cache statistics (for monitoring)
     */
    getCacheStats: publicProcedure.query(() => {
      const cacheStats = cache.getStats();
      return {
        cacheSize: cacheStats.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: (cacheStats.hitRate * 100).toFixed(2) + "%",
      };
    }),

    /**
     * Get cost tracking statistics (admin only)
     */
    getStats: protectedProcedure.query(async ({ ctx }) => {
      // Check if user is admin
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view cost statistics",
        });
      }

      const costStats = costTracker.getStats();
      return {
        totalCostCents: costStats.totalCost,
        totalCostUSD: (costStats.totalCost / 100).toFixed(2),
        totalEntries: costStats.totalEntries,
        usersTracked: costStats.usersTracked.size,
        cacheStats: cache.getStats(),
      };
    }),
  }),

  gamification: router({
    /**
     * Get child's progress (streaks, achievements, points, level)
     */
    getChildProgress: coppaProtectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify child belongs to user
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const progress = await getChildProgress(ctx.user.id, input.childId);

        // Get achievement details
        const achievementDetails = progress.unlockedAchievements.map(
          (key) => {
            const def = ACHIEVEMENTS.find((a) => a.key === key);
            return def
              ? {
                  key,
                  name: def.name,
                  icon: def.icon,
                  description: def.description,
                  tier: def.tier,
                  pointsReward: def.pointsReward,
                }
              : null;
          }
        ).filter(Boolean);

        return {
          ...progress,
          achievements: achievementDetails,
        };
      }),

    /**
     * Get all achievements with unlock status for a child
     */
    getAchievements: coppaProtectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify child belongs to user
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const unlockedAchievements = await db
          .select()
          .from(achievements)
          .where(
            and(
              eq(achievements.childId, input.childId),
              eq(achievements.userId, ctx.user.id)
            )
          );

        const unlockedKeys = new Set(
          unlockedAchievements.map((a) => a.achievementKey)
        );

        return ACHIEVEMENTS.map((def) => ({
          key: def.key,
          name: def.name,
          description: def.description,
          icon: def.icon,
          category: def.category,
          maxProgress: def.maxProgress,
          pointsReward: def.pointsReward,
          tier: def.tier,
          unlocked: unlockedKeys.has(def.key),
          unlockedAt: unlockedAchievements.find(
            (a) => a.achievementKey === def.key
          )?.unlockedAt,
        }));
      }),

    /**
     * Record reading activity and return any newly unlocked achievements
     */
    recordReading: coppaProtectedProcedure
      .input(z.object({ childId: z.number(), episodeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify child and episode belong to user
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, input.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId))
          .limit(1);

        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

        // Record activity
        await recordActivity(
          ctx.user.id,
          input.childId,
          "episode_completed",
          input.episodeId
        );

        // Update streak
        const streakResult = await updateStreak(ctx.user.id, input.childId);

        // Bonus points for streak milestones
        if (streakResult.streakIncremented) {
          if (streakResult.currentStreak === 7) {
            await recordActivity(
              ctx.user.id,
              input.childId,
              "streak_bonus_7"
            );
          } else if (streakResult.currentStreak === 30) {
            await recordActivity(
              ctx.user.id,
              input.childId,
              "streak_bonus_30"
            );
          }
        }

        // Check for newly unlocked achievements
        const newlyUnlocked = await checkAndUnlockAchievements(
          ctx.user.id,
          input.childId
        );

        // Get updated progress
        const progress = await getChildProgress(ctx.user.id, input.childId);

        return {
          success: true,
          newlyUnlocked,
          progress,
          streakIncremented: streakResult.streakIncremented,
          currentStreak: streakResult.currentStreak,
        };
      }),

    /**
     * Get leaderboard for all children of current user
     */
    getLeaderboard: protectedProcedure.query(async ({ ctx }) => {
      const userChildren = await db
        .select()
        .from(children)
        .where(eq(children.userId, ctx.user.id))
        .orderBy(desc(children.createdAt));

      const leaderboard = await Promise.all(
        userChildren.map(async (child) => {
          const progress = await getChildProgress(ctx.user.id, child.id);
          return {
            childId: child.id,
            childName: child.name,
            totalPoints: progress.totalPoints,
            level: progress.level,
            currentStreak: progress.currentStreak,
            longestStreak: progress.longestStreak,
            totalDaysRead: progress.totalDaysRead,
          };
        })
      );

      // Sort by points descending
      return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    }),
  }),

  parentTools: router({
    /**
     * Create a custom story element (character, location, moral, pet, object)
     */
    createCustomElement: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          elementType: z.enum(["character", "location", "moral", "pet", "object"]),
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          imageUrl: z.string().url().max(2048).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createCustomElement(
          ctx.user.id,
          input.childId,
          input.elementType,
          input.name,
          input.description,
          input.imageUrl
        );
        return result;
      }),

    /**
     * Get all custom elements for a child
     */
    getCustomElements: coppaProtectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getCustomElements(ctx.user.id, input.childId);
      }),

    /**
     * Delete (soft) a custom element
     */
    deleteCustomElement: coppaProtectedProcedure
      .input(z.object({ elementId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await deleteCustomElement(ctx.user.id, input.elementId);
      }),

    /**
     * Update a custom element
     */
    updateCustomElement: coppaProtectedProcedure
      .input(
        z.object({
          elementId: z.number(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().max(500).optional(),
          imageUrl: z.string().url().max(2048).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await updateCustomElement(ctx.user.id, input.elementId, {
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
        });
      }),

    /**
     * Submit an episode for parent approval
     */
    submitForApproval: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          episodeId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await submitForApproval(
          ctx.user.id,
          input.childId,
          input.episodeId
        );
      }),

    /**
     * Review an episode (approve/reject/edit)
     */
    reviewEpisode: coppaProtectedProcedure
      .input(
        z.object({
          queueId: z.number(),
          status: z.enum(["approved", "rejected", "edited"]),
          parentNotes: z.string().optional(),
          editedContent: z.record(z.unknown()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await reviewEpisode(
          ctx.user.id,
          input.queueId,
          input.status,
          input.parentNotes,
          input.editedContent
        );
      }),

    /**
     * Get all pending episode approvals for the parent
     */
    getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
      return await getPendingApprovals(ctx.user.id);
    }),

    /**
     * Get child story preferences (formatted custom elements)
     */
    getChildStoryPreferences: coppaProtectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getChildStoryPreferences(ctx.user.id, input.childId);
      }),

    /**
     * Create a parent voice recording
     */
    createVoiceRecording: coppaProtectedProcedure
      .input(
        z.object({
          childId: z.number(),
          voiceName: z.string().min(1).max(100),
          sampleAudioUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createVoiceRecording(
          ctx.user.id,
          input.childId,
          input.voiceName,
          input.sampleAudioUrl
        );
      }),

    /**
     * Get voice recordings for a child
     */
    getVoiceRecordings: coppaProtectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getVoiceRecordings(ctx.user.id, input.childId);
      }),

    /**
     * Update voice recording status
     */
    updateVoiceRecordingStatus: coppaProtectedProcedure
      .input(
        z.object({
          recordingId: z.number(),
          status: z.enum(["pending", "processing", "ready", "failed"]),
          voiceModelId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await updateVoiceRecordingStatus(
          ctx.user.id,
          input.recordingId,
          input.status,
          input.voiceModelId
        );
      }),
  }),

  // ─── Media Pipeline Optimization ─────────────────────────────────

  media: router({
    /**
     * Get all media assets for an episode with optimized URLs
     */
    getEpisodeAssets: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .query(async ({ input, ctx }) => {
        const assets = await assetManager.getEpisodeAssets(input.episodeId);

        // Filter to only show assets for this user's episodes
        const episodeResult = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId));

        if (episodeResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const episode = episodeResult[0];
        const arcResult = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, episode.storyArcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          );

        if (arcResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return assets.map((asset) => ({
          id: asset.id,
          type: asset.type,
          originalUrl: asset.originalUrl,
          variants: asset.variants,
          createdAt: asset.createdAt,
        }));
      }),

    /**
     * Get media generation progress for an episode
     */
    getMediaStatus: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify user owns this episode
        const episodeResult = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId));

        if (episodeResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const episode = episodeResult[0];
        const arcResult = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, episode.storyArcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          );

        if (arcResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return await mediaPipeline.getEpisodeMediaStatus(input.episodeId);
      }),

    /**
     * Get media generation progress for all episodes in a story arc
     */
    getArcMediaStatus: protectedProcedure
      .input(z.object({ arcId: z.number() }))
      .query(async ({ input, ctx }) => {
        const arc = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, input.arcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          );

        if (arc.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const episodesList = await db
          .select()
          .from(episodes)
          .where(eq(episodes.storyArcId, input.arcId));

        const statuses = await Promise.all(
          episodesList.map((ep) => mediaPipeline.getEpisodeMediaStatus(ep.id))
        );

        return {
          arcId: input.arcId,
          totalEpisodes: episodesList.length,
          mediaProgress: statuses,
          overallPercentComplete:
            statuses.length > 0
              ? Math.round(
                  statuses.reduce((sum, s) => sum + s.percentComplete, 0) /
                    statuses.length
                )
              : 0,
        };
      }),

    /**
     * Retry failed media generation jobs
     */
    retryFailed: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify user owns this episode
        const episodeResult = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId));

        if (episodeResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const episode = episodeResult[0];
        const arcResult = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, episode.storyArcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          );

        if (arcResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Find failed jobs for this episode
        const failedJobs = await db
          .select()
          .from(mediaQueue)
          .where(
            and(
              eq(mediaQueue.episodeId, input.episodeId),
              eq(mediaQueue.status, "failed")
            )
          );

        // Reset them to queued for retry
        const retried = failedJobs.map((job) => job.id);
        if (retried.length > 0) {
          await db
            .update(mediaQueue)
            .set({ status: "queued", errorMessage: null })
            .where((table) =>
              table.id.inArray(retried)
            );
        }

        // Start processing
        await mediaPipeline.processQueue();

        return { retriedCount: retried.length };
      }),

    /**
     * Get user's storage usage and quota
     */
    getStorageUsage: protectedProcedure.query(async ({ ctx }) => {
      return await assetManager.getStorageStats(ctx.user.id);
    }),

    /**
     * Get detailed image optimization variants for an asset
     */
    getImageVariants: protectedProcedure
      .input(z.object({ assetId: z.number() }))
      .query(async ({ input, ctx }) => {
        const asset = await assetManager.getAsset(input.assetId);

        if (!asset || asset.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return {
          assetId: asset.id,
          originalUrl: asset.originalUrl,
          variants: asset.variants.map((v) => ({
            size: v.size,
            url: v.url,
            width: v.width,
            height: v.height,
            format: v.format,
            fileSize: v.fileSize,
          })),
        };
      }),

    /**
     * Generate progressive placeholder for image loading
     */
    generateImagePlaceholder: protectedProcedure
      .input(z.object({ imageUrl: z.string().url() }))
      .query(async ({ input }) => {
        const placeholder =
          await imageOptimizer.generateProgressivePlaceholder(
            input.imageUrl
          );
        const srcSet = imageOptimizer.generateSrcSet(
          await imageOptimizer.generateResponsiveVariants(input.imageUrl)
        );
        const sizes = imageOptimizer.generateSizesAttribute();

        return {
          placeholder,
          srcSet,
          sizes,
        };
      }),

    /**
     * Get audio metadata for duration and format info
     */
    getAudioMetadata: protectedProcedure
      .input(z.object({ audioUrl: z.string().url() }))
      .query(async ({ input }) => {
        return await audioProcessor.getAudioMetadata(input.audioUrl);
      }),

    /**
     * Cancel pending media jobs for an episode
     */
    cancelEpisodeMedia: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify user owns this episode
        const episodeResult = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId));

        if (episodeResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const episode = episodeResult[0];
        const arcResult = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, episode.storyArcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          );

        if (arcResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Cancel jobs in pipeline
        const cancelled = mediaPipeline.cancelJobs(input.episodeId);

        // Update database
        await db
          .update(mediaQueue)
          .set({ status: "failed", errorMessage: "Cancelled by user" })
          .where(
            and(
              eq(mediaQueue.episodeId, input.episodeId),
              eq(mediaQueue.status, "queued")
            )
          );

        return { cancelledCount: cancelled };
      }),

    /**
     * Get pipeline statistics (admin only)
     */
    getPipelineStats: protectedProcedure.query(async ({ ctx }) => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id));

      if (user.length === 0 || user[0].role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return mediaPipeline.getStats();
    }),
  }),

  voice: router({
    /**
     * Process a voice command from a child
     */
    processCommand: protectedProcedure
      .input(
        z.object({
          episodeId: z.number(),
          pageNumber: z.number().int().min(1).max(200),
          command: z.string().min(1).max(500),
          childId: z.number(),
          storyContext: z.object({
            title: z.string().max(500),
            currentPageText: z.string().max(5000),
            previousPages: z.array(z.string().max(5000)).max(50).optional(),
            characters: z.array(z.string().max(200)).max(50),
            setting: z.string().max(1000),
          }),
          childProfile: z.object({
            name: z.string().max(255),
            age: z.number().int().min(0).max(18),
            interests: z.array(z.string().max(200)).max(50).optional(),
            fears: z.array(z.string().max(200)).max(50).optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { processVoiceCommand } = await import("./_core/voiceCommands");
        try {
          const result = await processVoiceCommand({
            command: input.command,
            episodeId: input.episodeId,
            pageNumber: input.pageNumber,
            childId: input.childId,
            storyContext: input.storyContext,
            childProfile: input.childProfile,
          });
          return result;
        } catch (error) {
          console.error("Voice command processing error:", error);
          return {
            type: "error" as const,
            content: "Sorry, I couldn't process that. Try again!",
            spokenText: "Sorry, I couldn't process that. Try again!",
            approved: false,
          };
        }
      }),
  }),

  collaborative: router({
    /**
     * Create a new collaborative session (host initiates)
     */
    createSession: protectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          maxParticipants: z.number().default(4).min(2).max(6),
          turnTimeLimit: z.number().default(120).min(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const {
          createSession: createCollaborativeSession,
          startSession,
        } = await import("./_core/collaborativeSession");

        const session = await createCollaborativeSession(
          ctx.userId,
          input.arcId,
          {
            maxParticipants: input.maxParticipants,
            turnTimeLimit: input.turnTimeLimit,
          }
        );

        return session;
      }),

    /**
     * Join an existing collaborative session using code
     */
    joinSession: protectedProcedure
      .input(
        z.object({
          code: z.string().length(6),
          displayName: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { joinSession: joinCollaborativeSession } = await import(
          "./_core/collaborativeSession"
        );

        const session = await joinCollaborativeSession(
          input.code,
          ctx.userId,
          input.displayName
        );

        return session;
      }),

    /**
     * Get current session state (for polling)
     */
    getSessionState: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const { getSessionState } = await import("./_core/collaborativeSession");
        return await getSessionState(input.sessionId);
      }),

    /**
     * Submit a turn contribution
     */
    submitTurn: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          input: z.string().min(5).max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { submitTurn: submitCollaborativeTurn, getSessionState } = await import(
          "./_core/collaborativeSession"
        );
        const { enhanceTurnInput, updateSegmentWithEnhancement } = await import(
          "./_core/turnProcessor"
        );

        // Get session context
        const session = await getSessionState(input.sessionId);

        // Get child profile for age-appropriate enhancement
        const childId = session.participants.find((p) => p.userId === ctx.userId)?.childId;
        let childAge = 6; // default

        if (childId) {
          const [child] = await db.select().from(children).where(eq(children.id, childId));
          if (child) childAge = child.age;
        }

        // Submit raw turn
        await submitCollaborativeTurn(input.sessionId, ctx.userId, input.input);

        // Get the segment we just created
        const segments = await db
          .select()
          .from(storySegments)
          .where(eq(storySegments.sessionId, input.sessionId));
        const latestSegment = segments[segments.length - 1];

        // Enhance the turn with AI
        try {
          const enhancement = await enhanceTurnInput(
            input.input,
            {
              currentStory: session.storySegments.map((s) => s.text).join("\n\n"),
              theme: "adventure", // TODO: get from arc
              childAge,
              previousSegments: session.storySegments,
            },
            "moderate"
          );

          await updateSegmentWithEnhancement(latestSegment.id, enhancement);
        } catch (error) {
          console.error("Turn enhancement error:", error);
          // Continue even if enhancement fails
        }

        return await getSessionState(input.sessionId);
      }),

    /**
     * Advance to next participant's turn
     */
    advanceTurn: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { advanceTurn, getSessionState } = await import(
          "./_core/collaborativeSession"
        );

        await advanceTurn(input.sessionId);
        return await getSessionState(input.sessionId);
      }),

    /**
     * Start the collaborative session (host only)
     */
    startSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { startSession, getSessionState } = await import(
          "./_core/collaborativeSession"
        );

        await startSession(input.sessionId, ctx.userId);
        return await getSessionState(input.sessionId);
      }),

    /**
     * Skip current turn (host only)
     */
    skipTurn: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { skipTurn, getSessionState } = await import(
          "./_core/collaborativeSession"
        );

        await skipTurn(input.sessionId, ctx.userId);
        return await getSessionState(input.sessionId);
      }),

    /**
     * End the collaborative session
     */
    endSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { endSession, getSessionState } = await import(
          "./_core/collaborativeSession"
        );

        await endSession(input.sessionId);
        return await getSessionState(input.sessionId);
      }),

    /**
     * Leave a collaborative session
     */
    leaveSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { leaveSession } = await import("./_core/collaborativeSession");
        await leaveSession(input.sessionId, ctx.userId);
        return { success: true };
      }),

    /**
     * Save completed collaborative story to library
     */
    saveStory: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getSessionState } = await import("./_core/collaborativeSession");
        const { mergeSegmentsIntoStory } = await import("./_core/turnProcessor");

        const session = await getSessionState(input.sessionId);

        // Verify the user is a participant in this session
        const isParticipant = session.participants?.some(
          (p: any) => p.userId === ctx.userId
        );
        if (!isParticipant) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a participant in this session",
          });
        }

        if (session.status !== "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only save completed sessions",
          });
        }

        // Create a new story arc from the collaborative story
        const mergedText = mergeSegmentsIntoStory(session.storySegments);

        // Insert as a new episode in the arc
        const [result] = await db.insert(episodes).values({
          storyArcId: session.arcId,
          episodeNumber: 1,
          title: "Our Collaborative Story",
          summary: mergedText.substring(0, 500),
          createdAt: new Date(),
        });

        return {
          success: true,
          episodeId: result.insertId,
          title: "Our Collaborative Story",
        };
      }),
  }),

  offline: router({
    /**
     * Get complete story bundle for offline download
     * Includes all episodes, pages, and media URLs
     */
    getStoryBundle: protectedProcedure
      .input(z.object({ arcId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.id, input.arcId),
              eq(storyArcs.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        const arcEpisodes = await db
          .select()
          .from(episodes)
          .where(eq(episodes.storyArcId, input.arcId));

        const episodeBundles = [];

        for (const episode of arcEpisodes) {
          const pageList = await db
            .select()
            .from(pages)
            .where(eq(pages.episodeId, episode.id));

          const pageData = pageList.map((p) => ({
            pageNumber: p.pageNumber,
            text: p.storyText,
            imageUrl: p.imageUrl,
            audioUrl: p.audioUrl,
            mood: p.mood,
            characters: p.characters,
          }));

          episodeBundles.push({
            episodeId: episode.id,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            summary: episode.summary,
            pages: pageData,
            musicUrl: episode.musicUrl,
            fullAudioUrl: episode.fullAudioUrl,
          });
        }

        return {
          arcId: arc.id,
          userId: arc.userId,
          title: arc.title,
          theme: arc.theme,
          coverImageUrl: arc.coverImageUrl,
          synopsis: arc.synopsis,
          episodes: episodeBundles,
        };
      }),

    /**
     * Get single episode bundle with all assets
     */
    getEpisodeBundle: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [episode] = await db
          .select()
          .from(episodes)
          .where(eq(episodes.id, input.episodeId))
          .limit(1);

        if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

        const [arc] = await db
          .select()
          .from(storyArcs)
          .where(eq(storyArcs.id, episode.storyArcId))
          .limit(1);

        if (!arc || arc.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const pageList = await db
          .select()
          .from(pages)
          .where(eq(pages.episodeId, input.episodeId));

        return {
          episodeId: episode.id,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          summary: episode.summary,
          pages: pageList.map((p) => ({
            pageNumber: p.pageNumber,
            text: p.storyText,
            imageUrl: p.imageUrl,
            audioUrl: p.audioUrl,
            mood: p.mood,
            characters: p.characters,
          })),
          musicUrl: episode.musicUrl,
          fullAudioUrl: episode.fullAudioUrl,
        };
      }),

    /**
     * Check if offline stories have updates available
     */
    checkUpdates: protectedProcedure
      .input(z.object({ arcIds: z.array(z.number()) }))
      .query(async ({ input, ctx }) => {
        const arcs = await db
          .select()
          .from(storyArcs)
          .where(
            and(
              eq(storyArcs.userId, ctx.user.id)
            )
          );

        const updates: Record<number, { hasUpdate: boolean; newEpisodes: number }> = {};

        for (const arcId of input.arcIds) {
          const arc = arcs.find((a) => a.id === arcId);
          if (!arc) continue;

          const episodes = await db
            .select()
            .from(episodes)
            .where(eq(episodes.storyArcId, arcId));

          // Check if there are episodes beyond what was likely downloaded
          updates[arcId] = {
            hasUpdate: episodes.length > 5, // Arbitrary threshold
            newEpisodes: Math.max(0, episodes.length - 5),
          };
        }

        return updates;
      }),

    /**
     * Report offline reading activity for analytics
     */
    reportUsage: protectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          episodeId: z.number(),
          readDurationMs: z.number(),
          readOffline: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // Record the activity using gamification system
          const child = await db
            .select()
            .from(children)
            .where(eq(children.userId, ctx.user.id))
            .limit(1);

          if (child.length > 0) {
            await recordActivity(child[0].id, {
              type: "story_reading",
              arcId: input.arcId,
              episodeId: input.episodeId,
              durationMs: input.readDurationMs,
              offline: input.readOffline,
            });
          }

          return { success: true };
        } catch (error) {
          console.error("Failed to report usage:", error);
          return { success: false };
        }
      }),
  }),

  sharing: router({
    /**
     * Generate share card data for a story
     */
    generateShareCard: protectedProcedure
      .input(z.object({ arcId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { generateShareCard } = await import("./_core/sharingService");
        return await generateShareCard(input.arcId);
      }),

    /**
     * Create a unique shareable link for a story
     */
    createShareLink: protectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          privacyLevel: z.enum(["private", "link_only", "public"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { generateShareLink } = await import("./_core/sharingService");
        return await generateShareLink(input.arcId, ctx.user.id, {
          privacyLevel: input.privacyLevel as any,
        });
      }),

    /**
     * Publish a story to the public gallery
     */
    publishToGallery: protectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          privacyLevel: z.enum(["link_only", "public"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { publishToGallery } = await import("./_core/sharingService");
        return await publishToGallery(input.arcId, ctx.user.id);
      }),

    /**
     * Remove a story from the public gallery
     */
    unpublishFromGallery: protectedProcedure
      .input(z.object({ arcId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { unpublishFromGallery } = await import("./_core/sharingService");
        return await unpublishFromGallery(input.arcId, ctx.user.id);
      }),

    /**
     * Get paginated gallery stories with filtering
     */
    getGalleryStories: publicProcedure
      .input(
        z.object({
          theme: z.string().optional(),
          ageGroup: z.string().optional(),
          sortBy: z.enum(["popular", "recent", "liked"]).optional().default("recent"),
          searchQuery: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const { getGalleryStories } = await import("./_core/sharingService");
        return await getGalleryStories(input);
      }),

    /**
     * Like or unlike a story
     */
    likeStory: protectedProcedure
      .input(z.object({ arcId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { likeStory } = await import("./_core/sharingService");
        return await likeStory(input.arcId, ctx.user.id);
      }),

    /**
     * Report a story for moderation
     */
    reportStory: protectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          reason: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { reportStory } = await import("./_core/sharingService");
        return await reportStory(input.arcId, ctx.user.id, input.reason);
      }),

    /**
     * Get sharing analytics for a story
     */
    getShareAnalytics: protectedProcedure
      .input(z.object({ arcId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getShareAnalytics } = await import("./_core/sharingService");
        return await getShareAnalytics(input.arcId, ctx.user.id);
      }),

    /**
     * Get user's shared stories
     */
    getMySharedStories: protectedProcedure
      .query(async ({ ctx }) => {
        const { getMySharedStories } = await import("./_core/sharingService");
        return await getMySharedStories(ctx.user.id);
      }),

    /**
     * Get a shared story by share code (public access, records view)
     */
    getSharedStoryByCode: publicProcedure
      .input(z.object({ shareCode: z.string().min(1).max(32) }))
      .query(async ({ input, ctx }) => {
        // Rate limit: max 10 share code lookups per minute per IP
        checkRateLimit(getRateLimitKey(ctx, "share_lookup"), 10, 60_000);
        const { getSharedStoryByCode } = await import("./_core/sharingService");
        return await getSharedStoryByCode(input.shareCode);
      }),
  }),

  admin: router({
    /**
     * Get detailed health status (authenticated admin only)
     */
    getHealth: adminProcedure.query(async () => {
      const { healthMonitor } = await import("./_core/healthMonitor");
      return await healthMonitor.getHealth();
    }),

    /**
     * Get request metrics (authenticated admin only)
     */
    getMetrics: adminProcedure.query(async () => {
      const { healthMonitor } = await import("./_core/healthMonitor");
      return healthMonitor.getMetrics();
    }),

    /**
     * Get rate limit status for a user (authenticated admin only)
     */
    getRateLimitStatus: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const { rateLimiter } = await import("./_core/rateLimiter");
        return {
          free_story_generation: rateLimiter.getRemainingQuota(
            input.userId,
            "free",
            "story_generation"
          ),
          free_api_general: rateLimiter.getRemainingQuota(input.userId, "free", "api_general"),
          monthly_story_generation: rateLimiter.getRemainingQuota(
            input.userId,
            "monthly",
            "story_generation"
          ),
          monthly_api_general: rateLimiter.getRemainingQuota(
            input.userId,
            "monthly",
            "api_general"
          ),
          yearly_story_generation: rateLimiter.getRemainingQuota(
            input.userId,
            "yearly",
            "story_generation"
          ),
          yearly_api_general: rateLimiter.getRemainingQuota(input.userId, "yearly", "api_general"),
          family_story_generation: rateLimiter.getRemainingQuota(
            input.userId,
            "family",
            "story_generation"
          ),
          family_api_general: rateLimiter.getRemainingQuota(input.userId, "family", "api_general"),
        };
      }),

    /**
     * Get database pool status (authenticated admin only)
     */
    getPoolStatus: adminProcedure.query(async () => {
      const { databasePool } = await import("./_core/dbPool");
      const status = await databasePool.getStatus();
      const health = await databasePool.healthCheck();
      return {
        ...status,
        health,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
