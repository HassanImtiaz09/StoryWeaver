/**
 * Language Processing Service for Multilingual Story Generation
 *
 * Handles:
 * - Language detection and validation
 * - Direct story generation in target languages
 * - Translation of story pages and episodes
 * - Age-appropriate vocabulary guidance per language
 * - Language metadata and configuration
 */

import { getDefaultProvider } from "./aiProvider";
import {
  TRANSLATION_TEMPLATE,
  BILINGUAL_VOCABULARY_TEMPLATE,
  LANGUAGE_VOCABULARY_GUIDELINES,
} from "./promptTemplates";

/**
 * Supported language metadata
 */
export interface LanguageMetadata {
  code: string; // ISO 639-1 code (e.g., 'en', 'es', 'zh')
  name: string; // English name
  nativeName: string; // Native name (e.g., '中文' for Chinese)
  rtl: boolean; // Right-to-left text direction
  ttsSupported: boolean; // ElevenLabs TTS support
}

/**
 * All supported languages with metadata
 */
export const SUPPORTED_LANGUAGES: Record<string, LanguageMetadata> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    rtl: false,
    ttsSupported: true,
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    rtl: false,
    ttsSupported: true,
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    rtl: false,
    ttsSupported: true,
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    rtl: false,
    ttsSupported: true,
  },
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    rtl: false,
    ttsSupported: true,
  },
  pt: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    rtl: false,
    ttsSupported: true,
  },
  zh: {
    code: "zh",
    name: "Mandarin Chinese",
    nativeName: "中文",
    rtl: false,
    ttsSupported: true,
  },
  ja: {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    rtl: false,
    ttsSupported: true,
  },
  ko: {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    rtl: false,
    ttsSupported: true,
  },
  ar: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    rtl: true,
    ttsSupported: true,
  },
  hi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    rtl: false,
    ttsSupported: false,
  },
  ru: {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    rtl: false,
    ttsSupported: true,
  },
  nl: {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    rtl: false,
    ttsSupported: true,
  },
  sv: {
    code: "sv",
    name: "Swedish",
    nativeName: "Svenska",
    rtl: false,
    ttsSupported: true,
  },
  tr: {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    rtl: false,
    ttsSupported: true,
  },
};

/**
 * Language Service for managing multilingual content
 */
export class LanguageService {
  /**
   * Generate a story directly in the target language
   *
   * Uses AI provider to create a story crafted for the target language
   * from the beginning (not just a translation).
   */
  async generateStoryInLanguage(
    storyContext: {
      childName: string;
      childAge: number;
      interests: string[];
      personality?: string;
      theme: string;
      pageCount?: number;
    },
    targetLanguage: string
  ): Promise<{
    title: string;
    summary: string;
    pages: Array<{
      text: string;
      imagePrompt: string;
      pageNumber: number;
      mood: string;
    }>;
    characters: Array<{
      name: string;
      traits: string[];
      voiceRole: string;
    }>;
  }> {
    const language = SUPPORTED_LANGUAGES[targetLanguage];
    if (!language) {
      throw new Error(`Unsupported language: ${targetLanguage}`);
    }

    const provider = getDefaultProvider();

    // Build language-specific generation prompt
    const vocabGuidelines = getLanguageVocabularyGuidelines(
      targetLanguage,
      this.getAgeGroup(storyContext.childAge)
    );

    const generationPrompt = `You are a world-class children's story author writing in ${language.name}.

STORY CONTEXT:
- Child: ${storyContext.childName}, age ${storyContext.childAge}
- Interests: ${storyContext.interests.join(", ")}
- Theme: ${storyContext.theme}
- Language: Write in native ${language.name} from the beginning

LANGUAGE GUIDELINES:
${vocabGuidelines}

${storyContext.personality ? `- Child Personality: ${storyContext.personality}` : ""}

REQUIREMENTS:
1. Create a ${storyContext.pageCount || 10}-page bedtime story
2. Use age-appropriate vocabulary and grammar for ${language.name}
3. Ensure all names and dialogue are natural in ${language.name}
4. Make the hero (${storyContext.childName}) the main character
5. Follow the emotional arc: curiosity → excitement → challenge → triumph → warmth → sleepiness

Return valid JSON with structure:
{
  "title": "Story title in ${language.name}",
  "summary": "3-4 sentence summary in ${language.name}",
  "characters": [{"name": "Character name", "traits": ["trait1"], "voiceRole": "narrator"}],
  "pages": [
    {
      "text": "Story text in ${language.name}",
      "imagePrompt": "Image description in English",
      "pageNumber": 1,
      "mood": "calm|exciting|warm|etc"
    }
  ]
}`;

    const schema = JSON.stringify({
      title: "string",
      summary: "string",
      characters: [
        {
          name: "string",
          traits: ["string"],
          voiceRole: "string",
        },
      ],
      pages: [
        {
          text: "string",
          imagePrompt: "string",
          pageNumber: "number",
          mood: "string",
        },
      ],
    });

    const result = await provider.generateJSON(generationPrompt, schema, {
      maxTokens: 16000,
      temperature: 0.8,
    });

    return result as any;
  }

