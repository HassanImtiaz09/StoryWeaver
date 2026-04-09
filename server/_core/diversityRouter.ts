// @ts-nocheck
import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import {
  getDiversityProfile,
  updateDiversityProfile,
  getDiversityCategories,
  generateDiversityPromptInjection,
  getCulturalCalendar,
  DiversityProfile,
  validateCulturalAccuracy,
} from "./diversityService";

const DiversityProfileSchema = z.object({
  ethnicities: z.array(z.string()),
  familyStructures: z.array(z.string()),
  abilities: z.array(z.string()),
  culturalBackgrounds: z.array(z.string()),
  genderExpression: z.array(z.string()),
  bodyTypes: z.array(z.string()),
  languages: z.array(z.string()),
  religiousSpiritual: z.array(z.string()),
  preferMirrorFamily: z.boolean(),
  diversityLevel: z.enum(["mirror_family", "balanced", "maximum_diversity"]),
});

export const diversityRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getDiversityProfile(ctx.userId);
  }),

  updateProfile: protectedProcedure
    .input(DiversityProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return updateDiversityProfile(ctx.userId, input as DiversityProfile);
    }),

  getCategories: protectedProcedure.query(async () => {
    return getDiversityCategories();
  }),

  getPromptInjection: protectedProcedure
    .input(z.object({ childId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const profile = await getDiversityProfile(ctx.userId);
      return generateDiversityPromptInjection(profile, input.childId);
    }),

  getCulturalCalendar: protectedProcedure.query(async () => {
    return getCulturalCalendar();
  }),

  validateStory: protectedProcedure
    .input(
      z.object({
        storyText: z.string(),
        cultures: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      return validateCulturalAccuracy(input.storyText, input.cultures);
    }),
});
