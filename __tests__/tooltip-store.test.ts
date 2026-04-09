import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((k) => delete mockStorage[k]);
      return Promise.resolve();
    }),
  },
}));

// Must import AFTER mocks are set up
import {
  dismissTooltip,
  recordMilestone,
  hasMilestone,
  isTooltipDismissed,
  getActiveTooltip,
  resetAllTooltips,
  TOOLTIP_CONFIGS,
} from "../lib/tooltip-store";

describe("tooltip-store", () => {
  beforeEach(async () => {
    // Clear storage and caches
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    await resetAllTooltips();
  });

  describe("dismissTooltip", () => {
    it("should mark a tooltip as dismissed", async () => {
      expect(await isTooltipDismissed("welcome_create_profile")).toBe(false);
      await dismissTooltip("welcome_create_profile");
      expect(await isTooltipDismissed("welcome_create_profile")).toBe(true);
    });

    it("should persist dismissal across calls", async () => {
      await dismissTooltip("tap_create_button");
      expect(await isTooltipDismissed("tap_create_button")).toBe(true);
      // Verify it's in storage
      const stored = JSON.parse(mockStorage["sw_tooltips_dismissed"] || "[]");
      expect(stored).toContain("tap_create_button");
    });
  });

  describe("recordMilestone", () => {
    it("should record a milestone", async () => {
      expect(await hasMilestone("child_created")).toBe(false);
      await recordMilestone("child_created");
      expect(await hasMilestone("child_created")).toBe(true);
    });

    it("should persist milestones", async () => {
      await recordMilestone("story_created");
      const stored = JSON.parse(mockStorage["sw_tooltips_milestones"] || "[]");
      expect(stored).toContain("story_created");
    });
  });

  describe("getActiveTooltip", () => {
    it("should show welcome tooltip on home when no children", async () => {
      const tooltip = await getActiveTooltip("home", {
        hasChildren: false,
        hasStories: false,
      });
      expect(tooltip).not.toBeNull();
      expect(tooltip!.id).toBe("welcome_create_profile");
    });

    it("should show first_child_created tooltip after child is created", async () => {
      await recordMilestone("child_created");
      const tooltip = await getActiveTooltip("home", {
        hasChildren: true,
        hasStories: false,
      });
      expect(tooltip).not.toBeNull();
      expect(tooltip!.id).toBe("first_child_created");
    });

    it("should show tap_create_button on create tab when no stories", async () => {
      const tooltip = await getActiveTooltip("create", {
        hasChildren: true,
        hasStories: false,
      });
      expect(tooltip).not.toBeNull();
      expect(tooltip!.id).toBe("tap_create_button");
    });

    it("should show explore_library on library tab when stories exist", async () => {
      const tooltip = await getActiveTooltip("library", {
        hasChildren: true,
        hasStories: true,
      });
      expect(tooltip).not.toBeNull();
      expect(tooltip!.id).toBe("explore_library");
    });

    it("should show family_tab_intro on family tab when children exist", async () => {
      const tooltip = await getActiveTooltip("family", {
        hasChildren: true,
        hasStories: false,
      });
      expect(tooltip).not.toBeNull();
      expect(tooltip!.id).toBe("family_tab_intro");
    });

    it("should return null after tooltip is dismissed", async () => {
      await dismissTooltip("welcome_create_profile");
      const tooltip = await getActiveTooltip("home", {
        hasChildren: false,
        hasStories: false,
      });
      expect(tooltip).toBeNull();
    });

    it("should show story_created tooltip after story milestone", async () => {
      await recordMilestone("story_created");
      const tooltip = await getActiveTooltip("home", {
        hasChildren: true,
        hasStories: true,
      });
      expect(tooltip).not.toBeNull();
      expect(tooltip!.id).toBe("story_created");
    });

    it("should not show create tooltip when stories exist", async () => {
      const tooltip = await getActiveTooltip("create", {
        hasChildren: true,
        hasStories: true,
      });
      expect(tooltip).toBeNull();
    });

    it("should not show library tooltip when no stories", async () => {
      const tooltip = await getActiveTooltip("library", {
        hasChildren: true,
        hasStories: false,
      });
      expect(tooltip).toBeNull();
    });
  });

  describe("resetAllTooltips", () => {
    it("should clear all dismissed tooltips and milestones", async () => {
      await dismissTooltip("welcome_create_profile");
      await recordMilestone("child_created");

      await resetAllTooltips();

      expect(await isTooltipDismissed("welcome_create_profile")).toBe(false);
      expect(await hasMilestone("child_created")).toBe(false);
    });
  });

  describe("TOOLTIP_CONFIGS", () => {
    it("should have all required tooltip definitions", () => {
      const expectedIds = [
        "welcome_create_profile",
        "first_child_created",
        "tap_create_button",
        "story_created",
        "explore_library",
        "family_tab_intro",
      ];
      expectedIds.forEach((id) => {
        expect(TOOLTIP_CONFIGS[id as keyof typeof TOOLTIP_CONFIGS]).toBeDefined();
        expect(TOOLTIP_CONFIGS[id as keyof typeof TOOLTIP_CONFIGS].title).toBeTruthy();
        expect(TOOLTIP_CONFIGS[id as keyof typeof TOOLTIP_CONFIGS].message).toBeTruthy();
        expect(TOOLTIP_CONFIGS[id as keyof typeof TOOLTIP_CONFIGS].emoji).toBeTruthy();
      });
    });
  });
});
