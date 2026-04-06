import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import * as db from "./db";

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
        name: z.string().min(1).max(100),
        age: z.number().min(2).max(12),
        gender: z.string().optional(),
        hairColor: z.string().optional(),
        skinTone: z.string().optional(),
        interests: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createChild({
          userId: ctx.user.id,
          name: input.name,
          age: input.age,
          gender: input.gender ?? null,
          hairColor: input.hairColor ?? null,
          skinTone: input.skinTone ?? null,
          interests: input.interests ? JSON.stringify(input.interests) : null,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        age: z.number().min(2).max(12).optional(),
        gender: z.string().optional(),
        hairColor: z.string().optional(),
        skinTone: z.string().optional(),
        interests: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, interests, ...rest } = input;
        await db.updateChild(id, ctx.user.id, {
          ...rest,
          ...(interests ? { interests: JSON.stringify(interests) } : {}),
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
        childId: z.number(),
        theme: z.string(),
        educationalValue: z.string(),
        totalEpisodes: z.number().min(3).max(15).default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await db.getChild(input.childId, ctx.user.id);
        if (!child) throw new Error("Child not found");
        const interests = child.interests ? JSON.parse(child.interests) : [];
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are a children's story writer. Create a story arc title and synopsis for a bedtime story series. The story should be age-appropriate for a ${child.age}-year-old named ${child.name}. The theme is "${input.theme}" and the educational value is "${input.educationalValue}". The child's interests include: ${interests.join(", ")}. Return JSON with "title" and "synopsis" fields. The title should be magical and captivating. The synopsis should be 2-3 sentences.` },
            { role: "user", content: "Generate the story arc title and synopsis." },
          ],
          response_format: { type: "json_object" },
        });
        const arcContent = llmResponse.choices[0].message.content;
        const arcData = JSON.parse(typeof arcContent === "string" ? arcContent : "{}");
        let coverImageUrl: string | null = null;
        try {
          const imageResult = await generateImage({ prompt: `A beautiful children's book cover illustration for a bedtime story called "${arcData.title}". Theme: ${input.theme}. Style: warm, magical, whimsical watercolor children's book illustration. Features a child hero in a ${input.theme} setting. Golden stars and moonlight. No text.` });
          coverImageUrl = imageResult.url ?? null;
        } catch (e) { console.error("Failed to generate cover image:", e); }
        const id = await db.createStoryArc({
          userId: ctx.user.id,
          childId: input.childId,
          title: arcData.title || `${child.name}'s ${input.theme} Adventure`,
          theme: input.theme,
          educationalValue: input.educationalValue,
          totalEpisodes: input.totalEpisodes,
          currentEpisode: 0,
          coverImageUrl,
          synopsis: arcData.synopsis || "A magical adventure awaits...",
        });
        return { id, title: arcData.title, synopsis: arcData.synopsis, coverImageUrl };
      }),
  }),

  episodes: router({
    list: protectedProcedure.input(z.object({ storyArcId: z.number() })).query(({ input }) => db.getEpisodes(input.storyArcId)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getEpisode(input.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.markEpisodeRead(input.id); return { success: true }; }),
    generate: protectedProcedure
      .input(z.object({ storyArcId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const arc = await db.getStoryArc(input.storyArcId, ctx.user.id);
        if (!arc) throw new Error("Story arc not found");
        const child = await db.getChild(arc.childId, ctx.user.id);
        if (!child) throw new Error("Child not found");
        const interests = child.interests ? JSON.parse(child.interests) : [];
        const nextEpisodeNum = arc.currentEpisode + 1;
        if (nextEpisodeNum > arc.totalEpisodes) throw new Error("Story arc is complete");
        const prevEpisodes = await db.getEpisodes(arc.id);
        const previousSummaries = prevEpisodes.map((ep) => `Episode ${ep.episodeNumber}: ${ep.title} - ${ep.summary}`).join("\n");
        const storyResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are a master children's bedtime story writer. Write episode ${nextEpisodeNum} of ${arc.totalEpisodes} for "${arc.title}".\nCHILD: ${child.name}, age ${child.age}, interests: ${interests.join(", ")}\nTHEME: ${arc.theme}\nEDUCATIONAL VALUE: ${arc.educationalValue}\nSYNOPSIS: ${arc.synopsis}\n${previousSummaries ? `PREVIOUS EPISODES:\n${previousSummaries}\n` : ""}\nWrite exactly 6 pages. Each page: 2-3 short paragraphs for a ${child.age}-year-old. Feature ${child.name} as hero. Warm, gentle, bedtime-suitable. Teach ${arc.educationalValue}. ${nextEpisodeNum < arc.totalEpisodes ? "End with gentle cliffhanger" : "Provide satisfying conclusion"}.\nReturn JSON: { "title": "...", "summary": "...", "pages": [{ "text": "...", "imagePrompt": "..." }] }` },
            { role: "user", content: `Generate episode ${nextEpisodeNum} now.` },
          ],
          response_format: { type: "json_object" },
        });
        const storyContent = storyResponse.choices[0].message.content;
        const episodeData = JSON.parse(typeof storyContent === "string" ? storyContent : "{}");
        let coverImageUrl: string | null = null;
        try {
          const coverResult = await generateImage({ prompt: `Children's book illustration for "${episodeData.title}". ${episodeData.pages?.[0]?.imagePrompt || `A scene from a ${arc.theme} adventure`}. Warm watercolor style, magical atmosphere, golden moonlight. No text.` });
          coverImageUrl = coverResult.url ?? null;
        } catch (e) { console.error("Failed to generate episode cover:", e); }
        const episodeId = await db.createEpisode({
          storyArcId: arc.id,
          episodeNumber: nextEpisodeNum,
          title: episodeData.title || `Episode ${nextEpisodeNum}`,
          summary: episodeData.summary || "",
          coverImageUrl: coverImageUrl ?? null,
        });
        const pagesData = (episodeData.pages || []).map((page: { text: string; imagePrompt: string }, idx: number) => ({
          episodeId,
          pageNumber: idx + 1,
          storyText: page.text,
          imagePrompt: page.imagePrompt,
          imageUrl: null,
        }));
        if (pagesData.length > 0) await db.createPages(pagesData);
        await db.updateStoryArc(arc.id, {
          currentEpisode: nextEpisodeNum,
          ...(nextEpisodeNum >= arc.totalEpisodes ? { status: "completed" } : {}),
        });
        return { id: episodeId, episodeNumber: nextEpisodeNum, title: episodeData.title, summary: episodeData.summary, coverImageUrl, pageCount: pagesData.length };
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
          const result = await generateImage({ prompt: `${page.imagePrompt || "A magical children's book illustration"}. Style: warm watercolor, dreamy, golden moonlight, bedtime story atmosphere. No text.` });
          const dbInst = await db.getDb();
          if (dbInst) {
            const { pages: pagesTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInst.update(pagesTable).set({ imageUrl: result.url }).where(eq(pagesTable.id, input.pageId));
          }
          return { imageUrl: result.url };
        } catch (e) {
          console.error("Failed to generate page image:", e);
          return { imageUrl: null };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
