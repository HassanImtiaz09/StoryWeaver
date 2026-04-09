/**
 * Simple in-memory rate limiter for tRPC procedures.
 * Uses a sliding window approach with automatic cleanup.
 *
 * For production at scale, replace with Redis-backed rate limiting.
 */

import { TRPCError } from "@trpc/server";

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    // Remove entries with no recent timestamps
    entry.timestamps = entry.timestamps.filter((t) => now - t < 600_000); // 10 min window max
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request is rate limited.
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if the request is allowed, throws if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): void {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
    });
  }

  entry.timestamps.push(now);
}

/**
 * Extract a rate-limit key from the tRPC context.
 * Uses userId if authenticated, otherwise falls back to IP.
 */
export function getRateLimitKey(ctx: any, prefix: string): string {
  if (ctx.userId) {
    return `${prefix}:user:${ctx.userId}`;
  }
  // Fallback to IP from request
  const req = ctx.req;
  const ip = req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "unknown";
  return `${prefix}:ip:${ip}`;
}
