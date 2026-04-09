import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const PARENT_TOOLS_KEY = "storyweaver_parent_tools";

export interface CustomElement {
  id: number;
  userId: number;
  childId: number;
  elementType: "character" | "location" | "moral" | "pet" | "object";
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceRecording {
  id: number;
  userId: number;
  childId: number;
  voiceName: string;
  sampleAudioUrl: string | null;
  voiceModelId: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalQueueItem {
  id: number;
  userId: number;
  childId: number;
  episodeId: number;
  status: "pending" | "approved" | "rejected" | "edited";
  parentNotes: string | null;
  editedContent: Record<string, unknown> | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChildStoryPreferences {
  characters: Array<{
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
  }>;
  locations: Array<{
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
  }>;
  morals: Array<{
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
  }>;
  pets: Array<{
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
  }>;
  objects: Array<{
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
  }>;
}

export interface ParentToolsState {
  // State
  customElements: Map<number, CustomElement[]>;
  voiceRecordings: Map<number, VoiceRecording[]>;
  approvalQueue: ApprovalQueueItem[];
  childPreferences: Map<number, ChildStoryPreferences>;
  isLoading: boolean;
  error: string | null;

  // Pure state setters — no tRPC calls; components orchestrate data fetching
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Custom Elements
  setCustomElements: (childId: number, elements: CustomElement[]) => Promise<void>;
  addCustomElement: (childId: number, element: CustomElement) => Promise<void>;
  replaceCustomElement: (elementId: number, updated: CustomElement) => Promise<void>;
  removeCustomElement: (elementId: number) => Promise<void>;

  // Voice Recordings
  setVoiceRecordings: (childId: number, recordings: VoiceRecording[]) => Promise<void>;
  addVoiceRecording: (childId: number, recording: VoiceRecording) => Promise<void>;
  updateRecordingInStore: (
    recordingId: number,
    status: VoiceRecording["status"],
    voiceModelId?: string
  ) => Promise<void>;

  // Approval Queue
  setApprovalQueue: (queue: ApprovalQueueItem[]) => Promise<void>;
  addToApprovalQueue: (item: ApprovalQueueItem) => Promise<void>;
  updateApprovalItem: (
    queueId: number,
    status: string,
    parentNotes?: string,
    editedContent?: Record<string, unknown>
  ) => Promise<void>;

  // Preferences
  setChildPreferences: (childId: number, preferences: ChildStoryPreferences) => Promise<void>;

  // Utilities
  clearError: () => void;
}

export const useParentToolsStore = create<ParentToolsState>((set, get) => ({
  customElements: new Map(),
  voiceRecordings: new Map(),
  approvalQueue: [],
  childPreferences: new Map(),
  isLoading: false,
  error: null,

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  // ─── Custom Elements ───────────────────────────────────────
  setCustomElements: async (childId: number, elements: CustomElement[]) => {
    set((state) => {
      const newMap = new Map(state.customElements);
      newMap.set(childId, elements);
      return { customElements: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.customElements.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  addCustomElement: async (childId: number, element: CustomElement) => {
    set((state) => {
      const newMap = new Map(state.customElements);
      const currentElements = newMap.get(childId) || [];
      newMap.set(childId, [...currentElements, element]);
      return { customElements: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.customElements.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  replaceCustomElement: async (elementId: number, updated: CustomElement) => {
    set((state) => {
      const newMap = new Map(state.customElements);
      newMap.forEach((elements, childId) => {
        const idx = elements.findIndex((e) => e.id === elementId);
        if (idx >= 0) {
          const newElements = [...elements];
          newElements[idx] = updated;
          newMap.set(childId, newElements);
        }
      });
      return { customElements: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.customElements.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  removeCustomElement: async (elementId: number) => {
    set((state) => {
      const newMap = new Map(state.customElements);
      newMap.forEach((elements, childId) => {
        const filtered = elements.filter((e) => e.id !== elementId);
        newMap.set(childId, filtered);
      });
      return { customElements: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.customElements.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  // ─── Voice Recordings ──────────────────────────────────────
  setVoiceRecordings: async (childId: number, recordings: VoiceRecording[]) => {
    set((state) => {
      const newMap = new Map(state.voiceRecordings);
      newMap.set(childId, recordings);
      return { voiceRecordings: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.voiceRecordings.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  addVoiceRecording: async (childId: number, recording: VoiceRecording) => {
    set((state) => {
      const newMap = new Map(state.voiceRecordings);
      const currentRecordings = newMap.get(childId) || [];
      newMap.set(childId, [...currentRecordings, recording]);
      return { voiceRecordings: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.voiceRecordings.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  updateRecordingInStore: async (recordingId, status, voiceModelId) => {
    set((state) => {
      const newMap = new Map(state.voiceRecordings);
      newMap.forEach((recordings, childId) => {
        const idx = recordings.findIndex((r) => r.id === recordingId);
        if (idx >= 0) {
          const newRecordings = [...recordings];
          newRecordings[idx] = {
            ...newRecordings[idx],
            status,
            voiceModelId: voiceModelId || newRecordings[idx].voiceModelId,
          };
          newMap.set(childId, newRecordings);
        }
      });
      return { voiceRecordings: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.voiceRecordings.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  // ─── Approval Queue ────────────────────────────────────────
  setApprovalQueue: async (queue: ApprovalQueueItem[]) => {
    set({ approvalQueue: queue, isLoading: false });
    await AsyncStorage.setItem(
      PARENT_TOOLS_KEY,
      JSON.stringify({ approvalQueue: queue })
    );
  },

  addToApprovalQueue: async (item: ApprovalQueueItem) => {
    set((state) => {
      const newQueue = [...state.approvalQueue];
      const exists = newQueue.some((q) => q.episodeId === item.episodeId);
      if (!exists) {
        newQueue.push(item);
      }
      return { approvalQueue: newQueue, isLoading: false };
    });

    const state = get();
    await AsyncStorage.setItem(
      PARENT_TOOLS_KEY,
      JSON.stringify({ approvalQueue: state.approvalQueue })
    );
  },

  updateApprovalItem: async (queueId, status, parentNotes, editedContent) => {
    set((state) => {
      const newQueue = [...state.approvalQueue];
      const idx = newQueue.findIndex((item) => item.id === queueId);
      if (idx >= 0) {
        newQueue[idx] = {
          ...newQueue[idx],
          status: status as ApprovalQueueItem["status"],
          parentNotes: parentNotes || newQueue[idx].parentNotes,
          editedContent: editedContent || newQueue[idx].editedContent,
          reviewedAt: new Date(),
        };
      }
      return { approvalQueue: newQueue, isLoading: false };
    });

    const state = get();
    await AsyncStorage.setItem(
      PARENT_TOOLS_KEY,
      JSON.stringify({ approvalQueue: state.approvalQueue })
    );
  },

  // ─── Preferences ──────────────────────────────────────────
  setChildPreferences: async (childId: number, preferences: ChildStoryPreferences) => {
    set((state) => {
      const newMap = new Map(state.childPreferences);
      newMap.set(childId, preferences);
      return { childPreferences: newMap, isLoading: false };
    });

    const state = get();
    const cacheData = Array.from(state.childPreferences.entries());
    await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
  },

  // ─── Utilities ────────────────────────────────────────────
  clearError: () => {
    set({ error: null });
  },
}));

// Load cached parent tools on store creation
export async function initializeParentToolsCache() {
  try {
    const cached = await AsyncStorage.getItem(PARENT_TOOLS_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const store = useParentToolsStore.getState();

      if (Array.isArray(data)) {
        // Custom elements or voice recordings cache
        const elementMap = new Map(
          data.filter(
            ([, items]: [number, unknown]) =>
              Array.isArray(items) &&
              (items[0] as any)?.elementType !== undefined
          )
        );
        if (elementMap.size > 0) {
          store.customElements = elementMap;
        }

        const recordingMap = new Map(
          data.filter(
            ([, items]: [number, unknown]) =>
              Array.isArray(items) && (items[0] as any)?.voiceName !== undefined
          )
        );
        if (recordingMap.size > 0) {
          store.voiceRecordings = recordingMap;
        }
      } else if (data.approvalQueue) {
        store.approvalQueue = data.approvalQueue;
      }
    }
  } catch (error) {
    console.error("Failed to load parent tools cache:", error);
  }
}
