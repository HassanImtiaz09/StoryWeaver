import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { trpc } from "../app/_layout";

const VOICE_ASSISTANT_KEY = "storyweaver_voice_assistant";

export interface VoiceCommand {
  id: string;
  timestamp: Date;
  transcript: string;
  category: "story_modification" | "navigation" | "questions" | "fun_interactions";
  intent: string;
  confidence: number;
}

export interface VoiceAssistantState {
  // State
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  lastCommand: VoiceCommand | null;
  voiceEnabled: boolean;
  commandHistory: VoiceCommand[];
  voiceLanguage: string;
  error: string | null;

  // Actions
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  setTranscript: (text: string) => void;
  setProcessing: (processing: boolean) => void;
  toggleVoiceEnabled: (enabled: boolean) => void;
  setVoiceLanguage: (language: string) => void;
  clearTranscript: () => void;
  clearError: () => void;
  recordCommand: (command: VoiceCommand) => void;
}

export const useVoiceAssistantStore = create<VoiceAssistantState>((set, get) => ({
  isListening: false,
  isProcessing: false,
  transcript: "",
  lastCommand: null,
  voiceEnabled: true,
  commandHistory: [],
  voiceLanguage: "en-US",
  error: null,

  startListening: async () => {
    set({ isListening: true, error: null, transcript: "" });
  },

  stopListening: async () => {
    set({ isListening: false });
  },

  setTranscript: (text: string) => {
    set({ transcript: text });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  toggleVoiceEnabled: (enabled: boolean) => {
    set({ voiceEnabled: enabled });
  },

  setVoiceLanguage: (language: string) => {
    set({ voiceLanguage: language });
  },

  clearTranscript: () => {
    set({ transcript: "" });
  },

  clearError: () => {
    set({ error: null });
  },

  recordCommand: (command: VoiceCommand) => {
    set((state) => ({
      lastCommand: command,
      commandHistory: [command, ...state.commandHistory].slice(0, 50), // Keep last 50 commands
    }));
  },
}));

/**
 * Parse a voice command and extract intent and category
 */
export function parseVoiceCommand(transcript: string): {
  category: "story_modification" | "navigation" | "questions" | "fun_interactions";
  intent: string;
  confidence: number;
} {
  const lower = transcript.toLowerCase().trim();

  // Story modification patterns
  if (
    /^make\s+(?:the\s+)?(\w+)\s+(\w+)/.test(lower) ||
    /^add\s+a\s+(\w+)/.test(lower) ||
    /^change\s+(?:the\s+)?(\w+)/.test(lower)
  ) {
    return {
      category: "story_modification",
      intent: lower,
      confidence: 0.85,
    };
  }

  // Navigation patterns
  if (
    /next\s+page|go\s+to\s+next|continue/.test(lower) ||
    /previous|go\s+back|back\s+page|last\s+page/.test(lower) ||
    /read\s+again|replay|start\s+over/.test(lower)
  ) {
    return {
      category: "navigation",
      intent: lower,
      confidence: 0.9,
    };
  }

  // Questions patterns
  if (
    /what\s+happens/.test(lower) ||
    /who\s+is/.test(lower) ||
    /tell\s+me\s+about/.test(lower) ||
    /why\s+did/.test(lower) ||
    /how\s+does/.test(lower) ||
    /where\s+is/.test(lower)
  ) {
    return {
      category: "questions",
      intent: lower,
      confidence: 0.85,
    };
  }

  // Fun interactions patterns
  if (
    /make\s+it\s+(funny|scary|magical)/.test(lower) ||
    /add\s+magic/.test(lower) ||
    /make\s+it\s+silly/.test(lower) ||
    /be\s+silly/.test(lower)
  ) {
    return {
      category: "fun_interactions",
      intent: lower,
      confidence: 0.8,
    };
  }

  // Default to questions if unclear
  return {
    category: "questions",
    intent: lower,
    confidence: 0.5,
  };
}

/**
 * Save voice assistant state to AsyncStorage
 */
export async function saveVoiceAssistantState(state: Partial<VoiceAssistantState>): Promise<void> {
  try {
    const current = useVoiceAssistantStore.getState();
    const toSave = {
      voiceEnabled: state.voiceEnabled ?? current.voiceEnabled,
      voiceLanguage: state.voiceLanguage ?? current.voiceLanguage,
      commandHistory: state.commandHistory ?? current.commandHistory,
    };
    await AsyncStorage.setItem(VOICE_ASSISTANT_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error("Failed to save voice assistant state:", error);
  }
}

/**
 * Load voice assistant state from AsyncStorage
 */
export async function loadVoiceAssistantState(): Promise<Partial<VoiceAssistantState>> {
  try {
    const stored = await AsyncStorage.getItem(VOICE_ASSISTANT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        voiceEnabled: parsed.voiceEnabled ?? true,
        voiceLanguage: parsed.voiceLanguage ?? "en-US",
        commandHistory: parsed.commandHistory ?? [],
      };
    }
  } catch (error) {
    console.error("Failed to load voice assistant state:", error);
  }
  return {
    voiceEnabled: true,
    voiceLanguage: "en-US",
    commandHistory: [],
  };
}

/**
 * Initialize voice assistant store with persisted state
 */
export async function initializeVoiceAssistant(): Promise<void> {
  try {
    const stored = await loadVoiceAssistantState();
    const store = useVoiceAssistantStore.getState();
    store.toggleVoiceEnabled(stored.voiceEnabled ?? true);
    store.setVoiceLanguage(stored.voiceLanguage ?? "en-US");
  } catch (error) {
    console.error("Failed to initialize voice assistant:", error);
  }
}
