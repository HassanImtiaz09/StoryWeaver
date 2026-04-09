/**
 * tRPC Context Creation
 * Extracts user information from request and provides it to procedures.
 *
 * Authentication flow:
 *   1. Bearer JWT token → verified with jwt.verify() using JWT_SECRET
 *   2. Session cookie → extracted from express-session middleware
 *   3. No auth → userId remains null (public endpoints only)
 */

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Session } from "next-auth";
import jwt from "jsonwebtoken";
import { ENV } from "./env";

// Fail fast if JWT_SECRET is not configured
if (!ENV.cookieSecret) {
  throw new Error("[FATAL] JWT_SECRET / cookieSecret is not configured. Server cannot start safely.");
}

/**
 * Context object available to all tRPC procedures
 */
export interface Context {
  session: Session | null;
  userId: number | null;
  userEmail: string | null;
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
}

/**
 * Creates context for each tRPC request.
 * Authentication is handled exclusively via:
 *   - JWT Bearer tokens (signature-verified)
 *   - Session cookies (server-side session store)
 *
 * Query-parameter auth has been removed for security.
 */
export function createContext({
  req,
  res,
}: CreateExpressContextOptions): Context {
  let userId: number | null = null;
  let userEmail: string | null = null;
  let session: Session | null = null;

  // ── 1. Bearer JWT token (signature-verified) ─────────────────
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const secret = ENV.cookieSecret;
      if (!secret) {
        // JWT_SECRET not configured — reject all token auth
        console.error("[Auth] JWT_SECRET is not configured; rejecting Bearer token");
      } else {
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
        userId = typeof decoded.sub === "number"
          ? decoded.sub
          : typeof decoded.sub === "string"
            ? parseInt(decoded.sub, 10) || null
            : decoded.userId ?? null;
        userEmail = typeof decoded.email === "string" ? decoded.email : null;
      }
    } catch (error) {
      // Invalid or expired token — continue unauthenticated.
      // Do NOT fall through to weaker auth methods.
    }
  }

  // ── 2. Session cookie ────────────────────────────────────────
  if (!userId && req.session) {
    const sessionData = req.session as Record<string, any>;
    userId = sessionData.userId || sessionData.user?.id || null;
    userEmail = sessionData.user?.email || null;
    session = sessionData as unknown as Session;
  }

  // NOTE: Query-parameter auth (?userId=X) has been deliberately removed.
  // It was a development shortcut that allowed trivial impersonation.

  return { session, userId, userEmail, req, res };
}
