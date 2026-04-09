import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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

  // Pure state setters — no tRPC calls; components orchestrate data fetching
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (childId: number, progress: ChildProgress) => Promise<void>;
  setAchievements: (childId: number, achievements: Achievement[]) => Promise<void>;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => Promise<void>;
  updateProgressAfterReading: (childId: number, progress: ChildProgress) => Promise<void>;
  clearError: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  childProgress: new Map(),
  allAchievements: new Map(),
  leaderboard: [],
  isLoading: false,
  error: null,

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  setProgress: async (childId: number, progress: ChildProgress) => {
    set((state) => {
      const newMap = new Map(state.childProgress);
      newMap.set(childId, progress);
      return { childProgress: newMap, isLoading: false };
    });

    // Cache to AsyncStorage
    const state = get();
    const cacheData = Array.from(state.childProgress.entries());
    await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(cacheData));
  },

  setAchievements: async (childId: number, achievements: Achievement[]) => {
    set((state) => {
      const newMap = new Map(state.allAchievements);
      newMap.set(childId, achievements);
      return { allAchievements: newMap, isLoading: false };
    });

    // Cache to AsyncStorage
    const state = get();
    const cacheData = Array.from(state.allAchievements.entries());
    await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(cacheData));
  },

  setLeaderboard: async (leaderboard: LeaderboardEntry[]) => {
    set({ leaderboard, isLoading: false });

    // Cache to AsyncStorage
    await AsyncStorage.setItem(
      GAMIFICATION_KEY,
      JSON.stringify({ leaderboard })
    );
  },

  updateProgressAfterReading: async (childId: number, progress: ChildProgress) => {
    set((state) => {
      const newMap = new Map(state.childProgress);
      newMap.set(childId, progress);
      return { childProgress: newMap, isLoading: false };
    });

    // Cache to AsyncStorage
    const state = get();
    const cacheData = Array.from(state.childProgress.entries());
    await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(cacheData));
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
