import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TextStyle } from "react-native";

const ACCESSIBILITY_KEY = "storyweaver_accessibility";

export interface AccessibilityState {
  // Font and Text
  fontMode: "standard" | "dyslexia" | "large-print";
  contrastMode: "normal" | "high-contrast" | "dark" | "sepia";
  textSize: number; // 0.8 to 2.0, default 1.0
  lineSpacing: number; // 1.0 to 2.5, default 1.5
  letterSpacing: number; // 0 to 3, default 0
  wordSpacing: number; // 0 to 5, default 0

  // Text-to-Speech
  ttsSpeed: number; // 0.5 to 2.0, default 1.0
  autoHighlightWords: boolean; // highlight words as TTS reads

  // Visual Accommodations
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  syllableBreaks: boolean; // show syllable breaks in words
  readingGuide: boolean; // show a reading ruler/guide line
  colorOverlay: "amber" | "blue" | "green" | "pink" | "purple" | null;
  colorOverlayOpacity: number; // 10 to 40, default 20

  // Actions
  setFontMode: (mode: "standard" | "dyslexia" | "large-print") => void;
  setContrastMode: (mode: "normal" | "high-contrast" | "dark" | "sepia") => void;
  setTextSize: (size: number) => void;
  setLineSpacing: (spacing: number) => void;
  setLetterSpacing: (spacing: number) => void;
  setWordSpacing: (spacing: number) => void;
  setTtsSpeed: (speed: number) => void;
  setAutoHighlightWords: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setScreenReaderOptimized: (enabled: boolean) => void;
  setSyllableBreaks: (enabled: boolean) => void;
  setReadingGuide: (enabled: boolean) => void;
  setColorOverlay: (color: "amber" | "blue" | "green" | "pink" | "purple" | null) => void;
  setColorOverlayOpacity: (opacity: number) => void;
  resetToDefaults: () => void;

  // Computed functions
  getAccessibleTextStyle: () => TextStyle;
  getAccessibleColors: () => AccessibilityColors;

  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export interface AccessibilityColors {
  text: string;
  background: string;
  surface: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
}

const DEFAULT_ACCESSIBILITY: Omit<
  AccessibilityState,
  | "setFontMode"
  | "setContrastMode"
  | "setTextSize"
  | "setLineSpacing"
  | "setLetterSpacing"
  | "setWordSpacing"
  | "setTtsSpeed"
  | "setAutoHighlightWords"
  | "setReduceMotion"
  | "setScreenReaderOptimized"
  | "setSyllableBreaks"
  | "setReadingGuide"
  | "setColorOverlay"
  | "setColorOverlayOpacity"
  | "resetToDefaults"
  | "getAccessibleTextStyle"
  | "getAccessibleColors"
  | "loadFromStorage"
  | "saveToStorage"
> = {
  fontMode: "standard",
  contrastMode: "normal",
  textSize: 1.0,
  lineSpacing: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
  ttsSpeed: 1.0,
  autoHighlightWords: false,
  reduceMotion: false,
  screenReaderOptimized: false,
  syllableBreaks: false,
  readingGuide: false,
  colorOverlay: null,
  colorOverlayOpacity: 20,
};

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  ...DEFAULT_ACCESSIBILITY,

  setFontMode: (mode) => set({ fontMode: mode }),
  setContrastMode: (mode) => set({ contrastMode: mode }),
  setTextSize: (size) => set({ textSize: Math.max(0.8, Math.min(2.0, size)) }),
  setLineSpacing: (spacing) => set({ lineSpacing: Math.max(1.0, Math.min(2.5, spacing)) }),
  setLetterSpacing: (spacing) => set({ letterSpacing: Math.max(0, Math.min(3, spacing)) }),
  setWordSpacing: (spacing) => set({ wordSpacing: Math.max(0, Math.min(5, spacing)) }),
  setTtsSpeed: (speed) => set({ ttsSpeed: Math.max(0.5, Math.min(2.0, speed)) }),
  setAutoHighlightWords: (enabled) => set({ autoHighlightWords: enabled }),
  setReduceMotion: (enabled) => set({ reduceMotion: enabled }),
  setScreenReaderOptimized: (enabled) => set({ screenReaderOptimized: enabled }),
  setSyllableBreaks: (enabled) => set({ syllableBreaks: enabled }),
  setReadingGuide: (enabled) => set({ readingGuide: enabled }),
  setColorOverlay: (color) => set({ colorOverlay: color }),
  setColorOverlayOpacity: (opacity) =>
    set({ colorOverlayOpacity: Math.max(10, Math.min(40, opacity)) }),

  resetToDefaults: () => set(DEFAULT_ACCESSIBILITY),

  getAccessibleTextStyle: () => {
    const state = get();
    const baseFontSize = 16 * state.textSize;
    let fontFamily = "System";

    // Font selection based on mode
    if (state.fontMode === "dyslexia") {
      fontFamily = "OpenDyslexic";
    } else if (state.fontMode === "large-print") {
      fontFamily = "Georgia";
    }

    return {
      fontSize: baseFontSize,
      lineHeight: baseFontSize * state.lineSpacing,
      letterSpacing: state.letterSpacing,
      fontFamily,
    } as TextStyle;
  },

  getAccessibleColors: (): AccessibilityColors => {
    const state = get();

    // Color schemes based on contrast mode
    const colorSchemes: Record<string, AccessibilityColors> = {
      normal: {
        text: "#1F2937",
        background: "#FFFFFF",
        surface: "#F8F9FA",
        textSecondary: "#6B7280",
        primary: "#FFD700",
        secondary: "#FF6B6B",
        accent: "#48C9B0",
        border: "#E5E7EB",
      },
      "high-contrast": {
        text: "#000000",
        background: "#FFFFFF",
        surface: "#F0F0F0",
        textSecondary: "#000000",
        primary: "#0000FF",
        secondary: "#FF0000",
        accent: "#008000",
        border: "#000000",
      },
      dark: {
        text: "#FFFFFF",
        background: "#0A0E1A",
        surface: "#1A1E2E",
        textSecondary: "#D1D5DB",
        primary: "#60A5FA",
        secondary: "#FB7185",
        accent: "#10B981",
        border: "#374151",
      },
      sepia: {
        text: "#3E2723",
        background: "#F5E6D3",
        surface: "#EDD5C4",
        textSecondary: "#5D4037",
        primary: "#D2691E",
        secondary: "#BC6C25",
        accent: "#8B6F47",
        border: "#A1887F",
      },
    };

    return colorSchemes[state.contrastMode] || colorSchemes.normal;
  },

  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem(ACCESSIBILITY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set(parsed);
      }
    } catch (error) {
      console.error("Failed to load accessibility settings:", error);
    }
  },

  saveToStorage: async () => {
    try {
      const state = get();
      const toStore = {
        fontMode: state.fontMode,
        contrastMode: state.contrastMode,
        textSize: state.textSize,
        lineSpacing: state.lineSpacing,
        letterSpacing: state.letterSpacing,
        wordSpacing: state.wordSpacing,
        ttsSpeed: state.ttsSpeed,
        autoHighlightWords: state.autoHighlightWords,
        reduceMotion: state.reduceMotion,
        screenReaderOptimized: state.screenReaderOptimized,
        syllableBreaks: state.syllableBreaks,
        readingGuide: state.readingGuide,
        colorOverlay: state.colorOverlay,
        colorOverlayOpacity: state.colorOverlayOpacity,
      };
      await AsyncStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error("Failed to save accessibility settings:", error);
    }
  },
}));

// Helper hook to use accessibility settings
export function useAccessibility() {
  return useAccessibilityStore();
}
