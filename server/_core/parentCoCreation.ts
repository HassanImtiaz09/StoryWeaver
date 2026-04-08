import { db } from "../db";
import {
  customStoryElements,
  parentVoiceRecordings,
  storyApprovalQueue,
  episodes,
  children,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Creates a custom story element for a child
 */
export async function createCustomElement(
  userId: number,
  childId: number,
  elementType: string,
  name: string,
  description?: string,
  imageUrl?: string
) {
  // Verify child belongs to user
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.userId, userId)))
    .limit(1);

  if (!child) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Child profile not found",
    });
  }

  const [element] = await db
    .insert(customStoryElements)
    .values({
      userId,
      childId,
      elementType,
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      isActive: true,
    })
    .$returningId();

  return element;
}

/**
 * Gets all active custom elements for a child
 */
export async function getCustomElements(userId: number, childId: number) {
  // Verify child belongs to user
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.userId, userId)))
    .limit(1);

  if (!child) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Child profile not found",
    });
  }

  const elements = await db
    .select()
    .from(customStoryElements)
    .where(
      and(
        eq(customStoryElements.userId, userId),
        eq(customStoryElements.childId, childId),
        eq(customStoryElements.isActive, true)
      )
    )
    .orderBy(desc(customStoryElements.createdAt));

  return elements;
}

/**
 * Soft-deletes a custom element
 */
export async function deleteCustomElement(userId: number, elementId: number) {
  const [element] = await db
    .select()
    .from(customStoryElements)
    .where(
      and(
        eq(customStoryElements.id, elementId),
        eq(customStoryElements.userId, userId)
      )
    )
    .limit(1);

  if (!element) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Element not found",
    });
  }

  await db
    .update(customStoryElements)
    .set({ isActive: false })
    .where(eq(customStoryElements.id, elementId));

  return { success: true };
}

/**
 * Updates a custom element
 */
export async function updateCustomElement(
  userId: number,
  elementId: number,
  updates: {
    name?: string;
    description?: string;
    imageUrl?: string;
  }
) {
  const [element] = await db
    .select()
    .from(customStoryElements)
    .where(
      and(
        eq(customStoryElements.id, elementId),
        eq(customStoryElements.userId, userId)
      )
    )
    .limit(1);

  if (!element) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Element not found",
    });
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;

  if (Object.keys(updateData).length === 0) {
    return element;
  }

  await db
    .update(customStoryElements)
    .set(updateData)
    .where(eq(customStoryElements.id, elementId));

  return { ...element, ...updateData };
}

/**
 * Submits an episode for parent approval
 */
export async function submitForApproval(
  userId: number,
  childId: number,
  episodeId: number
) {
  // Verify child belongs to user and episode exists
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.userId, userId)))
    .limit(1);

  if (!child) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Child profile not found",
    });
  }

  const [episode] = await db
    .select()
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1);

  if (!episode) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Episode not found",
    });
  }

  // Check if already in queue
  const [existingQueue] = await db
    .select()
    .from(storyApprovalQueue)
    .where(
      and(
        eq(storyApprovalQueue.episodeId, episodeId),
        eq(storyApprovalQueue.status, "pending")
      )
    )
    .limit(1);

  if (existingQueue) {
    return existingQueue;
  }

  const [queueItem] = await db
    .insert(storyApprovalQueue)
    .values({
      userId,
      childId,
      episodeId,
      status: "pending",
    })
    .$returningId();

  return queueItem;
}

/**
 * Reviews an episode in the approval queue
 */
export async function reviewEpisode(
  userId: number,
  queueId: number,
  status: "approved" | "rejected" | "edited",
  parentNotes?: string,
  editedContent?: Record<string, unknown>
) {
  const [queueItem] = await db
    .select()
    .from(storyApprovalQueue)
    .where(
      and(
        eq(storyApprovalQueue.id, queueId),
        eq(storyApprovalQueue.userId, userId)
      )
    )
    .limit(1);

  if (!queueItem) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Approval queue item not found",
    });
  }

  const updateData: Record<string, unknown> = {
    status,
    reviewedAt: new Date(),
  };

  if (parentNotes !== undefined) {
    updateData.parentNotes = parentNotes;
  }

  if (editedContent !== undefined) {
    updateData.editedContent = editedContent;
  }

  await db
    .update(storyApprovalQueue)
    .set(updateData)
    .where(eq(storyApprovalQueue.id, queueId));

  return { ...queueItem, ...updateData };
}

/**
 * Gets all pending approvals for a parent
 */
export async function getPendingApprovals(userId: number) {
  const pendingItems = await db
    .select()
    .from(storyApprovalQueue)
    .where(
      and(
        eq(storyApprovalQueue.userId, userId),
        eq(storyApprovalQueue.status, "pending")
      )
    )
    .orderBy(desc(storyApprovalQueue.createdAt));

  return pendingItems;
}

/**
 * Gets child story preferences (custom elements formatted for story generation)
 */
export async function getChildStoryPreferences(userId: number, childId: number) {
  const elements = await getCustomElements(userId, childId);

  // Group by element type
  const preferences: Record<string, unknown> = {
    characters: [],
    locations: [],
    morals: [],
    pets: [],
    objects: [],
  };

  elements.forEach((element) => {
    const key = `${element.elementType}s`;
    if (key in preferences) {
      (preferences[key] as Array<unknown>).push({
        id: element.id,
        name: element.name,
        description: element.description,
        imageUrl: element.imageUrl,
      });
    }
  });

  return preferences;
}

/**
 * Creates a parent voice recording
 */
export async function createVoiceRecording(
  userId: number,
  childId: number,
  voiceName: string,
  sampleAudioUrl?: string
) {
  // Verify child belongs to user
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.userId, userId)))
    .limit(1);

  if (!child) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Child profile not found",
    });
  }

  const [recording] = await db
    .insert(parentVoiceRecordings)
    .values({
      userId,
      childId,
      voiceName,
      sampleAudioUrl: sampleAudioUrl || null,
      status: "pending",
    })
    .$returningId();

  return recording;
}

/**
 * Gets voice recordings for a child
 */
export async function getVoiceRecordings(userId: number, childId: number) {
  const recordings = await db
    .select()
    .from(parentVoiceRecordings)
    .where(
      and(
        eq(parentVoiceRecordings.userId, userId),
        eq(parentVoiceRecordings.childId, childId)
      )
    )
    .orderBy(desc(parentVoiceRecordings.createdAt));

  return recordings;
}

/**
 * Updates voice recording status
 */
export async function updateVoiceRecordingStatus(
  userId: number,
  recordingId: number,
  status: "pending" | "processing" | "ready" | "failed",
  voiceModelId?: string
) {
  const [recording] = await db
    .select()
    .from(parentVoiceRecordings)
    .where(
      and(
        eq(parentVoiceRecordings.id, recordingId),
        eq(parentVoiceRecordings.userId, userId)
      )
    )
    .limit(1);

  if (!recording) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Voice recording not found",
    });
  }

  const updateData: Record<string, unknown> = { status };
  if (voiceModelId !== undefined) {
    updateData.voiceModelId = voiceModelId;
  }

  await db
    .update(parentVoiceRecordings)
    .set(updateData)
    .where(eq(parentVoiceRecordings.id, recordingId));

  return { ...recording, ...updateData };
}
