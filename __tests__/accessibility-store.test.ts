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

import { useAccessibilityStore } from "../lib/accessibility-store";

describe("accessibility-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useAccessibilityStore.setState({
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
    });
  });

  describe("store initial state", () => {
    it("initializes with standard font mode", () => {
      const state = useAccessibilityStore.getState();
      expect(state.fontMode).toBe("standard");
    });

    it("initializes with normal contrast mode", () => {
      const state = useAccessibilityStore.getState();
      expect(state.contrastMode).toBe("normal");
    });

    it("initializes with default text size", () => {
      const state = useAccessibilityStore.getState();
      expect(state.textSize).toBe(1.0);
    });

    it("initializes with default line spacing", () => {
      const state = useAccessibilityStore.getState();
      expect(state.lineSpacing).toBe(1.5);
    });
  });

  describe("font mode", () => {
    it("sets font mode to dyslexia-friendly", () => {
      const store = useAccessibilityStore.getState();
      store.setFontMode("dyslexia");
      expect(useAccessibilityStore.getState().fontMode).toBe("dyslexia");
    });

    it("sets font mode to large-print", () => {
      const store = useAccessibilityStore.getState();
      store.setFontMode("large-print");
      expect(useAccessibilityStore.getState().fontMode).toBe("large-print");
    });

    it("reverts font mode to standard", () => {
      const store = useAccessibilityStore.getState();
      store.setFontMode("dyslexia");
      store.setFontMode("standard");
      expect(useAccessibilityStore.getState().fontMode).toBe("standard");
    });
  });

  describe("contrast modes", () => {
    it("sets contrast to high-contrast", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("high-contrast");
      expect(useAccessibilityStore.getState().contrastMode).toBe("high-contrast");
    });

    it("sets contrast to dark mode", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("dark");
      expect(useAccessibilityStore.getState().contrastMode).toBe("dark");
    });

    it("sets contrast to sepia", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("sepia");
      expect(useAccessibilityStore.getState().contrastMode).toBe("sepia");
    });

    it("resets to normal contrast", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("dark");
      store.setContrastMode("normal");
      expect(useAccessibilityStore.getState().contrastMode).toBe("normal");
    });
  });

  describe("text size scaling", () => {
    it("increases text size to 1.2x", () => {
      const store = useAccessibilityStore.getState();
      store.setTextSize(1.2);
      expect(useAccessibilityStore.getState().textSize).toBe(1.2);
    });

    it("increases text size to 1.5x", () => {
      const store = useAccessibilityStore.getState();
      store.setTextSize(1.5);
      expect(useAccessibilityStore.getState().textSize).toBe(1.5);
    });

    it("increases text size to maximum 2.0x", () => {
      const store = useAccessibilityStore.getState();
      store.setTextSize(2.0);
      expect(useAccessibilityStore.getState().textSize).toBe(2.0);
    });

    it("decreases text size to 0.8x", () => {
      const store = useAccessibilityStore.getState();
      store.setTextSize(0.8);
      expect(useAccessibilityStore.getState().textSize).toBe(0.8);
    });
  });

  describe("line spacing", () => {
    it("increases line spacing to 1.8", () => {
      const store = useAccessibilityStore.getState();
      store.setLineSpacing(1.8);
      expect(useAccessibilityStore.getState().lineSpacing).toBe(1.8);
    });

    it("increases line spacing to 2.0", () => {
      const store = useAccessibilityStore.getState();
      store.setLineSpacing(2.0);
      expect(useAccessibilityStore.getState().lineSpacing).toBe(2.0);
    });

    it("increases line spacing to maximum 2.5", () => {
      const store = useAccessibilityStore.getState();
      store.setLineSpacing(2.5);
      expect(useAccessibilityStore.getState().lineSpacing).toBe(2.5);
    });
  });

  describe("letter and word spacing", () => {
    it("increases letter spacing", () => {
      const store = useAccessibilityStore.getState();
      store.setLetterSpacing(1.5);
      expect(useAccessibilityStore.getState().letterSpacing).toBe(1.5);
    });

    it("increases word spacing", () => {
      const store = useAccessibilityStore.getState();
      store.setWordSpacing(2.0);
      expect(useAccessibilityStore.getState().wordSpacing).toBe(2.0);
    });

    it("sets both letter and word spacing together", () => {
      const store = useAccessibilityStore.getState();
      store.setLetterSpacing(1.0);
      store.setWordSpacing(1.5);
      const state = useAccessibilityStore.getState();
      expect(state.letterSpacing).toBe(1.0);
      expect(state.wordSpacing).toBe(1.5);
    });
  });

  describe("text-to-speech controls", () => {
    it("increases TTS speed to 1.5x", () => {
      const store = useAccessibilityStore.getState();
      store.setTtsSpeed(1.5);
      expect(useAccessibilityStore.getState().ttsSpeed).toBe(1.5);
    });

    it("decreases TTS speed to 0.75x", () => {
      const store = useAccessibilityStore.getState();
      store.setTtsSpeed(0.75);
      expect(useAccessibilityStore.getState().ttsSpeed).toBe(0.75);
    });

    it("enables auto-highlight words", () => {
      const store = useAccessibilityStore.getState();
      store.setAutoHighlightWords(true);
      expect(useAccessibilityStore.getState().autoHighlightWords).toBe(true);
    });

    it("disables auto-highlight words", () => {
      const store = useAccessibilityStore.getState();
      store.setAutoHighlightWords(true);
      store.setAutoHighlightWords(false);
      expect(useAccessibilityStore.getState().autoHighlightWords).toBe(false);
    });
  });

  describe("motion reduction", () => {
    it("enables reduce motion", () => {
      const store = useAccessibilityStore.getState();
      store.setReduceMotion(true);
      expect(useAccessibilityStore.getState().reduceMotion).toBe(true);
    });

    it("disables reduce motion", () => {
      const store = useAccessibilityStore.getState();
      store.setReduceMotion(true);
      store.setReduceMotion(false);
      expect(useAccessibilityStore.getState().reduceMotion).toBe(false);
    });
  });

  describe("screen reader optimization", () => {
    it("enables screen reader optimization", () => {
      const store = useAccessibilityStore.getState();
      store.setScreenReaderOptimized(true);
      expect(useAccessibilityStore.getState().screenReaderOptimized).toBe(true);
    });

    it("disables screen reader optimization", () => {
      const store = useAccessibilityStore.getState();
      store.setScreenReaderOptimized(true);
      store.setScreenReaderOptimized(false);
      expect(useAccessibilityStore.getState().screenReaderOptimized).toBe(false);
    });
  });

  describe("syllable breaks", () => {
    it("enables syllable breaks", () => {
      const store = useAccessibilityStore.getState();
      store.setSyllableBreaks(true);
      expect(useAccessibilityStore.getState().syllableBreaks).toBe(true);
    });

    it("disables syllable breaks", () => {
      const store = useAccessibilityStore.getState();
      store.setSyllableBreaks(true);
      store.setSyllableBreaks(false);
      expect(useAccessibilityStore.getState().syllableBreaks).toBe(false);
    });
  });

  describe("reading guide", () => {
    it("enables reading guide", () => {
      const store = useAccessibilityStore.getState();
      store.setReadingGuide(true);
      expect(useAccessibilityStore.getState().readingGuide).toBe(true);
    });

    it("disables reading guide", () => {
      const store = useAccessibilityStore.getState();
      store.setReadingGuide(true);
      store.setReadingGuide(false);
      expect(useAccessibilityStore.getState().readingGuide).toBe(false);
    });
  });

  describe("color overlays", () => {
    it("sets color overlay to amber", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlay("amber");
      expect(useAccessibilityStore.getState().colorOverlay).toBe("amber");
    });

    it("sets color overlay to blue", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlay("blue");
      expect(useAccessibilityStore.getState().colorOverlay).toBe("blue");
    });

    it("sets color overlay to green", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlay("green");
      expect(useAccessibilityStore.getState().colorOverlay).toBe("green");
    });

    it("sets color overlay to pink", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlay("pink");
      expect(useAccessibilityStore.getState().colorOverlay).toBe("pink");
    });

    it("sets color overlay to purple", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlay("purple");
      expect(useAccessibilityStore.getState().colorOverlay).toBe("purple");
    });

    it("removes color overlay", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlay("blue");
      store.setColorOverlay(null);
      expect(useAccessibilityStore.getState().colorOverlay).toBeNull();
    });

    it("adjusts color overlay opacity", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlayOpacity(30);
      expect(useAccessibilityStore.getState().colorOverlayOpacity).toBe(30);
    });

    it("sets minimum opacity", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlayOpacity(10);
      expect(useAccessibilityStore.getState().colorOverlayOpacity).toBe(10);
    });

    it("sets maximum opacity", () => {
      const store = useAccessibilityStore.getState();
      store.setColorOverlayOpacity(40);
      expect(useAccessibilityStore.getState().colorOverlayOpacity).toBe(40);
    });
  });

  describe("reset to defaults", () => {
    it("resets all settings to defaults", () => {
      const store = useAccessibilityStore.getState();
      store.setFontMode("dyslexia");
      store.setContrastMode("dark");
      store.setTextSize(2.0);
      store.setLineSpacing(2.5);
      store.setReadingGuide(true);
      store.setColorOverlay("blue");
      store.setColorOverlayOpacity(40);

      store.resetToDefaults();

      const state = useAccessibilityStore.getState();
      expect(state.fontMode).toBe("standard");
      expect(state.contrastMode).toBe("normal");
      expect(state.textSize).toBe(1.0);
      expect(state.lineSpacing).toBe(1.5);
      expect(state.readingGuide).toBe(false);
      expect(state.colorOverlay).toBeNull();
      expect(state.colorOverlayOpacity).toBe(20);
    });
  });

  describe("accessible text styles", () => {
    it("generates accessible text style with font mode", () => {
      const store = useAccessibilityStore.getState();
      store.setFontMode("dyslexia");
      const style = store.getAccessibleTextStyle();
      expect(style).toBeDefined();
      expect(typeof style).toBe("object");
    });

    it("applies text size to style", () => {
      const store = useAccessibilityStore.getState();
      store.setTextSize(1.5);
      const style = store.getAccessibleTextStyle();
      expect(style.fontSize).toBeDefined();
    });

    it("applies line spacing to style", () => {
      const store = useAccessibilityStore.getState();
      store.setLineSpacing(2.0);
      const style = store.getAccessibleTextStyle();
      expect(style.lineHeight).toBeDefined();
    });
  });

  describe("accessible colors", () => {
    it("generates colors for normal contrast", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("normal");
      const colors = store.getAccessibleColors();
      expect(colors.text).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.surface).toBeDefined();
    });

    it("generates colors for high contrast", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("high-contrast");
      const colors = store.getAccessibleColors();
      expect(colors.text).toBeDefined();
      expect(colors.background).toBeDefined();
    });

    it("generates colors for dark mode", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("dark");
      const colors = store.getAccessibleColors();
      expect(colors.background).toBeDefined();
    });

    it("generates colors for sepia mode", () => {
      const store = useAccessibilityStore.getState();
      store.setContrastMode("sepia");
      const colors = store.getAccessibleColors();
      expect(colors).toBeDefined();
    });
  });

  describe("comprehensive accessibility profile", () => {
    it("supports comprehensive dyslexia-friendly profile", () => {
      const store = useAccessibilityStore.getState();
      store.setFontMode("dyslexia");
      store.setLineSpacing(2.0);
      store.setLetterSpacing(1.5);
      store.setWordSpacing(1.0);
      store.setContrastMode("sepia");
      store.setColorOverlay("blue");
      store.setColorOverlayOpacity(25);
      store.setReadingGuide(true);
      store.setSyllableBreaks(true);
      store.setTtsSpeed(0.85);
      store.setAutoHighlightWords(true);

      const state = useAccessibilityStore.getState();
      expect(state.fontMode).toBe("dyslexia");
      expect(state.readingGuide).toBe(true);
      expect(state.syllableBreaks).toBe(true);
      expect(state.autoHighlightWords).toBe(true);
    });

    it("supports vision-impaired profile with screen reader", () => {
      const store = useAccessibilityStore.getState();
      store.setScreenReaderOptimized(true);
      store.setTextSize(2.0);
      store.setContrastMode("high-contrast");
      store.setLineSpacing(2.5);

      const state = useAccessibilityStore.getState();
      expect(state.screenReaderOptimized).toBe(true);
      expect(state.textSize).toBe(2.0);
      expect(state.contrastMode).toBe("high-contrast");
    });
  });
});
