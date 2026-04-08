import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ReadingSummary,
  DailyReadingData,
  ThemeBreakdownData,
  VocabularyGrowthData,
  HeatmapData,
  Milestone,
  WeeklyReport,
  PeerComparison,
} from "../server/_core/analyticsService";

const ANALYTICS_CACHE_KEY = "storyweaver_analytics_cache";

export interface AnalyticsState {
  // Data
  summary: ReadingSummary | null;
  trends: DailyReadingData[];
  themeBreakdown: ThemeBreakdownData[];
  vocabularyGrowth: VocabularyGrowthData[];
  heatmap: HeatmapData[];
  milestones: Milestone[];
  weeklyReport: WeeklyReport | null;
  peerComparison: PeerComparison | null;

  // UI State
  selectedChild: number | null;
  selectedPeriod: "week" | "month" | "all";
  isLoading: boolean;
  error: string | null;
  lastUpdated: number; // timestamp

  // Actions
  setSelectedChild: (childId: number) => void;
  setPeriod: (period: "week" | "month" | "all") => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Data loading
  loadAnalytics: (childId: number, userId: number) => Promise<void>;
  refreshData: (childId: number, userId: number) => Promise<void>;
  clearAnalytics: () => void;

  // Cache
  loadFromCache: () => Promise<void>;
  saveToCache: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
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

  // UI actions
  setSelectedChild: (childId: number) => {
    set({ selectedChild: childId });
  },

  setPeriod: (period: "week" | "month" | "all") => {
    set({ selectedPeriod: period });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Main data loading
  loadAnalytics: async (childId: number, userId: number) => {
    const state = get();

    // Don't reload if recently updated (within 5 minutes)
    if (
      state.selectedChild === childId &&
      Date.now() - state.lastUpdated < 5 * 60 * 1000
    ) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const period = state.selectedPeriod;

      // Fetch all analytics data in parallel
      const [summaryRes, trendsRes, themeRes, vocabRes, heatmapRes, milestonesRes, reportRes, peerRes] =
        await Promise.all([
          fetch(
            `/api/trpc/analytics.getReadingSummary?input=${encodeURIComponent(
              JSON.stringify({ childId, userId, period })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.getReadingTrends?input=${encodeURIComponent(
              JSON.stringify({
                childId,
                userId,
                days: period === "week" ? 7 : 30,
              })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.getThemeBreakdown?input=${encodeURIComponent(
              JSON.stringify({ childId, userId })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.getVocabularyGrowth?input=${encodeURIComponent(
              JSON.stringify({ childId, userId, days: 90 })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.getReadingHeatmap?input=${encodeURIComponent(
              JSON.stringify({ childId, userId, weeks: 12 })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.getMilestones?input=${encodeURIComponent(
              JSON.stringify({ childId, userId })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.getWeeklyReport?input=${encodeURIComponent(
              JSON.stringify({ childId, userId })
            )}`
          ),
          fetch(
            `/api/trpc/analytics.compareWithPeers?input=${encodeURIComponent(
              JSON.stringify({ childId, userId })
            )}`
          ),
        ]);

      // Parse all responses
      const summaryData = await summaryRes.json();
      const trendsData = await trendsRes.json();
      const themeData = await themeRes.json();
      const vocabData = await vocabRes.json();
      const heatmapData = await heatmapRes.json();
      const milestonesData = await milestonesRes.json();
      const reportData = await reportRes.json();
      const peerData = await peerRes.json();

      // Extract result from tRPC response format
      const extractResult = (res: any) => {
        if (res.result?.data) return res.result.data;
        if (res.data) return res.data;
        return null;
      };

      set({
        selectedChild: childId,
        summary: extractResult(summaryData),
        trends: extractResult(trendsData) || [],
        themeBreakdown: extractResult(themeData) || [],
        vocabularyGrowth: extractResult(vocabData) || [],
        heatmap: extractResult(heatmapData) || [],
        milestones: extractResult(milestonesData) || [],
        weeklyReport: extractResult(reportData),
        peerComparison: extractResult(peerData),
        lastUpdated: Date.now(),
        isLoading: false,
      });

      // Cache the data
      await get().saveToCache();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load analytics";
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  // Refresh data
  refreshData: async (childId: number, userId: number) => {
    set({ lastUpdated: 0 }); // Force reload
    await get().loadAnalytics(childId, userId);
  },

  // Clear analytics
  clearAnalytics: () => {
    set({
      summary: null,
      trends: [],
      themeBreakdown: [],
      vocabularyGrowth: [],
      heatmap: [],
      milestones: [],
      weeklyReport: null,
      peerComparison: null,
      selectedChild: null,
      error: null,
      lastUpdated: 0,
    });
  },

  // Cache operations
  loadFromCache: async () => {
    try {
      const cached = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        set(data);
      }
    } catch {
      // Silently fail on cache read errors
    }
  },

  saveToCache: async () => {
    try {
      const state = get();
      const cacheData = {
        summary: state.summary,
        trends: state.trends,
        themeBreakdown: state.themeBreakdown,
        vocabularyGrowth: state.vocabularyGrowth,
        heatmap: state.heatmap,
        milestones: state.milestones,
        weeklyReport: state.weeklyReport,
        peerComparison: state.peerComparison,
        selectedChild: state.selectedChild,
        selectedPeriod: state.selectedPeriod,
        lastUpdated: state.lastUpdated,
      };

      await AsyncStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(cacheData));
    } catch {
      // Silently fail on cache write errors
    }
  },
}));

// Initialize cache on app start
export async function initializeAnalyticsCache() {
  await useAnalyticsStore.getState().loadFromCache();
}
