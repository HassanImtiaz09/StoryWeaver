import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("envValidation", () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    // Clear the global unavailable services set
    (globalThis as any).__storyWeaverUnavailableServices = undefined;
  });

  describe("validateRequiredEnvVars", () => {
    it("throws when DATABASE_URL is missing", async () => {
      // We need to mock the module because ENV is evaluated at module load time
      vi.resetModules();
      process.env.DATABASE_URL = "";
      process.env.JWT_SECRET = "test-secret";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      expect(() => validateRequiredEnvVars()).toThrow();
      expect(() => validateRequiredEnvVars()).toThrow(/DATABASE_URL/);
    });

    it("throws when JWT_SECRET is missing", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "postgresql://localhost/test";
      process.env.JWT_SECRET = "";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      expect(() => validateRequiredEnvVars()).toThrow();
      expect(() => validateRequiredEnvVars()).toThrow(/JWT_SECRET/);
    });

    it("throws when ANTHROPIC_API_KEY is missing", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "postgresql://localhost/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.ANTHROPIC_API_KEY = "";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      expect(() => validateRequiredEnvVars()).toThrow();
      expect(() => validateRequiredEnvVars()).toThrow(/ANTHROPIC_API_KEY/);
    });

    it("throws listing ALL missing vars at once", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "";
      process.env.JWT_SECRET = "";
      process.env.ANTHROPIC_API_KEY = "";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      const error = () => validateRequiredEnvVars();
      expect(error).toThrow();

      try {
        validateRequiredEnvVars();
      } catch (e: any) {
        const message = e.message;
        // Should mention all three variables
        expect(message).toContain("DATABASE_URL");
        expect(message).toContain("JWT_SECRET");
        expect(message).toContain("ANTHROPIC_API_KEY");
        // Should say "3 required environment variables are missing"
        expect(message).toContain("3 required");
      }
    });

    it("includes descriptive labels for missing vars", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "";
      process.env.JWT_SECRET = "test-secret";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      try {
        validateRequiredEnvVars();
      } catch (e: any) {
        expect(e.message).toContain("Database connection URL");
      }
    });

    it("does not throw when all required vars are present", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "postgresql://localhost/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      expect(() => validateRequiredEnvVars()).not.toThrow();
    });

    it("error message uses singular/plural correctly", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "";
      process.env.JWT_SECRET = "test-secret";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      try {
        validateRequiredEnvVars();
      } catch (e: any) {
        // Should say "1 required environment variable is"
        expect(e.message).toContain("1 required");
        expect(e.message).toContain("variable is");
      }
    });

    it("error message for multiple vars uses plural", async () => {
      vi.resetModules();
      process.env.DATABASE_URL = "";
      process.env.JWT_SECRET = "";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      try {
        validateRequiredEnvVars();
      } catch (e: any) {
        // Should say "variables are"
        expect(e.message).toContain("variables are");
      }
    });
  });

  describe("validateServiceConfiguration", () => {
    it("logs warnings for missing optional services", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.PRINTFUL_API_KEY = "";
      process.env.STRIPE_SECRET_KEY = "";
      process.env.ELEVENLABS_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Printful")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Stripe")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ElevenLabs")
      );

      consoleSpy.mockRestore();
    });

    it("sets unavailable services in global state", async () => {
      vi.resetModules();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.PRINTFUL_API_KEY = "";
      process.env.STRIPE_SECRET_KEY = "valid-key";
      process.env.ELEVENLABS_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      const unavailable = (globalThis as any).__storyWeaverUnavailableServices as Set<string>;
      expect(unavailable).toBeDefined();
      expect(unavailable.has("printful")).toBe(true);
      expect(unavailable.has("stripe")).toBe(false);
      expect(unavailable.has("elevenlabs")).toBe(true);
    });

    it("warns about missing Printful key", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.PRINTFUL_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Printful API key")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Print-on-demand")
      );

      consoleSpy.mockRestore();
    });

    it("warns about missing Stripe key", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.STRIPE_SECRET_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Stripe secret key")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Payment")
      );

      consoleSpy.mockRestore();
    });

    it("warns about missing ElevenLabs key", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.ELEVENLABS_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ElevenLabs")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Voice narration")
      );

      consoleSpy.mockRestore();
    });

    it("warns about missing Anthropic key in service config", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.ANTHROPIC_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Anthropic")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("story generation")
      );

      consoleSpy.mockRestore();
    });

    it("warns about missing Suno key", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.SUNO_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Suno")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("music generation")
      );

      consoleSpy.mockRestore();
    });

    it("does not warn when all optional services are configured", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.PRINTFUL_API_KEY = "test-key";
      process.env.STRIPE_SECRET_KEY = "test-key";
      process.env.ELEVENLABS_API_KEY = "test-key";
      process.env.SUNO_API_KEY = "test-key";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("sets global unavailable services as a Set", async () => {
      vi.resetModules();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.PRINTFUL_API_KEY = "";

      const { validateServiceConfiguration } = await import("../../server/_core/env");
      validateServiceConfiguration();

      const unavailable = (globalThis as any).__storyWeaverUnavailableServices;
      expect(unavailable instanceof Set).toBe(true);
    });
  });

  describe("isServiceConfigured", () => {
    beforeEach(async () => {
      vi.resetModules();
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("returns true when service is configured", async () => {
      process.env.PRINTFUL_API_KEY = "test-key";
      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("printful")).toBe(true);
    });

    it("returns false when service is not configured", async () => {
      process.env.PRINTFUL_API_KEY = "";
      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("printful")).toBe(false);
    });

    it("returns true for all services when validateServiceConfiguration not called", async () => {
      const { isServiceConfigured } = await import("../../server/_core/env");
      // Global set not initialized
      (globalThis as any).__storyWeaverUnavailableServices = undefined;

      expect(isServiceConfigured("printful")).toBe(true);
      expect(isServiceConfigured("stripe")).toBe(true);
      expect(isServiceConfigured("elevenlabs")).toBe(true);
      expect(isServiceConfigured("anthropic")).toBe(true);
      expect(isServiceConfigured("suno")).toBe(true);
    });

    it("returns correct status for stripe service", async () => {
      process.env.STRIPE_SECRET_KEY = "";
      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("stripe")).toBe(false);
    });

    it("returns correct status for elevenlabs service", async () => {
      process.env.ELEVENLABS_API_KEY = "configured";
      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("elevenlabs")).toBe(true);
    });

    it("returns correct status for anthropic service", async () => {
      process.env.ANTHROPIC_API_KEY = "";
      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("anthropic")).toBe(false);
    });

    it("returns correct status for suno service", async () => {
      process.env.SUNO_API_KEY = "key";
      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("suno")).toBe(true);
    });

    it("can check multiple services independently", async () => {
      process.env.PRINTFUL_API_KEY = "key";
      process.env.STRIPE_SECRET_KEY = "";
      process.env.ELEVENLABS_API_KEY = "";

      const { validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );
      validateServiceConfiguration();

      expect(isServiceConfigured("printful")).toBe(true);
      expect(isServiceConfigured("stripe")).toBe(false);
      expect(isServiceConfigured("elevenlabs")).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("production setup with all required vars should not throw", async () => {
      vi.resetModules();
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://prod/db";
      process.env.JWT_SECRET = "secret-key";
      process.env.ANTHROPIC_API_KEY = "api-key";

      const { validateRequiredEnvVars } = await import("../../server/_core/env");
      expect(() => validateRequiredEnvVars()).not.toThrow();
    });

    it("development setup with missing optional services still starts", async () => {
      vi.resetModules();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "sqlite::memory:";
      process.env.JWT_SECRET = "dev-secret";
      process.env.ANTHROPIC_API_KEY = "dev-key";
      process.env.STRIPE_SECRET_KEY = "";
      process.env.PRINTFUL_API_KEY = "";

      const { validateRequiredEnvVars, validateServiceConfiguration } = await import(
        "../../server/_core/env"
      );

      expect(() => validateRequiredEnvVars()).not.toThrow();
      validateServiceConfiguration();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("can validate required vars and then check service configuration", async () => {
      vi.resetModules();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      process.env.DATABASE_URL = "postgresql://localhost/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.ANTHROPIC_API_KEY = "test-key";
      process.env.STRIPE_SECRET_KEY = "";

      const { validateRequiredEnvVars, validateServiceConfiguration, isServiceConfigured } = await import(
        "../../server/_core/env"
      );

      expect(() => validateRequiredEnvVars()).not.toThrow();
      validateServiceConfiguration();
      expect(isServiceConfigured("stripe")).toBe(false);
      expect(isServiceConfigured("anthropic")).toBe(true);
    });
  });
});
