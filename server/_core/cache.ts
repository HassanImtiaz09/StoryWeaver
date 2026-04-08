/**
 * Caching service for StoryWeaver.
 * Uses in-memory LRU cache by default, can be swapped for Redis.
 * Reduces API costs by caching expensive operations.
 */

/**
 * Cache configuration with TTL and key prefixes
 */
const CACHE_CONFIG = {
  recommendations: { ttl: 24 * 60 * 60 * 1000, prefix: "rec:" },      // 24 hours
  voicePreviews: { ttl: 7 * 24 * 60 * 60 * 1000, prefix: "voice:" },  // 7 days
  themeAssets: { ttl: 30 * 24 * 60 * 60 * 1000, prefix: "theme:" },   // 30 days
  storyTemplates: { ttl: 7 * 24 * 60 * 60 * 1000, prefix: "tmpl:" },  // 7 days
  userProfiles: { ttl: 5 * 60 * 1000, prefix: "user:" },              // 5 minutes
};

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

/**
 * Caching service with Redis-compatible interface
 */
class CacheService {
  private store: Map<string, CacheEntry<any>>;
  private maxEntries: number;
  private totalHits: number = 0;
  private totalMisses: number = 0;

  /**
   * Initialize cache service
   * @param maxEntries Maximum number of entries before LRU eviction (default: 1000)
   */
  constructor(maxEntries = 1000) {
    this.store = new Map();
    this.maxEntries = maxEntries;
  }

  /**
   * Get a value from cache
   * @template T The type of the cached value
   * @param key Cache key
   * @returns The cached value or null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.totalMisses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.totalMisses++;
      return null;
    }

    // Update hit count
    entry.hits++;
    this.totalHits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Time-to-live in milliseconds
   */
  async set(key: string, value: any, ttlMs: number): Promise<void> {
    // Evict oldest entry if we're at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      hits: 0,
    });
  }

  /**
   * Delete a cache entry
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async flush(): Promise<void> {
    this.store.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  /**
   * Get or compute a value (cache-aside pattern)
   * @template T The type of the value
   * @param key Cache key
   * @param ttlMs Time-to-live in milliseconds
   * @param compute Function to compute the value if cache miss
   * @returns The cached or computed value
   */
  async getOrSet<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    await this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      // Prefer evicting expired entries first
      if (entry.expiresAt < Date.now()) {
        this.store.delete(key);
        return;
      }

      // Otherwise evict entry with fewest hits, or oldest if equal hits
      if (entry.hits < minHits || (entry.hits === minHits && entry.expiresAt < oldestTime)) {
        minHits = entry.hits;
        oldestTime = entry.expiresAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.store.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.totalHits + this.totalMisses;
    return {
      size: this.store.size,
      hits: this.totalHits,
      misses: this.totalMisses,
      hitRate: total > 0 ? this.totalHits / total : 0,
    };
  }
}

/**
 * Global cache instance
 */
export const cache = new CacheService();

// ─── Cache Key Generators ──────────────────────────────────

/**
 * Generate a cache key for story recommendations
 * @param childId ID of the child
 * @param profileHash Hash of the child's profile
 */
export function recommendationsCacheKey(childId: number, profileHash: string): string {
  return `${CACHE_CONFIG.recommendations.prefix}${childId}:${profileHash}`;
}

/**
 * Generate a cache key for voice previews
 * @param voiceId ID of the voice
 * @param textHash Hash of the preview text
 */
export function voicePreviewCacheKey(voiceId: string, textHash: string): string {
  return `${CACHE_CONFIG.voicePreviews.prefix}${voiceId}:${textHash}`;
}

/**
 * Generate a hash of child profile for cache key
 * Hashes interests, age, and personality traits
 * @param child Child profile object
 */
export function generateProfileHash(child: {
  age?: number;
  interests?: string[];
  personalityTraits?: string[];
}): string {
  const parts = [
    child.age?.toString() ?? "",
    (child.interests ?? []).sort().join(","),
    (child.personalityTraits ?? []).sort().join(","),
  ];

  // Simple hash function (not cryptographic, just for cache keys)
  let hash = 0;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a hash of text for cache key
 * @param text Text to hash
 */
export function generateTextHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export { CACHE_CONFIG, CacheService };
