/**
 * API Versioning Middleware and Utilities
 * Provides API version management and compatibility checking
 */

import { middleware } from "./trpc";
import type { Context } from "./context";

export const CURRENT_API_VERSION = "2024-04-09";

/**
 * tRPC middleware that adds API version information to response headers
 * This middleware can be applied to individual procedures or routers
 */
export const apiVersionMiddleware = middleware(async ({ ctx, next }) => {
  const result = await next();

  // Add version header to context for response serialization
  if (!ctx._responseHeaders) {
    ctx._responseHeaders = {};
  }
  ctx._responseHeaders["X-API-Version"] = CURRENT_API_VERSION;

  return result;
});

/**
 * Compares client API version against server CURRENT_API_VERSION
 * Returns compatibility status and any warnings
 *
 * @param clientVersion - The API version reported by the client
 * @returns Object with isCompatible boolean and message string
 */
export function checkApiVersion(clientVersion: string | null | undefined): {
  isCompatible: boolean;
  message: string;
  serverVersion: string;
} {
  if (!clientVersion) {
    return {
      isCompatible: true,
      message: "No client version specified; assuming current version",
      serverVersion: CURRENT_API_VERSION,
    };
  }

  if (clientVersion === CURRENT_API_VERSION) {
    return {
      isCompatible: true,
      message: "Client API version matches server",
      serverVersion: CURRENT_API_VERSION,
    };
  }

  // Parse versions to allow for minor compatibility
  const parseVersion = (v: string) => {
    const parts = v.split("-").pop()?.split(".") ?? [];
    return {
      year: parseInt(parts[0]) || 0,
      month: parseInt(parts[1]) || 0,
      day: parseInt(parts[2]) || 0,
    };
  };

  const client = parseVersion(clientVersion);
  const server = parseVersion(CURRENT_API_VERSION);

  // Same year-month = compatible, different = potentially incompatible
  const compatible = client.year === server.year && client.month === server.month;

  return {
    isCompatible: compatible,
    message: compatible
      ? `Client version ${clientVersion} is compatible with server ${CURRENT_API_VERSION}`
      : `Client version ${clientVersion} may be incompatible with server ${CURRENT_API_VERSION}. Please update your client.`,
    serverVersion: CURRENT_API_VERSION,
  };
}
