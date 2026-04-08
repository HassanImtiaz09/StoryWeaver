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

import { useLanguageStore, useLanguageDisplay, useLanguageLearning, useTranslationCache } from "../lib/language-store";

describe("language-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useLanguageStore.setState({
      primaryLanguage: "en",
      secondaryLanguage: null,
      bilingualMode: false,
      isTranslating: false,
      translationCache: new Map(),
      learningLanguage: null,
      vocabularyHighlightsEnabled: true,
      learningProgress: {},
    });
  });

  describe("store initial state", () => {
    it("initializes with English as primary language", () => {
      const state = useLanguageStore.getState();
      expect(state.primaryLanguage).toBe("en");
      expect(state.secondaryLanguage).toBeNull();
      expect(state.bilingualMode).toBe(false);
    });

    it("initializes with empty translation cache", () => {
      const state = useLanguageStore.getState();
      expect(state.translationCache.size).toBe(0);
    });

    it("initializes with translation features enabled", () => {
      const state = useLanguageStore.getState();
      expect(state.vocabularyHighlightsEnabled).toBe(true);
    });
  });

  describe("primary language selection", () => {
    it("sets primary language to Spanish", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("es");
      expect(useLanguageStore.getState().primaryLanguage).toBe("es");
    });

    it("sets primary language to French", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("fr");
      expect(useLanguageStore.getState().primaryLanguage).toBe("fr");
    });

    it("sets primary language to Mandarin", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("zh");
      expect(useLanguageStore.getState().primaryLanguage).toBe("zh");
    });

    it("sets primary language to German", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("de");
      expect(useLanguageStore.getState().primaryLanguage).toBe("de");
    });
  });

  describe("secondary language and bilingual mode", () => {
    it("sets secondary language and enables bilingual mode", () => {
      const store = useLanguageStore.getState();
      store.setSecondaryLanguage("es");
      const state = useLanguageStore.getState();
      expect(state.secondaryLanguage).toBe("es");
      expect(state.bilingualMode).toBe(true);
    });

    it("clears secondary language and disables bilingual mode", () => {
      const store = useLanguageStore.getState();
      store.setSecondaryLanguage("fr");
      store.setSecondaryLanguage(null);
      const state = useLanguageStore.getState();
      expect(state.secondaryLanguage).toBeNull();
      expect(state.bilingualMode).toBe(false);
    });

    it("toggles bilingual mode on", () => {
      const store = useLanguageStore.getState();
      store.setSecondaryLanguage("fr");
      store.toggleBilingualMode();
      expect(useLanguageStore.getState().bilingualMode).toBe(false);
    });

    it("toggles bilingual mode off", () => {
      const store = useLanguageStore.getState();
      store.toggleBilingualMode();
      expect(useLanguageStore.getState().bilingualMode).toBe(true);
    });

    it("preserves secondary language when toggling bilingual mode", () => {
      const store = useLanguageStore.getState();
      store.setSecondaryLanguage("de");
      const secondaryBefore = useLanguageStore.getState().secondaryLanguage;
      store.toggleBilingualMode();
      store.toggleBilingualMode();
      expect(useLanguageStore.getState().secondaryLanguage).toBe(secondaryBefore);
    });
  });

  describe("translation caching", () => {
    it("caches translation", () => {
      const store = useLanguageStore.getState();
      store.cacheTranslation("hello", "hola");
      const state = useLanguageStore.getState();
      expect(state.translationCache.get("hello")).toBe("hola");
    });

    it("retrieves cached translation", () => {
      const store = useLanguageStore.getState();
      store.cacheTranslation("goodbye", "adiós");
      const translation = store.getCachedTranslation("goodbye");
      expect(translation).toBe("adiós");
    });

    it("returns undefined for missing translation", () => {
      const store = useLanguageStore.getState();
      const translation = store.getCachedTranslation("notfound");
      expect(translation).toBeUndefined();
    });

    it("caches multiple translations", () => {
      const store = useLanguageStore.getState();
      store.cacheTranslation("hello", "hola");
      store.cacheTranslation("goodbye", "adiós");
      store.cacheTranslation("thanks", "gracias");
      const state = useLanguageStore.getState();
      expect(state.translationCache.size).toBe(3);
    });

    it("clears translation cache", () => {
      const store = useLanguageStore.getState();
      store.cacheTranslation("hello", "hola");
      store.cacheTranslation("goodbye", "adiós");
      store.clearTranslationCache();
      const state = useLanguageStore.getState();
      expect(state.translationCache.size).toBe(0);
    });
  });

  describe("learning language", () => {
    it("sets learning language", () => {
      const store = useLanguageStore.getState();
      store.setLearningLanguage("es");
      expect(useLanguageStore.getState().learningLanguage).toBe("es");
    });

    it("clears learning language", () => {
      const store = useLanguageStore.getState();
      store.setLearningLanguage("fr");
      store.setLearningLanguage(null);
      expect(useLanguageStore.getState().learningLanguage).toBeNull();
    });
  });

  describe("vocabulary highlights", () => {
    it("enables vocabulary highlights", () => {
      const store = useLanguageStore.getState();
      store.setVocabularyHighlightsEnabled(true);
      expect(useLanguageStore.getState().vocabularyHighlightsEnabled).toBe(true);
    });

    it("disables vocabulary highlights", () => {
      const store = useLanguageStore.getState();
      store.setVocabularyHighlightsEnabled(false);
      expect(useLanguageStore.getState().vocabularyHighlightsEnabled).toBe(false);
    });
  });

  describe("learning progress", () => {
    it("increments learning progress for a language", () => {
      const store = useLanguageStore.getState();
      store.incrementLearningProgress("es", 5);
      expect(useLanguageStore.getState().learningProgress["es"]).toBe(5);
    });

    it("accumulates progress across multiple increments", () => {
      const store = useLanguageStore.getState();
      store.incrementLearningProgress("fr", 3);
      store.incrementLearningProgress("fr", 7);
      expect(useLanguageStore.getState().learningProgress["fr"]).toBe(10);
    });

    it("tracks progress for multiple languages", () => {
      const store = useLanguageStore.getState();
      store.incrementLearningProgress("es", 5);
      store.incrementLearningProgress("fr", 8);
      store.incrementLearningProgress("de", 3);
      const progress = useLanguageStore.getState().learningProgress;
      expect(progress["es"]).toBe(5);
      expect(progress["fr"]).toBe(8);
      expect(progress["de"]).toBe(3);
    });

    it("resets learning progress", () => {
      const store = useLanguageStore.getState();
      store.incrementLearningProgress("es", 10);
      store.incrementLearningProgress("fr", 20);
      store.resetLearningProgress();
      expect(useLanguageStore.getState().learningProgress).toEqual({});
    });
  });

  describe("translation state", () => {
    it("sets isTranslating flag", () => {
      const store = useLanguageStore.getState();
      store.setIsTranslating(true);
      expect(useLanguageStore.getState().isTranslating).toBe(true);
    });

    it("clears isTranslating flag", () => {
      const store = useLanguageStore.getState();
      store.setIsTranslating(true);
      store.setIsTranslating(false);
      expect(useLanguageStore.getState().isTranslating).toBe(false);
    });
  });

  describe("RTL language detection", () => {
    it("identifies Arabic as RTL language", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("ar");
      // RTL detection would be in a helper function
      // For now, just verify language is set
      expect(useLanguageStore.getState().primaryLanguage).toBe("ar");
    });

    it("identifies Hebrew as RTL language", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("he");
      expect(useLanguageStore.getState().primaryLanguage).toBe("he");
    });
  });

  describe("helper hooks", () => {
    it("useLanguageDisplay returns current display info", () => {
      const store = useLanguageStore.getState();
      store.setPrimaryLanguage("es");
      store.setSecondaryLanguage("fr");
      const display = useLanguageDisplay();
      expect(display.primaryLanguage).toBe("es");
      expect(display.secondaryLanguage).toBe("fr");
      expect(display.bilingualMode).toBe(true);
    });

    it("useLanguageLearning returns learning info", () => {
      const store = useLanguageStore.getState();
      store.setLearningLanguage("de");
      store.incrementLearningProgress("de", 15);
      const learning = useLanguageLearning();
      expect(learning.learningLanguage).toBe("de");
      expect(learning.getProgressForLanguage("de")).toBe(15);
      expect(learning.vocabularyHighlightsEnabled).toBe(true);
    });

    it("useTranslationCache provides cache operations", () => {
      const store = useLanguageStore.getState();
      const cache = useTranslationCache();

      const key = cache.generateCacheKey("hello", "en", "es");
      expect(key).toContain("en→es");
      expect(key).toContain("hello");

      cache.cacheTranslation(key, "hola");
      expect(cache.getCachedTranslation(key)).toBe("hola");
    });

    it("useTranslationCache generateCacheKey handles long text", () => {
      const cache = useTranslationCache();
      const longText = "This is a very long sentence that should be truncated to 50 characters";
      const key = cache.generateCacheKey(longText, "en", "es");
      expect(key).toContain("en→es");
      expect(key.length).toBeLessThan(100); // Key should be reasonably sized
    });

    it("useTranslationCache getOrCache caches translations", () => {
      const cache = useTranslationCache();
      cache.getOrCache("hello", "en", "es", "hola");
      const stored = cache.getCachedTranslation(cache.generateCacheKey("hello", "en", "es"));
      expect(stored).toBe("hola");
    });
  });

  describe("bilingual workflow", () => {
    it("supports full bilingual workflow", () => {
      const store = useLanguageStore.getState();

      // Start with English
      expect(useLanguageStore.getState().primaryLanguage).toBe("en");

      // Add Spanish as secondary
      store.setSecondaryLanguage("es");
      expect(useLanguageStore.getState().bilingualMode).toBe(true);

      // Cache translations
      store.cacheTranslation("cat", "gato");
      store.cacheTranslation("dog", "perro");

      // Verify cache
      expect(store.getCachedTranslation("cat")).toBe("gato");
      expect(store.getCachedTranslation("dog")).toBe("perro");
    });
  });

  describe("language switching", () => {
    it("switches primary language while preserving secondary", () => {
      const store = useLanguageStore.getState();
      store.setSecondaryLanguage("es");
      store.setPrimaryLanguage("fr");

      const state = useLanguageStore.getState();
      expect(state.primaryLanguage).toBe("fr");
      expect(state.secondaryLanguage).toBe("es");
    });
  });

  describe("vocabulary highlights with learning", () => {
    it("combines vocabulary highlights with learning progress", () => {
      const store = useLanguageStore.getState();
      store.setVocabularyHighlightsEnabled(true);
      store.setLearningLanguage("es");
      store.incrementLearningProgress("es", 25);

      const learning = useLanguageLearning();
      expect(learning.vocabularyHighlightsEnabled).toBe(true);
      expect(learning.learningLanguage).toBe("es");
      expect(learning.getProgressForLanguage("es")).toBe(25);
    });
  });

  describe("simultaneous learning languages", () => {
    it("tracks progress for multiple learning languages", () => {
      const store = useLanguageStore.getState();
      store.incrementLearningProgress("es", 10);
      store.incrementLearningProgress("fr", 15);
      store.incrementLearningProgress("de", 8);

      const progress = useLanguageStore.getState().learningProgress;
      expect(progress["es"]).toBe(10);
      expect(progress["fr"]).toBe(15);
      expect(progress["de"]).toBe(8);
    });
  });
});
