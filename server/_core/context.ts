/**
 * tRPC Context Creation
 * Extracts user information from request and provides it to procedures
 */

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Session } from "next-auth";

/**
 * Context object available to all tRPC procedures
 */
export interface Context {
  // User information from session
  session: Session | null;
  userId: number | null;
  userEmail: string | null;

  // Express request/response for advanced use cases
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
}

/**
 * Creates context for each tRPC request
 *
 * In a production app, you would:
 * 1. Extract session from JWT token or cookies
 * 2. Look up user from database
 * 3. Populate userId and user details
 *
 * For now, this is a basic implementation that extracts userId from headers
 */
export function createContext({
  req,
  res,
}: CreateExpressContextOptions): Context {
  // Extract user ID from Authorization header or session
  let userId: number | null = null;
  let userEmail: string | null = null;
  let session: Session | null = null;

  // Try to get user ID from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      // In production, you would verify the JWT token here
      // For now, we'll parse it as a simple JSON payload
      // This is insecure and should never be used in production
      if (token.includes(".")) {
        // JWT format - extract the payload
        const parts = token.split(".");
        if (parts[1]) {
          const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString());
          userId = decoded.sub || decoded.userId || null;
          userEmail = decoded.email || null;
        }
      } else {
        // Simple token format - assume it's the user ID
        userId = parseInt(token, 10) || null;
      }
    } catch (error) {
      // Token parsing failed, continue without user
    }
  }

  // Try to get user ID from cookies (if using session-based auth)
  if (!userId && req.session) {
    const sessionData = req.session as any;
    userId = sessionData.userId || sessionData.user?.id || null;
    userEmail = sessionData.user?.email || null;
    session = sessionData as Session;
  }

  // Try to get user ID from query params (for development only)
  if (!userId && req.query?.userId) {
    userId = parseInt(req.query.userId as string, 10) || null;
  }

  return {
    session,
    userId,
    userEmail,
    req,
    res,
  };
}
