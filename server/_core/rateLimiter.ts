/**
 * Rate limiter with token bucket algorithm
 * Supports subscription tiers and per-endpoint limits
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Rate limit tiers based on subscription level
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Free tier
  "free:story_generation": {
    windowMs: 3600000, // 1 hour
    maxRequests: 3,
    message: "Free tier: 3 stories per hour",
  },
  "free:api_general": {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
  },

  // Monthly subscription
  "monthly:story_generation": {
    windowMs: 3600000,
    maxRequests: 20,
  },
  "monthly:api_general": {
    windowMs: 60000,
    maxRequests: 100,
  },

  // Annual subscription
  "yearly:story_generation": {
    windowMs: 3600000,
    maxRequests: 30,
  },
  "yearly:api_general": {
    windowMs: 60000,
    maxRequests: 150,
  },

  // Family plan
  "family:story_generation": {
    windowMs: 3600000,
    maxRequests: 50,
  },
  "family:api_general": {
    windowMs: 60000,
    maxRequests: 200,
  },
};

/**
 * Token bucket entry
 */
interface TokenBucket {
  tokens: number;
  refillRate: number;
  lastRefillAt: number;
  windowStart: number;
}

/**
 * In-memory rate limiter with token bucket algorithm
 * Ready to swap for Redis backend
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private defaultConfig: RateLimitConfig;

  constructor(defaultConfig?: RateLimitConfig) {
    this.buckets = new Map();
    this.defaultConfig = defaultConfig || {
      windowMs: 60000,
      maxRequests: 100,
    };
  }

  /**
   * Check if a request is allowed without consuming tokens
   */
  checkLimit(userId: number, tier: string, endpoint: string): RateLimitStatus {
    const key = this.generateKey(userId, tier, endpoint);
    const config = this.getConfig(tier, endpoint);
    const bucket = this.getOrCreateBucket(key, config);

    const now = Date.now();
    this.refillBucket(bucket, config, now);

    const allowed = bucket.tokens >= 1;
    const remaining = Math.floor(bucket.tokens);
    const resetAt = new Date(bucket.windowStart + config.windowMs);
    const retryAfter = allowed ? undefined : Math.ceil((resetAt.getTime() - now) / 1000);

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetAt,
      retryAfter,
    };
  }

  /**
   * Consume a token if available
   */
  consumeToken(userId: number, tier: string, endpoint: string): boolean {
    const key = this.generateKey(userId, tier, endpoint);
    const config = this.getConfig(tier, endpoint);
    const bucket = this.getOrCreateBucket(key, config);

    const now = Date.now();
    this.refillBucket(bucket, config, now);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Get remaining quota information
   */
  getRemainingQuota(userId: number, tier: string, endpoint: string): {
    remaining: number;
    total: number;
    resetAt: Date;
  } {
    const key = this.generateKey(userId, tier, endpoint);
    const config = this.getConfig(tier, endpoint);
    const bucket = this.getOrCreateBucket(key, config);

    const now = Date.now();
    this.refillBucket(bucket, config, now);

    return {
      remaining: Math.floor(bucket.tokens),
      total: config.maxRequests,
      resetAt: new Date(bucket.windowStart + config.windowMs),
    };
  }

  /**
   * Reset limits for a user
   */
  resetUser(userId: number, tier?: string, endpoint?: string): void {
    if (tier && endpoint) {
      const key = this.generateKey(userId, tier, endpoint);
      this.buckets.delete(key);
    } else {
      // Reset all buckets for this user
      for (const key of this.buckets.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.buckets.delete(key);
        }
      }
    }
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Get current bucket state (for monitoring)
   */
  getState(userId: number, tier: string, endpoint: string) {
    const key = this.generateKey(userId, tier, endpoint);
    const bucket = this.buckets.get(key);

    if (!bucket) {
      return null;
    }

    const config = this.getConfig(tier, endpoint);
    const now = Date.now();
    this.refillBucket(bucket, config, now);

    return {
      tokens: bucket.tokens,
      capacity: config.maxRequests,
      nextResetAt: new Date(bucket.windowStart + config.windowMs),
      windowStartedAt: new Date(bucket.windowStart),
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillBucket(bucket: TokenBucket, config: RateLimitConfig, now: number): void {
    const elapsedMs = now - bucket.lastRefillAt;
    const tokensToAdd = (elapsedMs / config.windowMs) * config.maxRequests;

    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefillAt = now;

    // Reset window if window has elapsed
    if (now - bucket.windowStart > config.windowMs) {
      bucket.windowStart = now;
      bucket.tokens = config.maxRequests;
    }
  }

  /**
   * Get or create a token bucket
   */
  private getOrCreateBucket(key: string, config: RateLimitConfig): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      const now = Date.now();
      bucket = {
        tokens: config.maxRequests,
        refillRate: config.maxRequests / config.windowMs,
        lastRefillAt: now,
        windowStart: now,
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Get rate limit config for a tier and endpoint
   */
  private getConfig(tier: string, endpoint: string): RateLimitConfig {
    const key = `${tier}:${endpoint}`;
    return RATE_LIMITS[key] || this.defaultConfig;
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(userId: number, tier: string, endpoint: string): string {
    return `${userId}:${tier}:${endpoint}`;
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new RateLimiter();
