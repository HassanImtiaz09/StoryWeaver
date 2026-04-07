import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import {
  generateEpisodeWithClaude,
  generateRecommendations,
  generateStoryArcWithClaude,
  type ChildProfile,
} from "./_core/claudeStoryEngine";
import { generatePageAudio, getVoiceQuota } from "./_core/elevenlabs";
import * as db from "./db";

function toChildProfile(child: {
  name: string; age: number; gender?: string | null;
  interests?: string | null; hairColor?: string | null; skinTone?: string | null;
  favoriteColor?: string | null; personalityTraits?: string | null;
  fears?: string | null; readingLevel?: string | null; language?: string | null;
}): ChildProfile {
  return {
    name: child.name, age: child.age,
    gender: child.gender ?? undefined,
    interests: child.interests ? JSON.parse(child.interests) : [],
    hairColor: child.hairColor ?? undefined,
    skinTone: child.skinTone ?? undefined,
    favoriteColor: child.favoriteColor ?? undefined,
    personalityTraits: child.personalityTraits ? JSON.parse(child.personalityTraits) : undefined,
    fears: child.fears ? JSON.parse(child.fears) : undefined,
    readingLevel: child.readingLevel ?? undefined,
    language: child.language ?? undefined,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  children: router({
    list: protectedProcedure.query(({ ctx }) => db.getChildren(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => db.getChild(input.id, ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100), age: z.number().min(2).max(12),
        gender: z.string().optional(), hairColor: z.string().optional(), skinTone: z.string().optional(),
        interests: z.array(z.string()).optional(),
        favoriteColor: z.string().optional(), personalityTraits: z.array(z.string()).optional(),
        fears: z.array(z.string()).optional(), readingLevel: z.string().optional(), language: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createChild({
          userId: ctx.user.id, name: input.name, age: input.age,
          gender: input.gender ?? null, hairColor: input.hairColor ?? null, skinTone: input.skinTone ?? null,
          interests: input.interests ? JSON.stringify(input.interests) : null,
          favoriteColor: input.favoriteColor ?? null,
          personalityTraits: input.personalityTraits ? JSON.stringify(input.personalityTraits) : null,
          fears: input.fears ? JSON.stringify(input.fears) : null,
          readingLevel: input.readingLevel ?? null, language: input.language ?? "en",
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(), name: z.string().min(1).max(100).optional(), age: z.number().min(2).max(12).optional(),
        gender: z.string().optional(), hairColor: z.string().optional(), skinTone: z.string().optional(),
        interests: z.array(z.string()).optional(), favoriteColor: z.string().optional(),
        personalityTraits: z.array(z.string()).optional(), fears: z.array(z.string()).optional(),
        readingLevel: z.string().optional(), language: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, interests, personalityTraits, fears, ...rest } = input;
        await db.updateChild(id, ctx.user.id, {
          ...rest,
          ...(interests ? { interests: JSON.stringify(interests) } : {}),
          ...(personalityTraits ? { personalityTraits: JSON.stringify(personalityTraits) } : {}),
          ...(fears ? { fears: JSON.stringify(fears) } : {}),
        });
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteChild(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  storyArcs: router({
    list: protectedProcedure.query(({ ctx }) => db.getStoryArcs(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => db.getStoryArc(input.id, ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        childId: z.number(), theme: z.string(), educationalValue: z.string(),
        totalEpisodes: z.number().min(3).max(15).default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await db.getChild(input.childId, ctx.user.id);
        if (!child) throw new Error("Child not found");
        const childProfile = toChildProfile(child);
        const arcData = await generateStoryArcWithClaude(childProfile, input.theme, input.educationalValue);

        let coverImageUrl: string | null = null;
        try {
          const imageResult = await generateImage({
            prompt: `A beautiful children's book cover illustration for "${arcData.title}". Theme: ${input.theme}. Warm, magical watercolor style. Features a ${child.age}-year-old child hero${child.hairColor ? " with " + child.hairColor + " hair" : ""}${child.skinTone ? " and " + child.skinTone + " skin" : ""} in a ${input.theme} setting. Golden stars and moonlight. No text.`,
          });
          coverImageUrl = imageResult.url ?? null;
        } catch (e) { console.error("Failed to generate cover image:", e); }

        const id = await db.createStoryArc({
          userId: ctx.user.id, childId: input.childId,
          title: arcData.title || `${child.name}'s ${input.theme} Adventure`,
          theme: input.theme, educationalValue: input.educationalValue,
          totalEpisodes: input.totalEpisodes, currentEpisode: 0, coverImageUrl,
          synopsis: arcData.synopsis || "A magical adventure awaits...",
        });
        return { id, title: arcData.title, synopsis: arcData.synopsis, coverImageUrl };
      }),
  }),

  episodes: router({
    list: protectedProcedure.input(z.object({ storyArcId: z.number() })).query(({ input }) => db.getEpisodes(input.storyArcId)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getEpisode(input.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markEpisodeRead(input.id);
      return { success: true };
    }),
    generate: protectedProcedure
      .input(z.object({ storyArcId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const arc = await db.getStoryArc(input.storyArcId, ctx.user.id);
        if (!arc) throw new Error("Story arc not found");
        const child = await db.getChild(arc.childId, ctx.user.id);
        if (!child) throw new Error("Child not found");

        const nextEpisodeNum = arc.currentEpisode + 1;
        if (nextEpisodeNum > arc.totalEpisodes) throw new Error("Story arc is complete");

        const prevEpisodes = await db.getEpisodes(arc.id);
        const previousSummaries = prevEpisodes.map((ep) => `${ep.title} - ${ep.summary}`);
        const childProfile = toChildProfile(child);

        const episodeData = await generateEpisodeWithClaude(childProfile, {
          title: arc.title, theme: arc.theme, educationalValue: arc.educationalValue,
          synopsis: arc.synopsis || "", totalEpisodes: arc.totalEpisodes,
          currentEpisode: arc.currentEpisode, previousEpisodeSummaries: previousSummaries,
        }, nextEpisodeNum);

        let coverImageUrl: string | null = null;
        try {
          const coverResult = await generateImage({
            prompt: `Children's book illustration for "${episodeData.title}". ${episodeData.pages?.[0]?.imagePrompt || "A scene from a " + arc.theme + " adventure"}. Warm watercolor style, magical atmosphere. No text.`,
          });
          coverImageUrl = coverResult.url ?? null;
        } catch (e) { console.error("Failed to generate episode cover:", e); }

        const episodeId = await db.createEpisode({
          storyArcId: arc.id, episodeNumber: nextEpisodeNum,
          title: episodeData.title || `Episode ${nextEpisodeNum}`,
          summary: episodeData.summary || "", coverImageUrl: coverImageUrl ?? null,
        });

        const pagesData = (episodeData.pages || []).map((page: { text: string; imagePrompt: string; mood?: string }, idx: number) => ({
          episodeId, pageNumber: idx + 1, storyText: page.text, imagePrompt: page.imagePrompt,
          imageUrl: null, audioUrl: null, audioDurationMs: null,
          mood: page.mood || "calm",
          characters: episodeData.characters ? JSON.stringify(episodeData.characters) : null,
        }));
        if (pagesData.length > 0) await db.createPages(pagesData);

        await db.updateStoryArc(arc.id, {
          currentEpisode: nextEpisodeNum,
          ...(nextEpisodeNum >= arc.totalEpisodes ? { status: "completed" } : {}),
        });

        return {
          id: episodeId, episodeNumber: nextEpisodeNum, title: episodeData.title,
          summary: episodeData.summary, coverImageUrl, pageCount: pagesData.length,
          characters: episodeData.characters,
        };
      }),
  }),

  pages: router({
    list: protectedProcedure.input(z.object({ episodeId: z.number() })).query(({ input }) => db.getPages(input.episodeId)),
    generateImage: protectedProcedure
      .input(z.object({ pageId: z.number(), episodeId: z.number() }))
      .mutation(async ({ input }) => {
        const pageList = await db.getPages(input.episodeId);
        const page = pageList.find((p) => p.id === input.pageId);
        if (!page) throw new Error("Page not found");
        if (page.imageUrl) return { imageUrl: page.imageUrl };
        try {
          const result = await generateImage({
            prompt: `${page.imagePrompt || "A magical children's book illustration"}. Style: warm watercolor, dreamy, golden moonlight. No text.`,
          });
          const dbInst = await db.getDb();
          if (dbInst) {
            const { pages: pagesTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInst.update(pagesTable).set({ imageUrl: result.url }).where(eq(pagesTable.id, input.pageId));
          }
          return { imageUrl: result.url };
        } catch (e) { console.error("Failed to generate page image:", e); return { imageUrl: null }; }
      }),
    generateAudio: protectedProcedure
      .input(z.object({ pageId: z.number(), episodeId: z.number() }))
      .mutation(async ({ input }) => {
        const pageList = await db.getPages(input.episodeId);
        const page = pageList.find((p) => p.id === input.pageId);
        if (!page) throw new Error("Page not found");
        if (page.audioUrl) return { audioUrl: page.audioUrl, durationMs: page.audioDurationMs || 0 };

        const characters = page.characters
          ? JSON.parse(page.characters).map((c: { name: string; traits: string }) => ({ name: c.name, traits: c.traits }))
          : [];
        try {
          const result = await generatePageAudio(page.storyText, characters, page.id);
          const dbInst = await db.getDb();
          if (dbInst) {
            const { pages: pagesTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInst.update(pagesTable).set({ audioUrl: result.audioUrl, audioDurationMs: result.durationMs }).where(eq(pagesTable.id, input.pageId));
          }
          return { audioUrl: result.audioUrl, durationMs: result.durationMs, segments: result.segments };
        } catch (e) { console.error("Failed to generate page audio:", e); return { audioUrl: null, durationMs: 0 }; }
      }),
  }),

  recommendations: router({
    generate: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const child = await db.getChild(input.childId, ctx.user.id);
        if (!child) throw new Error("Child not found");
        const childProfile = toChildProfile(child);
        const recommendations = await generateRecommendations(childProfile);

        const results = await Promise.allSettled(
          recommendations.map(async (rec) => {
            let imageUrl: string | null = null;
            try { const imageResult = await generateImage({ prompt: rec.imagePrompt }); imageUrl = imageResult.url ?? null; } catch (e) { console.error("Failed to generate recommendation image:", e); }
            const dbInst = await db.getDb();
            if (dbInst) {
              const { storyRecommendations } = await import("../drizzle/schema");
              await dbInst.insert(storyRecommendations).values({
                userId: ctx.user.id, childId: input.childId, title: rec.title, theme: rec.theme,
                educationalValue: rec.educationalValue, synopsis: rec.synopsis, imageUrl,
                imagePrompt: rec.imagePrompt, whyRecommended: rec.whyRecommended, estimatedEpisodes: rec.estimatedEpisodes,
              });
            }
            return { ...rec, imageUrl };
          })
        );
        return results.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled").map((r) => r.value);
      }),
    list: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) return [];
        const { storyRecommendations } = await import("../drizzle/schema");
        const { eq, and, desc } = await import("drizzle-orm");
        return dbInst.select().from(storyRecommendations)
          .where(and(eq(storyRecommendations.userId, ctx.user.id), eq(storyRecommendations.childId, input.childId)))
          .orderBy(desc(storyRecommendations.createdAt)).limit(10);
      }),
  }),

  voice: router({
    quota: protectedProcedure.query(async () => {
      try { return await getVoiceQuota(); } catch (e) { return { characterCount: 0, characterLimit: 0, remainingCharacters: 0 }; }
    }),
  }),
});

export type AppRouter = typeof appRouter;
