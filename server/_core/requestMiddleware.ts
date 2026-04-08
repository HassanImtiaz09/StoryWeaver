/**
 * Request lifecycle middleware for Express
 */

import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger";
import { rateLimiter } from "./rateLimiter";
import { RateLimitError } from "./errorHandler";

/**
 * Extend Express Request to include our custom properties
 */
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
      userId?: number;
    }
  }
}

/**
 * Middleware to add unique request ID to each request
 */
export function requestIdMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    req.id = req.headers["x-request-id"] as string || uuidv4();
    res.setHeader("X-Request-ID", req.id);
    next();
  };
}

/**
 * Middleware to log request and response with timing
 */
export function requestLoggerMiddleware(parentLogger: typeof logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.startTime = Date.now();

    // Capture the original send function
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - (req.startTime || Date.now());
      const statusCode = res.statusCode;
      const isError = statusCode >= 400;

      parentLogger
        .withRequestId(req.id || "unknown")
        .info(`${req.method} ${req.path}`, {
          method: req.method,
          path: req.path,
          statusCode,
          duration,
          userId: req.userId,
        });

      // Restore original send and call it
      res.send = originalSend;
      return res.send(data);
    };

    next();
  };
}

/**
 * Middleware to apply rate limiting based on user tier
 */
export function rateLimitMiddleware(limiter: typeof rateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for health check and OPTIONS requests
    if (req.path === "/api/health" || req.method === "OPTIONS") {
      return next();
    }

    // Get user ID from request (should be set by auth middleware)
    const userId = req.userId || 0; // Anonymous users get ID 0

    // Determine subscription tier (would come from user model in real app)
    const tier = (req as any).userTier || "free";

    // Determine endpoint for rate limiting
    const endpoint = req.path.split("/").slice(1, 3).join("_") || "api_general";

    // Check rate limit
    const status = limiter.checkLimit(userId, tier, endpoint);

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", status.resetAt.getTime());
    res.setHeader("X-RateLimit-Remaining", status.remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(status.resetAt.getTime() / 1000));

    if (!status.allowed) {
      throw new RateLimitError("Rate limit exceeded", status.retryAfter);
    }

    // Consume the token
    limiter.consumeToken(userId, tier, endpoint);

    next();
  };
}

/**
 * Middleware to validate common request parameters
 */
export function validationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate Content-Type for POST/PUT requests
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const contentType = req.headers["content-type"];

      if (contentType && !contentType.includes("application/json")) {
        return res.status(400).json({
          error: {
            code: "INVALID_CONTENT_TYPE",
            message: "Content-Type must be application/json",
            requestId: req.id,
          },
        });
      }
    }

    // Validate request body size (additional safeguard)
    const contentLength = req.headers["content-length"];
    if (contentLength && parseInt(contentLength) > 52428800) {
      // 50MB
      return res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body is too large",
          requestId: req.id,
        },
      });
    }

    next();
  };
}

/**
 * Middleware to add security headers
 */
export function securityHeadersMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Enable XSS protection
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // Enable HSTS (force HTTPS)
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Disable referrer leaking
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Control which features/APIs can be used in the browser
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Prevent content security policy violations
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

    next();
  };
}

/**
 * Extract user ID from request (called after auth middleware)
 */
export function extractUserIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // This would be set by your authentication middleware
    // For now, it's a placeholder that would be set by tRPC context
    const user = (req as any).user;
    if (user && typeof user === "object" && "id" in user) {
      req.userId = user.id;
    }
    next();
  };
}
