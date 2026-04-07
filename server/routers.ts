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
import { generatePageAudio } from "./_core/elevenlabs";
import { generateImage } from "./_core/imageGeneration";
import {
  calculateBookPrice,
  getShippingRates,
  createPrintfulOrder,
  confirmPrintfulOrder,
  getPrintfulOrderStatus,
  generateBookInteriorPdf,
} from "./_core/printful";
import { SUBSCRIPTION_TIERS } from "../constants/assets";

// ─── Helper: Convert DB child to ChildProfile ──────────────────
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

// ─── Helper: Check subscription limits ─────────────────────────
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

// ─── App Router ────────────────────────────────────────────────
export const appRouter = router({
  // ─── System ──────────────────────────────────────────────────
  system: router({
    health: publicProcedure.query(() => ({ status: "ok", timestamp: Date.now() })),
  }),

  // ─── Auth ────────────────────────────────────────────────────
  auth: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      return { success: true };
    }),
  }),

  // ─── Children ────────────────────────────────────────────────
  children: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.select().from(children).where(eq(children.userId, ctx.user.id)).orderBy(desc(children.createdAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const [child] = await db.select().from(children).where(and(eq(children.id, input.id), eq(children.userId, ctx.user.id)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        return child;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          nickname: z.string().optional(),
          age: z.number().min(1).max(15),
          gender: z.string().optional(),
          hairColor: z.string().optional(),
          skinTone: z.string().optional(),
          interests: z.array(z.string()).default([]),
          favoriteColor: z.string().optional(),
          personalityTraits: z.array(z.string()).optional(),
          fears: z.array(z.string()).optional(),
          readingLevel: z.string().optional(),
          language: z.string().optional(),
          bedtime: z.string().optional(),
          favoriteCharacter: z.string().optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z
            .array(
              z.object({
                type: z.string(),
                sensoryPreferences: z.array(z.string()).optional(),
                communicationStyle: z.string().optional(),
                storyPacing: z.string().optional(),
                customNotes: z.string().optional(),
              })
            )
            .optional(),
          sensoryPreferences: z.array(z.string()).optional(),
          communicationStyle: z.string().optional(),
          storyPacing: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await checkChildLimit(ctx.user.id);
        const [result] = await db.insert(children).values({
          userId: ctx.user.id,
          ...input,
        });
        return { id: result.insertId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          nickname: z.string().optional(),
          age: z.number().optional(),
          gender: z.string().optional(),
          hairColor: z.string().optional(),
          skinTone: z.string().optional(),
          interests: z.array(z.string()).optional(),
          favoriteColor: z.string().optional(),
          personalityTraits: z.array(z.string()).optional(),
          fears: z.array(z.string()).optional(),
          readingLevel: z.string().optional(),
          language: z.string().optional(),
          bedtime: z.string().optional(),
          favoriteCharacter: z.string().optional(),
          isNeurodivergent: z.boolean().optional(),
          neurodivergentProfiles: z.any().optional(),
          sensoryPreferences: z.array(z.string()).optional(),
          communicationStyle: z.string().optional(),
          storyPacing: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.update(children).set(data).where(and(eq(children.id, id), eq(children.userId, ctx.user.id)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.delete(children).where(and(eq(children.id, input.id), eq(children.userId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ─── Story Arcs ──────────────────────────────────────────────
  storyArcs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.select().from(storyArcs).where(eq(storyArcs.userId, ctx.user.id)).orderBy(desc(storyArcs.updatedAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const [arc] = await db.select().from(storyArcs).where(and(eq(storyArcs.id, input.id), eq(storyArcs.userId, ctx.user.id)));
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        return arc;
      }),

    create: protectedProcedure
      .input(
        z.object({
          childId: z.number(),
          theme: z.string(),
          educationalValue: z.string(),
          totalEpisodes: z.number().min(3).max(10).default(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await checkStoryLimit(ctx.user.id);

        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.userId, ctx.user.id)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });

        const profile = toChildProfile(child);
        const arcData = await generateStoryArcWithClaude(profile, input.theme, input.educationalValue, input.totalEpisodes);

        // Generate cover image
        let coverImageUrl: string | undefined;
        try {
          coverImageUrl = await generateImage(
            `Children's book cover: ${arcData.title}. ${input.theme} theme. Features a ${child.age}-year-old child. Watercolor style, warm magical lighting.`
          );
        } catch {}

        const [result] = await db.insert(storyArcs).values({
          userId: ctx.user.id,
          childId: input.childId,
          title: arcData.title,
          theme: input.theme,
          educationalValue: input.educationalValue,
          totalEpisodes: input.totalEpisodes,
          currentEpisode: 0,
          coverImageUrl,
          synopsis: arcData.synopsis,
          status: "active",
        });

        // Increment stories used
        await db.update(users).set({ storiesUsed: (ctx.user.storiesUsed ?? 0) + 1 }).where(eq(users.id, ctx.user.id));

        return { id: result.insertId, title: arcData.title, synopsis: arcData.synopsis, coverImageUrl };
      }),
  }),

  // ─── Episodes ────────────────────────────────────────────────
  episodes: router({
    list: protectedProcedure
      .input(z.object({ storyArcId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.select().from(episodes).where(eq(episodes.storyArcId, input.storyArcId)).orderBy(episodes.episodeNumber);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const [ep] = await db.select().from(episodes).where(eq(episodes.id, input.id));
        if (!ep) throw new TRPCError({ code: "NOT_FOUND" });
        return ep;
      }),

    generate: protectedProcedure
      .input(z.object({ storyArcId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const [arc] = await db.select().from(storyArcs).where(and(eq(storyArcs.id, input.storyArcId), eq(storyArcs.userId, ctx.user.id)));
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });

        const [child] = await db.select().from(children).where(eq(children.id, arc.childId));
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const profile = toChildProfile(child);
        const episodeNumber = (arc.currentEpisode ?? 0) + 1;

        // Get previous episode summary
        let previousSummary: string | undefined;
        if (episodeNumber > 1) {
          const [prevEp] = await db.select().from(episodes).where(and(eq(episodes.storyArcId, arc.id), eq(episodes.episodeNumber, episodeNumber - 1)));
          previousSummary = prevEp?.summary ?? undefined;
        }

        const generated = await generateEpisodeWithClaude(profile, {
          title: arc.title,
          theme: arc.theme,
          educationalValue: arc.educationalValue ?? "",
          totalEpisodes: arc.totalEpisodes ?? 5,
          currentEpisode: episodeNumber,
          previousEpisodeSummary: previousSummary,
        }, episodeNumber);

        // Insert episode
        const [epResult] = await db.insert(episodes).values({
          storyArcId: arc.id,
          episodeNumber,
          title: generated.title,
          summary: generated.summary,
        });

        // Insert pages with image prompts
        for (let i = 0; i < generated.pages.length; i++) {
          const p = generated.pages[i];
          await db.insert(pages).values({
            episodeId: epResult.insertId,
            pageNumber: i + 1,
            storyText: p.text,
            imagePrompt: p.imagePrompt,
            mood: p.mood,
            characters: generated.characters,
          });
        }

        // Update arc progress
        await db.update(storyArcs).set({
          currentEpisode: episodeNumber,
          status: episodeNumber >= (arc.totalEpisodes ?? 5) ? "completed" : "active",
        }).where(eq(storyArcs.id, arc.id));

        return {
          episodeId: epResult.insertId,
          title: generated.title,
          summary: generated.summary,
          pageCount: generated.pages.length,
        };
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.update(episodes).set({ isRead: true }).where(eq(episodes.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Pages ───────────────────────────────────────────────────
  pages: router({
    list: protectedProcedure
      .input(z.object({ episodeId: z.number() }))
      .query(async ({ input }) => {
        return db.select().from(pages).where(eq(pages.episodeId, input.episodeId)).orderBy(pages.pageNumber);
      }),

    generateImage: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const [page] = await db.select().from(pages).where(eq(pages.id, input.pageId));
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });

        let prompt = page.imagePrompt;

        // If no prompt, generate one from the text
        if (!prompt && page.storyText) {
          const [ep] = await db.select().from(episodes).where(eq(episodes.id, page.episodeId));
          if (ep) {
            const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, ep.storyArcId));
            if (arc) {
              const [child] = await db.select().from(children).where(eq(children.id, arc.childId));
              if (child) {
                prompt = await generatePageImagePrompt(
                  toChildProfile(child),
                  page.storyText,
                  page.mood ?? "warm",
                  arc.theme,
                  page.pageNumber
                );
              }
            }
          }
        }

        if (!prompt) prompt = "Warm watercolor children's book illustration, magical scene, soft lighting";

        const imageUrl = await generateImage(prompt);

        await db.update(pages).set({ imageUrl, imagePrompt: prompt }).where(eq(pages.id, input.pageId));

        return { imageUrl };
      }),

    generateAudio: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .mutation(async ({ input }) => {
        const [page] = await db.select().from(pages).where(eq(pages.id, input.pageId));
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });

        const result = await generatePageAudio(
          page.storyText ?? "",
          page.characters ?? []
        );

        await db.update(pages).set({
          audioUrl: result.audioUrl,
          audioDurationMs: result.durationMs,
        }).where(eq(pages.id, input.pageId));

        return { audioUrl: result.audioUrl, durationMs: result.durationMs };
      }),
  }),

  // ─── Recommendations ────────────────────────────────────────
  recommendations: router({
    generate: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.userId, ctx.user.id)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const recs = await generateRecommendations(toChildProfile(child));

        // Store recommendations
        for (const rec of recs) {
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

        return recs;
      }),

    list: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.select().from(storyRecommendations).where(
          and(eq(storyRecommendations.childId, input.childId), eq(storyRecommendations.userId, ctx.user.id))
        ).orderBy(desc(storyRecommendations.createdAt));
      }),
  }),

  // ─── Print Orders (Printful) ─────────────────────────────────
  printOrders: router({
    create: protectedProcedure
      .input(
        z.object({
          storyArcId: z.number(),
          episodeId: z.number().optional(),
          bookFormat: z.string(),
          dedication: z.string().optional(),
          shipping: z.object({
            name: z.string(),
            address1: z.string(),
            address2: z.string().optional(),
            city: z.string(),
            stateCode: z.string(),
            zip: z.string(),
            countryCode: z.string().default("US"),
            email: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [arc] = await db.select().from(storyArcs).where(and(eq(storyArcs.id, input.storyArcId), eq(storyArcs.userId, ctx.user.id)));
        if (!arc) throw new TRPCError({ code: "NOT_FOUND" });
        // Get all pages for the episode or full arc
        let storyPages: any[];
        if (input.episodeId) {
          storyPages = await db.select().from(pages).where(eq(pages.episodeId, input.episodeId)).orderBy(pages.pageNumber);
        } else {
          const eps = await db.select().from(episodes).where(eq(episodes.storyArcId, arc.id)).orderBy(episodes.episodeNumber);
          storyPages = [];
          for (const ep of eps) {
            const epPages = await db.select().from(pages).where(eq(pages.episodeId, ep.id)).orderBy(pages.pageNumber);
            storyPages.push(...epPages);
          }
        }

        // Calculate pricing
        const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
        const plan = user?.subscriptionPlan ?? "free";
        const tier = SUBSCRIPTION_TIERS[plan as keyof typeof SUBSCRIPTION_TIERS];
        const pricing = calculateBookPrice(input.bookFormat, storyPages.length, tier?.printDiscount ?? 0);

        // Create order record
        const [orderResult] = await db.insert(printOrders).values({
          userId: ctx.user.id,
          storyArcId: input.storyArcId,
          episodeId: input.episodeId,
          bookFormat: input.bookFormat,
          pageCount: storyPages.length,
          coverImageUrl: arc.coverImageUrl,
          status: "draft",
          shippingName: input.shipping.name,
          shippingAddress: input.shipping.address1 + (input.shipping.address2 ? "\n" + input.shipping.address2 : ""),
          shippingCity: input.shipping.city,
          shippingState: input.shipping.stateCode,
          shippingZip: input.shipping.zip,
          shippingCountry: input.shipping.countryCode,
          subtotal: String(pricing.subtotal),
          discount: String(pricing.discount),
          total: String(pricing.total),
        });

        return {
          orderId: String(orderResult.insertId),
          pricing,
          pageCount: storyPages.length,
        };
      }),

    confirm: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const ordId = parseInt(input.orderId, 10);
        const [order] = await db.select().from(printOrders).where(and(eq(printOrders.id, ordId), eq(printOrders.userId, ctx.user.id)));
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        // In production: generate PDF, upload, create Printful order, confirm
        await db.update(printOrders).set({ status: "submitted" }).where(eq(printOrders.id, ordId));

        return { success: true, status: "submitted" };
      }),

    status: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ ctx, input }) => {
        const ordId = parseInt(input.orderId, 10);
        const [order] = await db.select().from(printOrders).where(and(eq(printOrders.id, ordId), eq(printOrders.userId, ctx.user.id)));
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        // Check Printful status if we have an external order ID
        if (order.printfulOrderId) {
          try {
            const status = await getPrintfulOrderStatus(order.printfulOrderId);
            return { status: status.status, tracking: status.tracking, order };
          } catch {}
        }

        return { status: order.status, order };
      }),

    shippingRates: protectedProcedure
      .input(
        z.object({
          address: z.object({
            name: z.string(),
            address1: z.string(),
            city: z.string(),
            stateCode: z.string(),
            zip: z.string(),
            countryCode: z.string(),
          }),
          bookFormat: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return getShippingRates(input.address, input.bookFormat);
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.select().from(printOrders).where(eq(printOrders.userId, ctx.user.id)).orderBy(desc(printOrders.createdAt));
    }),
  }),

  // ─── Voice ───────────────────────────────────────────────────
  voice: router({
    quota: protectedProcedure.query(async () => {
      // Return ElevenLabs quota info
      return { charactersUsed: 0, charactersLimit: 10000, resetsAt: new Date().toISOString() };
    }),
  }),

  // ─── Subscription ───────────────────────────────────────────
  subscription: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
      return {
        plan: user?.subscriptionPlan ?? "free",
        storiesUsed: user?.storiesUsed ?? 0,
        expiresAt: user?.subscriptionExpiresAt,
      };
    }),

    upgrade: protectedProcedure
      .input(z.object({ plan: z.enum(["monthly", "yearly"]) }))
      .mutation(async ({ ctx, input }) => {
        // In production: integrate with Stripe
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + (input.plan === "yearly" ? 12 : 1));

        await db.update(users).set({
          subscriptionPlan: input.plan,
          subscriptionExpiresAt: expiresAt,
        }).where(eq(users.id, ctx.user.id));

        return { success: true, plan: input.plan, expiresAt };
      }),
  }),
});

export type AppRouter = typeof appRouter;
