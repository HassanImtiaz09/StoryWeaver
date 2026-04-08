/**
 * Bilingual Content Formatter
 *
 * Handles formatting of bilingual pages, vocabulary highlights,
 * and language learning enhancements for children.
 *
 * Features:
 * - Side-by-side and stacked bilingual layout
 * - RTL language support (Arabic)
 * - CJK font sizing adjustments
 * - Educational vocabulary highlighting
 * - Language learning notes for children
 */

import { SUPPORTED_LANGUAGES } from "./languageService";

/**
 * Bilingual page content formatted for display
 */
export interface BilingualPageContent {
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryText: string;
  secondaryText: string;
  primaryRTL: boolean;
  secondaryRTL: boolean;
  primaryCJK: boolean;
  secondaryCJK: boolean;
  characterAlignment: "left" | "right";
  displayFormat: "side-by-side" | "stacked";
  primaryFontSize: number;
  secondaryFontSize: number;
}

/**
 * Vocabulary highlight with context
 */
export interface VocabularyHighlight {
  word: string;
  startIndex: number;
  endIndex: number;
  translation: string;
  pronunciation?: string;
  definition?: string;
  exampleSentence?: string;
  targetLanguage: string;
}

/**
 * Language learning note for educational purposes
 */
export interface LanguageLearningNote {
  phrase: string;
  translation: string;
  pronunciation?: string;
  culturalContext?: string;
  pronunciation_guide?: string;
  tip?: string;
}

/**
 * CJK (Chinese, Japanese, Korean) language detection
 */
function isCJKLanguage(languageCode: string): boolean {
  return ["zh", "ja", "ko"].includes(languageCode.toLowerCase());
}

/**
 * Format two texts for side-by-side bilingual display
 */
export function formatBilingualPage(
  primaryText: string,
  secondaryText: string,
  primaryLanguageCode: string,
  secondaryLanguageCode: string,
  displayFormat: "side-by-side" | "stacked" = "side-by-side"
): BilingualPageContent {
  const primaryLang = SUPPORTED_LANGUAGES[primaryLanguageCode];
  const secondaryLang = SUPPORTED_LANGUAGES[secondaryLanguageCode];

  if (!primaryLang || !secondaryLang) {
    throw new Error(
      `Invalid language codes: ${primaryLanguageCode}, ${secondaryLanguageCode}`
    );
  }

  const primaryIsCJK = isCJKLanguage(primaryLanguageCode);
  const secondaryIsCJK = isCJKLanguage(secondaryLanguageCode);

  // Default font sizes for different character sets
  const defaultFontSize = 16;
  const cjkFontSize = 18; // CJK characters are larger for readability

  return {
    primaryLanguage: primaryLanguageCode,
    secondaryLanguage: secondaryLanguageCode,
    primaryText,
    secondaryText,
    primaryRTL: primaryLang.rtl,
    secondaryRTL: secondaryLang.rtl,
    primaryCJK: primaryIsCJK,
    secondaryCJK: secondaryIsCJK,
    characterAlignment: primaryLang.rtl || secondaryLang.rtl ? "right" : "left",
    displayFormat,
    primaryFontSize: primaryIsCJK ? cjkFontSize : defaultFontSize,
    secondaryFontSize: secondaryIsCJK ? cjkFontSize : defaultFontSize,
  };
}

/**
 * Generate vocabulary highlights for a page of text
 *
 * Identifies and marks educational words with translations
 */
export function generateVocabularyHighlights(
  text: string,
  language: string,
  ageGroup: string,
  vocabularyWords: Array<{
    word: string;
    translation: string;
    pronunciation?: string;
    definition?: string;
  }>
): VocabularyHighlight[] {
  const highlights: VocabularyHighlight[] = [];

  for (const vocab of vocabularyWords) {
    // Find all occurrences of the word (case-insensitive)
    const wordRegex = new RegExp(`\\b${vocab.word}\\b`, "gi");
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      highlights.push({
        word: vocab.word,
        startIndex: match.index,
        endIndex: match.index + vocab.word.length,
        translation: vocab.translation,
        pronunciation: vocab.pronunciation,
        definition: vocab.definition,
        targetLanguage: language,
      });
    }
  }

  // Sort by position in text
  highlights.sort((a, b) => a.startIndex - b.startIndex);

  return highlights;
}

/**
 * Create language learning tips for a page
 *
 * Generates simple, age-appropriate language learning notes
 */
export function createLanguageLearningNotes(
  pageText: string,
  primaryLanguage: string,
  learningLanguage: string,
  ageGroup: string
): LanguageLearningNote[] {
  const notes: LanguageLearningNote[] = [];

  // Age group appropriate note count
  const noteCount = ageGroup === "2-4" ? 1 : ageGroup === "5-7" ? 2 : 3;

  // Common phrases to extract and translate
  const commonPhrases = extractCommonPhrases(pageText, noteCount);

  for (const phrase of commonPhrases) {
    notes.push({
      phrase: phrase,
      translation: `[Translation of "${phrase}" in ${SUPPORTED_LANGUAGES[learningLanguage].name}]`,
      pronunciation: `[Pronunciation guide for "${phrase}"]`,
      culturalContext: getPhraseCulturalContext(phrase, learningLanguage),
      tip: getLanguageLearningTip(phrase, learningLanguage, ageGroup),
    });
  }

  return notes;
}

/**
 * Extract common phrases from text for learning
 */
function extractCommonPhrases(text: string, count: number): string[] {
  // Simple extraction: take sentences or common phrases
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const phrases: string[] = [];

  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    const sentence = sentences[i].trim();
    // Extract first phrase from sentence (usually the most important)
    const phraseMatch = sentence.match(/[^,;:]+/);
    if (phraseMatch) {
      phrases.push(phraseMatch[0].trim());
    }
  }

  return phrases;
}

