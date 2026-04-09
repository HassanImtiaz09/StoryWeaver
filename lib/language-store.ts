/**
 * Language Store - Zustand state management for multilingual features
 *
 * Manages:
 * - Primary and secondary language selection
 * - Bilingual mode state
 * - Translation cache
 * - Learning progress
 * - Persistent storage via AsyncStorage
 */


import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Language store state and actions
 */
export interface LanguageStore {
  // State
  primaryLanguage: string;
  secondaryLanguage: string | null;
  bilingualMode: boolean;
  isTranslating: boolean;
  translationCache: Map<string, string>;
  learningLanguage: string | null;
  vocabularyHighlightsEnabled: boolean;
  learningProgress: Record<string, number>; // language -> word count

  // Primary language actions
  setPrimaryLanguage: (code: string) => void;

  // Secondary language actions
  setSecondaryLanguage: (code: string | null) => void;
  toggleBilingualMode: () => void;

  // Translation actions
  getCachedTranslation: (key: string) => string | undefined;
  cacheTranslation: (key: string, translation: string) => void;
  clearTranslationCache: () => void;

  // Learning actions
  setLearningLanguage: (code: string | null) => void;
  setVocabularyHighlightsEnabled: (enabled: boolean) => void;
  incrementLearningProgress: (language: string, count: number) => void;
  resetLearningProgress: () => void;

  // State
  setIsTranslating: (translating: boolean) => void;
}

/**
 * Create the language store
 */
export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      // Initial state
      primaryLanguage: "en",
      secondaryLanguage: null,
      bilingualMode: false,
      isTranslating: false,
      translationCache: new Map(),
      learningLanguage: null,
      vocabularyHighlightsEnabled: true,
      learningProgress: {},

      // Primary language
      setPrimaryLanguage: (code: string) => {
        set((state) => ({
          primaryLanguage: code,
        }));
      },

      // Secondary language
      setSecondaryLanguage: (code: string | null) => {
        set(() => ({
          secondaryLanguage: code,
          bilingualMode: code !== null,
        }));
      },

      toggleBilingualMode: () => {
        set((state) => ({
          bilingualMode: !state.bilingualMode,
          // Preserve secondary language when toggling so it can be restored
        }));
      },

      // Translation cache
      getCachedTranslation: (key: string) => {
        return get().translationCache.get(key);
      },

      cacheTranslation: (key: string, translation: string) => {
        set((state) => ({
          translationCache: new Map(state.translationCache).set(key, translation),
        }));
      },

      clearTranslationCache: () => {
        set(() => ({
          translationCache: new Map(),
        }));
      },

      // Learning
      setLearningLanguage: (code: string | null) => {
        set(() => ({
          learningLanguage: code,
        }));
      },

      setVocabularyHighlightsEnabled: (enabled: boolean) => {
        set(() => ({
          vocabularyHighlightsEnabled: enabled,
        }));
      },

      incrementLearningProgress: (language: string, count: number) => {
        set((state) => ({
          learningProgress: {
            ...state.learningProgress,
            [language]: (state.learningProgress[language] || 0) + count,
          },
        }));
      },

      resetLearningProgress: () => {
        set(() => ({
          learningProgress: {},
        }));
      },

      setIsTranslating: (translating: boolean) => {
        set(() => ({
          isTranslating: translating,
        }));
      },
    }),
    {
      name: "language-store",
      storage: {
        getItem: async (name) => {
          try {
            const item = await AsyncStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch {
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Silently fail
          }
        },
        removeItem: async (name) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch {
            // Silently fail
          }
        },
      },
      // @ts-expect-error - type assertion needed
      partialize: (state) => ({
        primaryLanguage: state.primaryLanguage,
        secondaryLanguage: state.secondaryLanguage,
        bilingualMode: state.bilingualMode,
        learningLanguage: state.learningLanguage,
        vocabularyHighlightsEnabled: state.vocabularyHighlightsEnabled,
        learningProgress: state.learningProgress,
      }),
    }
  )
);

/**
 * Helper hook to get language display info
 */
export function useLanguageDisplay() {
  const { primaryLanguage, secondaryLanguage, bilingualMode } = useLanguageStore();

  return {
    primaryLanguage,
    secondaryLanguage,
    bilingualMode,
    isSecondaryLanguageActive: bilingualMode && secondaryLanguage !== null,
  };
}

/**
 * Helper hook to get learning info
 */
export function useLanguageLearning() {
  const { learningLanguage, learningProgress, vocabularyHighlightsEnabled } =
    useLanguageStore();

  const getProgressForLanguage = (language: string): number => {
    return learningProgress[language] || 0;
  };

  return {
    learningLanguage,
    learningProgress,
    vocabularyHighlightsEnabled,
    getProgressForLanguage,
  };
}

/**
 * Helper hook to manage translation cache
 */
export function useTranslationCache() {
  const { translationCache, getCachedTranslation, cacheTranslation, clearTranslationCache } =
    useLanguageStore();

  const generateCacheKey = (text: string, sourceLanguage: string, targetLanguage: string) => {
    return `${sourceLanguage}→${targetLanguage}:${text.substring(0, 50)}`;
  };

  const getOrCache = (
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    translatedText: string
  ) => {
    const key = generateCacheKey(text, sourceLanguage, targetLanguage);
    cacheTranslation(key, translatedText);
  };

  return {
    translationCache,
    getCachedTranslation,
    cacheTranslation,
    clearTranslationCache,
    generateCacheKey,
    getOrCache,
  };
}
