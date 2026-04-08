/**
 * Bilingual Page View Component
 *
 * Displays story pages in two languages side-by-side or stacked.
 * Features:
 * - Side-by-side or stacked layout toggle
 * - RTL language support (Arabic)
 * - CJK font sizing (Chinese, Japanese, Korean)
 * - Vocabulary highlighting with translations
 * - Language labels
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { useLanguageStore } from "@/lib/language-store";
import {
  formatBilingualPage,
  getFontFamilyForLanguage,
  getLineHeightForLanguage,
  formatLanguageName,
} from "@/server/_core/bilingualFormatter";
import { VocabularyCard } from "./vocabulary-card";
import { SUPPORTED_LANGUAGES } from "@/server/_core/languageService";

interface BilingualPageViewProps {
  primaryText: string;
  secondaryText: string;
  primaryLanguageCode: string;
  secondaryLanguageCode: string;
  pageNumber?: number;
  showVocabularyHighlights?: boolean;
  vocabularyHighlights?: Array<{
    word: string;
    translation: string;
    pronunciation?: string;
    definition?: string;
    language?: string;
  }>;
}

export function BilingualPageView({
  primaryText,
  secondaryText,
  primaryLanguageCode,
  secondaryLanguageCode,
  pageNumber,
  showVocabularyHighlights = false,
  vocabularyHighlights = [],
}: BilingualPageViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [displayFormat, setDisplayFormat] = useState<"side-by-side" | "stacked">(
    screenWidth > 768 ? "side-by-side" : "stacked"
  );
  const [selectedWord, setSelectedWord] = useState<(typeof vocabularyHighlights)[0] | null>(null);

  const bilingualPage = useMemo(
    () =>
      formatBilingualPage(
        primaryText,
        secondaryText,
        primaryLanguageCode,
        secondaryLanguageCode,
        displayFormat
      ),
    [primaryText, secondaryText, primaryLanguageCode, secondaryLanguageCode, displayFormat]
  );

  const isSideBySide = displayFormat === "side-by-side" && screenWidth > 768;

  return (
    <View style={styles.container}>
      {/* Page Header */}
      {pageNumber && (
        <View style={styles.header}>
          <Text style={styles.pageNumber}>Page {pageNumber}</Text>
        </View>
      )}

      {/* Layout Toggle */}
      {screenWidth > 768 && (
        <View style={styles.layoutToggle}>
          <TouchableOpacity
            style={[
              styles.layoutButton,
              displayFormat === "side-by-side" && styles.layoutButtonActive,
            ]}
            onPress={() => setDisplayFormat("side-by-side")}
          >
            <Text style={styles.layoutButtonText}>Side-by-Side</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.layoutButton,
              displayFormat === "stacked" && styles.layoutButtonActive,
            ]}
            onPress={() => setDisplayFormat("stacked")}
          >
            <Text style={styles.layoutButtonText}>Stacked</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {isSideBySide ? (
          <View style={styles.sideBySideContainer}>
            {/* Primary Language */}
            <View style={[styles.languageSection, styles.primarySection]}>
              <LanguageSectionHeader
                languageCode={primaryLanguageCode}
                isPrimary={true}
              />
              <LanguageText
                text={primaryText}
                languageCode={primaryLanguageCode}
                rtl={bilingualPage.primaryRTL}
                cjk={bilingualPage.primaryCJK}
                fontSize={bilingualPage.primaryFontSize}
                highlights={
                  showVocabularyHighlights
                    ? vocabularyHighlights.filter((h) => h.language !== secondaryLanguageCode)
                    : []
                }
                onWordPress={setSelectedWord}
              />
            </View>

            {/* Secondary Language */}
            <View style={[styles.languageSection, styles.secondarySection]}>
              <LanguageSectionHeader
                languageCode={secondaryLanguageCode}
                isPrimary={false}
              />
              <LanguageText
                text={secondaryText}
                languageCode={secondaryLanguageCode}
                rtl={bilingualPage.secondaryRTL}
                cjk={bilingualPage.secondaryCJK}
                fontSize={bilingualPage.secondaryFontSize}
                highlights={
                  showVocabularyHighlights
                    ? vocabularyHighlights.filter((h) => h.language === secondaryLanguageCode)
                    : []
                }
                onWordPress={setSelectedWord}
              />
            </View>
          </View>
        ) : (
          <View style={styles.stackedContainer}>
            {/* Primary Language */}
            <View style={styles.languageSection}>
              <LanguageSectionHeader
                languageCode={primaryLanguageCode}
                isPrimary={true}
              />
              <LanguageText
                text={primaryText}
                languageCode={primaryLanguageCode}
                rtl={bilingualPage.primaryRTL}
                cjk={bilingualPage.primaryCJK}
                fontSize={bilingualPage.primaryFontSize}
                highlights={
                  showVocabularyHighlights
                    ? vocabularyHighlights.filter((h) => h.language !== secondaryLanguageCode)
                    : []
                }
                onWordPress={setSelectedWord}
              />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Secondary Language */}
            <View style={styles.languageSection}>
              <LanguageSectionHeader
                languageCode={secondaryLanguageCode}
                isPrimary={false}
              />
              <LanguageText
                text={secondaryText}
                languageCode={secondaryLanguageCode}
                rtl={bilingualPage.secondaryRTL}
                cjk={bilingualPage.secondaryCJK}
                fontSize={bilingualPage.secondaryFontSize}
                highlights={
                  showVocabularyHighlights
                    ? vocabularyHighlights.filter((h) => h.language === secondaryLanguageCode)
                    : []
                }
                onWordPress={setSelectedWord}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Vocabulary Card Modal */}
      {selectedWord && (
        <VocabularyCard
          word={selectedWord.word}
          translation={selectedWord.translation}
          pronunciation={selectedWord.pronunciation}
          definition={selectedWord.definition}
          visible={!!selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </View>
  );
}

/**
 * Language Section Header
 */
function LanguageSectionHeader({
  languageCode,
  isPrimary,
}: {
  languageCode: string;
  isPrimary: boolean;
}) {
  const language = SUPPORTED_LANGUAGES[languageCode];

  if (!language) return null;

  return (
    <View style={[styles.sectionHeader, !isPrimary && styles.secondaryHeader]}>
      <Text style={styles.languageFlag}>
        {language.nativeName === language.name ? language.nativeName : language.nativeName}
      </Text>
      <View style={styles.languageNameContainer}>
        <Text style={styles.languageName}>{language.name}</Text>
        {language.rtl && <Text style={styles.rtlIndicator}>RTL</Text>}
      </View>
    </View>
  );
}

/**
 * Language Text with Vocabulary Highlights
 */
function LanguageText({
  text,
  languageCode,
  rtl,
  cjk,
  fontSize,
  highlights = [],
  onWordPress,
}: {
  text: string;
  languageCode: string;
  rtl: boolean;
  cjk: boolean;
  fontSize: number;
  highlights?: Array<{ word: string; translation: string; pronunciation?: string; definition?: string }>;
  onWordPress?: (highlight: any) => void;
}) {
  const fontFamily = getFontFamilyForLanguage(languageCode);
  const lineHeight = getLineHeightForLanguage(languageCode);

  // Build text with highlights
  const parts = [];
  let lastIndex = 0;

  if (highlights.length > 0) {
    // Sort highlights by position
    const sortedHighlights = [...highlights].sort((a, b) => {
      const aIndex = text.toLowerCase().indexOf(a.word.toLowerCase());
      const bIndex = text.toLowerCase().indexOf(b.word.toLowerCase());
      return aIndex - bIndex;
    });

    for (const highlight of sortedHighlights) {
      const index = text.toLowerCase().indexOf(highlight.word.toLowerCase());
      if (index >= lastIndex) {
        if (index > lastIndex) {
          parts.push({
            text: text.substring(lastIndex, index),
            highlighted: false,
          });
        }
        parts.push({
          text: text.substring(index, index + highlight.word.length),
          highlighted: true,
          highlight,
        });
        lastIndex = index + highlight.word.length;
      }
    }
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlighted: false,
    });
  }

  return (
    <View style={{ direction: rtl ? "rtl" : "ltr" }}>
      <Text
        style={[
          styles.storyText,
          {
            fontSize,
            fontFamily,
            lineHeight: fontSize * lineHeight,
            textAlign: rtl ? "right" : "left",
            writingDirection: rtl ? "rtl" : "ltr",
          },
        ]}
      >
        {parts.length > 0
          ? parts.map((part, idx) => (
              <Text
                key={idx}
                style={
                  part.highlighted
                    ? [
                        styles.highlightedWord,
                        {
                          fontSize,
                          fontFamily,
                        },
                      ]
                    : {
                        fontSize,
                        fontFamily,
                      }
                }
                onPress={
                  part.highlighted && part.highlight
                    ? () => onWordPress?.(part.highlight)
                    : undefined
                }
              >
                {part.text}
              </Text>
            ))
          : text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },

  pageNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },

  layoutToggle: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  layoutButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },

  layoutButtonActive: {
    backgroundColor: "#2196f3",
  },

  layoutButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  contentScroll: {
    flex: 1,
  },

  sideBySideContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  stackedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  languageSection: {
    flex: 1,
    backgroundColor: "#fff",
  },

  primarySection: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    paddingRight: 12,
  },

  secondarySection: {
    paddingLeft: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#2196f3",
  },

  secondaryHeader: {
    borderBottomColor: "#ffc107",
  },

  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },

  languageNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  languageName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  rtlIndicator: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f44336",
    backgroundColor: "#ffebee",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 16,
  },

  storyText: {
    color: "#333",
    lineHeight: 28,
  },

  highlightedWord: {
    backgroundColor: "#fff3cd",
    borderBottomWidth: 2,
    borderBottomColor: "#ffc107",
    fontWeight: "600",
  },
});
