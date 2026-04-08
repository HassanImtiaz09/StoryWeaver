import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  DiversityProfile,
  DiversityCategory,
  CulturalEvent,
  RepresentationStats,
} from "@/server/_core/diversityService";

interface DiversityStore {
  profile: DiversityProfile | null;
  categories: DiversityCategory[];
  representationStats: RepresentationStats | null;
  culturalEvents: CulturalEvent[];
  loading: boolean;
  error: string | null;

  setProfile: (profile: DiversityProfile) => void;
  setCategories: (categories: DiversityCategory[]) => void;
  setRepresentationStats: (stats: RepresentationStats) => void;
  setCulturalEvents: (events: CulturalEvent[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  categories: [],
  representationStats: null,
  culturalEvents: [],
  loading: false,
  error: null,
};

export const useDiversityStore = create<DiversityStore>()(
  persist(
    (set) => ({
      ...initialState,

      setProfile: (profile: DiversityProfile) =>
        set({ profile, error: null }),

      setCategories: (categories: DiversityCategory[]) =>
        set({ categories, error: null }),

      setRepresentationStats: (representationStats: RepresentationStats) =>
        set({ representationStats, error: null }),

      setCulturalEvents: (culturalEvents: CulturalEvent[]) =>
        set({ culturalEvents, error: null }),

      setLoading: (loading: boolean) => set({ loading }),

      setError: (error: string | null) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: "diversity-store",
      storage: AsyncStorage,
      partialize: (state) => ({
        profile: state.profile,
        categories: state.categories,
        representationStats: state.representationStats,
        culturalEvents: state.culturalEvents,
      }),
    }
  )
);
