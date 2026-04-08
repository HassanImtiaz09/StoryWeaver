import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import { db } from "./db";
import { eq, and, desc, isNull, asc, inArray } from "drizzle-orm";
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
} from "../drizzle/schema";
import { checkParentalConsent, recordParentalConsent, requireConsent, getConsentStatus } from "./_core/coppaConsent";
import { moderateEpisode, aiSafetyCheck, validateChildAge } from "./_core/contentModeration";
import {
  generateEpisodeWithClaude,
  generateStoryArcWithClaude,
  generateRecommendations,
  generatePageImagePrompt,
  type ChildProfile,
  type StoryArcContext,
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
  type BookSpec,
  type PrintfulShippingAddress,
} from "./_core/printful";
import {
  generateBookLayout,
  estimatePageCount,
  validatePrintReady,
  type BookLayout,
} from "./_core/bookLayout";
import {
  calculatePrice,
  getAvailableFormats,
  type PriceBreakdown,
} from "./_core/printPricing";
import { SUBSCRIPTION_TIERS } from "../constants/assets";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { cache, recommendationsCacheKey, voicePreviewCacheKey, generateProfileHash, generateTextHash, CACHE_CONFIG } from "./_core/cache";
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

  auth: router({
    signUp: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input }) => {
        return { userId: 1, email: input.email };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .query(async ({ input }) => {
        return { token: "placeholder" };
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
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db
        .select()
        .from(children)
        .where(eq(children.userId, ctx.user.id));
    }),

    get: protectedProcedure
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

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          age: z.number().int().min(1).max(18),
          gender: z.string().optional(),
          interests: z.array(z.string()).optional(),
          personalityTraits: z.array(z.string()).optional(),
          fears: z.array(z.string()).optional(),
          favoriteColor: z.string().optional(),
          readingLevel: z.string().optional(),
          language: z.string().optional(),
          hairColor: z.string().optional(),
          skinTone: z.string().optional(),
          nickname: z.string().optional(),
          favoriteCharacter: z.string().optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.string().optional(),
          sensoryPreferences: z.array(z.string()).optional(),
          communicationStyle: z.string().optional(),
          storyPacing: z.string().optional(),
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

    update: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          name: z.string().optional(),
          age: z.number().int().optional(),
          gender: z.string().optional(),
          interests: z.array(z.string()).optional(),
          personalityTraits: z.array(z.string()).optional(),
          fears: z.array(z.string()).optional(),
          favoriteColor: z.string().optional(),
          readingLevel: z.string().optional(),
          language: z.string().optional(),
          hairColor: z.string().optional(),
          skinTone: z.string().optional(),
          nickname: z.string().optional(),
          favoriteCharacter: z.string().optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.string().optional(),
          sensoryPreferences: z.array(z.string()).optional(),
          communicationStyle: z.string().optional(),
          storyPacing: z.string().optional(),
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

        await db
          .update(children)
          .set(updateData as any)
          .where(eq(children.id, childId));
        const [updated] = await db.select().from(children).where(eq(children.id, childId)).limit(1);
        return updated;
      }),
  }),

  storyArcs: router({
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
          .from(storyArcs)
          .where(eq(storyArcs.childId, input.childId));
      }),

    get: protectedProcedure
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
    create: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string(),
          customPrompt: z.string().optional(),
          educationalValue: z.string().optional(),
          totalEpisodes: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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
        const arcData = await generateStoryArcWithClaude(childProfile, input.theme, educationalValue, totalEpisodes);

        const result = await db
          .insert(storyArcs)
          .values({
            userId: ctx.user.id,
            childId: input.childId,
            theme: input.theme,
            title: arcData.title,
            synopsis: arcData.synopsis,
            educationalValue,
            totalEpisodes,
          })
          .$returningId();
        const newId = result[0].id;

        await db
          .update(users)
          .set({ storiesUsed: (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0].storiesUsed! + 1 })
          .where(eq(users.id, ctx.user.id));

        const [newArc] = await db.select().from(storyArcs).where(eq(storyArcs.id, newId)).limit(1);
        return newArc;
      }),

    generate: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string(),
          customPrompt: z.string().optional(),
          educationalValue: z.string().optional(),
          totalEpisodes: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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
        const arcData = await generateStoryArcWithClaude(childProfile, input.theme, educationalValue, totalEpisodes);

        const result = await db
          .insert(storyArcs)
          .values({
            userId: ctx.user.id,
            childId: input.childId,
            theme: input.theme,
            title: arcData.title,
            synopsis: arcData.synopsis,
            educationalValue,
            totalEpisodes,
          })
          .$returningId();
        const newId = result[0].id;

        await db
          .update(users)
          .set({ storiesUsed: (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0].storiesUsed! + 1 })
          .where(eq(users.id, ctx.user.id));

        const [newArc] = await db.select().from(storyArcs).where(eq(storyArcs.id, newId)).limit(1);
        return newArc;
      }),
  }),

  episodes: router({
    list: protectedProcedure
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
          .where(eq(episodes.storyArcId, input.arcId));
      }),

    get: protectedProcedure
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

    generate: protectedProcedure
      .input(
        z.object({
          arcId: z.number(),
          episodeNumber: z.number().int(),
          customPrompt: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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

        // Get episode context for narrative continuity
        const episodeContext = await getEpisodeContext(input.arcId, input.episodeNumber);

        // Build story context for new StoryEngine
        const storyContext: StoryContext = {
          child: {
            name: child.nickname ?? child.name,
            age: child.age,
            interests: child.interests ?? [],
            personality: child.personalityTraits?.join(", "),
            fears: child.fears ?? undefined,
          },
          theme: arc.theme,
          storyArc: {
            title: arc.title,
            totalEpisodes: arc.totalEpisodes ?? 5,
            currentEpisode: input.episodeNumber,
          },
          previousEpisodes: episodeContext.previousEpisodes,
          preferences: {
            readingLevel: child.readingLevel ?? undefined,
            tone: "bedtime-friendly",
          },
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

        const epResult = await db
          .insert(episodes)
          .values({
            storyArcId: input.arcId,
            episodeNumber: input.episodeNumber,
            title: episodeData.title,
            summary: episodeData.summary,
            musicMood: episodeData.musicMood ?? null,
          })
          .$returningId();
        const newEpisodeId = epResult[0].id;

        // Insert pages
        for (let pageIdx = 0; pageIdx < episodeData.pages.length; pageIdx++) {
          const pageData = episodeData.pages[pageIdx];
          await db.insert(pages).values({
            episodeId: newEpisodeId,
            pageNumber: pageData.pageNumber ?? pageIdx + 1,
            storyText: pageData.text,
            imagePrompt: pageData.imagePrompt,
            mood: pageData.mood ?? null,
            sceneDescription: null,
            soundEffectHint: null,
          });
        }

        // Log successful moderation
        await db.insert(contentModerationLog).values({
          episodeId: newEpisodeId,
          userId: ctx.user.id,
          childId: child.id,
          contentType: "episode",
          approved: true,
          flaggedItems: null,
          overallSeverity: "safe",
        });

        // Update arc progress
        await updateArcProgress(input.arcId, newEpisodeId);

        const [newEpisode] = await db.select().from(episodes).where(eq(episodes.id, newEpisodeId)).limit(1);
        return newEpisode;
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
        mood: z.string().optional(),
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
          .where(eq(pages.episodeId, input.episodeId));
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
        prompt: z.string().optional(),
      }))
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

        // Get pages for the arc's episodes
        const arcEpisodes = await db.select().from(episodes).where(eq(episodes.storyArcId, input.arcId));
        const allPages = [];
        for (const ep of arcEpisodes) {
          const epPages = await db.select().from(pages).where(eq(pages.episodeId, ep.id));
          allPages.push(...epPages);
        }

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
        address: z.object({
          name: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          city: z.string(),
          stateCode: z.string(),
          zip: z.string(),
          countryCode: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
        }),
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
        address: z.object({
          name: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          city: z.string(),
          stateCode: z.string(),
          zip: z.string(),
          countryCode: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
        }),
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
        const allPages = [];
        for (const ep of arcEpisodes) {
          const epPages = await db.select().from(pages).where(eq(pages.episodeId, ep.id));
          allPages.push(...epPages);
        }

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
          address: z.object({
            name: z.string(),
            address1: z.string(),
            address2: z.string().optional(),
            city: z.string(),
            stateCode: z.string(),
            zip: z.string(),
            countryCode: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
          }),
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
          shippingAddress: z.object({
            name: z.string(),
            address1: z.string(),
            address2: z.string().optional(),
            city: z.string(),
            stateCode: z.string(),
            zip: z.string(),
            countryCode: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
          }),
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
        const allPages = [];
        for (const ep of arcEpisodes) {
          const epPages = await db.select().from(pages).where(eq(pages.episodeId, ep.id));
          allPages.push(...epPages);
        }

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
        .orderBy(desc(shippingAddresses.isDefault));
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
        stripeCustomerId: user.stripeCustomerId,
      };
    }),

    createCheckoutSession: protectedProcedure
      .input(z.object({ planId: z.enum(["monthly", "yearly", "family"]) }))
      .mutation(async ({ input, ctx }) => {
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
    getChildProgress: protectedProcedure
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
    getAchievements: protectedProcedure
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
    recordReading: protectedProcedure
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
    createCustomElement: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          elementType: z.enum(["character", "location", "moral", "pet", "object"]),
          name: z.string().min(1).max(200),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
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
    getCustomElements: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getCustomElements(ctx.user.id, input.childId);
      }),

    /**
     * Delete (soft) a custom element
     */
    deleteCustomElement: protectedProcedure
      .input(z.object({ elementId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await deleteCustomElement(ctx.user.id, input.elementId);
      }),

    /**
     * Update a custom element
     */
    updateCustomElement: protectedProcedure
      .input(
        z.object({
          elementId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
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
    submitForApproval: protectedProcedure
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
    reviewEpisode: protectedProcedure
      .input(
        z.object({
          queueId: z.number(),
          status: z.enum(["approved", "rejected", "edited"]),
          parentNotes: z.string().optional(),
          editedContent: z.record(z.string(), z.unknown()).optional(),
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
    getChildStoryPreferences: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getChildStoryPreferences(ctx.user.id, input.childId);
      }),

    /**
     * Create a parent voice recording
     */
    createVoiceRecording: protectedProcedure
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
    getVoiceRecordings: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getVoiceRecordings(ctx.user.id, input.childId);
      }),

    /**
     * Update voice recording status
     */
    updateVoiceRecordingStatus: protectedProcedure
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
            .where(inArray(mediaQueue.id, retried));
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
