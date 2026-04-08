import { router, protectedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import {
  getSelTemplates,
  getSelCompetencies,
  generateSelStory,
  assessEmotionalResponse,
  getSelProgress,
  getRecommendedTemplates,
  createCustomSelTemplate,
  getSelInsights,
  initializeBuiltinTemplates,
} from "./selService";

type Competency =
  | "self_awareness"
  | "self_management"
  | "social_awareness"
  | "relationship_skills"
  | "responsible_decision_making";

export const selRouter = router({
  /**
   * Get all SEL templates, optionally filtered by competency and age range
   */
  getTemplates: publicProcedure
    .input(
      z.object({
        competency: z.enum([
          "self_awareness",
          "self_management",
          "social_awareness",
          "relationship_skills",
          "responsible_decision_making",
        ] as const).optional(),
        ageMin: z.number().optional(),
        ageMax: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      await initializeBuiltinTemplates();
      return getSelTemplates(
        input.competency,
        input.ageMin && input.ageMax
          ? { min: input.ageMin, max: input.ageMax }
          : undefined
      );
    }),

  /**
   * Get the 5 CASEL competencies with descriptions
   */
  getCompetencies: publicProcedure.query(async () => {
    return getSelCompetencies();
  }),

  /**
   * Generate an AI-powered SEL story based on a template
   */
  generateStory: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        childId: z.number(),
        childName: z.string(),
        childAge: z.number(),
        customization: z
          .object({
            theme: z.string().optional(),
            characterName: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      return generateSelStory(
        input.templateId,
        input.childId,
        input.childName,
        input.childAge,
        input.customization
      );
    }),

  /**
   * Submit emotional check-in response after reading a story
   */
  submitResponse: protectedProcedure
    .input(
      z.object({
        childId: z.number(),
        templateId: z.number(),
        emotionFelt: z.string(),
        emotionIntensity: z.number().min(1).max(5),
        reflection: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return assessEmotionalResponse(
        input.childId,
        input.templateId,
        input.emotionFelt,
        input.emotionIntensity,
        input.reflection
      );
    }),

  /**
   * Get child's SEL progress across all competencies
   */
  getProgress: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ input }) => {
      return getSelProgress(input.childId);
    }),

  /**
   * Get recommended templates based on child's profile and progress
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        childId: z.number(),
        childAge: z.number(),
        childName: z.string(),
      })
    )
    .query(async ({ input }) => {
      return getRecommendedTemplates(
        input.childId,
        input.childAge,
        input.childName
      );
    }),

  /**
   * Create a custom SEL template (for therapists/parents)
   */
  createTemplate: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        competency: z.enum([
          "self_awareness",
          "self_management",
          "social_awareness",
          "relationship_skills",
          "responsible_decision_making",
        ] as const),
        ageRangeMin: z.number(),
        ageRangeMax: z.number(),
        difficulty: z.enum(["gentle", "moderate", "challenging"]),
        promptTemplate: z.string(),
        emotionalGoals: z.array(z.string()),
        iconEmoji: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }
      return createCustomSelTemplate(ctx.userId, input as any);
    }),

  /**
   * Get parent-facing insights on child's emotional growth
   */
  getInsights: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ input }) => {
      return getSelInsights(input.childId);
    }),
});
