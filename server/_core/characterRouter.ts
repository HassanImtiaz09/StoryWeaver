/**
 * Character API Router
 *
 * Handles all character-related operations:
 * - Photo analysis
 * - Avatar generation
 * - Avatar selection
 * - Character retrieval
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./trpc";
import { db } from "../db";
import { characterAvatars } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  analyzePhoto,
  generateCharacterVariants,
  buildConsistencyPrompt,
  validatePhotoContent,
  type CharacterDescription,
  type GeneratedAvatar,
} from "./characterGenerator";
import { updateConsistencyPrompt, clearCharacterAvatar } from "./characterConsistency";
import { ENV } from "./env";

export const characterRouter = router({
  /**
   * Analyze an uploaded photo to extract facial features
   * Uses Claude's vision capability
   */
  analyzePhoto: protectedProcedure
    .input(
      z.object({
        photoBase64: z.string(),
        childName: z.string(),
        childAge: z.number().min(2).max(13),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validate photo content for safety
        const isSafe = await validatePhotoContent(input.photoBase64);
        if (!isSafe) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Photo does not meet content requirements. Please upload a different photo.",
          });
        }

        // Analyze the photo
        const description = await analyzePhoto(
          input.photoBase64,
          input.childName,
          input.childAge
        );

        return {
          success: true,
          description,
        };
      } catch (error) {
        console.error("Photo analysis failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to analyze photo",
        });
      }
    }),

  /**
   * Generate multiple avatar variants from a photo
   */
  generateAvatars: protectedProcedure
    .input(
      z.object({
        photoBase64: z.string(),
        artStyle: z.enum([
          "watercolor",
          "cartoon",
          "anime",
          "storybook-classic",
          "pixel-art",
        ]),
        childName: z.string(),
        childAge: z.number().min(2).max(13).optional(),
        count: z.number().min(1).max(4).default(3),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Analyze the photo first
        const description = await analyzePhoto(
          input.photoBase64,
          input.childName,
          input.childAge || 8
        );

        // Generate variants
        const variants = await generateCharacterVariants(
          description,
          input.artStyle,
          input.childName,
          input.count
        );

        return {
          success: true,
          variants: variants.map((v) => ({
            id: v.id,
            description: v.description,
            portrait: v.variants.portrait,
            fullBody: v.variants.fullBody,
            actionPose: v.variants.actionPose,
          })),
        };
      } catch (error) {
        console.error("Avatar generation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate avatars",
        });
      }
    }),

  /**
   * Select and save a generated avatar for a child
   */
  selectAvatar: protectedProcedure
    .input(
      z.object({
        childId: z.number(),
        avatarId: z.string(),
        description: z.object({
          hairColor: z.string(),
          hairStyle: z.string(),
          skinTone: z.string(),
          eyeColor: z.string(),
          expression: z.string(),
          distinguishingFeatures: z.array(z.string()),
          clothingStyle: z.string(),
          ageGroup: z.string(),
          personalityHints: z.array(z.string()),
        }),
        artStyle: z.string(),
        variants: z.object({
          portrait: z.string().url(),
          fullBody: z.string().url(),
          actionPose: z.string().url(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the child belongs to this user
        const { children } = await import("../../drizzle/schema");
        const childResult = await db
          .select()
          .from(children)
          .where(eq(children.id, input.childId));

        if (
          childResult.length === 0 ||
          childResult[0].userId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to modify this child's avatar",
          });
        }

        // Build consistency prompt
        const childName = childResult[0].name;
        const consistencyPrompt = buildConsistencyPrompt(
          input.description,
          childName,
          input.artStyle
        );

        // Check if avatar already exists
        const existingAvatar = await db
          .select()
          .from(characterAvatars)
          .where(eq(characterAvatars.childId, input.childId));

        if (existingAvatar.length > 0) {
          // Update existing
          await db
            .update(characterAvatars)
            .set({
              artStyle: input.artStyle,
              description: input.description,
              selectedVariantId: input.avatarId,
              variants: input.variants,
              consistencyPrompt,
              updatedAt: new Date(),
            })
            .where(eq(characterAvatars.childId, input.childId));
        } else {
          // Create new
          await db.insert(characterAvatars).values({
            childId: input.childId,
            artStyle: input.artStyle,
            description: input.description,
            selectedVariantId: input.avatarId,
            variants: input.variants,
            consistencyPrompt,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Update consistency prompt in consistency engine
        await updateConsistencyPrompt(input.childId, consistencyPrompt);

        return {
          success: true,
          message: "Avatar saved successfully",
        };
      } catch (error) {
        console.error("Avatar selection failed:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to save avatar",
        });
      }
    }),

  /**
   * Get the current avatar for a child
   */
  getAvatar: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify authorization
        const { children } = await import("../../drizzle/schema");
        const childResult = await db
          .select()
          .from(children)
          .where(eq(children.id, input.childId));

        if (
          childResult.length === 0 ||
          childResult[0].userId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to view this child's avatar",
          });
        }

        // Get avatar
        const avatar = await db
          .select()
          .from(characterAvatars)
          .where(eq(characterAvatars.childId, input.childId));

        if (avatar.length === 0) {
          return {
            hasAvatar: false,
            avatar: null,
          };
        }

        const av = avatar[0];
        return {
          hasAvatar: true,
          avatar: {
            id: av.id,
            childId: av.childId,
            artStyle: av.artStyle,
            description: av.description,
            variants: av.variants,
            consistencyPrompt: av.consistencyPrompt,
            createdAt: av.createdAt,
            updatedAt: av.updatedAt,
          },
        };
      } catch (error) {
        console.error("Failed to get avatar:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve avatar",
        });
      }
    }),

  /**
   * Get the consistency prompt for injecting character into stories
   */
  getConsistencyPrompt: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify authorization
        const { children } = await import("../../drizzle/schema");
        const childResult = await db
          .select()
          .from(children)
          .where(eq(children.id, input.childId));

        if (
          childResult.length === 0 ||
          childResult[0].userId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized",
          });
        }

        // Get avatar
        const avatar = await db
          .select()
          .from(characterAvatars)
          .where(eq(characterAvatars.childId, input.childId));

        if (avatar.length === 0) {
          return {
            hasCharacter: false,
            consistencyPrompt: null,
          };
        }

        return {
          hasCharacter: true,
          consistencyPrompt: avatar[0].consistencyPrompt,
        };
      } catch (error) {
        console.error("Failed to get consistency prompt:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve consistency prompt",
        });
      }
    }),

  /**
   * Delete a character avatar
   */
  deleteAvatar: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify authorization
        const { children } = await import("../../drizzle/schema");
        const childResult = await db
          .select()
          .from(children)
          .where(eq(children.id, input.childId));

        if (
          childResult.length === 0 ||
          childResult[0].userId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to modify this child's avatar",
          });
        }

        // Delete avatar
        await clearCharacterAvatar(input.childId);

        return {
          success: true,
          message: "Avatar deleted successfully",
        };
      } catch (error) {
        console.error("Avatar deletion failed:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete avatar",
        });
      }
    }),
});
