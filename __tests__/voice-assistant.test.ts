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
  useVoiceAssistantStore,
  parseVoiceCommand,
  saveVoiceAssistantState,
  loadVoiceAssistantState,
  initializeVoiceAssistant,
} from "../lib/voice-assistant";

describe("voice-assistant store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useVoiceAssistantStore.setState({
      isListening: false,
      isProcessing: false,
      transcript: "",
      lastCommand: null,
      voiceEnabled: true,
      commandHistory: [],
      voiceLanguage: "en-US",
      error: null,
    });
  });

  describe("store initial state", () => {
    it("initializes with correct default state", () => {
      const state = useVoiceAssistantStore.getState();
      expect(state.isListening).toBe(false);
      expect(state.isProcessing).toBe(false);
      expect(state.transcript).toBe("");
      expect(state.voiceEnabled).toBe(true);
      expect(state.voiceLanguage).toBe("en-US");
      expect(state.commandHistory).toEqual([]);
    });
  });

  describe("listening state management", () => {
    it("starts listening", async () => {
      const store = useVoiceAssistantStore.getState();
      await store.startListening();
      const state = useVoiceAssistantStore.getState();
      expect(state.isListening).toBe(true);
      expect(state.error).toBeNull();
      expect(state.transcript).toBe("");
    });

    it("stops listening", async () => {
      const store = useVoiceAssistantStore.getState();
      await store.startListening();
      await store.stopListening();
      const state = useVoiceAssistantStore.getState();
      expect(state.isListening).toBe(false);
    });
  });

  describe("transcript management", () => {
    it("sets transcript", () => {
      const store = useVoiceAssistantStore.getState();
      store.setTranscript("hello world");
      const state = useVoiceAssistantStore.getState();
      expect(state.transcript).toBe("hello world");
    });

    it("clears transcript", () => {
      const store = useVoiceAssistantStore.getState();
      store.setTranscript("hello");
      store.clearTranscript();
      const state = useVoiceAssistantStore.getState();
      expect(state.transcript).toBe("");
    });
  });

  describe("processing state", () => {
    it("sets processing to true", () => {
      const store = useVoiceAssistantStore.getState();
      store.setProcessing(true);
      expect(useVoiceAssistantStore.getState().isProcessing).toBe(true);
    });

    it("sets processing to false", () => {
      const store = useVoiceAssistantStore.getState();
      store.setProcessing(false);
      expect(useVoiceAssistantStore.getState().isProcessing).toBe(false);
    });
  });

  describe("voice enabled toggle", () => {
    it("enables voice", () => {
      const store = useVoiceAssistantStore.getState();
      store.toggleVoiceEnabled(true);
      expect(useVoiceAssistantStore.getState().voiceEnabled).toBe(true);
    });

    it("disables voice", () => {
      const store = useVoiceAssistantStore.getState();
      store.toggleVoiceEnabled(false);
      expect(useVoiceAssistantStore.getState().voiceEnabled).toBe(false);
    });
  });

  describe("voice language management", () => {
    it("sets voice language to Spanish", () => {
      const store = useVoiceAssistantStore.getState();
      store.setVoiceLanguage("es-ES");
      expect(useVoiceAssistantStore.getState().voiceLanguage).toBe("es-ES");
    });

    it("sets voice language to French", () => {
      const store = useVoiceAssistantStore.getState();
      store.setVoiceLanguage("fr-FR");
      expect(useVoiceAssistantStore.getState().voiceLanguage).toBe("fr-FR");
    });
  });

  describe("error management", () => {
    it("clears error", () => {
      useVoiceAssistantStore.setState({ error: "Some error" });
      const store = useVoiceAssistantStore.getState();
      store.clearError();
      expect(useVoiceAssistantStore.getState().error).toBeNull();
    });
  });

  describe("command history tracking", () => {
    it("records command and updates history", () => {
      const store = useVoiceAssistantStore.getState();
      const command = {
        id: "1",
        timestamp: new Date(),
        transcript: "next page",
        category: "navigation" as const,
        intent: "next page",
        confidence: 0.9,
      };
      store.recordCommand(command);
      const state = useVoiceAssistantStore.getState();
      expect(state.lastCommand).toEqual(command);
      expect(state.commandHistory).toContain(command);
    });

    it("keeps last 50 commands in history", () => {
      const store = useVoiceAssistantStore.getState();
      for (let i = 0; i < 55; i++) {
        const command = {
          id: `${i}`,
          timestamp: new Date(),
          transcript: `command ${i}`,
          category: "navigation" as const,
          intent: `command ${i}`,
          confidence: 0.9,
        };
        store.recordCommand(command);
      }
      const state = useVoiceAssistantStore.getState();
      expect(state.commandHistory.length).toBe(50);
    });

    it("tracks multiple commands in order", () => {
      const store = useVoiceAssistantStore.getState();
      const cmd1 = {
        id: "1",
        timestamp: new Date(),
        transcript: "first",
        category: "navigation" as const,
        intent: "first",
        confidence: 0.9,
      };
      const cmd2 = {
        id: "2",
        timestamp: new Date(),
        transcript: "second",
        category: "navigation" as const,
        intent: "second",
        confidence: 0.9,
      };
      store.recordCommand(cmd1);
      store.recordCommand(cmd2);
      const state = useVoiceAssistantStore.getState();
      expect(state.commandHistory[0]).toEqual(cmd2); // Most recent first
      expect(state.commandHistory[1]).toEqual(cmd1);
    });
  });

  describe("parseVoiceCommand - story modification", () => {
    it("parses 'make the character happy' as story modification", () => {
      const result = parseVoiceCommand("make the character happy");
      expect(result.category).toBe("story_modification");
      expect(result.confidence).toBe(0.85);
    });

    it("parses 'add a dragon' as story modification", () => {
      const result = parseVoiceCommand("add a dragon");
      expect(result.category).toBe("story_modification");
      expect(result.confidence).toBe(0.85);
    });

    it("parses 'change the ending' as story modification", () => {
      const result = parseVoiceCommand("change the ending");
      expect(result.category).toBe("story_modification");
      expect(result.confidence).toBe(0.85);
    });
  });

  describe("parseVoiceCommand - navigation", () => {
    it("parses 'next page' as navigation", () => {
      const result = parseVoiceCommand("next page");
      expect(result.category).toBe("navigation");
      expect(result.confidence).toBe(0.9);
    });

    it("parses 'go back' as navigation", () => {
      const result = parseVoiceCommand("go back");
      expect(result.category).toBe("navigation");
      expect(result.confidence).toBe(0.9);
    });

    it("parses 'continue' as navigation", () => {
      const result = parseVoiceCommand("continue");
      expect(result.category).toBe("navigation");
      expect(result.confidence).toBe(0.9);
    });

    it("parses 'read again' as navigation", () => {
      const result = parseVoiceCommand("read again");
      expect(result.category).toBe("navigation");
      expect(result.confidence).toBe(0.9);
    });
  });

  describe("parseVoiceCommand - questions", () => {
    it("parses 'what happens next' as questions", () => {
      const result = parseVoiceCommand("what happens next");
      expect(result.category).toBe("questions");
      expect(result.confidence).toBe(0.85);
    });

    it("parses 'who is the hero' as questions", () => {
      const result = parseVoiceCommand("who is the hero");
      expect(result.category).toBe("questions");
      expect(result.confidence).toBe(0.85);
    });

    it("parses 'tell me about the castle' as questions", () => {
      const result = parseVoiceCommand("tell me about the castle");
      expect(result.category).toBe("questions");
      expect(result.confidence).toBe(0.85);
    });
  });

  describe("parseVoiceCommand - fun interactions", () => {
    it("parses 'make it funny' as fun interaction", () => {
      const result = parseVoiceCommand("make it funny");
      expect(result.category).toBe("fun_interactions");
      expect(result.confidence).toBe(0.8);
    });

    it("parses 'make it scary' as fun interaction", () => {
      const result = parseVoiceCommand("make it scary");
      expect(result.category).toBe("fun_interactions");
      expect(result.confidence).toBe(0.8);
    });

    it("parses 'add magic' as fun interaction", () => {
      const result = parseVoiceCommand("add magic");
      expect(result.category).toBe("fun_interactions");
      expect(result.confidence).toBe(0.8);
    });
  });

  describe("parseVoiceCommand - fallback", () => {
    it("defaults unclear command to questions with low confidence", () => {
      const result = parseVoiceCommand("random unclear words");
      expect(result.category).toBe("questions");
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("persistence", () => {
    it("saves voice assistant state to AsyncStorage", async () => {
      useVoiceAssistantStore.setState({
        voiceEnabled: false,
        voiceLanguage: "es-ES",
      });
      const store = useVoiceAssistantStore.getState();
      await saveVoiceAssistantState({
        voiceEnabled: false,
        voiceLanguage: "es-ES",
      });
      const stored = mockStorage["storyweaver_voice_assistant"];
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.voiceEnabled).toBe(false);
      expect(parsed.voiceLanguage).toBe("es-ES");
    });

    it("loads voice assistant state from AsyncStorage", async () => {
      mockStorage["storyweaver_voice_assistant"] = JSON.stringify({
        voiceEnabled: false,
        voiceLanguage: "fr-FR",
        commandHistory: [],
      });
      const state = await loadVoiceAssistantState();
      expect(state.voiceEnabled).toBe(false);
      expect(state.voiceLanguage).toBe("fr-FR");
    });

    it("returns defaults when storage is empty", async () => {
      const state = await loadVoiceAssistantState();
      expect(state.voiceEnabled).toBe(true);
      expect(state.voiceLanguage).toBe("en-US");
      expect(state.commandHistory).toEqual([]);
    });
  });

  describe("initialization", () => {
    it("initializes voice assistant with stored preferences", async () => {
      mockStorage["storyweaver_voice_assistant"] = JSON.stringify({
        voiceEnabled: false,
        voiceLanguage: "de-DE",
        commandHistory: [],
      });
      await initializeVoiceAssistant();
      const state = useVoiceAssistantStore.getState();
      expect(state.voiceEnabled).toBe(false);
      expect(state.voiceLanguage).toBe("de-DE");
    });
  });
});
