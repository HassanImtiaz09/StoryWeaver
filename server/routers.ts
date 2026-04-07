import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { db } from "./db";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
  users,
  children,
  storyArcs,
  episodes,
  pages,
  storyRecommendations,
  printOrders,
} from "../drizzle/schema";
import {
  generateEpisodeWithClaude,
  generateStoryArcWithClaude,
  generateRecommendations,
  generatePageImagePrompt,
  type ChildProfile,
  type StoryArcContext,
} from "./_core/claudeStoryEngine";
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
import { SUBSCRIPTION_TIERS } from "../constants/assets";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

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
        const cookieOptions = getSessionCookieOptions(req);
        res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return { success: true };
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

        const childProfile = toChildProfile(child);
        const arcContext: StoryArcContext = {
          title: arc.title,
          theme: arc.theme,
          educationalValue: arc.educationalValue ?? "general learning",
          totalEpisodes: arc.totalEpisodes ?? 5,
          currentEpisode: input.episodeNumber,
        };
        const episodeData = await generateEpisodeWithClaude(
          childProfile,
          arcContext,
          input.episodeNumber,
        );

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
            pageNumber: pageIdx + 1,
            storyText: pageData.text,
            imagePrompt: pageData.imagePrompt,
            mood: pageData.mood ?? null,
            sceneDescription: pageData.sceneDescription ?? null,
            soundEffectHint: pageData.soundEffectHint ?? null,
          });
        }

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
        const recommendations = await generateRecommendations(childProfile);

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
      return { plan, tier };
    }),

    upgradePlan: protectedProcedure
      .input(z.object({ newPlan: z.enum(["free", "monthly", "yearly"]) }))
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
      .mutation(async ({ input }) => {
        const voiceEntry = Object.entries(VOICE_PRESETS).find(([, v]) => v.voiceId === input.voiceId);
        const voiceConfig = voiceEntry ? voiceEntry[1] : VOICE_PRESETS.narrator;
        const sampleText = input.text ?? "Once upon a time, in a land far away, there lived a brave little explorer.";
        const audioBuffer = await generateSpeech({ text: sampleText, voiceConfig });
        return { audioUrl: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}` };
      }),
  }),
});

export type AppRouter = typeof appRouter;
