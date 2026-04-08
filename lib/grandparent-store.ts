import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FamilyMember {
  id: number;
  familyMemberUserId: number;
  relationship: "grandparent" | "aunt_uncle" | "cousin" | "family_friend" | "other";
  familyMemberName: string;
  createdAt: Date;
}

export interface CoCreationSession {
  id: number;
  hostUserId: number;
  familyMemberUserId: number;
  childId: number;
  arcId?: number | null;
  status: "active" | "paused" | "completed";
  createdAt: Date;
  completedAt?: Date | null;
}

export interface MemoryPrompt {
  id: number;
  sessionId: number;
  userId: number;
  memoryText: string;
  category: "childhood" | "travel" | "family_tradition" | "funny_moment" | "life_lesson";
  generatedStoryId?: number | null;
  createdAt: Date;
}

export interface FamilyStory {
  id: number;
  hostUserId: number;
  familyMemberUserId: number;
  childId: number;
  status: "active" | "paused" | "completed";
  memoryCount: number;
  memories: MemoryPrompt[];
  createdAt: Date;
  completedAt?: Date | null;
}

interface GrandparentStore {
  // State
  familyMembers: FamilyMember[];
  activeSession: CoCreationSession | null;
  memoryPrompts: MemoryPrompt[];
  familyArchive: FamilyStory[];
  inviteCode: string | null;
  isGrandparentMode: boolean;
  fontSize: number; // Base font size multiplier for accessibility
  loading: {
    familyMembers: boolean;
    session: boolean;
    archive: boolean;
    memory: boolean;
  };

  // Actions
  setGrandparentMode: (enabled: boolean) => void;
  setFontSize: (size: number) => void;
  setFamilyMembers: (members: FamilyMember[]) => void;
  setActiveSession: (session: CoCreationSession | null) => void;
  setMemoryPrompts: (prompts: MemoryPrompt[]) => void;
  setFamilyArchive: (stories: FamilyStory[]) => void;
  setInviteCode: (code: string | null) => void;
  setLoading: (key: keyof GrandparentStore["loading"], value: boolean) => void;

  // Computed/Helper actions
  addMemoryPrompt: (prompt: MemoryPrompt) => void;
  addStoryToArchive: (story: FamilyStory) => void;
  clearActiveSession: () => void;
  reset: () => void;
}

const initialState = {
  familyMembers: [],
  activeSession: null,
  memoryPrompts: [],
  familyArchive: [],
  inviteCode: null,
  isGrandparentMode: false,
  fontSize: 1, // 1x multiplier, can be 1.2x, 1.5x for accessibility
  loading: {
    familyMembers: false,
    session: false,
    archive: false,
    memory: false,
  },
};

export const useGrandparentStore = create<GrandparentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setGrandparentMode: (enabled: boolean) => {
        set({ isGrandparentMode: enabled });
      },

      setFontSize: (size: number) => {
        // Clamp between 0.8x and 2x
        const clampedSize = Math.max(0.8, Math.min(2, size));
        set({ fontSize: clampedSize });
      },

      setFamilyMembers: (members: FamilyMember[]) => {
        set({ familyMembers: members });
      },

      setActiveSession: (session: CoCreationSession | null) => {
        set({ activeSession: session });
      },

      setMemoryPrompts: (prompts: MemoryPrompt[]) => {
        set({ memoryPrompts: prompts });
      },

      setFamilyArchive: (stories: FamilyStory[]) => {
        set({ familyArchive: stories });
      },

      setInviteCode: (code: string | null) => {
        set({ inviteCode: code });
      },

      setLoading: (key: keyof GrandparentStore["loading"], value: boolean) => {
        set((state) => ({
          loading: {
            ...state.loading,
            [key]: value,
          },
        }));
      },

      addMemoryPrompt: (prompt: MemoryPrompt) => {
        set((state) => ({
          memoryPrompts: [...state.memoryPrompts, prompt],
        }));
      },

      addStoryToArchive: (story: FamilyStory) => {
        set((state) => ({
          familyArchive: [...state.familyArchive, story],
        }));
      },

      clearActiveSession: () => {
        set({ activeSession: null, memoryPrompts: [] });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "grandparent-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isGrandparentMode: state.isGrandparentMode,
        fontSize: state.fontSize,
      }),
    }
  )
);
