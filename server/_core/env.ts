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