  /**
   * Translate a single page from one language to another
   *
   * Maintains story quality and adjusts complexity for child's age
   */
  async translateStoryPage(
    text: string,
    fromLanguage: string,
    toLanguage: string,
    childAge: number,
    context?: string
  ): Promise<string> {
    const fromLang = SUPPORTED_LANGUAGES[fromLanguage];
    const toLang = SUPPORTED_LANGUAGES[toLanguage];

    if (!fromLang || !toLang) {
      throw new Error(`Unsupported language pair: ${fromLanguage} → ${toLanguage}`);
    }

    const provider = getDefaultProvider();
    const ageGroup = this.getAgeGroup(childAge);
    const vocabGuidelines = getLanguageVocabularyGuidelines(toLanguage, ageGroup);

    const prompt = TRANSLATION_TEMPLATE(
      text,
      fromLanguage,
      toLanguage,
      childAge,
      ageGroup,
      vocabGuidelines,
      context
    );

    const translatedText = await provider.generateText(prompt, {
      maxTokens: text.length + 500,
      temperature: 0.7,
    });

    return translatedText.trim();
  }

  /**
   * Translate a full episode (all pages)
   */
  async translateEpisode(
    pages: Array<{ text: string; pageNumber: number }>,
    fromLanguage: string,
    toLanguage: string,
    childAge: number
  ): Promise<Array<{ pageNumber: number; translatedText: string }>> {
    const translatedPages: Array<{ pageNumber: number; translatedText: string }> = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Provide context about surrounding pages for consistency
      const context =
        i > 0 ? `Previous page mentioned: ${pages[i - 1].text.substring(0, 200)}` : undefined;

      const translated = await this.translateStoryPage(
        page.text,
        fromLanguage,
        toLanguage,
        childAge,
        context
      );

      translatedPages.push({
        pageNumber: page.pageNumber,
        translatedText: translated,
      });

      // Small delay to avoid rate limiting
      if (i < pages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return translatedPages;
  }

  /**
   * Get vocabulary guidelines for a specific language and age group
   *
   * Returns rules for word complexity, sentence structure, etc.
   */
  getLanguageVocabularyGuidelines(language: string, ageGroup: string): string {
    const langCode = language.toLowerCase();
    const key = `${langCode}_${ageGroup}`;

    return (
      LANGUAGE_VOCABULARY_GUIDELINES[key] ||
      LANGUAGE_VOCABULARY_GUIDELINES[`${langCode}_default`] ||
      "Use age-appropriate vocabulary and simple sentence structures."
    );
  }

  /**
   * Detect the language of a text
   *
   * Simple language detection using common words and patterns
   */
  async detectLanguage(text: string): Promise<string> {
    const provider = getDefaultProvider();

    const detectionPrompt = `Identify the language of the following text. Return ONLY the ISO 639-1 language code (e.g., "en", "es", "fr", "zh", etc.).

Text: "${text.substring(0, 500)}"

Respond with only the language code, nothing else.`;

    const result = await provider.generateText(detectionPrompt, {
      maxTokens: 5,
      temperature: 0,
    });

    const code = result.trim().toLowerCase();

    // Validate the code
    if (SUPPORTED_LANGUAGES[code]) {
      return code;
    }

    // Return English as default if detection fails
    return "en";
  }

  /**
   * Get vocabulary highlights for learning
   *
   * Identifies educational words and provides translations
   */
  async getVocabularyHighlights(
    text: string,
    language: string,
    learningLanguage: string,
    ageGroup: string
  ): Promise<
    Array<{
      word: string;
      translation: string;
      pronunciation?: string;
      exampleSentence: string;
      definition: string;
    }>
  > {
    const fromLang = SUPPORTED_LANGUAGES[language];
    const toLang = SUPPORTED_LANGUAGES[learningLanguage];

    if (!fromLang || !toLang) {
      throw new Error(`Unsupported language pair: ${language} → ${learningLanguage}`);
    }

    const provider = getDefaultProvider();

    const prompt = BILINGUAL_VOCABULARY_TEMPLATE(
      text,
      language,
      learningLanguage,
      ageGroup
    );

    const result = await provider.generateJSON(
      prompt,
      JSON.stringify({
        vocabularyWords: [
          {
            word: "string",
            translation: "string",
            pronunciation: "string",
            exampleSentence: "string",
            definition: "string",
          },
        ],
      }),
      {
        maxTokens: 2000,
        temperature: 0.7,
      }
    );

    return (result as any).vocabularyWords || [];
  }

  /**
   * Get the age group category
   */
  private getAgeGroup(age: number): string {
    if (age <= 4) return "2-4";
    if (age <= 7) return "5-7";
    if (age <= 10) return "8-10";
    return "11-13";
  }

  /**
   * Validate a language code
   */
  isValidLanguage(code: string): boolean {
    return code in SUPPORTED_LANGUAGES;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): LanguageMetadata[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Get languages with TTS support
   */
  getLanguagesWithTTS(): LanguageMetadata[] {
    return Object.values(SUPPORTED_LANGUAGES).filter((lang) => lang.ttsSupported);
  }
}

// Singleton instance
export const languageService = new LanguageService();

/**
 * Helper function to get vocabulary guidelines for a language
 */
export function getLanguageVocabularyGuidelines(language: string, ageGroup: string): string {
  return languageService.getLanguageVocabularyGuidelines(language, ageGroup);
}
