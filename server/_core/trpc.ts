/**
 * tRPC Server Configuration
 * Initializes tRPC procedures with authentication and context setup
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { createContext } from "./context";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { checkParentalConsent } from "./coppaConsent";

const t = initTRPC.context<typeof createContext>().create();

/**
 * Public procedure - accessible without authentication
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      // Add a user object for backward compatibility with existing code
      user: {
        id: ctx.userId,
        email: ctx.userEmail,
      },
    },
  });
});

/**
 * Admin procedure - requires admin role verified from database.
 * The user's `role` column must be "admin" — no hardcoded user IDs.
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, ctx.userId!))
    .limit(1);

  if (!user || user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next();
});

/**
 * COPPA-protected procedure — requires both authentication AND
 * verified parental consent. Use for any endpoint that accesses
 * or modifies child data.
 */
export const coppaProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const hasConsent = await checkParentalConsent(ctx.userId!);
  if (!hasConsent) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Parental consent is required to access child data. Please complete the consent verification process.",
    });
  }
  return next();
});

export const router = t.router;
export const middleware = t.middleware;
