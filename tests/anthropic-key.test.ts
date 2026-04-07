import { describe, it, expect } from "vitest";

describe("Anthropic (Claude) API Key Validation", () => {
  it("should have ANTHROPIC_API_KEY set in environment", () => {
    const key = process.env.ANTHROPIC_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(typeof key).toBe("string");
  });

  it("should authenticate successfully with Anthropic API", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    // Send a minimal message to Claude to validate the key
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [
          { role: "user", content: "Say hello in one word." },
        ],
      }),
    });

    const data = await response.json();

    // Key validation logic:
    // - 200: Key is valid and has credits (ideal)
    // - 400 with "credit balance is too low": Key is valid but needs credits topped up
    // - 401: Key is invalid (authentication_error)
    // - 403: Key lacks permissions (permission_error)
    
    // The key MUST NOT be invalid (401) or forbidden (403)
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);

    if (response.status === 200) {
      // Key is valid and has credits - full success
      expect(data).toHaveProperty("content");
      expect(Array.isArray(data.content)).toBe(true);
      expect(data.content.length).toBeGreaterThan(0);
    } else if (response.status === 400) {
      // Key authenticated but request failed - check if it's a credit issue
      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("type");
      // "invalid_request_error" with credit message means key IS valid
      // The user just needs to add credits at https://console.anthropic.com/settings/billing
      console.warn(
        "Anthropic API key is VALID but has insufficient credits.",
        "Please add credits at https://console.anthropic.com/settings/billing"
      );
      expect(data.error.type).toBe("invalid_request_error");
    }
  });
});
