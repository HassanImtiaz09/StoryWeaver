/**
 * Collaborative Session Store
 * Manages real-time collaborative story session state on the client
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────

export interface CollaborativeParticipant {
  userId: number;
  childId?: number;
  displayName: string;
  role: "host" | "contributor";
  joinedAt: Date;
  color: string;
  turnsCompleted: number;
}

export interface CollaborativeSegment {
  participantId: number;
  text: string;
  prompt: string;
  pageNumber: number;
  timestamp: Date;
  aiEnhanced: boolean;
}

export interface CollaborativeSession {
  id: number;
  arcId: number;
  hostUserId: number;
  participants: CollaborativeParticipant[];
  currentTurnIndex: number;
  turnOrder: number[];
  status: "waiting" | "active" | "paused" | "completed";
  storySegments: CollaborativeSegment[];
  maxParticipants: number;
  turnTimeLimit: number;
  sessionCode: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CollaborativeStoreState {
  // Current session
  activeSession: CollaborativeSession | null;
  sessionCode: string | null;

  // Current user
  myUserId: number | null;
  myTurnInput: string;
  isMyTurn: boolean;
  myParticipantData: CollaborativeParticipant | null;

  // Suggested prompts for current turn
  suggestedPrompts: string[];

  // Connection state
  connectionStatus: "disconnected" | "connecting" | "connected";
  lastSyncAt: number | null;
  syncError: string | null;

  // Actions
  setActiveSession: (session: CollaborativeSession) => void;
  setMyUserId: (userId: number) => void;
  setMyTurnInput: (input: string) => void;
  setSuggestedPrompts: (prompts: string[]) => void;
  setConnectionStatus: (status: "disconnected" | "connecting" | "connected") => void;
  setSyncError: (error: string | null) => void;
  updateSessionState: (session: CollaborativeSession) => void;
  createSession: (arcId: number, maxParticipants?: number, turnTimeLimit?: number) => Promise<void>;
  joinSession: (code: string, displayName: string) => Promise<void>;
  submitTurn: (input: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  loadSession: (sessionId: number) => Promise<void>;
  updateLastSync: () => void;
  clearSession: () => void;

  // Computed
  getCurrentParticipant: () => CollaborativeParticipant | null;
  getIsHost: () => boolean;
  getMergedStory: () => string;
}

// ─── Store Implementation ──────────────────────────────────────

export const useCollaborativeStore = create<CollaborativeStoreState>((set, get) => ({
  activeSession: null,
  sessionCode: null,
  myUserId: null,
  myTurnInput: "",
  isMyTurn: false,
  myParticipantData: null,
  suggestedPrompts: [],
  connectionStatus: "disconnected",
  lastSyncAt: null,
  syncError: null,

  setActiveSession: (session) => {
    set((state) => {
      const myUserId = state.myUserId;
      const isMyTurn =
        myUserId !== null &&
        session.turnOrder.length > 0 &&
        session.turnOrder[session.currentTurnIndex % session.turnOrder.length] === myUserId;

      const myParticipantData =
        myUserId !== null
          ? session.participants.find((p) => p.userId === myUserId) || null
          : null;

      return {
        activeSession: session,
        sessionCode: session.sessionCode,
        isMyTurn,
        myParticipantData,
      };
    });
  },

  setMyUserId: (userId) => {
    set({ myUserId: userId });
  },

  setMyTurnInput: (input) => {
    set({ myTurnInput: input });
  },

  setSuggestedPrompts: (prompts) => {
    set({ suggestedPrompts: prompts });
  },

  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },

  setSyncError: (error) => {
    set({ syncError: error });
  },

  updateSessionState: (session) => {
    set((state) => {
      const myUserId = state.myUserId;
      const isMyTurn =
        myUserId !== null &&
        session.turnOrder.length > 0 &&
        session.turnOrder[session.currentTurnIndex % session.turnOrder.length] === myUserId;

      const myParticipantData =
        myUserId !== null
          ? session.participants.find((p) => p.userId === myUserId) || null
          : null;

      return {
        activeSession: session,
        isMyTurn,
        myParticipantData,
        lastSyncAt: Date.now(),
        syncError: null,
      };
    });
  },

  createSession: async (arcId, maxParticipants = 4, turnTimeLimit = 120) => {
    try {
      set({ connectionStatus: "connecting" });

      const response = await fetch("/api/collaborative/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arcId, maxParticipants, turnTimeLimit }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const session = await response.json();
      get().setActiveSession(session);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        "collaborative_session",
        JSON.stringify({ sessionId: session.id, code: session.sessionCode })
      );

      set({ connectionStatus: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ connectionStatus: "disconnected", syncError: message });
      throw error;
    }
  },

  joinSession: async (code, displayName) => {
    try {
      set({ connectionStatus: "connecting" });

      const response = await fetch("/api/collaborative/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, displayName }),
      });

      if (!response.ok) throw new Error("Failed to join session");

      const session = await response.json();
      get().setActiveSession(session);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        "collaborative_session",
        JSON.stringify({ sessionId: session.id, code })
      );

      set({ connectionStatus: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ connectionStatus: "disconnected", syncError: message });
      throw error;
    }
  },

  submitTurn: async (input) => {
    try {
      const state = get();
      if (!state.activeSession) throw new Error("No active session");

      set({ connectionStatus: "connecting" });

      const response = await fetch("/api/collaborative/submit-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.activeSession.id,
          input,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit turn");

      const updatedSession = await response.json();
      get().updateSessionState(updatedSession);
      set({ myTurnInput: "" });
      set({ connectionStatus: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ connectionStatus: "disconnected", syncError: message });
      throw error;
    }
  },

  leaveSession: async () => {
    try {
      const state = get();
      if (!state.activeSession) return;

      set({ connectionStatus: "connecting" });

      await fetch("/api/collaborative/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.activeSession.id }),
      });

      await AsyncStorage.removeItem("collaborative_session");
      get().clearSession();
      set({ connectionStatus: "disconnected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ syncError: message });
    }
  },

  loadSession: async (sessionId) => {
    try {
      set({ connectionStatus: "connecting" });

      const response = await fetch(`/api/collaborative/state?sessionId=${sessionId}`);

      if (!response.ok) throw new Error("Failed to load session");

      const session = await response.json();
      get().updateSessionState(session);
      set({ connectionStatus: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ connectionStatus: "disconnected", syncError: message });
      throw error;
    }
  },

  updateLastSync: () => {
    set({ lastSyncAt: Date.now() });
  },

  clearSession: () => {
    set({
      activeSession: null,
      sessionCode: null,
      myTurnInput: "",
      isMyTurn: false,
      myParticipantData: null,
      suggestedPrompts: [],
      connectionStatus: "disconnected",
      lastSyncAt: null,
      syncError: null,
    });
  },

  getCurrentParticipant: () => {
    const state = get();
    return state.myParticipantData || null;
  },

  getIsHost: () => {
    const state = get();
    return (
      state.activeSession !== null &&
      state.myUserId !== null &&
      state.activeSession.hostUserId === state.myUserId
    );
  },

  getMergedStory: () => {
    const state = get();
    if (!state.activeSession) return "";

    return state.activeSession.storySegments
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((seg) => seg.text)
      .join("\n\n");
  },
}));

// ─── Session Recovery ──────────────────────────────────────────

/**
 * Load saved session from AsyncStorage on app start
 */
export async function loadSavedCollaborativeSession(): Promise<{
  sessionId: number;
  code: string;
} | null> {
  try {
    const saved = await AsyncStorage.getItem("collaborative_session");
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}
