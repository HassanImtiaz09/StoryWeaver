export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // ElevenLabs TTS API key for high-quality multi-character voice narration
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  // Anthropic Claude API key for premium story generation
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // Printful API key for print-on-demand storybook ordering
  printfulApiKey: process.env.PRINTFUL_API_KEY ?? "",
  // Suno API key for AI-generated background music and sound effects
  sunoApiKey: process.env.SUNO_API_KEY ?? "",
  // Stripe API keys for payment processing
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  stripePriceAnnual: process.env.STRIPE_PRICE_ANNUAL ?? "",
  stripePriceFamily: process.env.STRIPE_PRICE_FAMILY ?? "",
  // Redis URL for caching (optional, falls back to in-memory cache)
  redisUrl: process.env.REDIS_URL ?? "",
};

// ─── Required Environment Variable Validation ────────────────────
// These variables are essential for the server to function. If any are
// missing the server should refuse to start, rather than failing at
// runtime with confusing errors (e.g. a database connection to "").

interface RequiredVar {
  envKey: string;
  envObjKey: keyof typeof ENV;
  label: string;
}

const REQUIRED_VARS: RequiredVar[] = [
  { envKey: "DATABASE_URL", envObjKey: "databaseUrl", label: "Database connection URL" },
  { envKey: "JWT_SECRET", envObjKey: "cookieSecret", label: "JWT signing secret" },
  { envKey: "ANTHROPIC_API_KEY", envObjKey: "anthropicApiKey", label: "Anthropic API key (story generation)" },
];

/**
 * Validate that all required environment variables are present.
 * Call this once at server startup BEFORE any services are initialised.
 * Throws an error listing every missing variable so the operator can
 * fix them all in one pass rather than discovering them one at a time.
 */
export function validateRequiredEnvVars(): void {
  const missing = REQUIRED_VARS.filter((v) => !ENV[v.envObjKey]);

  if (missing.length > 0) {
    const details = missing
      .map((v) => `  - ${v.envKey}: ${v.label}`)
      .join("\n");

    const message =
      `[StoryWeaver] Server cannot start — ${missing.length} required environment ` +
      `variable${missing.length > 1 ? "s are" : " is"} missing:\n${details}\n` +
      `Set ${missing.length > 1 ? "them" : "it"} in your .env file or environment and try again.`;

    // In production, throw so the process crashes with a clear message.
    // In development, also throw — silent empty-string fallbacks are never safe.
    throw new Error(message);
  }
}

// Service configuration validation
// Logs warnings for unconfigured optional services but allows app to run
export function validateServiceConfiguration(): void {
  const missingServices: string[] = [];

  if (!ENV.printfulApiKey) {
    console.warn("[StoryWeaver] Printful API key not configured. Print-on-demand features will be unavailable.");
    missingServices.push("printful");
  }

  if (!ENV.stripeSecretKey) {
    console.warn("[StoryWeaver] Stripe secret key not configured. Payment features will be unavailable.");
    missingServices.push("stripe");
  }

  if (!ENV.elevenLabsApiKey) {
    console.warn("[StoryWeaver] ElevenLabs API key not configured. Voice narration features will be unavailable.");
    missingServices.push("elevenlabs");
  }

  if (!ENV.anthropicApiKey) {
    console.warn("[StoryWeaver] Anthropic API key not configured. AI story generation features will be unavailable.");
    missingServices.push("anthropic");
  }

  if (!ENV.sunoApiKey) {
    console.warn("[StoryWeaver] Suno API key not configured. AI music generation features will be unavailable.");
    missingServices.push("suno");
  }

  // Store configuration status globally
  (globalThis as any).__storyWeaverUnavailableServices = new Set(missingServices);
}

// Check if a specific service is configured
export function isServiceConfigured(service: "printful" | "stripe" | "elevenlabs" | "anthropic" | "suno"): boolean {
  const unavailable = (globalThis as any).__storyWeaverUnavailableServices as Set<string> | undefined;
  if (!unavailable) return true; // Assume configured if not yet validated
  return !unavailable.has(service);
}
