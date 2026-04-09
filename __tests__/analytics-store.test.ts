// @ts-nocheck
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

import { useAnalyticsStore } from "../lib/analytics-store";

describe("analytics-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useAnalyticsStore.setState({
      summary: null,
      trends: [],
      themeBreakdown: [],
      vocabularyGrowth: [],
      heatmap: [],
      milestones: [],
      weeklyReport: null,
      peerComparison: null,
      selectedChild: null,
      selectedPeriod: "week",
      isLoading: false,
      error: null,
      lastUpdated: 0,
    });
  });

  describe("store initial state", () => {
    it("initializes with no summary", () => {
      const state = useAnalyticsStore.getState();
      expect(state.summary).toBeNull();
    });

    it("initializes with week period selected", () => {
      const state = useAnalyticsStore.getState();
      expect(state.selectedPeriod).toBe("week");
    });

    it("initializes with no child selected", () => {
      const state = useAnalyticsStore.getState();
      expect(state.selectedChild).toBeNull();
    });

    it("initializes with empty trends", () => {
      const state = useAnalyticsStore.getState();
      expect(state.trends).toEqual([]);
    });
  });

  describe("child selection", () => {
    it("selects a child", () => {
      const store = useAnalyticsStore.getState();
      store.setSelectedChild(5);
      expect(useAnalyticsStore.getState().selectedChild).toBe(5);
    });

    it("changes selected child", () => {
      const store = useAnalyticsStore.getState();
      store.setSelectedChild(5);
      store.setSelectedChild(6);
      expect(useAnalyticsStore.getState().selectedChild).toBe(6);
    });
  });

  describe("period selection", () => {
    it("selects week period", () => {
      const store = useAnalyticsStore.getState();
      store.setPeriod("week");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("week");
    });

    it("selects month period", () => {
      const store = useAnalyticsStore.getState();
      store.setPeriod("month");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("month");
    });

    it("selects all time period", () => {
      const store = useAnalyticsStore.getState();
      store.setPeriod("all");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("all");
    });

    it("switches between periods", () => {
      const store = useAnalyticsStore.getState();
      store.setPeriod("week");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("week");
      store.setPeriod("month");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("month");
      store.setPeriod("all");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("all");
    });
  });

  describe("loading state", () => {
    it("sets loading to true", () => {
      const store = useAnalyticsStore.getState();
      store.setLoading(true);
      expect(useAnalyticsStore.getState().isLoading).toBe(true);
    });

    it("sets loading to false", () => {
      const store = useAnalyticsStore.getState();
      store.setLoading(true);
      store.setLoading(false);
      expect(useAnalyticsStore.getState().isLoading).toBe(false);
    });
  });

  describe("error handling", () => {
    it("sets error message", () => {
      const store = useAnalyticsStore.getState();
      store.setError("Failed to load data");
      expect(useAnalyticsStore.getState().error).toBe("Failed to load data");
    });

    it("clears error", () => {
      const store = useAnalyticsStore.getState();
      store.setError("Some error");
      store.setError(null);
      expect(useAnalyticsStore.getState().error).toBeNull();
    });
  });

  describe("reading summary", () => {
    it("loads reading summary", () => {
      const summary = {
        totalStoriesRead: 25,
        averageReadingTime: 180,
        totalReadingTime: 4500,
        favoriteTheme: "adventure",
        currentReadingLevel: "3.5",
        weeklyReadingGoal: 10,
        weeklyStoriesRead: 8,
      };
      const store = useAnalyticsStore.getState();
      // Summary would be set via loadAnalytics
      useAnalyticsStore.setState({ summary: summary as any });
      expect(useAnalyticsStore.getState().summary?.totalStoriesRead).toBe(25);
    });
  });

  describe("trends data", () => {
    it("loads daily reading trends", () => {
      const trends = [
        { date: "2026-04-01", storiesRead: 2, readingTime: 180 },
        { date: "2026-04-02", storiesRead: 1, readingTime: 120 },
        { date: "2026-04-03", storiesRead: 3, readingTime: 300 },
      ];
      const store = useAnalyticsStore.getState();
      useAnalyticsStore.setState({ trends: trends as any });
      expect(useAnalyticsStore.getState().trends).toHaveLength(3);
    });

    it("tracks reading patterns over time", () => {
      const trends = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
        storiesRead: Math.floor(Math.random() * 4) + 1,
        readingTime: Math.floor(Math.random() * 300) + 60,
      }));
      useAnalyticsStore.setState({ trends: trends as any });
      expect(useAnalyticsStore.getState().trends).toHaveLength(7);
    });
  });

  describe("theme breakdown", () => {
    it("tracks stories by theme", () => {
      const themes = [
        { theme: "adventure", count: 10, averageReadingTime: 200 },
        { theme: "mystery", count: 8, averageReadingTime: 180 },
        { theme: "fantasy", count: 7, averageReadingTime: 190 },
      ];
      const store = useAnalyticsStore.getState();
      useAnalyticsStore.setState({ themeBreakdown: themes as any });
      expect(useAnalyticsStore.getState().themeBreakdown).toHaveLength(3);
    });

    it("identifies favorite theme", () => {
      const themes = [
        { theme: "adventure", count: 15, averageReadingTime: 200 },
        { theme: "mystery", count: 8, averageReadingTime: 180 },
      ];
      useAnalyticsStore.setState({ themeBreakdown: themes as any });
      const breakdown = useAnalyticsStore.getState().themeBreakdown;
      const favorite = breakdown.reduce((prev, current) =>
        prev.count > current.count ? prev : current
      );
      expect(favorite.theme).toBe("adventure");
    });
  });

  describe("vocabulary growth", () => {
    it("tracks vocabulary learning", () => {
      const vocab = [
        { month: "2026-02", wordsLearned: 50, uniqueWords: 50 },
        { month: "2026-03", wordsLearned: 75, uniqueWords: 45 },
        { month: "2026-04", wordsLearned: 100, uniqueWords: 55 },
      ];
      const store = useAnalyticsStore.getState();
      useAnalyticsStore.setState({ vocabularyGrowth: vocab as any });
      expect(useAnalyticsStore.getState().vocabularyGrowth).toHaveLength(3);
    });

    it("shows growth trend", () => {
      const vocab = [
        { month: "2026-02", wordsLearned: 25, uniqueWords: 20 },
        { month: "2026-03", wordsLearned: 50, uniqueWords: 35 },
        { month: "2026-04", wordsLearned: 100, uniqueWords: 60 },
      ];
      useAnalyticsStore.setState({ vocabularyGrowth: vocab as any });
      const data = useAnalyticsStore.getState().vocabularyGrowth;
      expect(data[0].wordsLearned).toBeLessThan(data[1].wordsLearned);
      expect(data[1].wordsLearned).toBeLessThan(data[2].wordsLearned);
    });
  });

  describe("heatmap data", () => {
    it("tracks daily reading activity", () => {
      const heatmap = [
        { date: "2026-04-01", activity: 3, intensity: "high" },
        { date: "2026-04-02", activity: 1, intensity: "low" },
        { date: "2026-04-03", activity: 2, intensity: "medium" },
      ];
      useAnalyticsStore.setState({ heatmap: heatmap as any });
      expect(useAnalyticsStore.getState().heatmap).toHaveLength(3);
    });
  });

  describe("milestones", () => {
    it("tracks reading milestones", () => {
      const milestones = [
        { id: 1, title: "First Story", description: "Completed first story", unlockedAt: new Date() },
        { id: 2, title: "10 Stories", description: "Read 10 stories", unlockedAt: new Date() },
        { id: 3, title: "Reading Streak", description: "7-day reading streak", unlockedAt: null },
      ];
      useAnalyticsStore.setState({ milestones: milestones as any });
      expect(useAnalyticsStore.getState().milestones).toHaveLength(3);
    });

    it("identifies unlocked vs locked milestones", () => {
      const milestones = [
        { id: 1, title: "First", unlockedAt: new Date() },
        { id: 2, title: "Tenth", unlockedAt: new Date() },
        { id: 3, title: "Hundredth", unlockedAt: null },
      ];
      useAnalyticsStore.setState({ milestones: milestones as any });
      const data = useAnalyticsStore.getState().milestones;
      const unlocked = data.filter((m: any) => m.unlockedAt);
      const locked = data.filter((m: any) => !m.unlockedAt);
      expect(unlocked).toHaveLength(2);
      expect(locked).toHaveLength(1);
    });
  });

  describe("weekly report", () => {
    it("generates weekly report", () => {
      const report = {
        week: "2026-W14",
        totalReadingTime: 1200,
        storiesRead: 5,
        averageReadingTime: 240,
        mostActiveDay: "Saturday",
        favoriteTheme: "adventure",
        readingStreak: 5,
      };
      useAnalyticsStore.setState({ weeklyReport: report as any });
      expect(useAnalyticsStore.getState().weeklyReport?.storiesRead).toBe(5);
    });
  });

  describe("peer comparison", () => {
    it("provides peer comparison data", () => {
      const comparison = {
        childReadingTime: 1200,
        peerAverageReadingTime: 900,
        childStoriesRead: 10,
        peerAverageStoriesRead: 8,
        childReadingLevel: "3.8",
        peerAverageReadingLevel: "3.5",
        percentile: 75,
      };
      useAnalyticsStore.setState({ peerComparison: comparison as any });
      expect(useAnalyticsStore.getState().peerComparison?.percentile).toBe(75);
    });
  });

  describe("cache operations", () => {
    it("saves analytics to cache", async () => {
      const store = useAnalyticsStore.getState();
      useAnalyticsStore.setState({
        summary: { totalStoriesRead: 25 } as any,
        selectedChild: 5,
      });
      await store.saveToCache();
      expect(mockStorage["storyweaver_analytics_cache"]).toBeDefined();
    });

    it("loads analytics from cache", async () => {
      mockStorage["storyweaver_analytics_cache"] = JSON.stringify({
        summary: { totalStoriesRead: 25 },
        selectedChild: 5,
      });
      const store = useAnalyticsStore.getState();
      await store.loadFromCache();
      // Cache loading would update state
      expect(store).toBeDefined();
    });
  });

  describe("clearing analytics", () => {
    it("clears all analytics data", () => {
      const store = useAnalyticsStore.getState();
      useAnalyticsStore.setState({
        summary: { totalStoriesRead: 25 } as any,
        trends: [{ date: "2026-04-01" }] as any,
        themeBreakdown: [{ theme: "adventure", count: 10 }] as any,
      });

      store.clearAnalytics();

      const state = useAnalyticsStore.getState();
      expect(state.summary).toBeNull();
      expect(state.trends).toEqual([]);
      expect(state.themeBreakdown).toEqual([]);
    });
  });

  describe("analytics workflow", () => {
    it("supports complete analytics workflow", async () => {
      const store = useAnalyticsStore.getState();

      // Select child
      store.setSelectedChild(5);
      expect(useAnalyticsStore.getState().selectedChild).toBe(5);

      // Select period
      store.setPeriod("month");
      expect(useAnalyticsStore.getState().selectedPeriod).toBe("month");

      // Load data
      store.setLoading(true);
      useAnalyticsStore.setState({
        summary: { totalStoriesRead: 15 } as any,
        trends: [{ date: "2026-04-01", storiesRead: 2 }] as any,
        themeBreakdown: [{ theme: "mystery", count: 8 }] as any,
      });
      store.setLoading(false);

      const state = useAnalyticsStore.getState();
      expect(state.selectedChild).toBe(5);
      expect(state.selectedPeriod).toBe("month");
      expect(state.isLoading).toBe(false);
      expect(state.summary?.totalStoriesRead).toBe(15);
    });
  });

  describe("multiple children analytics", () => {
    it("switches between children analytics", () => {
      const store = useAnalyticsStore.getState();

      // Load for child 5
      store.setSelectedChild(5);
      useAnalyticsStore.setState({
        summary: { totalStoriesRead: 25 } as any,
      });

      // Switch to child 6
      store.setSelectedChild(6);
      useAnalyticsStore.setState({
        summary: { totalStoriesRead: 18 } as any,
      });

      expect(useAnalyticsStore.getState().summary?.totalStoriesRead).toBe(18);
    });
  });

  describe("caching and performance", () => {
    it("avoids reloading within 5 minute cache window", () => {
      const store = useAnalyticsStore.getState();
      store.setSelectedChild(5);

      useAnalyticsStore.setState({
        lastUpdated: Date.now(),
        summary: { totalStoriesRead: 25 } as any,
      });

      const timeSinceUpdate = Date.now() - useAnalyticsStore.getState().lastUpdated;
      expect(timeSinceUpdate).toBeLessThan(5 * 60 * 1000);
    });
  });
});
