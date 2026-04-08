/**
 * Tracks API costs per user and per story generation.
 * Helps inform pricing decisions and identify cost optimization opportunities.
 */

/**
 * Cost entry for an API operation
 */
export interface CostEntry {
  service: "claude" | "forge" | "elevenlabs" | "suno";
  operation: string;
  estimatedCost: number; // in USD cents
  tokensUsed?: number;
  timestamp: Date;
}

/**
 * Cost tracker for tracking API usage costs
 */
class CostTracker {
  /**
   * Map of "userId:storyArcId" -> CostEntry[]
   */
  private costs: Map<string, CostEntry[]>;

  /**
   * Map of userId -> total costs in cents
   */
  private userCosts: Map<number, number>;

  constructor() {
    this.costs = new Map();
    this.userCosts = new Map();
  }

  /**
   * Track a cost for a user's story generation
   * @param userId User ID
   * @param storyArcId Story arc ID (optional, null for non-story operations)
   * @param entry Cost entry (without timestamp)
   */
  trackCost(
    userId: number,
    storyArcId: number | null,
    entry: Omit<CostEntry, "timestamp">
  ): void {
    const key = storyArcId ? `${userId}:${storyArcId}` : `${userId}:none`;
    const fullEntry: CostEntry = {
      ...entry,
      timestamp: new Date(),
    };

    if (!this.costs.has(key)) {
      this.costs.set(key, []);
    }
    this.costs.get(key)!.push(fullEntry);

    // Update user total
    const userTotal = this.userCosts.get(userId) ?? 0;
    this.userCosts.set(userId, userTotal + entry.estimatedCost);
  }

  /**
   * Get total costs for a user with breakdown by service
   * @param userId User ID
   * @param sinceDate Optional date to filter costs since
   */
  getUserCosts(
    userId: number,
    sinceDate?: Date
  ): {
    total: number;
    byService: Record<string, number>;
    count: number;
  } {
    let total = 0;
    const byService: Record<string, number> = {
      claude: 0,
      forge: 0,
      elevenlabs: 0,
      suno: 0,
    };
    let count = 0;

    // Iterate through all entries for this user
    for (const [key, entries] of this.costs.entries()) {
      if (key.startsWith(`${userId}:`)) {
        for (const entry of entries) {
          if (!sinceDate || entry.timestamp >= sinceDate) {
            total += entry.estimatedCost;
            byService[entry.service] += entry.estimatedCost;
            count++;
          }
        }
      }
    }

    return { total, byService, count };
  }

  /**
   * Get costs for a specific story
   * @param userId User ID
   * @param storyArcId Story arc ID
   */
  getStoryCost(
    userId: number,
    storyArcId: number
  ): {
    total: number;
    breakdown: CostEntry[];
  } {
    const key = `${userId}:${storyArcId}`;
    const entries = this.costs.get(key) ?? [];
    const total = entries.reduce((sum, e) => sum + e.estimatedCost, 0);
    return { total, breakdown: entries };
  }

  /**
   * Get all cost entries for a user (for detailed analysis)
   * @param userId User ID
   */
  getAllUserEntries(userId: number): CostEntry[] {
    const entries: CostEntry[] = [];
    for (const [key, keyEntries] of this.costs.entries()) {
      if (key.startsWith(`${userId}:`)) {
        entries.push(...keyEntries);
      }
    }
    return entries;
  }

  /**
   * Reset costs (for testing or admin operations)
   */
  reset(): void {
    this.costs.clear();
    this.userCosts.clear();
  }

  /**
   * Get statistics about cost tracking
   */
  getStats(): {
    totalCost: number;
    totalEntries: number;
    usersTracked: Set<number>;
  } {
    const usersTracked = new Set<number>();
    let totalEntries = 0;

    for (const [key] of this.costs.entries()) {
      const userId = parseInt(key.split(":")[0], 10);
      usersTracked.add(userId);
      totalEntries += (this.costs.get(key) ?? []).length;
    }

    let totalCost = 0;
    for (const cost of this.userCosts.values()) {
      totalCost += cost;
    }

    return { totalCost, totalEntries, usersTracked };
  }
}

/**
 * Global cost tracker instance
 */
export const costTracker = new CostTracker();

/**
 * Estimated costs for common operations (in USD cents)
 * Based on typical Claude 3 Sonnet usage, Forge, ElevenLabs, and Suno pricing
 */
export const COST_ESTIMATES = {
  storyGeneration: 3.5,    // ~3.5 cents per episode (Claude Sonnet)
  imageGeneration: 2.0,    // ~2 cents per image (Forge/Replicate)
  audioNarration: 1.5,     // ~1.5 cents per page audio (ElevenLabs)
  musicGeneration: 5.0,    // ~5 cents per track (Suno)
  aiSafetyCheck: 0.5,      // ~0.5 cents (Claude Haiku)
} as const;

export type CostService = keyof typeof COST_ESTIMATES;
