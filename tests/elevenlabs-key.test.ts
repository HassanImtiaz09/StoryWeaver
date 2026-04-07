import { describe, it, expect } from "vitest";

describe("ElevenLabs API Key Validation", () => {
  it("should have ELEVENLABS_API_KEY set in environment", () => {
    const key = process.env.ELEVENLABS_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(typeof key).toBe("string");
  });

  it("should authenticate successfully with ElevenLabs API", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    // Call the lightweight /v1/user endpoint to validate the key
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: {
        "xi-api-key": key,
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    // The user endpoint returns subscription info - verify it has expected fields
    expect(data).toHaveProperty("subscription");
    expect(data.subscription).toHaveProperty("character_count");
    expect(data.subscription).toHaveProperty("character_limit");
  });

  it("should be able to list available voices", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": key,
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("voices");
    expect(Array.isArray(data.voices)).toBe(true);
    expect(data.voices.length).toBeGreaterThan(0);
  });
});
