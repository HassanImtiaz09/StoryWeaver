/**
 * Centralized error handling for Express
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, any>;
  };
}

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Record<string, any>
  ) {
    super(message, 400, "VALIDATION_ERROR");
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(
    message: string,
    public retryAfter: number = 60
  ) {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(
    public service: string,
    message: string
  ) {
    super(`${service} error: ${message}`, 502, `${service.toUpperCase()}_ERROR`);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Map error to HTTP status code
 */
function errorToStatusCode(error: any): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error.status) {
    return error.status;
  }

  if (error.statusCode) {
    return error.statusCode;
  }

  return 500;
}

/**
 * Map error to error code
 */
function errorToCode(error: any): string {
  if (error instanceof AppError) {
    return error.code;
  }

  if (error.code) {
    return error.code;
  }

  return "INTERNAL_ERROR";
}

/**
 * Sanitize error message for production
 */
function sanitizeMessage(error: any, isProduction: boolean): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error.message) {
    // Don't leak implementation details in production
    if (isProduction && error.message.includes("ENOENT")) {
      return "Resource not found";
    }
    return error.message;
  }

  return "An unexpected error occurred";
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const isProduction = process.env.NODE_ENV === "production";
  const requestId = (req as any).id || "unknown";

  const statusCode = errorToStatusCode(err);
  const code = errorToCode(err);
  const message = sanitizeMessage(err, isProduction);

  // Log the error
  logger
    .withRequestId(requestId)
    .error(`${code}: ${message}`, err, {
      method: req.method,
      url: req.url,
      statusCode,
    });

  // Build error response
  const response: ErrorResponse = {
    error: {
      code,
      message,
      requestId,
    },
  };

  // Add details in development
  if (!isProduction && err instanceof ValidationError && err.details) {
    response.error.details = err.details;
  }

  // Add retry-after header for rate limits
  if (err instanceof RateLimitError) {
    res.set("Retry-After", String(err.retryAfter));
  }

  // Send response
  res.status(statusCode).json(response);
}

/**
 * Async error wrapper for Express route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
