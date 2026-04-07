import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
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
} from "./_core/printful";
import { SUBSCRIPTION_TIERS } from "../constants/assets";

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
        // Implementation would go here
        return { userId: 1, email: input.email };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .query(async ({ input }) => {
        // Implementation would go here
        return { token: "placeholder" };
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
          personalityTraits: z.string().optional(),
          fears: z.string().optional(),
          favoriteColor: z.string().optional(),
          readingLevel: z.string().optional(),
          language: z.string().optional(),
          hairColor: z.string().optional(),
          skinTone: z.string().optional(),
          nickname: z.string().optional(),
          favoriteCharacter: z.string().optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.string().optional(),
          sensoryPreferences: z.string().optional(),
          communicationStyle: z.string().optional(),
          storyPacing: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await checkChildLimit(ctx.user.id);
        const [newChild] = await db
          .insert(children)
          .values({
            userId: ctx.user.id,
            ...input,
            interests: input.interests ? JSON.stringify(input.interests) : null,
          })
          .returning();
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
          personalityTraits: z.string().optional(),
          fears: z.string().optional(),
          favoriteColor: z.string().optional(),
          readingLevel: z.string().optional(),
          language: z.string().optional(),
          hairColor: z.string().optional(),
          skinTone: z.string().optional(),
          nickname: z.string().optional(),
          favoriteCharacter: z.string().optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.string().optional(),
          sensoryPreferences: z.string().optional(),
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

        const dataToUpdate = {
          ...updateData,
          interests: updateData.interests
            ? JSON.stringify(updateData.interests)
            : undefined,
        };

        const [updated] = await db
          .update(children)
          .set(dataToUpdate)
          .where(eq(children.id, childId))
          .returning();
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

    generate: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string(),
          customPrompt: z.string().optional(),
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
        const arcData = await generateStoryArcWithClaude(childProfile, input.theme, input.customPrompt);

        const [newArc] = await db
          .insert(storyArcs)
          .values({
            childId: input.childId,
            theme: input.theme,
            title: arcData.title,
            description: arcData.description,
            characterNames: JSON.stringify(arcData.characters || []),
            lessons: JSON.stringify(arcData.lessons || []),
          })
          .returning();

        await db
          .update(users)
          .set({ storiesUsed: (child as any).storiesUsed + 1 })
          .where(eq(users.id, ctx.user.id));

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
        const episodeData = await generateEpisodeWithClaude(
          childProfile,
          arc,
          input.episodeNumber,
          input.customPrompt
        );

        const [newEpisode] = await db
          .insert(episodes)
          .values({
            storyArcId: input.arcId,
            episodeNumber: input.episodeNumber,
            title: episodeData.title,
            summary: episodeData.summary,
            musicMood: episodeData.musicMood ?? null,
          })
          .returning();

        // Insert pages and store sceneDescription and soundEffectHint
        for (const pageData of episodeData.pages) {
          await db.insert(pages).values({
            episodeId: newEpisode.id,
            pageNumber: pageData.pageNumber,
            text: pageData.text,
            imagePrompt: pageData.imagePrompt,
            sceneDescription: pageData.sceneDescription ?? null,
            soundEffectHint: pageData.soundEffectHint ?? null,
          });
        }

        return newEpisode;
      }),

    generateFullAudio: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
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

        // Call generateEpisodeAudio
        const { audioUrl, totalDurationMs, pageTimings } = await generateEpisodeAudio(
          episode,
          pageList
        );

        // Update episode record with audio data
        const [updated] = await db
          .update(episodes)
          .set({
            fullAudioUrl: audioUrl,
            fullAudioDurationMs: totalDurationMs,
            pageTimings: JSON.stringify(pageTimings),
          })
          .where(eq(episodes.id, input.episodeId))
          .returning();

        return { audioUrl, totalDurationMs, pageTimings };
      }),

    generateMusic: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
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

        // Call generateEpisodeMusic
        const { musicUrl, durationMs, title } = await generateEpisodeMusic(
          episode,
          pageList
        );

        // Update episode with music data
        const [updated] = await db
          .update(episodes)
          .set({
            musicUrl,
            musicDurationMs: durationMs,
          })
          .where(eq(episodes.id, input.episodeId))
          .returning();

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

        const imageUrl = await generateImage(page.imagePrompt);
        const [updated] = await db
          .update(pages)
          .set({ imageUrl })
          .where(eq(pages.id, input.pageId))
          .returning();
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

        const audioUrl = await generatePageAudio(page, input.voiceRole as VoiceRole);
        const [updated] = await db
          .update(pages)
          .set({ audioUrl })
          .where(eq(pages.id, input.pageId))
          .returning();
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

        // Call generatePageSoundEffect with page and arc context
        const { effectUrl, durationMs } = await generatePageSoundEffect(page, arc);

        // Update page with sound effect URL
        const [updated] = await db
          .update(pages)
          .set({ soundEffectUrl: effectUrl })
          .where(eq(pages.id, input.pageId))
          .returning();

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
            childId: input.childId,
            title: rec.title,
            description: rec.description,
            imagePrompt: rec.imagePrompt,
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
              eq(storyRecommendations.imageUrl, null)
            )
          );

        let generated = 0;

        // Generate image for each recommendation
        for (const rec of recs) {
          try {
            const imageUrl = await generateImage(rec.imagePrompt);
            await db
              .update(storyRecommendations)
              .set({ imageUrl })
              .where(eq(storyRecommendations.id, rec.id));
            generated++;
          } catch (error) {
            console.error(`Failed to generate image for recommendation ${rec.id}:`, error);
            // Continue to next recommendation on error
          }
        }

        return { generated };
      }),
  }),

  printOrders: router({
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
          .from(printOrders)
          .where(eq(printOrders.childId, input.childId));
      }),

    get: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(eq(printOrders.id, input.orderId))
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, order.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });
        return order;
      }),

    create: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          arcId: z.number(),
          format: z.enum(["hardcover", "paperback", "ebook"]),
          quantity: z.number().int().min(1),
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

        // Generate book PDF
        const pdfUrl = await generateBookInteriorPdf(input.arcId);

        // Create order
        const [order] = await db
          .insert(printOrders)
          .values({
            childId: input.childId,
            storyArcId: input.arcId,
            format: input.format,
            quantity: input.quantity,
            status: "pending",
            printfulOrderId: null,
            pdfUrl,
          })
          .returning();

        return order;
      }),

    initiateCheckout: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(eq(printOrders.id, input.orderId))
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, order.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        const price = await calculateBookPrice(order.format, order.quantity);
        const shippingRates = await getShippingRates();

        return { price, shippingRates };
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
          .where(eq(printOrders.id, input.orderId))
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, order.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        const printfulOrder = await createPrintfulOrder(order, input.shippingAddress, input.shippingMethod);
        const confirmed = await confirmPrintfulOrder(printfulOrder.id);

        const [updated] = await db
          .update(printOrders)
          .set({
            status: "confirmed",
            printfulOrderId: printfulOrder.id,
          })
          .where(eq(printOrders.id, input.orderId))
          .returning();

        return updated;
      }),

    getStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [order] = await db
          .select()
          .from(printOrders)
          .where(eq(printOrders.id, input.orderId))
          .limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, order.childId),
              eq(children.userId, ctx.user.id)
            )
          )
          .limit(1);
        if (!child) throw new TRPCError({ code: "FORBIDDEN" });

        if (!order.printfulOrderId) {
          return { status: order.status };
        }

        const printfulStatus = await getPrintfulOrderStatus(order.printfulOrderId);
        return { status: printfulStatus.status, tracking: printfulStatus.trackingUrl };
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
      .mutation(async ({ input, ctx }) => {
        const audioUrl = await generateSpeech(input.text, input.voiceId);
        return { audioUrl };
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
      .input(z.object({ newPlan: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        const [updated] = await db
          .update(users)
          .set({ subscriptionPlan: input.newPlan })
          .where(eq(users.id, ctx.user.id))
          .returning();

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
  }),
});

export type AppRouter = typeof appRouter;
