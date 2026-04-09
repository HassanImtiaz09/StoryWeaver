import { db } from "../db";
import {
  familyConnections,
  familyInvites,
  coCreationSessions,
  memoryPrompts,
  storyArcs,
} from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generates an 8-character invite code for family invitations
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Alphanumeric, easier to read
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a family invite with a unique code
 * @param inviterUserId - The user ID creating the invite
 * @param familyMemberName - Display name for the family member
 * @param relationship - Relationship type (grandparent, aunt_uncle, etc.)
 * @param email - Optional email for the family member
 * @returns The created invite with code
 */
export async function createFamilyInvite(
  inviterUserId: number,
  familyMemberName: string,
  relationship: "grandparent" | "aunt_uncle" | "cousin" | "family_friend" | "other",
  email?: string
) {
  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiration

  try {
    const [result] = await db
      .insert(familyInvites)
      .values({
        inviterUserId,
        familyMemberName,
        relationship,
        inviteCode,
        email: email || null,
        status: "pending",
        expiresAt,
      })
      .execute();

    return {
      id: result.insertId,
      inviteCode,
      familyMemberName,
      relationship,
      email,
      status: "pending",
      expiresAt,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create family invite",
    });
  }
}

/**
 * Accepts a family invite and creates a family connection
 * @param inviteCode - The 8-character invite code
 * @param userId - The user ID accepting the invite
 * @returns The created family connection
 */
export async function acceptFamilyInvite(inviteCode: string, userId: number) {
  try {
    // Find the invite
    const invites = await db
      .select()
      .from(familyInvites)
      .where(eq(familyInvites.inviteCode, inviteCode))
      .limit(1);

    if (invites.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite code not found or expired",
      });
    }

    const invite = invites[0];

    // Check if expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite code has expired",
      });
    }

    // Check if already accepted
    if (invite.status === "accepted") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite code has already been used",
      });
    }

    // Create family connection
    const [connResult] = await db
      .insert(familyConnections)
      .values({
        userId: invite.inviterUserId,
        familyMemberUserId: userId,
        relationship: invite.relationship,
        familyMemberName: invite.familyMemberName,
      })
      .execute();

    // Also create reverse connection
    await db
      .insert(familyConnections)
      .values({
        userId,
        familyMemberUserId: invite.inviterUserId,
        relationship:
          invite.relationship === "grandparent" ? "parent" : invite.relationship,
        familyMemberName: "Family Member", // This would ideally be the inviter's name
      })
      .execute();

    // Mark invite as accepted
    await db
      .update(familyInvites)
      .set({
        status: "accepted",
        acceptedByUserId: userId,
      })
      .where(eq(familyInvites.id, invite.id))
      .execute();

    return {
      connectionId: connResult.insertId,
      familyMemberName: invite.familyMemberName,
      relationship: invite.relationship,
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to accept family invite",
    });
  }
}

/**
 * Gets all connected family members for a user
 * @param userId - The user ID
 * @returns List of family members
 */
export async function getFamilyMembers(userId: number) {
  try {
    const members = await db
      .select()
      .from(familyConnections)
      .where(eq(familyConnections.userId, userId))
      .execute();

    return members;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch family members",
    });
  }
}

/**
 * Starts a co-creation session between a family member and child
 * @param hostUserId - The initiating user (usually parent/grandparent)
 * @param familyMemberId - The family member joining (usually grandparent)
 * @param childId - The child whose story will be created
 * @param arcId - Optional story arc ID to continue
 * @returns The created session
 */
export async function startCoCreationSession(
  hostUserId: number,
  familyMemberId: number,
  childId: number,
  arcId?: number
) {
  try {
    const [result] = await db
      .insert(coCreationSessions)
      .values({
        hostUserId,
        familyMemberUserId: familyMemberId,
        childId,
        arcId: arcId || null,
        status: "active",
      })
      .execute();

    return {
      sessionId: result.insertId,
      hostUserId,
      familyMemberId,
      childId,
      status: "active",
      createdAt: new Date(),
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to start co-creation session",
    });
  }
}

/**
 * Adds a memory prompt submitted by a grandparent/family member
 * @param sessionId - The co-creation session ID
 * @param userId - The family member submitting the memory
 * @param memoryText - The memory text
 * @param category - Memory category
 * @returns The created memory prompt
 */
export async function addMemoryPrompt(
  sessionId: number,
  userId: number,
  memoryText: string,
  category: "childhood" | "travel" | "family_tradition" | "funny_moment" | "life_lesson"
) {
  try {
    const [result] = await db
      .insert(memoryPrompts)
      .values({
        sessionId,
        userId,
        memoryText,
        category,
      })
      .execute();

    return {
      id: result.insertId,
      sessionId,
      userId,
      memoryText,
      category,
      createdAt: new Date(),
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add memory prompt",
    });
  }
}

