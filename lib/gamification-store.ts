import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { trpc } from "../app/_layout";

const GAMIFICATION_KEY = "storyweaver_gamification";

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: "reading" | "streak" | "exploration" | "bedtime" | "collection";
  maxProgress: number;
  pointsReward: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface ChildProgress {
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  unlockedAchievements: string[];
  achievements: Array<{
    key: string;
    name: string;
    icon: string;
    description: string;
    tier: string;
    pointsReward: number;
  }>;
  recentActivity: Array<{
    type: string;
    points: number;
    date: Date;
  }>;
}

export interface LeaderboardEntry {
  childId: number;
  childName: string;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
}

export interface GamificationState {
  // State
  childProgress: Map<number, ChildProgress>;
  allAchievements: Map<number, Achievement[]>;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProgress: (childId: number) => Promise<void>;
  fetchAchievements: (childId: number) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  recordReading: (
    childId: number,
    episodeId: number
  ) => Promise<{
    newlyUnlocked: Array<{
      key: string;
      name: string;
      icon: string;
      pointsReward: number;
    }>;
    progress: ChildProgress;
    streakIncremented: boolean;
    currentStreak: number;
  } | null>;
  clearError: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  childProgress: new Map(),
  allAchievements: new Map(),
  leaderboard: [],
  isLoading: false,
  error: null,

  fetchProgress: async (childId: number) => {
    set({ isLoading: true, error: null });
    try {
      const progress = await trpc.gamification.getChildProgress.query({
        childId,
      });

      set((state) => {
        const newMap = new Map(state.childProgress);
        newMap.set(childId, progress);
        return { childProgress: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.childProgress.entries());
      await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch progress";
      set({ error: message, isLoading: false });
    }
  },

  fetchAchievements: async (childId: number) => {
    set({ isLoading: true, error: null });
    try {
      const achievements = await trpc.gamification.getAchievements.query({
        childId,
      });

      set((state) => {
        const newMap = new Map(state.allAchievements);
        newMap.set(childId, achievements);
        return { allAchievements: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.allAchievements.entries());
      await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch achievements";
      set({ error: message, isLoading: false });
    }
  },

  fetchLeaderboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const leaderboard = await trpc.gamification.getLeaderboard.query();
      set({ leaderboard, isLoading: false });

      // Cache to AsyncStorage
      await AsyncStorage.setItem(
        GAMIFICATION_KEY,
        JSON.stringify({ leaderboard })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch leaderboard";
      set({ error: message, isLoading: false });
    }
  },

  recordReading: async (childId: number, episodeId: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await trpc.gamification.recordReading.mutate({
        childId,
        episodeId,
      });

      if (result) {
        set((state) => {
          const newMap = new Map(state.childProgress);
          newMap.set(childId, result.progress);
          return { childProgress: newMap, isLoading: false };
        });

        // Cache to AsyncStorage
        const state = get();
        const cacheData = Array.from(state.childProgress.entries());
        await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(cacheData));
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record reading";
      set({ error: message, isLoading: false });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Load cached progress on store creation
export async function initializeGamificationCache() {
  try {
    const cached = await AsyncStorage.getItem(GAMIFICATION_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const store = useGamificationStore.getState();

      if (Array.isArray(data)) {
        // Old cache format with progress entries
        const progressMap = new Map(data);
        store.childProgress = progressMap;
      }
    }
  } catch (error) {
    console.error("Failed to load gamification cache:", error);
  }
}
