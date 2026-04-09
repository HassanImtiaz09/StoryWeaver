import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleWebhookEvent } from "./stripe";
import { logger } from "./logger";
import { healthMonitor } from "./healthMonitor";
import { gracefulShutdown } from "./gracefulShutdown";
import { databasePool } from "./dbPool";
import { cache } from "./cache";
import {
  requestIdMiddleware,
  requestLoggerMiddleware,
  securityHeadersMiddleware,
  validationMiddleware,
} from "./requestMiddleware";
import { errorHandler, asyncHandler } from "./errorHandler";
import { getDb } from "../db";
import { prewarmFontCache } from "./bookLayout";
import { validateRequiredEnvVars, validateServiceConfiguration } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Fail fast if required env vars are missing — before any services initialise
  validateRequiredEnvVars();
  // Log warnings for optional services that aren't configured
  validateServiceConfiguration();

  const app = express();
  const server = createServer(app);

  // Register graceful shutdown
  const db = await getDb();
  gracefulShutdown.register(server, db, cache);

  // Start periodic health checks
  healthMonitor.startPeriodicChecks(60000);

  // Core middleware
  app.use(requestIdMiddleware());
  app.use(securityHeadersMiddleware());
  app.use(requestLoggerMiddleware(logger));
  app.use(validationMiddleware());

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Stripe webhook - MUST be before express.json() middleware
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      await handleWebhookEvent(req.body as Buffer, sig);
      res.json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Error:", err);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  // Enhanced health endpoint
  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      const health = await healthMonitor.getHealth();
      const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 503 : 500;
      res.status(statusCode).json(health);
    })
  );

  // Database pool status endpoint
  app.get(
    "/api/admin/pool-status",
    asyncHandler(async (_req, res) => {
      const status = await databasePool.getStatus();
      res.json(status);
    })
  );

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Global error handler (must be last middleware)
  app.use(errorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server listening`, { port, nodeEnv: process.env.NODE_ENV });

    // Pre-warm font cache in background after server starts accepting requests
    prewarmFontCache().catch((err) => {
      logger.warn("Font cache pre-warming failed (non-fatal)", err);
    });
  });
}

startServer().catch((error) => {
  logger.fatal("Failed to start server", error);
  process.exit(1);
});
