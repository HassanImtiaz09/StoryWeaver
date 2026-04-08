import { useAccessibilityStore } from "@/lib/accessibility-store";
import { getAccessibleColorPalette, getAccessibleTextStyle } from "@/lib/accessibility-text-styles";

/**
 * Hook to access and manage accessibility settings
 * Provides convenience methods for common accessibility operations
 */
export function useAccessibility() {
  const store = useAccessibilityStore();

  return {
    // State
    ...store,

    // Computed values
    colors: getAccessibleColorPalette(store.contrastMode),
    textStyle: getAccessibleTextStyle(16),

    // Convenience methods
    hasAccessibilityNeeds: () => {
      return (
        store.fontMode !== "standard" ||
        store.contrastMode !== "normal" ||
        store.textSize !== 1.0 ||
        store.readingGuide ||
        store.colorOverlay !== null ||
        store.syllableBreaks ||
        store.autoHighlightWords
      );
    },

    /**
     * Check if a specific feature is enabled
     */
    isFeatureEnabled: (feature: keyof typeof store) => {
      return store[feature] === true;
    },

    /**
     * Get a summary of active accessibility features
     */
    getActiveFeaturesDescription: (): string[] => {
      const features: string[] = [];

      if (store.fontMode !== "standard") {
        features.push(`${store.fontMode} font`);
      }

      if (store.contrastMode !== "normal") {
        features.push(`${store.contrastMode} contrast`);
      }

      if (store.textSize !== 1.0) {
        features.push(`${(store.textSize * 100).toFixed(0)}% text size`);
      }

      if (store.lineSpacing !== 1.5) {
        features.push(`line spacing ${store.lineSpacing.toFixed(1)}`);
      }

      if (store.letterSpacing !== 0) {
        features.push(`letter spacing`);
      }

      if (store.autoHighlightWords) {
        features.push("word highlighting");
      }

      if (store.readingGuide) {
        features.push("reading guide");
      }

      if (store.syllableBreaks) {
        features.push("syllable breaks");
      }

      if (store.colorOverlay) {
        features.push(`${store.colorOverlay} overlay`);
      }

      if (store.reduceMotion) {
        features.push("reduced motion");
      }

      return features;
    },
  };
}

export default useAccessibility;
