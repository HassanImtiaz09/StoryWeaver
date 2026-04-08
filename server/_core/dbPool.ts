/**
 * Database connection pool configuration and management
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Database pool configuration
 */
export const DB_POOL_CONFIG = {
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 60000, // 60 seconds
  acquireTimeout: 10000, // 10 seconds
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 seconds
};

/**
 * Pool status information
 */
export interface PoolStatus {
  active: number;
  idle: number;
  waiting: number;
  total: number;
  config: typeof DB_POOL_CONFIG;
}

/**
 * Database pool manager
 */
export class DatabasePool {
  private config: typeof DB_POOL_CONFIG;

  constructor(config: typeof DB_POOL_CONFIG = DB_POOL_CONFIG) {
    this.config = config;
  }

  /**
   * Get current pool status
   */
  async getStatus(): Promise<PoolStatus> {
    try {
      const db = await getDb();
      if (!db) {
        return {
          active: 0,
          idle: 0,
          waiting: 0,
          total: 0,
          config: this.config,
        };
      }

      // Access the underlying MySQL2 pool
      const pool = (db as any)._.connection?.pool;

      if (!pool) {
        return {
          active: 0,
          idle: 0,
          waiting: 0,
          total: 0,
          config: this.config,
        };
      }

      return {
        active: pool._allConnections?.size ?? 0,
        idle: pool._freeConnections?.length ?? 0,
        waiting: pool._waitingCallbacks?.length ?? 0,
        total: pool.config?.connectionLimit ?? this.config.connectionLimit,
        config: this.config,
      };
    } catch (error) {
      logger.warn("Error getting pool status", error as Error);
      return {
        active: 0,
        idle: 0,
        waiting: 0,
        total: this.config.connectionLimit,
        config: this.config,
      };
    }
  }

  /**
   * Health check - test query execution time
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    latencyMs: number;
    poolStatus: PoolStatus;
  }> {
    try {
      const db = await getDb();
      if (!db) {
        return {
          status: "unhealthy",
          latencyMs: 0,
          poolStatus: await this.getStatus(),
        };
      }

      const startTime = Date.now();
      // Simple test query
      await db.execute(sql`SELECT 1`);
      const latencyMs = Date.now() - startTime;

      const poolStatus = await this.getStatus();

      return {
        status: latencyMs < 1000 ? "healthy" : "unhealthy",
        latencyMs,
        poolStatus,
      };
    } catch (error) {
      logger.error("Database pool health check failed", error as Error);
      return {
        status: "unhealthy",
        latencyMs: 0,
        poolStatus: await this.getStatus(),
      };
    }
  }

  /**
   * Drain pool connections gracefully
   */
  async drain(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const pool = (db as any)._.connection?.pool;
      if (!pool) return;

      // End all connections in the pool
      await new Promise<void>((resolve, reject) => {
        pool.end((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info("Database pool drained");
    } catch (error) {
      logger.warn("Error draining database pool", error as Error);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): typeof DB_POOL_CONFIG {
    return this.config;
  }

  /**
   * Update configuration (for future enhancement)
   */
  updateConfig(newConfig: Partial<typeof DB_POOL_CONFIG>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("Database pool configuration updated", this.config);
  }
}

/**
 * Global database pool manager
 */
export const databasePool = new DatabasePool();