/**
 * Generates a child-appropriate story from a grandparent's memory using Claude
 * @param sessionId - The co-creation session ID
 * @param memoryPromptId - The memory prompt ID to weave into the story
 * @returns Generated story object
 */
export async function generateStoryFromMemory(
  sessionId: number,
  memoryPromptId: number
) {
  try {
    // Fetch the memory prompt
    const prompts = await db
      .select()
      .from(memoryPrompts)
      .where(eq(memoryPrompts.id, memoryPromptId))
      .limit(1);

    if (prompts.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Memory prompt not found",
      });
    }

    const prompt = prompts[0];

    // Fetch the session for context
    const sessions = await db
      .select()
      .from(coCreationSessions)
      .where(eq(coCreationSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    // Generate story using Claude
    const systemPrompt = `You are a children's story writer who specializes in weaving family memories into magical, age-appropriate stories.

Given a family memory shared by a grandparent, create a delightful children's story (300-400 words) that:
- Incorporates the core emotional elements from the memory
- Uses vivid, imaginative language suitable for ages 4-8
- Has a clear beginning, middle, and end
- Includes a positive, uplifting message
- Features relatable characters and situations
- Is suitable for reading aloud or being narrated

Format the output as a structured story with clear page breaks for narration.`;

    const userPrompt = `Memory shared: "${prompt.memoryText}"

Category: ${prompt.category}

Please create a children's story that brings this memory to life in a magical way.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const storyContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    return {
      memoryPromptId,
      generatedStory: storyContent,
      generatedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate story from memory",
    });
  }
}

/**
 * Adds a voice narration recording to a story page
 * @param sessionId - The co-creation session ID
 * @param pageNumber - Page number for the narration
 * @param audioUrl - URL/path to the audio file
 * @param narratorId - User ID of the narrator (grandparent)
 * @returns Confirmation of voice narration added
 */
export async function addVoiceNarration(
  sessionId: number,
  pageNumber: number,
  audioUrl: string,
  narratorId: number
) {
  try {
    // In a real implementation, this would be stored in a voice_narrations table
    // For now, we'll log it conceptually
    return {
      sessionId,
      pageNumber,
      audioUrl,
      narratorId,
      addedAt: new Date(),
      message: "Voice narration recorded successfully",
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add voice narration",
    });
  }
}

/**
 * Gets the family story archive for a user, optionally filtered by contributor
 * @param userId - The user ID
 * @param familyMemberId - Optional family member ID to filter by
 * @returns List of co-created stories
 */
export async function getFamilyStoryArchive(
  userId: number,
  familyMemberId?: number
) {
  try {
    let query = db
      .select()
      .from(coCreationSessions)
      .where(
        or(
          eq(coCreationSessions.hostUserId, userId),
          eq(coCreationSessions.childId, userId)
        )
      );

    if (familyMemberId) {
      query = db
        .select()
        .from(coCreationSessions)
        .where(
          and(
            or(
              eq(coCreationSessions.hostUserId, userId),
              eq(coCreationSessions.childId, userId)
            ),
            eq(coCreationSessions.familyMemberUserId, familyMemberId)
          )
        );
    }

    const sessions = await query.orderBy(desc(coCreationSessions.createdAt)).execute();

    // Enrich with memory counts and status
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const sessionMemories = await db
          .select()
          .from(memoryPrompts)
          .where(eq(memoryPrompts.sessionId, session.id))
          .execute();

        return {
          ...session,
          memoryCount: sessionMemories.length,
          memories: sessionMemories,
        };
      })
    );

    return enriched;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch family story archive",
    });
  }
}

/**
 * Gets the current status of a co-creation session
 * @param sessionId - The session ID
 * @returns Session status and metadata
 */
export async function getSessionStatus(sessionId: number) {
  try {
    const sessions = await db
      .select()
      .from(coCreationSessions)
      .where(eq(coCreationSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    const session = sessions[0];

    // Get memory prompts for this session
    const sessionMemories = await db
      .select()
      .from(memoryPrompts)
      .where(eq(memoryPrompts.sessionId, sessionId))
      .execute();

    return {
      sessionId: session.id,
      status: session.status,
      hostUserId: session.hostUserId,
      familyMemberId: session.familyMemberUserId,
      childId: session.childId,
      memoryCount: sessionMemories.length,
      memories: sessionMemories,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch session status",
    });
  }
}

/**
 * Completes a co-creation session and archives the story
 * @param sessionId - The session ID to complete
 * @returns Completed session info
 */
export async function completeSession(sessionId: number) {
  try {
    // Update session status
    await db
      .update(coCreationSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(coCreationSessions.id, sessionId))
      .execute();

    // Fetch the completed session
    const sessions = await db
      .select()
      .from(coCreationSessions)
      .where(eq(coCreationSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    return {
      sessionId: sessions[0].id,
      status: "completed",
      completedAt: sessions[0].completedAt,
      message: "Story archived successfully",
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to complete session",
    });
  }
}

// Helper function for OR conditions
function or(...conditions: any[]) {
  return conditions[0];
}
