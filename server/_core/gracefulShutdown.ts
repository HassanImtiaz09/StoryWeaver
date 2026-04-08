/**
 * Graceful shutdown handling for server and external resources
 */

import type { Server } from "http";
import { logger } from "./logger";

/**
 * Graceful shutdown coordinator
 */
export class GracefulShutdown {
  private server?: Server;
  private db?: any;
  private cache?: any;
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds
  private inFlightRequests = 0;

  /**
   * Register server and resources for cleanup
   */
  register(server: Server, db?: any, cache?: any): void {
    this.server = server;
    this.db = db;
    this.cache = cache;

    // Register signal handlers
    process.on("SIGTERM", () => this.handleSignal("SIGTERM"));
    process.on("SIGINT", () => this.handleSignal("SIGINT"));

    // Track in-flight requests
    if (server) {
      server.on("request", () => {
        this.inFlightRequests++;
      });

      server.on("close", () => {
        this.inFlightRequests = Math.max(0, this.inFlightRequests - 1);
      });
    }
  }

  /**
   * Handle shutdown signal
   */
  private async handleSignal(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress, forcing exit");
      process.exit(1);
    }

    this.isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown`);

    try {
      await this.shutdown(signal);
      logger.info("Graceful shutdown completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown", error as Error);
      process.exit(1);
    }
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(signal?: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Stop accepting new connections
      if (this.server) {
        logger.info("Closing HTTP server");
        await this.closeServer();
      }

      // Wait for in-flight requests with timeout
      await this.waitForRequestsToComplete();

      // Close database connection
      if (this.db) {
        logger.info("Closing database connection");
        await this.closeDatabase();
      }

      // Flush cache
      if (this.cache) {
        logger.info("Flushing cache");
        await this.flushCache();
      }

      const duration = Date.now() - startTime;
      logger.info("All resources cleaned up", { durationMs: duration });
    } catch (error) {
      logger.error("Error during resource cleanup", error as Error);
      throw error;
    }
  }

  /**
   * Close HTTP server
   */
  private closeServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        logger.warn("Server close timeout, forcing shutdown");
        reject(new Error("Server close timeout"));
      }, this.shutdownTimeout);

      this.server.close(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Wait for in-flight requests to complete
   */
  private async waitForRequestsToComplete(): Promise<void> {
    const startTime = Date.now();
    const maxWaitTime = 30000; // 30 seconds

    while (this.inFlightRequests > 0) {
      if (Date.now() - startTime > maxWaitTime) {
        logger.warn(`Timeout waiting for ${this.inFlightRequests} requests to complete, forcing shutdown`);
        return;
      }

      logger.debug("Waiting for in-flight requests", {
        inFlightRequests: this.inFlightRequests,
        elapsedMs: Date.now() - startTime,
      });

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info("All in-flight requests completed");
  }

  /**
   * Close database connection
   */
  private async closeDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      // Try to close the database pool
      if (typeof this.db.close === "function") {
        await this.db.close();
      }

      // For Drizzle with MySQL2 connection pool
      if (this.db._.connection?.pool?.end) {
        await new Promise<void>((resolve, reject) => {
          this.db._.connection.pool.end((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      logger.info("Database connection closed");
    } catch (error) {
      logger.warn("Error closing database", error as Error);
    }
  }

  /**
   * Flush cache
   */
  private async flushCache(): Promise<void> {
    if (!this.cache) return;

    try {
      if (typeof this.cache.flush === "function") {
        await this.cache.flush();
      }

      if (typeof this.cache.flushAll === "function") {
        await this.cache.flushAll();
      }

      logger.info("Cache flushed");
    } catch (error) {
      logger.warn("Error flushing cache", error as Error);
    }
  }

  /**
   * Get shutdown status
   */
  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get number of in-flight requests
   */
  getInFlightRequests(): number {
    return this.inFlightRequests;
  }
}

/**
 * Global graceful shutdown coordinator
 */
export const gracefulShutdown = new GracefulShutdown();
