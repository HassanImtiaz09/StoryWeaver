import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAccessibilityStore } from "@/lib/accessibility-store";
import { getAccessibleColorPalette } from "@/lib/accessibility-text-styles";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

/**
 * Word Highlighter Component
 * Highlights the current word being read by TTS
 * Synchronizes with the existing audio narration system
 */
export interface WordHighlighterProps {
  words: string[]; // Array of words in the text
  currentWordIndex: number; // Index of the word currently being read (-1 = none)
  baseTextStyle?: any;
  showSyllableBreaks?: boolean;
}

interface Word {
  text: string;
  syllables: string[];
  startIndex: number;
}

/**
 * Split a word into syllables
 * Simple heuristic-based approach for early readers
 */
function splitIntoSyllables(word: string): string[] {
  if (word.length <= 3) return [word];

  // Simple vowel-based syllable splitting (heuristic)
  const vowels = /[aeiouy]/i;
  const syllables: string[] = [];
  let currentSyllable = "";

  for (let i = 0; i < word.length; i++) {
    currentSyllable += word[i];

    // Check if we should split after this character
    if (vowels.test(word[i]) && i < word.length - 1) {
      // Look ahead - if next is consonant + vowel, split here
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

export function WordHighlighter({
  words,
  currentWordIndex,
  baseTextStyle,
  showSyllableBreaks = false,
}: WordHighlighterProps) {
  const { autoHighlightWords, contrastMode } = useAccessibilityStore();
  const [displayText, setDisplayText] = useState<Word[]>([]);

  const colors = getAccessibleColorPalette(contrastMode);

  // Parse words and syllables
  useEffect(() => {
    const parsed: Word[] = words.map((word, index) => ({
      text: word,
      syllables: showSyllableBreaks ? splitIntoSyllables(word) : [word],
      startIndex: index,
    }));
    setDisplayText(parsed);
  }, [words, showSyllableBreaks]);

  if (!autoHighlightWords || displayText.length === 0) {
    // Just render the words without highlighting
    return (
      <Text style={baseTextStyle}>
        {displayText.map((w) => w.text).join(" ")}
      </Text>
    );
  }

  const currentWord = displayText[currentWordIndex];

  return (
    <View style={styles.container} accessibilityLabel="Word highlighting for text-to-speech">
      {displayText.map((wordObj, idx) => {
        const isCurrentWord = idx === currentWordIndex;

        if (showSyllableBreaks && wordObj.syllables.length > 1) {
          // Show syllable breaks
          return (
            <View key={`word-${idx}`} style={styles.syllableContainer}>
              {wordObj.syllables.map((syllable, silIdx) => (
                <Animated.View
                  key={`syllable-${idx}-${silIdx}`}
                  entering={isCurrentWord ? FadeIn.duration(100) : undefined}
                  exiting={isCurrentWord ? FadeOut.duration(100) : undefined}
                  style={[
                    isCurrentWord && {
                      backgroundColor: colors.primary,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                    },
                  ]}
                >
                  <Text
                    style={[
                      baseTextStyle,
                      {
                        color: isCurrentWord ? colors.background : colors.text,
                        fontWeight: isCurrentWord ? "700" : "400",
                      },
                    ]}
                  >
                    {syllable}
                  </Text>
                </Animated.View>
              ))}
              {idx < displayText.length - 1 && (
                <Text style={[baseTextStyle, { marginHorizontal: 2 }]}> </Text>
              )}
            </View>
          );
        }

        // Regular word highlighting without syllables
        return (
          <Animated.View
            key={`word-${idx}`}
            entering={isCurrentWord ? FadeIn.duration(100) : undefined}
            exiting={isCurrentWord ? FadeOut.duration(100) : undefined}
            style={[
              isCurrentWord && {
                backgroundColor: colors.primary,
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
                marginHorizontal: 2,
              },
            ]}
          >
            <Text
              style={[
                baseTextStyle,
                {
                  color: isCurrentWord ? colors.background : colors.text,
                  fontWeight: isCurrentWord ? "700" : "400",
                },
              ]}
            >
              {wordObj.text}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  syllableContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
  },
});

export default WordHighlighter;
