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
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((key) => delete mockStorage[key]);
      return Promise.resolve();
    }),
  },
}));

// Mock fetch
global.fetch = vi.fn();

import {
  useCollaborativeStore,
  loadSavedCollaborativeSession,
  type CollaborativeSession,
  type CollaborativeParticipant,
} from "../lib/collaborative-store";

describe("collaborative-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useCollaborativeStore.setState({
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
    });
    vi.clearAllMocks();
  });

  describe("store initial state", () => {
    it("initializes with correct default state", () => {
      const state = useCollaborativeStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.sessionCode).toBeNull();
      expect(state.myUserId).toBeNull();
      expect(state.connectionStatus).toBe("disconnected");
    });
  });

  describe("session management", () => {
    it("sets active session", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [],
        currentTurnIndex: 0,
        turnOrder: [1],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setMyUserId(1);
      store.setActiveSession(session);
      const state = useCollaborativeStore.getState();
      expect(state.activeSession).toEqual(session);
      expect(state.sessionCode).toBe("ABC123");
    });

    it("clears session", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [],
        currentTurnIndex: 0,
        turnOrder: [1],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setActiveSession(session);
      store.clearSession();
      const state = useCollaborativeStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.sessionCode).toBeNull();
    });
  });

  describe("user identification", () => {
    it("sets user ID", () => {
      const store = useCollaborativeStore.getState();
      store.setMyUserId(42);
      expect(useCollaborativeStore.getState().myUserId).toBe(42);
    });

    it("determines if it is user's turn", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [{ userId: 1 } as CollaborativeParticipant],
        currentTurnIndex: 0,
        turnOrder: [1, 2],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setMyUserId(1);
      store.setActiveSession(session);
      const state = useCollaborativeStore.getState();
      expect(state.isMyTurn).toBe(true);
    });
  });

  describe("turn input management", () => {
    it("sets turn input", () => {
      const store = useCollaborativeStore.getState();
      store.setMyTurnInput("Once upon a time...");
      expect(useCollaborativeStore.getState().myTurnInput).toBe("Once upon a time...");
    });

    it("clears turn input after submission", () => {
      const store = useCollaborativeStore.getState();
      store.setMyTurnInput("Story text");
      store.setMyTurnInput("");
      expect(useCollaborativeStore.getState().myTurnInput).toBe("");
    });
  });

  describe("suggested prompts", () => {
    it("sets suggested prompts", () => {
      const prompts = ["Once upon a time", "In a far away land", "Long ago"];
      const store = useCollaborativeStore.getState();
      store.setSuggestedPrompts(prompts);
      expect(useCollaborativeStore.getState().suggestedPrompts).toEqual(prompts);
    });

    it("clears suggested prompts", () => {
      const store = useCollaborativeStore.getState();
      store.setSuggestedPrompts(["prompt1", "prompt2"]);
      store.setSuggestedPrompts([]);
      expect(useCollaborativeStore.getState().suggestedPrompts).toEqual([]);
    });
  });

  describe("connection status", () => {
    it("sets connection status to connecting", () => {
      const store = useCollaborativeStore.getState();
      store.setConnectionStatus("connecting");
      expect(useCollaborativeStore.getState().connectionStatus).toBe("connecting");
    });

    it("sets connection status to connected", () => {
      const store = useCollaborativeStore.getState();
      store.setConnectionStatus("connected");
      expect(useCollaborativeStore.getState().connectionStatus).toBe("connected");
    });

    it("sets connection status to disconnected", () => {
      const store = useCollaborativeStore.getState();
      store.setConnectionStatus("disconnected");
      expect(useCollaborativeStore.getState().connectionStatus).toBe("disconnected");
    });
  });

  describe("sync errors", () => {
    it("sets sync error", () => {
      const store = useCollaborativeStore.getState();
      store.setSyncError("Network timeout");
      expect(useCollaborativeStore.getState().syncError).toBe("Network timeout");
    });

    it("clears sync error", () => {
      const store = useCollaborativeStore.getState();
      store.setSyncError("Some error");
      store.setSyncError(null);
      expect(useCollaborativeStore.getState().syncError).toBeNull();
    });
  });

  describe("session updates", () => {
    it("updates session state and last sync", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [],
        currentTurnIndex: 1,
        turnOrder: [1, 2],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setMyUserId(2);
      store.updateSessionState(session);
      const state = useCollaborativeStore.getState();
      expect(state.activeSession).toEqual(session);
      expect(state.lastSyncAt).not.toBeNull();
    });
  });

  describe("last sync tracking", () => {
    it("updates last sync timestamp", () => {
      const store = useCollaborativeStore.getState();
      store.updateLastSync();
      const state = useCollaborativeStore.getState();
      expect(state.lastSyncAt).not.toBeNull();
      expect(typeof state.lastSyncAt).toBe("number");
    });
  });

  describe("computed functions", () => {
    it("gets current participant data", () => {
      const participant: CollaborativeParticipant = {
        userId: 1,
        displayName: "Alice",
        role: "host",
        joinedAt: new Date(),
        color: "#FF0000",
        turnsCompleted: 2,
      };
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [participant],
        currentTurnIndex: 0,
        turnOrder: [1],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setMyUserId(1);
      store.setActiveSession(session);
      const current = useCollaborativeStore.getState().getCurrentParticipant();
      expect(current).toEqual(participant);
    });

    it("determines if user is host", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [],
        currentTurnIndex: 0,
        turnOrder: [1],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setMyUserId(1);
      store.setActiveSession(session);
      const isHost = useCollaborativeStore.getState().getIsHost();
      expect(isHost).toBe(true);
    });

    it("returns false when user is not host", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [],
        currentTurnIndex: 0,
        turnOrder: [2],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setMyUserId(2);
      store.setActiveSession(session);
      const isHost = useCollaborativeStore.getState().getIsHost();
      expect(isHost).toBe(false);
    });

    it("merges story from segments", () => {
      const session: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [],
        currentTurnIndex: 0,
        turnOrder: [],
        status: "active",
        storySegments: [
          {
            participantId: 1,
            text: "Once upon a time",
            prompt: "start",
            pageNumber: 1,
            timestamp: new Date(),
            aiEnhanced: false,
          },
          {
            participantId: 2,
            text: "there was a girl",
            prompt: "continue",
            pageNumber: 2,
            timestamp: new Date(),
            aiEnhanced: false,
          },
        ],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };
      const store = useCollaborativeStore.getState();
      store.setActiveSession(session);
      const merged = useCollaborativeStore.getState().getMergedStory();
      expect(merged).toBe("Once upon a time\n\nthere was a girl");
    });
  });

  describe("session persistence", () => {
    it("loads saved session from AsyncStorage", async () => {
      mockStorage["collaborative_session"] = JSON.stringify({
        sessionId: 42,
        code: "XYZ789",
      });
      const saved = await loadSavedCollaborativeSession();
      expect(saved).toEqual({
        sessionId: 42,
        code: "XYZ789",
      });
    });

    it("returns null when no saved session", async () => {
      const saved = await loadSavedCollaborativeSession();
      expect(saved).toBeNull();
    });
  });

  describe("API interactions - create session", () => {
    it("creates session successfully", async () => {
      const mockSession: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [
          {
            userId: 1,
            displayName: "Host",
            role: "host",
            joinedAt: new Date(),
            color: "#FF0000",
            turnsCompleted: 0,
          },
        ],
        currentTurnIndex: 0,
        turnOrder: [1],
        status: "waiting",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const store = useCollaborativeStore.getState();
      store.setMyUserId(1);
      await store.createSession(100, 4, 120);

      const state = useCollaborativeStore.getState();
      expect(state.connectionStatus).toBe("connected");
      expect(state.activeSession?.sessionCode).toBe("ABC123");
    });

    it("handles create session error", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const store = useCollaborativeStore.getState();
      try {
        await store.createSession(100);
      } catch {
        // Expected
      }

      const state = useCollaborativeStore.getState();
      expect(state.connectionStatus).toBe("disconnected");
      expect(state.syncError).toBeDefined();
    });
  });

  describe("API interactions - join session", () => {
    it("joins session successfully", async () => {
      const mockSession: CollaborativeSession = {
        id: 1,
        arcId: 100,
        hostUserId: 1,
        participants: [
          {
            userId: 2,
            displayName: "Bob",
            role: "contributor",
            joinedAt: new Date(),
            color: "#0000FF",
            turnsCompleted: 0,
          },
        ],
        currentTurnIndex: 0,
        turnOrder: [1, 2],
        status: "active",
        storySegments: [],
        maxParticipants: 4,
        turnTimeLimit: 120,
        sessionCode: "ABC123",
        createdAt: new Date(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const store = useCollaborativeStore.getState();
      store.setMyUserId(2);
      await store.joinSession("ABC123", "Bob");

      const state = useCollaborativeStore.getState();
      expect(state.connectionStatus).toBe("connected");
      expect(state.sessionCode).toBe("ABC123");
    });
  });
});
