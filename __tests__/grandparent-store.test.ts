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

import {
  useGrandparentStore,
  type FamilyMember,
  type CoCreationSession,
  type MemoryPrompt,
  type FamilyStory,
} from "../lib/grandparent-store";

describe("grandparent-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useGrandparentStore.setState({
      familyMembers: [],
      activeSession: null,
      memoryPrompts: [],
      familyArchive: [],
      inviteCode: null,
      isGrandparentMode: false,
      fontSize: 1,
      loading: {
        familyMembers: false,
        session: false,
        archive: false,
        memory: false,
      },
    });
  });

  describe("store initial state", () => {
    it("initializes with grandparent mode disabled", () => {
      const state = useGrandparentStore.getState();
      expect(state.isGrandparentMode).toBe(false);
    });

    it("initializes with default font size", () => {
      const state = useGrandparentStore.getState();
      expect(state.fontSize).toBe(1);
    });

    it("initializes with no family members", () => {
      const state = useGrandparentStore.getState();
      expect(state.familyMembers).toEqual([]);
    });

    it("initializes with no active session", () => {
      const state = useGrandparentStore.getState();
      expect(state.activeSession).toBeNull();
    });
  });

  describe("grandparent mode", () => {
    it("enables grandparent mode", () => {
      const store = useGrandparentStore.getState();
      store.setGrandparentMode(true);
      expect(useGrandparentStore.getState().isGrandparentMode).toBe(true);
    });

    it("disables grandparent mode", () => {
      const store = useGrandparentStore.getState();
      store.setGrandparentMode(true);
      store.setGrandparentMode(false);
      expect(useGrandparentStore.getState().isGrandparentMode).toBe(false);
    });
  });

  describe("font size accessibility", () => {
    it("increases font size to 1.2x", () => {
      const store = useGrandparentStore.getState();
      store.setFontSize(1.2);
      expect(useGrandparentStore.getState().fontSize).toBe(1.2);
    });

    it("increases font size to 1.5x", () => {
      const store = useGrandparentStore.getState();
      store.setFontSize(1.5);
      expect(useGrandparentStore.getState().fontSize).toBe(1.5);
    });

    it("supports larger font sizes for accessibility", () => {
      const store = useGrandparentStore.getState();
      store.setFontSize(2.0);
      expect(useGrandparentStore.getState().fontSize).toBe(2.0);
    });
  });

  describe("family member management", () => {
    it("sets family members", () => {
      const members: FamilyMember[] = [
        {
          id: 1,
          familyMemberUserId: 101,
          relationship: "grandparent",
          familyMemberName: "Grandma Rose",
          createdAt: new Date(),
        },
      ];
      const store = useGrandparentStore.getState();
      store.setFamilyMembers(members);
      expect(useGrandparentStore.getState().familyMembers).toEqual(members);
    });

    it("tracks multiple family members with different relationships", () => {
      const members: FamilyMember[] = [
        {
          id: 1,
          familyMemberUserId: 101,
          relationship: "grandparent",
          familyMemberName: "Grandma",
          createdAt: new Date(),
        },
        {
          id: 2,
          familyMemberUserId: 102,
          relationship: "aunt_uncle",
          familyMemberName: "Uncle Jack",
          createdAt: new Date(),
        },
        {
          id: 3,
          familyMemberUserId: 103,
          relationship: "cousin",
          familyMemberName: "Cousin Emma",
          createdAt: new Date(),
        },
      ];
      const store = useGrandparentStore.getState();
      store.setFamilyMembers(members);
      expect(useGrandparentStore.getState().familyMembers).toHaveLength(3);
    });
  });

  describe("session management", () => {
    it("creates active co-creation session", () => {
      const session: CoCreationSession = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        arcId: 100,
        status: "active",
        createdAt: new Date(),
      };
      const store = useGrandparentStore.getState();
      store.setActiveSession(session);
      expect(useGrandparentStore.getState().activeSession).toEqual(session);
    });

    it("pauses session", () => {
      const session: CoCreationSession = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        status: "active",
        createdAt: new Date(),
      };
      const store = useGrandparentStore.getState();
      store.setActiveSession(session);

      const pausedSession: CoCreationSession = {
        ...session,
        status: "paused",
      };
      store.setActiveSession(pausedSession);
      expect(useGrandparentStore.getState().activeSession?.status).toBe("paused");
    });

    it("completes session", () => {
      const session: CoCreationSession = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        status: "active",
        createdAt: new Date(),
      };
      const store = useGrandparentStore.getState();
      store.setActiveSession(session);

      const completedSession: CoCreationSession = {
        ...session,
        status: "completed",
        completedAt: new Date(),
      };
      store.setActiveSession(completedSession);
      expect(useGrandparentStore.getState().activeSession?.status).toBe("completed");
    });

    it("clears active session", () => {
      const session: CoCreationSession = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        status: "active",
        createdAt: new Date(),
      };
      const store = useGrandparentStore.getState();
      store.setActiveSession(session);
      store.clearActiveSession();
      expect(useGrandparentStore.getState().activeSession).toBeNull();
    });
  });

  describe("memory prompts", () => {
    it("sets memory prompts from session", () => {
      const prompts: MemoryPrompt[] = [
        {
          id: 1,
          sessionId: 1,
          userId: 101,
          memoryText: "I remember when we went to the beach",
          category: "travel",
          createdAt: new Date(),
        },
      ];
      const store = useGrandparentStore.getState();
      store.setMemoryPrompts(prompts);
      expect(useGrandparentStore.getState().memoryPrompts).toEqual(prompts);
    });

    it("adds new memory prompt", () => {
      const prompt: MemoryPrompt = {
        id: 1,
        sessionId: 1,
        userId: 101,
        memoryText: "A funny moment from the past",
        category: "funny_moment",
        createdAt: new Date(),
      };
      const store = useGrandparentStore.getState();
      store.addMemoryPrompt(prompt);
      expect(useGrandparentStore.getState().memoryPrompts).toContain(prompt);
    });

    it("tracks multiple memory categories", () => {
      const prompts: MemoryPrompt[] = [
        {
          id: 1,
          sessionId: 1,
          userId: 101,
          memoryText: "Childhood memory",
          category: "childhood",
          createdAt: new Date(),
        },
        {
          id: 2,
          sessionId: 1,
          userId: 101,
          memoryText: "Travel memory",
          category: "travel",
          createdAt: new Date(),
        },
        {
          id: 3,
          sessionId: 1,
          userId: 101,
          memoryText: "Family tradition",
          category: "family_tradition",
          createdAt: new Date(),
        },
        {
          id: 4,
          sessionId: 1,
          userId: 101,
          memoryText: "Funny moment",
          category: "funny_moment",
          createdAt: new Date(),
        },
        {
          id: 5,
          sessionId: 1,
          userId: 101,
          memoryText: "Life lesson",
          category: "life_lesson",
          createdAt: new Date(),
        },
      ];
      const store = useGrandparentStore.getState();
      store.setMemoryPrompts(prompts);
      expect(useGrandparentStore.getState().memoryPrompts).toHaveLength(5);
    });
  });

  describe("family archive", () => {
    it("sets family story archive", () => {
      const archive: FamilyStory[] = [
        {
          id: 1,
          hostUserId: 1,
          familyMemberUserId: 101,
          childId: 5,
          status: "completed",
          memoryCount: 3,
          memories: [],
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ];
      const store = useGrandparentStore.getState();
      store.setFamilyArchive(archive);
      expect(useGrandparentStore.getState().familyArchive).toEqual(archive);
    });

    it("adds story to archive", () => {
      const story: FamilyStory = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        status: "completed",
        memoryCount: 2,
        memories: [],
        createdAt: new Date(),
      };
      const store = useGrandparentStore.getState();
      store.addStoryToArchive(story);
      expect(useGrandparentStore.getState().familyArchive).toContain(story);
    });

    it("tracks multiple family stories", () => {
      const stories: FamilyStory[] = [
        {
          id: 1,
          hostUserId: 1,
          familyMemberUserId: 101,
          childId: 5,
          status: "completed",
          memoryCount: 2,
          memories: [],
          createdAt: new Date(),
        },
        {
          id: 2,
          hostUserId: 1,
          familyMemberUserId: 102,
          childId: 5,
          status: "completed",
          memoryCount: 3,
          memories: [],
          createdAt: new Date(),
        },
      ];
      const store = useGrandparentStore.getState();
      store.setFamilyArchive(stories);
      expect(useGrandparentStore.getState().familyArchive).toHaveLength(2);
    });
  });

  describe("invite code management", () => {
    it("sets invite code", () => {
      const store = useGrandparentStore.getState();
      store.setInviteCode("FAMILY123");
      expect(useGrandparentStore.getState().inviteCode).toBe("FAMILY123");
    });

    it("clears invite code", () => {
      const store = useGrandparentStore.getState();
      store.setInviteCode("FAMILY123");
      store.setInviteCode(null);
      expect(useGrandparentStore.getState().inviteCode).toBeNull();
    });
  });

  describe("loading states", () => {
    it("sets loading state for family members", () => {
      const store = useGrandparentStore.getState();
      store.setLoading("familyMembers", true);
      expect(useGrandparentStore.getState().loading.familyMembers).toBe(true);
      store.setLoading("familyMembers", false);
      expect(useGrandparentStore.getState().loading.familyMembers).toBe(false);
    });

    it("sets loading state for session", () => {
      const store = useGrandparentStore.getState();
      store.setLoading("session", true);
      expect(useGrandparentStore.getState().loading.session).toBe(true);
    });

    it("sets loading state for archive", () => {
      const store = useGrandparentStore.getState();
      store.setLoading("archive", true);
      expect(useGrandparentStore.getState().loading.archive).toBe(true);
    });

    it("sets loading state for memory", () => {
      const store = useGrandparentStore.getState();
      store.setLoading("memory", true);
      expect(useGrandparentStore.getState().loading.memory).toBe(true);
    });
  });

  describe("reset functionality", () => {
    it("resets store to initial state", () => {
      const store = useGrandparentStore.getState();
      store.setGrandparentMode(true);
      store.setFontSize(1.5);
      store.setFamilyMembers([
        {
          id: 1,
          familyMemberUserId: 101,
          relationship: "grandparent",
          familyMemberName: "Grandma",
          createdAt: new Date(),
        },
      ]);

      store.reset();

      const state = useGrandparentStore.getState();
      expect(state.isGrandparentMode).toBe(false);
      expect(state.fontSize).toBe(1);
      expect(state.familyMembers).toEqual([]);
    });
  });

  describe("co-creation workflow", () => {
    it("supports full co-creation workflow", () => {
      const store = useGrandparentStore.getState();

      // Set family members
      const members: FamilyMember[] = [
        {
          id: 1,
          familyMemberUserId: 101,
          relationship: "grandparent",
          familyMemberName: "Grandma Rose",
          createdAt: new Date(),
        },
      ];
      store.setFamilyMembers(members);

      // Start session
      const session: CoCreationSession = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        status: "active",
        createdAt: new Date(),
      };
      store.setActiveSession(session);

      // Add memory prompts
      const prompt: MemoryPrompt = {
        id: 1,
        sessionId: 1,
        userId: 101,
        memoryText: "A special childhood moment",
        category: "childhood",
        createdAt: new Date(),
      };
      store.addMemoryPrompt(prompt);

      const state = useGrandparentStore.getState();
      expect(state.familyMembers).toHaveLength(1);
      expect(state.activeSession?.id).toBe(1);
      expect(state.memoryPrompts).toHaveLength(1);
    });
  });

  describe("accessibility for elderly users", () => {
    it("supports large font sizes for vision accessibility", () => {
      const store = useGrandparentStore.getState();
      store.setFontSize(1.8);
      expect(useGrandparentStore.getState().fontSize).toBe(1.8);
    });

    it("enables grandparent mode with accessibility settings", () => {
      const store = useGrandparentStore.getState();
      store.setGrandparentMode(true);
      store.setFontSize(1.5);
      const state = useGrandparentStore.getState();
      expect(state.isGrandparentMode).toBe(true);
      expect(state.fontSize).toBe(1.5);
    });
  });

  describe("multiple sessions", () => {
    it("can manage session transitions", () => {
      const store = useGrandparentStore.getState();

      const session1: CoCreationSession = {
        id: 1,
        hostUserId: 1,
        familyMemberUserId: 101,
        childId: 5,
        status: "completed",
        createdAt: new Date(),
        completedAt: new Date(),
      };

      const session2: CoCreationSession = {
        id: 2,
        hostUserId: 1,
        familyMemberUserId: 102,
        childId: 6,
        status: "active",
        createdAt: new Date(),
      };

      store.setActiveSession(session1);
      expect(useGrandparentStore.getState().activeSession?.id).toBe(1);

      store.setActiveSession(session2);
      expect(useGrandparentStore.getState().activeSession?.id).toBe(2);
    });
  });

  describe("memory preservation", () => {
    it("preserves memories with their categories", () => {
      const store = useGrandparentStore.getState();
      const memories: MemoryPrompt[] = [
        {
          id: 1,
          sessionId: 1,
          userId: 101,
          memoryText: "We went to the mountains",
          category: "travel",
          createdAt: new Date(),
        },
        {
          id: 2,
          sessionId: 1,
          userId: 101,
          memoryText: "Grandpa taught me to fish",
          category: "life_lesson",
          createdAt: new Date(),
        },
      ];
      store.setMemoryPrompts(memories);

      const state = useGrandparentStore.getState();
      const travel = state.memoryPrompts.find((m) => m.category === "travel");
      const lesson = state.memoryPrompts.find((m) => m.category === "life_lesson");

      expect(travel?.memoryText).toContain("mountains");
      expect(lesson?.memoryText).toContain("fish");
    });
  });
});