/**
 * Get cultural context for a phrase in a target language
 */
function getPhraseCulturalContext(phrase: string, language: string): string {
  // Basic cultural context based on language
  const contexts: Record<string, string> = {
    es: "This expression is commonly used in Spanish-speaking cultures.",
    fr: "This phrase reflects French conversational style.",
    ja: "This phrase is polite and appropriate for children.",
    zh: "This expression is commonly used in Chinese culture.",
    ar: "This phrase is part of Arabic cultural communication.",
    de: "This is a typical German expression.",
  };

  return contexts[language] || "This is a common phrase in this language.";
}

/**
 * Get a language learning tip for a specific phrase
 */
function getLanguageLearningTip(phrase: string, language: string, ageGroup: string): string {
  const tips: Record<string, Record<string, string>> = {
    es: {
      "2-4": "Try saying this phrase with a happy voice!",
      "5-7": "Notice how Spanish speakers emphasize this word.",
      "8-10": "Compare this phrase to how it would be said in English.",
      "11-13": "This phrase shows important grammar concepts in Spanish.",
    },
    fr: {
      "2-4": "Listen to how a French speaker would say this!",
      "5-7": "French pronunciation is softer than English.",
      "8-10": "Try to imitate the accent and intonation.",
      "11-13": "This phrase demonstrates French grammar rules.",
    },
    zh: {
      "2-4": "Chinese characters tell stories!",
      "5-7": "Listen carefully to the tones in this phrase.",
      "8-10": "Each character has a meaning that builds the phrase.",
      "11-13": "Tones are essential in Mandarin Chinese.",
    },
    de: {
      "2-4": "German words can be fun to pronounce!",
      "5-7": "German pronunciation is clear and distinct.",
      "8-10": "Notice the grammatical structure of this phrase.",
      "11-13": "German grammar is systematic and logical.",
    },
  };

  const langTips = tips[language] || {};
  return langTips[ageGroup] || "Practice this phrase to improve your language skills!";
}

/**
 * Apply vocabulary highlights to text with HTML markup
 */
export function applyVocabularyHighlightsToHTML(
  text: string,
  highlights: VocabularyHighlight[]
): string {
  if (highlights.length === 0) {
    return text;
  }

  // Sort highlights in reverse order to maintain index positions
  const sortedHighlights = [...highlights].sort((a, b) => b.startIndex - a.startIndex);

  let result = text;

  for (const highlight of sortedHighlights) {
    const before = result.substring(0, highlight.startIndex);
    const word = result.substring(highlight.startIndex, highlight.endIndex);
    const after = result.substring(highlight.endIndex);

    const title = `${highlight.translation}${
      highlight.pronunciation ? ` (${highlight.pronunciation})` : ""
    }`;

    result = `${before}<span class="vocabulary-highlight" title="${title}" data-translation="${highlight.translation}">${word}</span>${after}`;
  }

  return result;
}

/**
 * Get appropriate font family for a language
 */
export function getFontFamilyForLanguage(languageCode: string): string {
  const fontFamilies: Record<string, string> = {
    zh: '"SimSun", "Source Han Sans", sans-serif',
    ja: '"Hiragino Sans", "Noto Sans JP", sans-serif',
    ko: '"Apple SD Gothic Neo", "Noto Sans CJK KR", sans-serif',
    ar: '"Arabic Typesetting", "Segoe UI", sans-serif',
    hi: '"Noto Sans Devanagari", "Mangal", sans-serif',
    ru: '"Segoe UI", "Noto Sans", sans-serif',
  };

  return fontFamilies[languageCode.toLowerCase()] || '"Segoe UI", "Noto Sans", sans-serif';
}

/**
 * Get appropriate line height for a language
 */
export function getLineHeightForLanguage(languageCode: string): number {
  // CJK languages need more line spacing
  const isCJK = isCJKLanguage(languageCode);
  return isCJK ? 1.8 : 1.6;
}

/**
 * Format language name for display
 */
export function formatLanguageName(
  languageCode: string,
  format: "english" | "native" | "both" = "both"
): string {
  const lang = SUPPORTED_LANGUAGES[languageCode];

  if (!lang) {
    return languageCode;
  }

  switch (format) {
    case "english":
      return lang.name;
    case "native":
      return lang.nativeName;
    case "both":
      return `${lang.nativeName} (${lang.name})`;
  }
}

/**
 * Get flag emoji for a language
 */
export function getLanguageFlag(languageCode: string): string {
  const flags: Record<string, string> = {
    en: "🇺🇸",
    es: "🇪🇸",
    fr: "🇫🇷",
    de: "🇩🇪",
    it: "🇮🇹",
    pt: "🇵🇹",
    zh: "🇨🇳",
    ja: "🇯🇵",
    ko: "🇰🇷",
    ar: "🇸🇦",
    hi: "🇮🇳",
    ru: "🇷🇺",
    nl: "🇳🇱",
    sv: "🇸🇪",
    tr: "🇹🇷",
  };

  return flags[languageCode.toLowerCase()] || "🌐";
}

/**
 * Format learning progress badge
 */
export function formatLearningBadge(
  wordCount: number,
  targetLanguage: string,
  mastery: number = 0
): {
  label: string;
  percentage: number;
  description: string;
} {
  const langName = SUPPORTED_LANGUAGES[targetLanguage]?.nativeName || targetLanguage;

  return {
    label: `${wordCount} ${langName} ${wordCount === 1 ? "word" : "words"}`,
    percentage: Math.min((wordCount / 100) * 100, 100), // Cap at 100%
    description:
      mastery > 0
        ? `${mastery}% mastered in ${langName}`
        : `Learning ${langName} vocabulary`,
  };
}
