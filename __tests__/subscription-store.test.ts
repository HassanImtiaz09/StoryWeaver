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
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  getSubscriptionState,
  saveSubscriptionState,
  incrementStoriesUsed,
  canCreateStory,
  canUseHDVoices,
  canUseNDModes,
  activateSubscription,
  activateTrial,
  restorePurchases,
  cancelSubscription,
  isPremiumPlan,
  formatExpiryDate,
  getRemainingFreeStories,
  PLAN_DETAILS,
} from "../lib/subscription-store";

describe("subscription-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe("getSubscriptionState", () => {
    it("returns default state when no data stored", async () => {
      const state = await getSubscriptionState();
      expect(state.plan).toBe("free");
      expect(state.storiesUsed).toBe(0);
      expect(state.freeStoriesLimit).toBe(3);
      expect(state.expiresAt).toBeNull();
      expect(state.trialActive).toBe(false);
    });

    it("returns saved state", async () => {
      mockStorage["storyweaver_subscription"] = JSON.stringify({
        plan: "monthly",
        storiesUsed: 5,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      const state = await getSubscriptionState();
      expect(state.plan).toBe("monthly");
      expect(state.storiesUsed).toBe(5);
    });

    it("auto-downgrades expired subscription", async () => {
      mockStorage["storyweaver_subscription"] = JSON.stringify({
        plan: "monthly",
        storiesUsed: 5,
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      });
      const state = await getSubscriptionState();
      expect(state.plan).toBe("free");
      expect(state.expiresAt).toBeNull();
    });
  });

  describe("incrementStoriesUsed", () => {
    it("increments stories used count", async () => {
      const state1 = await getSubscriptionState();
      expect(state1.storiesUsed).toBe(0);

      const state2 = await incrementStoriesUsed();
      expect(state2.storiesUsed).toBe(1);

      const state3 = await incrementStoriesUsed();
      expect(state3.storiesUsed).toBe(2);
    });
  });

  describe("canCreateStory", () => {
    it("allows free users under limit", async () => {
      const result = await canCreateStory();
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
    });

    it("blocks free users at limit", async () => {
      await saveSubscriptionState({ storiesUsed: 3 });
      const result = await canCreateStory();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("always allows premium users", async () => {
      await activateSubscription("monthly");
      const result = await canCreateStory();
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe("canUseHDVoices", () => {
    it("blocks free users", async () => {
      const result = await canUseHDVoices();
      expect(result).toBe(false);
    });

    it("allows premium users", async () => {
      await activateSubscription("weekly");
      const result = await canUseHDVoices();
      expect(result).toBe(true);
    });

    it("allows trial users", async () => {
      await activateTrial("monthly", 7);
      const result = await canUseHDVoices();
      expect(result).toBe(true);
    });
  });

  describe("canUseNDModes", () => {
    it("blocks free users", async () => {
      const result = await canUseNDModes();
      expect(result).toBe(false);
    });

    it("blocks weekly users", async () => {
      await activateSubscription("weekly");
      const result = await canUseNDModes();
      expect(result).toBe(false);
    });

    it("allows annual users", async () => {
      await activateSubscription("annual");
      const result = await canUseNDModes();
      expect(result).toBe(true);
    });
  });

  describe("activateSubscription", () => {
    it("activates weekly plan", async () => {
      const state = await activateSubscription("weekly");
      expect(state.plan).toBe("weekly");
      expect(state.expiresAt).toBeDefined();
      expect(state.lastPurchaseDate).toBeDefined();
    });

    it("activates monthly plan", async () => {
      const state = await activateSubscription("monthly");
      expect(state.plan).toBe("monthly");
    });

    it("activates annual plan", async () => {
      const state = await activateSubscription("annual");
      expect(state.plan).toBe("annual");
    });
  });

  describe("activateTrial", () => {
    it("activates trial with correct duration", async () => {
      const state = await activateTrial("monthly", 7);
      expect(state.plan).toBe("monthly");
      expect(state.trialActive).toBe(true);
      expect(state.trialEndsAt).toBeDefined();
    });
  });

  describe("cancelSubscription", () => {
    it("resets to free plan", async () => {
      await activateSubscription("annual");
      const state = await cancelSubscription();
      expect(state.plan).toBe("free");
      expect(state.expiresAt).toBeNull();
      expect(state.trialActive).toBe(false);
    });
  });

  describe("restorePurchases", () => {
    it("restores existing purchase", async () => {
      await activateSubscription("monthly");
      const result = await restorePurchases();
      expect(result.restored).toBe(true);
      expect(result.plan).toBe("monthly");
    });

    it("returns false when no purchases", async () => {
      const result = await restorePurchases();
      expect(result.restored).toBe(false);
    });
  });

  describe("helpers", () => {
    it("isPremiumPlan correctly identifies plans", () => {
      expect(isPremiumPlan("free")).toBe(false);
      expect(isPremiumPlan("weekly")).toBe(true);
      expect(isPremiumPlan("monthly")).toBe(true);
      expect(isPremiumPlan("annual")).toBe(true);
    });

    it("formatExpiryDate formats correctly", () => {
      expect(formatExpiryDate(null)).toBe("");
      const date = "2026-12-25T00:00:00.000Z";
      const formatted = formatExpiryDate(date);
      expect(formatted).toContain("December");
      expect(formatted).toContain("2026");
    });

    it("getRemainingFreeStories returns correct count", () => {
      expect(
        getRemainingFreeStories({
          plan: "free",
          storiesUsed: 1,
          freeStoriesLimit: 3,
          expiresAt: null,
          trialActive: false,
          trialEndsAt: null,
          lastPurchaseDate: null,
        })
      ).toBe(2);
    });

    it("getRemainingFreeStories returns -1 for premium", () => {
      expect(
        getRemainingFreeStories({
          plan: "monthly",
          storiesUsed: 10,
          freeStoriesLimit: 3,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          trialActive: false,
          trialEndsAt: null,
          lastPurchaseDate: new Date().toISOString(),
        })
      ).toBe(-1);
    });

    it("PLAN_DETAILS has 3 plans", () => {
      expect(PLAN_DETAILS).toHaveLength(3);
      expect(PLAN_DETAILS.map((p) => p.id)).toEqual(["weekly", "monthly", "annual"]);
    });
  });
});
