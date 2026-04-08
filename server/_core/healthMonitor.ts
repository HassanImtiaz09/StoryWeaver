/**
 * Health monitoring and system metrics
 */

import { getDb } from "../db";
import { logger } from "./logger";
import { sql } from "drizzle-orm";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  checks: {
    database: {
      status: string;
      latencyMs: number;
    };
    cache: {
      status: string;
      hitRate: number;
    };
    externalApis: {
      anthropic: {
        status: string;
        lastCheck: Date;
      };
      elevenlabs: {
        status: string;
        lastCheck: Date;
      };
      printful: {
        status: string;
        lastCheck: Date;
      };
      stripe: {
        status: string;
        lastCheck: Date;
      };
    };
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  activeConnections: number;
}

export interface Metrics {
  requestCount: number;
  totalRequests: number;
  errorCount: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

type ApiStatusValue = "unknown" | "healthy" | "unhealthy";

/**
 * Health monitor for system status and external API checks
 */
export class HealthMonitor {
  private startTime: number;
  private requestMetrics = {
    count: 0,
    totalCount: 0,
    errorCount: 0,
    totalDuration: 0,
  };
  private externalApiStatus: Record<string, { status: ApiStatusValue; lastCheck: Date; latency: number }> = {
    anthropic: { status: "unknown", lastCheck: new Date(), latency: 0 },
    elevenlabs: { status: "unknown", lastCheck: new Date(), latency: 0 },
    printful: { status: "unknown", lastCheck: new Date(), latency: 0 },
    stripe: { status: "unknown", lastCheck: new Date(), latency: 0 },
  };
  private periodicCheckIntervalId?: ReturnType<typeof setInterval>;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive health status
   */
  async getHealth(): Promise<HealthStatus> {
    const dbCheck = await this.checkDatabase();
    const memUsage = process.memoryUsage();

    const status = this.determineOverallStatus(dbCheck);

    return {
      status,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || "unknown",
      checks: {
        database: dbCheck,
        cache: this.checkCache(),
        externalApis: {
          anthropic: {
            status: this.externalApiStatus.anthropic?.status ?? "unknown",
            lastCheck: this.externalApiStatus.anthropic?.lastCheck ?? new Date(),
          },
          elevenlabs: {
            status: this.externalApiStatus.elevenlabs?.status ?? "unknown",
            lastCheck: this.externalApiStatus.elevenlabs?.lastCheck ?? new Date(),
          },
          printful: {
            status: this.externalApiStatus.printful?.status ?? "unknown",
            lastCheck: this.externalApiStatus.printful?.lastCheck ?? new Date(),
          },
          stripe: {
            status: this.externalApiStatus.stripe?.status ?? "unknown",
            lastCheck: this.externalApiStatus.stripe?.lastCheck ?? new Date(),
          },
        },
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
      activeConnections: 0,
    };
  }

  /**
   * Check database connectivity and latency
   */
  async checkDatabase(): Promise<{
    status: string;
    latencyMs: number;
  }> {
    try {
      const db = await getDb();
      if (!db) {
        return {
          status: "disconnected",
          latencyMs: 0,
        };
      }

      const startTime = Date.now();
      await db.execute(sql`SELECT 1`);
      const latencyMs = Date.now() - startTime;

      return {
        status: "healthy",
        latencyMs,
      };
    } catch (error) {
      logger.error("Database health check failed", error as Error);
      return {
        status: "unhealthy",
        latencyMs: 0,
      };
    }
  }

  /**
   * Check cache health
   */
  private checkCache(): {
    status: string;
    hitRate: number;
  } {
    try {
      const cache = require("./cache");
      const stats = cache.cache.getStats?.() ?? { hits: 0, misses: 0 };
      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? stats.hits / total : 0;

      return {
        status: "healthy",
        hitRate,
      };
    } catch {
      return {
        status: "unknown",
        hitRate: 0,
      };
    }
  }

  /**
   * Check external API reachability
   */
  async checkExternalApi(name: string, url: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      const isHealthy = response.ok || response.status === 405;

      const key = name.toLowerCase();
      if (this.externalApiStatus[key]) {
        this.externalApiStatus[key].status = isHealthy ? "healthy" : "unhealthy";
        this.externalApiStatus[key].lastCheck = new Date();
        this.externalApiStatus[key].latency = latency;
      }

      return isHealthy;
    } catch (error) {
      const key = name.toLowerCase();
      if (this.externalApiStatus[key]) {
        this.externalApiStatus[key].status = "unhealthy";
        this.externalApiStatus[key].lastCheck = new Date();
      }
      return false;
    }
  }

  /**
   * Get request metrics
   */
  getMetrics(): Metrics {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestMetrics.totalCount > 0
      ? this.requestMetrics.totalDuration / this.requestMetrics.totalCount
      : 0;
    const errorRate = this.requestMetrics.totalCount > 0
      ? this.requestMetrics.errorCount / this.requestMetrics.totalCount
      : 0;

    return {
      requestCount: this.requestMetrics.count,
      totalRequests: this.requestMetrics.totalCount,
      errorCount: this.requestMetrics.errorCount,
      avgResponseTime,
      errorRate,
      uptime,
    };
  }

  /**
   * Record a request for metrics
   */
  recordRequest(duration: number, isError: boolean = false): void {
    this.requestMetrics.count++;
    this.requestMetrics.totalCount++;
    this.requestMetrics.totalDuration += duration;
    if (isError) {
      this.requestMetrics.errorCount++;
    }
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 60000): void {
    if (this.periodicCheckIntervalId) {
      return;
    }

    this.periodicCheckIntervalId = setInterval(async () => {
      try {
        await Promise.allSettled([
          this.checkExternalApi("anthropic", "https://api.anthropic.com/health"),
          this.checkExternalApi("elevenlabs", "https://api.elevenlabs.io/v1/models"),
          this.checkExternalApi("printful", "https://api.printful.com/"),
          this.checkExternalApi("stripe", "https://api.stripe.com/health"),
        ]);
      } catch (error) {
        logger.debug("Periodic health check error", { error: String(error) });
      }
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.periodicCheckIntervalId) {
      clearInterval(this.periodicCheckIntervalId);
      this.periodicCheckIntervalId = undefined;
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    dbCheck: { status: string; latencyMs: number }
  ): "healthy" | "degraded" | "unhealthy" {
    if (dbCheck.status !== "healthy") {
      return "unhealthy";
    }

    const unhealthyApis = Object.values(this.externalApiStatus).filter(
      (api) => api.status === "unhealthy"
    ).length;

    if (unhealthyApis >= 2) {
      return "degraded";
    }

    if (dbCheck.latencyMs > 500) {
      return "degraded";
    }

    return "healthy";
  }
}

export const healthMonitor = new HealthMonitor();
