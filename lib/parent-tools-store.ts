import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

/**
 * Helper to make tRPC-compatible API calls from outside React tree.
 */
async function apiCall(method: "GET" | "POST", path: string, input?: any) {
  const { getApiBaseUrl } = await import("@/constants/oauth");
  const Auth = await import("@/lib/_core/auth");
  const baseUrl = getApiBaseUrl();
  const token = await Auth.getSessionToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (method === "GET") {
    const params = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
    const res = await fetch(`${baseUrl}/api/trpc/${path}${params}`, { method: "GET", headers, credentials: "include" });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? "Request failed");
    return json.result?.data;
  } else {
    const res = await fetch(`${baseUrl}/api/trpc/${path}`, { method: "POST", headers, credentials: "include", body: JSON.stringify(input) });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? "Request failed");
    return json.result?.data;
  }
}

const trpc = {
  parentTools: {
    getCustomElements: { query: (input: any) => apiCall("GET", "parentTools.getCustomElements", input) },
    createCustomElement: { mutate: (input: any) => apiCall("POST", "parentTools.createCustomElement", input) },
    updateCustomElement: { mutate: (input: any) => apiCall("POST", "parentTools.updateCustomElement", input) },
    deleteCustomElement: { mutate: (input: any) => apiCall("POST", "parentTools.deleteCustomElement", input) },
    getVoiceRecordings: { query: (input: any) => apiCall("GET", "parentTools.getVoiceRecordings", input) },
    createVoiceRecording: { mutate: (input: any) => apiCall("POST", "parentTools.createVoiceRecording", input) },
    updateVoiceRecordingStatus: { mutate: (input: any) => apiCall("POST", "parentTools.updateVoiceRecordingStatus", input) },
    submitForApproval: { mutate: (input: any) => apiCall("POST", "parentTools.submitForApproval", input) },
    reviewEpisode: { mutate: (input: any) => apiCall("POST", "parentTools.reviewEpisode", input) },
    getPendingApprovals: { query: () => apiCall("GET", "parentTools.getPendingApprovals") },
    getChildStoryPreferences: { query: (input: any) => apiCall("GET", "parentTools.getChildStoryPreferences", input) },
  },
};

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

  // Custom Elements
  fetchCustomElements: (childId: number) => Promise<void>;
  createCustomElement: (
    childId: number,
    elementType: CustomElement["elementType"],
    name: string,
    description?: string,
    imageUrl?: string
  ) => Promise<void>;
  updateCustomElement: (
    elementId: number,
    updates: {
      name?: string;
      description?: string;
      imageUrl?: string;
    }
  ) => Promise<void>;
  deleteCustomElement: (elementId: number) => Promise<void>;

  // Voice Recordings
  fetchVoiceRecordings: (childId: number) => Promise<void>;
  createVoiceRecording: (
    childId: number,
    voiceName: string,
    sampleAudioUrl?: string
  ) => Promise<void>;
  updateVoiceRecordingStatus: (
    recordingId: number,
    status: VoiceRecording["status"],
    voiceModelId?: string
  ) => Promise<void>;

  // Approval Queue
  fetchPendingApprovals: () => Promise<void>;
  submitEpisodeForApproval: (childId: number, episodeId: number) => Promise<void>;
  reviewEpisode: (
    queueId: number,
    status: "approved" | "rejected" | "edited",
    parentNotes?: string,
    editedContent?: Record<string, unknown>
  ) => Promise<void>;

  // Preferences
  fetchChildPreferences: (childId: number) => Promise<void>;

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

  // ─── Custom Elements ───────────────────────────────────────
  fetchCustomElements: async (childId: number) => {
    set({ isLoading: true, error: null });
    try {
      const elements = await trpc.parentTools.getCustomElements.query({
        childId,
      });

      set((state) => {
        const newMap = new Map(state.customElements);
        newMap.set(childId, elements);
        return { customElements: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.customElements.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch custom elements";
      set({ error: message, isLoading: false });
    }
  },

  createCustomElement: async (
    childId,
    elementType,
    name,
    description,
    imageUrl
  ) => {
    set({ isLoading: true, error: null });
    try {
      const newElement = await trpc.parentTools.createCustomElement.mutate({
        childId,
        elementType,
        name,
        description,
        imageUrl,
      });

      set((state) => {
        const newMap = new Map(state.customElements);
        const currentElements = newMap.get(childId) || [];
        newMap.set(childId, [...currentElements, newElement as CustomElement]);
        return { customElements: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.customElements.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create custom element";
      set({ error: message, isLoading: false });
    }
  },

  updateCustomElement: async (elementId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await trpc.parentTools.updateCustomElement.mutate({
        elementId,
        ...updates,
      });

      set((state) => {
        const newMap = new Map(state.customElements);
        newMap.forEach((elements, childId) => {
          const idx = elements.findIndex((e) => e.id === elementId);
          if (idx >= 0) {
            const newElements = [...elements];
            newElements[idx] = updated as CustomElement;
            newMap.set(childId, newElements);
          }
        });
        return { customElements: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.customElements.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update custom element";
      set({ error: message, isLoading: false });
    }
  },

  deleteCustomElement: async (elementId) => {
    set({ isLoading: true, error: null });
    try {
      await trpc.parentTools.deleteCustomElement.mutate({ elementId });

      set((state) => {
        const newMap = new Map(state.customElements);
        newMap.forEach((elements, childId) => {
          const filtered = elements.filter((e) => e.id !== elementId);
          newMap.set(childId, filtered);
        });
        return { customElements: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.customElements.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete custom element";
      set({ error: message, isLoading: false });
    }
  },

  // ─── Voice Recordings ──────────────────────────────────────
  fetchVoiceRecordings: async (childId: number) => {
    set({ isLoading: true, error: null });
    try {
      const recordings = await trpc.parentTools.getVoiceRecordings.query({
        childId,
      });

      set((state) => {
        const newMap = new Map(state.voiceRecordings);
        newMap.set(childId, recordings);
        return { voiceRecordings: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.voiceRecordings.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch voice recordings";
      set({ error: message, isLoading: false });
    }
  },

  createVoiceRecording: async (childId, voiceName, sampleAudioUrl) => {
    set({ isLoading: true, error: null });
    try {
      const newRecording = await trpc.parentTools.createVoiceRecording.mutate({
        childId,
        voiceName,
        sampleAudioUrl,
      });

      set((state) => {
        const newMap = new Map(state.voiceRecordings);
        const currentRecordings = newMap.get(childId) || [];
        newMap.set(childId, [...currentRecordings, newRecording as VoiceRecording]);
        return { voiceRecordings: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.voiceRecordings.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create voice recording";
      set({ error: message, isLoading: false });
    }
  },

  updateVoiceRecordingStatus: async (recordingId, status, voiceModelId) => {
    set({ isLoading: true, error: null });
    try {
      await trpc.parentTools.updateVoiceRecordingStatus.mutate({
        recordingId,
        status,
        voiceModelId,
      });

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

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.voiceRecordings.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update voice recording";
      set({ error: message, isLoading: false });
    }
  },

  // ─── Approval Queue ────────────────────────────────────────
  fetchPendingApprovals: async () => {
    set({ isLoading: true, error: null });
    try {
      const queue = await trpc.parentTools.getPendingApprovals.query();
      set({ approvalQueue: queue, isLoading: false });

      // Cache to AsyncStorage
      await AsyncStorage.setItem(
        PARENT_TOOLS_KEY,
        JSON.stringify({ approvalQueue: queue })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch pending approvals";
      set({ error: message, isLoading: false });
    }
  },

  submitEpisodeForApproval: async (childId, episodeId) => {
    set({ isLoading: true, error: null });
    try {
      const queueItem = await trpc.parentTools.submitForApproval.mutate({
        childId,
        episodeId,
      });

      set((state) => {
        const newQueue = [...state.approvalQueue];
        const exists = newQueue.some((item) => item.episodeId === episodeId);
        if (!exists) {
          newQueue.push(queueItem as ApprovalQueueItem);
        }
        return { approvalQueue: newQueue, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      await AsyncStorage.setItem(
        PARENT_TOOLS_KEY,
        JSON.stringify({ approvalQueue: state.approvalQueue })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit episode for approval";
      set({ error: message, isLoading: false });
    }
  },

  reviewEpisode: async (queueId, status, parentNotes, editedContent) => {
    set({ isLoading: true, error: null });
    try {
      await trpc.parentTools.reviewEpisode.mutate({
        queueId,
        status,
        parentNotes,
        editedContent,
      });

      set((state) => {
        const newQueue = [...state.approvalQueue];
        const idx = newQueue.findIndex((item) => item.id === queueId);
        if (idx >= 0) {
          newQueue[idx] = {
            ...newQueue[idx],
            status,
            parentNotes: parentNotes || newQueue[idx].parentNotes,
            editedContent: editedContent || newQueue[idx].editedContent,
            reviewedAt: new Date(),
          };
        }
        return { approvalQueue: newQueue, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      await AsyncStorage.setItem(
        PARENT_TOOLS_KEY,
        JSON.stringify({ approvalQueue: state.approvalQueue })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to review episode";
      set({ error: message, isLoading: false });
    }
  },

  // ─── Preferences ──────────────────────────────────────────
  fetchChildPreferences: async (childId: number) => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await trpc.parentTools.getChildStoryPreferences.query({
        childId,
      });

      set((state) => {
        const newMap = new Map(state.childPreferences);
        newMap.set(childId, preferences as ChildStoryPreferences);
        return { childPreferences: newMap, isLoading: false };
      });

      // Cache to AsyncStorage
      const state = get();
      const cacheData = Array.from(state.childPreferences.entries());
      await AsyncStorage.setItem(PARENT_TOOLS_KEY, JSON.stringify(cacheData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch preferences";
      set({ error: message, isLoading: false });
    }
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
        const elementMap: Map<number, CustomElement[]> = new Map(
          data.filter(
            ([, items]: [number, unknown]) =>
              Array.isArray(items) &&
              (items[0] as any)?.elementType !== undefined
          )
        );
        if (elementMap.size > 0) {
          store.customElements = elementMap;
        }

        const recordingMap: Map<number, VoiceRecording[]> = new Map(
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
