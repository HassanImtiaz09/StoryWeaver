/**
 * tRPC Server Configuration
 * Initializes tRPC procedures with authentication and context setup
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

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
 * Admin procedure - requires admin role
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // In a real app, check user role from database
  // For now, we'll assume admins have a special flag or userId of 1
  // In production, you would query the database to check role
  const isAdmin = ctx.userId === 1; // Simple demo check

  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next();
});

export const router = t.router;
export const middleware = t.middleware;
