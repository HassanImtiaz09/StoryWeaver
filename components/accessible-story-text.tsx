import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useAccessibilityStore } from "@/lib/accessibility-store";
import { getStoryTextStyle } from "@/lib/accessibility-text-styles";
import { WordHighlighter } from "./word-highlighter";

/**
 * AccessibleStoryText Component
 * Wraps story text with all accessibility enhancements applied:
 * - Font mode (standard, dyslexia, large-print)
 * - Text sizing and spacing
 * - Contrast mode
 * - Word highlighting during TTS
 * - Syllable breaks for early readers
 * - Screen reader labels
 */
export interface AccessibleStoryTextProps {
  text: string;
  currentWordIndex?: number; // For TTS word highlighting
  isHighlightingEnabled?: boolean; // Enable word highlighting
  accessibilityLabel?: string;
  selectable?: boolean;
  numberOfLines?: number;
  style?: any;
  onPress?: () => void;
}

export function AccessibleStoryText({
  text,
  currentWordIndex = -1,
  isHighlightingEnabled = false,
  accessibilityLabel,
  selectable = true,
  numberOfLines,
  style,
  onPress,
}: AccessibleStoryTextProps) {
  const {
    fontMode,
    contrastMode,
    textSize,
    lineSpacing,
    letterSpacing,
    syllableBreaks,
    screenReaderOptimized,
  } = useAccessibilityStore();

  // Get computed text style
  const computedStyle = getStoryTextStyle(
    fontMode,
    textSize,
    lineSpacing,
    letterSpacing,
    contrastMode
  );

  // Split text into words for highlighting
  const words = text.split(/\s+/);

  // If word highlighting is enabled and we have a current word
  const shouldHighlight = isHighlightingEnabled && currentWordIndex >= 0;

  const accessibilityProps = {
    accessibilityLabel: accessibilityLabel || text,
    accessibilityRole: "text" as const,
    accessibilityHint: screenReaderOptimized
      ? "Double tap to read with screen reader. Adjust text size, contrast, and font in accessibility settings."
      : undefined,
  };

  return (
    <View
      style={[styles.container, style]}
      // @ts-expect-error - overload mismatch
      onPress={onPress}
      accessible={true}
      {...accessibilityProps}
    >
      {shouldHighlight ? (
        <WordHighlighter
          words={words}
          currentWordIndex={currentWordIndex}
          baseTextStyle={computedStyle}
          showSyllableBreaks={syllableBreaks}
        />
      ) : (
        <Text
          style={[computedStyle, styles.text]}
          selectable={selectable}
          numberOfLines={numberOfLines}
          accessibilityElementsHidden={true}
        >
          {syllableBreaks ? renderSyllableBreaks(text) : text}
        </Text>
      )}
    </View>
  );
}

/**
 * Render text with syllable breaks for early readers
 * Format: "ad-ven-ture" instead of "adventure"
 */
function renderSyllableBreaks(text: string): string {
  const words = text.split(/\s+/);
  const processedWords = words.map((word) => {
    // Remove punctuation for syllable processing
    const match = word.match(/^([^.,!?;:]+)(.*)/);
    if (!match) return word;

    const [, cleanWord, punctuation] = match;
    const syllables = splitIntoSyllables(cleanWord);
    return syllables.join("-") + punctuation;
  });

  return processedWords.join(" ");
}

/**
 * Split a word into syllables (same as in word-highlighter)
 */
function splitIntoSyllables(word: string): string[] {
  if (word.length <= 3) return [word];

  const vowels = /[aeiouy]/i;
  const syllables: string[] = [];
  let currentSyllable = "";

  for (let i = 0; i < word.length; i++) {
    currentSyllable += word[i];

    if (vowels.test(word[i]) && i < word.length - 1) {
      if (
        !vowels.test(word[i + 1]) &&
        i + 2 < word.length &&
        vowels.test(word[i + 2])
      ) {
        syllables.push(currentSyllable);
        currentSyllable = "";
      }
    }
  }

  if (currentSyllable) {
    syllables.push(currentSyllable);
  }

  return syllables.length > 0 ? syllables : [word];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    textAlignVertical: "center",
  },
});

export default AccessibleStoryText;
