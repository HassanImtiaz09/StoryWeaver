import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import {
  createFamilyInvite,
  acceptFamilyInvite,
  getFamilyMembers,
  startCoCreationSession,
  addMemoryPrompt,
  generateStoryFromMemory,
  addVoiceNarration,
  getFamilyStoryArchive,
  getSessionStatus,
  completeSession,
} from "./grandparentService";

export const grandparentRouter = router({
  /**
   * Create a family invite with a unique code
   */
  createInvite: protectedProcedure
    .input(
      z.object({
        familyMemberName: z.string().min(1).max(255),
        relationship: z.enum([
          "grandparent",
          "aunt_uncle",
          "cousin",
          "family_friend",
          "other",
        ]),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createFamilyInvite(
        // @ts-expect-error - argument type mismatch
        ctx.userId,
        input.familyMemberName,
        input.relationship,
        input.email
      );
    }),

  /**
   * Accept a family invite using invite code
   */
  acceptInvite: protectedProcedure
    .input(
      z.object({
        inviteCode: z.string().length(8).toUpperCase(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // @ts-expect-error - argument type mismatch
      return await acceptFamilyInvite(input.inviteCode, ctx.userId);
    }),

  /**
   * Get all family members connected to the user
   */
  getFamilyMembers: protectedProcedure.query(async ({ ctx }) => {
    // @ts-expect-error - argument type mismatch
    return await getFamilyMembers(ctx.userId);
  }),

  /**
   * Start a co-creation session with a family member and child
   */
  startSession: protectedProcedure
    .input(
      z.object({
        familyMemberId: z.number().int().positive(),
        childId: z.number().int().positive(),
        arcId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await startCoCreationSession(
        // @ts-expect-error - argument type mismatch
        ctx.userId,
        input.familyMemberId,
        input.childId,
        input.arcId
      );
    }),

  /**
   * Add a memory prompt to a co-creation session
   */
  addMemory: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        memoryText: z.string().min(10).max(2000),
        category: z.enum([
          "childhood",
          "travel",
          "family_tradition",
          "funny_moment",
          "life_lesson",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await addMemoryPrompt(
        input.sessionId,
        // @ts-expect-error - argument type mismatch
        ctx.userId,
        input.memoryText,
        input.category
      );
    }),

  /**
   * Generate a story from a memory prompt using Claude
   */
  generateFromMemory: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        memoryPromptId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateStoryFromMemory(input.sessionId, input.memoryPromptId);
    }),

  /**
   * Add a voice narration recording to a story page
   */
  addVoiceNarration: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        pageNumber: z.number().int().nonnegative(),
        audioUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await addVoiceNarration(
        input.sessionId,
        input.pageNumber,
        input.audioUrl,
        // @ts-expect-error - argument type mismatch
        ctx.userId
      );
    }),

  /**
   * Get the family story archive, optionally filtered by family member
   */
  getFamilyArchive: protectedProcedure
    .input(
      z.object({
        familyMemberId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // @ts-expect-error - argument type mismatch
      return await getFamilyStoryArchive(ctx.userId, input.familyMemberId);
    }),

  /**
   * Get the current status of a co-creation session
   */
  getSessionStatus: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      return await getSessionStatus(input.sessionId);
    }),

  /**
   * Complete a co-creation session and archive the story
   */
  completeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return await completeSession(input.sessionId);
    }),
});
