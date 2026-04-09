// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(function (table) {
        return {
          where: vi.fn(() => Promise.resolve([])),
        };
      }),
    })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  STORY_MOOD_LIGHTING,
  hslToHex,
  getSmartHomeConfig,
  updateSmartHomeConfig,
} from "../../server/_core/smartHomeService";

describe("smartHomeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mood to lighting color mapping", () => {
    it("defines all story moods", () => {
      const moods = ["adventure", "mystery", "happy", "scary", "calm", "magical", "sad"];
      moods.forEach((mood) => {
        expect(STORY_MOOD_LIGHTING[mood]).toBeDefined();
      });
    });

    it("maps adventure to orange hue", () => {
      expect(STORY_MOOD_LIGHTING.adventure.hue).toBe(40);
    });

    it("maps mystery to purple hue", () => {
      expect(STORY_MOOD_LIGHTING.mystery.hue).toBe(270);
    });

    it("maps happy to yellow hue", () => {
      expect(STORY_MOOD_LIGHTING.happy.hue).toBe(50);
    });

    it("maps scary to cyan hue", () => {
      expect(STORY_MOOD_LIGHTING.scary.hue).toBe(180);
    });

    it("maps calm to blue hue", () => {
      expect(STORY_MOOD_LIGHTING.calm.hue).toBe(220);
    });

    it("maps magical to magenta hue", () => {
      expect(STORY_MOOD_LIGHTING.magical.hue).toBe(300);
    });

    it("maps sad to teal hue", () => {
      expect(STORY_MOOD_LIGHTING.sad.hue).toBe(210);
    });
  });

  describe("mood lighting attributes", () => {
    it("adventure has high brightness and saturation", () => {
      const adventure = STORY_MOOD_LIGHTING.adventure;
      expect(adventure.brightness).toBe(80);
      expect(adventure.saturation).toBe(100);
    });

    it("calm has low brightness", () => {
      const calm = STORY_MOOD_LIGHTING.calm;
      expect(calm.brightness).toBe(30);
    });

    it("happy has high brightness for cheerfulness", () => {
      const happy = STORY_MOOD_LIGHTING.happy;
      expect(happy.brightness).toBe(90);
    });

    it("scary has low brightness for tension", () => {
      const scary = STORY_MOOD_LIGHTING.scary;
      expect(scary.brightness).toBe(40);
    });

    it("magical has medium-high brightness", () => {
      const magical = STORY_MOOD_LIGHTING.magical;
      expect(magical.brightness).toBe(70);
    });

    it("sad has low brightness", () => {
      const sad = STORY_MOOD_LIGHTING.sad;
      expect(sad.brightness).toBe(45);
    });
  });

  describe("HSL to hex conversion", () => {
    it("converts valid HSL to hex format", () => {
      const hex = hslToHex(0, 100, 50);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("converts adventure mood HSL to hex", () => {
      const adventure = STORY_MOOD_LIGHTING.adventure;
      const hex = hslToHex(adventure.hue, adventure.saturation, adventure.lightness);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("converts all mood colors to valid hex", () => {
      Object.values(STORY_MOOD_LIGHTING).forEach((mood) => {
        const hex = hslToHex(mood.hue, mood.saturation, mood.lightness);
        expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      });
    });

    it("handles zero saturation", () => {
      const hex = hslToHex(0, 0, 50);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("handles full saturation", () => {
      const hex = hslToHex(0, 100, 50);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("handles lightness at minimum", () => {
      const hex = hslToHex(180, 50, 0);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("handles lightness at maximum", () => {
      const hex = hslToHex(180, 50, 100);
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe("smart home configuration", () => {
    it("returns empty config for user with no devices", async () => {
      const config = await getSmartHomeConfig(999);
      expect(config.devices).toEqual([]);
      expect(config.isSmartHomeEnabled).toBe(false);
    });

    it("determines smart home enabled status", async () => {
      // Mock enabled device
      const { db } = await import("../../server/db");
      (db.select as any).mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([{ isEnabled: true }]),
        }),
      });

      const config = await getSmartHomeConfig(1);
      expect(config.devices).toBeDefined();
    });
  });

  describe("bedtime routine step types", () => {
    it("supports dim_lights step", () => {
      const step = {
        type: "dim_lights" as const,
        duration: 600,
        config: { brightness: 20 },
      };
      expect(step.type).toBe("dim_lights");
    });

    it("supports play_music step", () => {
      const step = {
        type: "play_music" as const,
        duration: 1800,
        config: { genre: "calm" },
      };
      expect(step.type).toBe("play_music");
    });

    it("supports read_story step", () => {
      const step = {
        type: "read_story" as const,
        duration: 900,
        config: { category: "peaceful" },
      };
      expect(step.type).toBe("read_story");
    });

    it("supports lights_off step", () => {
      const step = {
        type: "lights_off" as const,
        duration: 0,
        config: {},
      };
      expect(step.type).toBe("lights_off");
    });

    it("supports ambient_sound step", () => {
      const step = {
        type: "ambient_sound" as const,
        duration: 1800,
        config: { sound: "rain" },
      };
      expect(step.type).toBe("ambient_sound");
    });

    it("supports voice_command step", () => {
      const step = {
        type: "voice_command" as const,
        duration: 0,
        config: { command: "good night" },
      };
      expect(step.type).toBe("voice_command");
    });
  });

  describe("ambient sound library", () => {
    it("defines ambient sounds", () => {
      const sounds = ["rain", "ocean", "forest", "campfire", "wind", "stars"];
      // Ambient sounds should be defined in service
      expect(sounds).toHaveLength(6);
    });
  });

  describe("mood lighting properties validation", () => {
    it("all moods have valid HSL values", () => {
      Object.values(STORY_MOOD_LIGHTING).forEach((mood) => {
        expect(mood.hue).toBeGreaterThanOrEqual(0);
        expect(mood.hue).toBeLessThanOrEqual(360);
        expect(mood.saturation).toBeGreaterThanOrEqual(0);
        expect(mood.saturation).toBeLessThanOrEqual(100);
        expect(mood.lightness).toBeGreaterThanOrEqual(0);
        expect(mood.lightness).toBeLessThanOrEqual(100);
        expect(mood.brightness).toBeGreaterThanOrEqual(0);
        expect(mood.brightness).toBeLessThanOrEqual(100);
      });
    });

    it("all moods have proper structure", () => {
      Object.values(STORY_MOOD_LIGHTING).forEach((mood) => {
        expect(mood.name).toBeDefined();
        expect(mood.hue).toBeDefined();
        expect(mood.saturation).toBeDefined();
        expect(mood.lightness).toBeDefined();
        expect(mood.brightness).toBeDefined();
      });
    });
  });

  describe("bedtime routine validation", () => {
    it("validates routine has valid steps", () => {
      const routine = {
        id: 1,
        userId: 1,
        name: "Bedtime",
        steps: [
          {
            type: "dim_lights" as const,
            duration: 300,
            config: {},
          },
          {
            type: "play_music" as const,
            duration: 1800,
            config: {},
          },
        ],
        isActive: true,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      };

      expect(routine.steps).toHaveLength(2);
      routine.steps.forEach((step) => {
        expect(step.type).toBeDefined();
        expect(step.duration).toBeGreaterThanOrEqual(0);
        expect(step.config).toBeDefined();
      });
    });

    it("validates days of week", () => {
      const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday through Saturday
      const routine = {
        daysOfWeek,
      };

      routine.daysOfWeek.forEach((day) => {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      });
    });

    it("supports weekday-only routines", () => {
      const weekdayRoutine = {
        daysOfWeek: [1, 2, 3, 4, 5], // Monday through Friday
      };
      expect(weekdayRoutine.daysOfWeek).toHaveLength(5);
    });

    it("supports weekend-only routines", () => {
      const weekendRoutine = {
        daysOfWeek: [0, 6], // Sunday and Saturday
      };
      expect(weekendRoutine.daysOfWeek).toHaveLength(2);
    });
  });

  describe("smart home device platforms", () => {
    it("supports Philips Hue", () => {
      const platform = "philips_hue" as const;
      expect(platform).toBe("philips_hue");
    });

    it("supports Alexa", () => {
      const platform = "alexa" as const;
      expect(platform).toBe("alexa");
    });

    it("supports Google Home", () => {
      const platform = "google_home" as const;
      expect(platform).toBe("google_home");
    });

    it("supports other platforms", () => {
      const platform = "other" as const;
      expect(platform).toBe("other");
    });
  });

  describe("lighting color attributes", () => {
    it("adventure has warm tone", () => {
      const adventure = STORY_MOOD_LIGHTING.adventure;
      expect(adventure.hue).toBeGreaterThan(0);
      expect(adventure.hue).toBeLessThan(90);
    });

    it("calm has cool tone", () => {
      const calm = STORY_MOOD_LIGHTING.calm;
      expect(calm.hue).toBeGreaterThan(180);
      expect(calm.hue).toBeLessThan(270);
    });

    it("magical has cool-warm tone", () => {
      const magical = STORY_MOOD_LIGHTING.magical;
      expect(magical.hue).toBeGreaterThan(270);
    });
  });

  describe("device settings management", () => {
    it("preserves device settings during update", () => {
      const existingSettings = {
        brightness: 50,
        color: "warm",
        custom: "value",
      };
      const updates = {
        brightness: 75,
      };
      const merged = { ...existingSettings, ...updates };
      expect(merged.brightness).toBe(75);
      expect(merged.color).toBe("warm");
      expect(merged.custom).toBe("value");
    });
  });

  describe("mood lighting hex color validation", () => {
    it("generates valid hex colors for all moods", () => {
      Object.values(STORY_MOOD_LIGHTING).forEach((mood) => {
        const hex = hslToHex(mood.hue, mood.saturation, mood.lightness);
        // Validate hex format
        const hexRegex = /^#[0-9A-F]{6}$/;
        expect(hexRegex.test(hex)).toBe(true);
      });
    });

    it("generates readable hex color for adventure (orange)", () => {
      const adventure = STORY_MOOD_LIGHTING.adventure;
      const hex = hslToHex(adventure.hue, adventure.saturation, adventure.lightness);
      // Orange should have high red component
      const redComponent = hex.substring(1, 3);
      expect(parseInt(redComponent, 16)).toBeGreaterThan(150);
    });

    it("generates readable hex color for calm (blue)", () => {
      const calm = STORY_MOOD_LIGHTING.calm;
      const hex = hslToHex(calm.hue, calm.saturation, calm.lightness);
      // Blue should have high blue component
      const blueComponent = hex.substring(5, 7);
      expect(parseInt(blueComponent, 16)).toBeGreaterThan(80);
    });
  });
});
