/**
 * Language Router for Multilingual Story Features
 *
 * Provides tRPC procedures for:
 * - Translating pages and episodes
 * - Generating bilingual stories
 * - Getting vocabulary highlights
 * - Managing language preferences
 */
// @ts-nocheck


import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import { languageService, SUPPORTED_LANGUAGES } from "./languageService";
import {
  generateVocabularyHighlights,
  createLanguageLearningNotes,
  formatLanguageName,
} from "./bilingualFormatter";
import { TRPCError } from "@trpc/server";

export const languageRouter = router({
  /**
   * Get list of all supported languages
   */
  getAvailableLanguages: protectedProcedure.query(() => {
    const languages = Object.values(SUPPORTED_LANGUAGES).map((lang) => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      rtl: lang.rtl,
      ttsSupported: lang.ttsSupported,
    }));

    return {
      total: languages.length,
      languages,
      languagesWithTTS: languages.filter((l) => l.ttsSupported),
    };
  }),

  /**
   * Translate a single page from one language to another
   */
  translatePage: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        fromLanguage: z.string(),
        toLanguage: z.string(),
        childAge: z.number().min(2).max(13),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate languages
      if (!languageService.isValidLanguage(input.fromLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported source language: ${input.fromLanguage}`,
        });
      }

      if (!languageService.isValidLanguage(input.toLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported target language: ${input.toLanguage}`,
        });
      }

      try {
        const translatedText = await languageService.translateStoryPage(
          input.text,
          input.fromLanguage,
          input.toLanguage,
          input.childAge,
          input.context
        );

        return {
          success: true,
          translatedText,
          fromLanguage: input.fromLanguage,
          toLanguage: input.toLanguage,
          characterCount: input.text.length,
          translatedCharacterCount: translatedText.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Translate a full episode (all pages)
   */
  translateEpisode: protectedProcedure
    .input(
      z.object({
        pages: z.array(
          z.object({
            pageNumber: z.number(),
            text: z.string(),
          })
        ),
        fromLanguage: z.string(),
        toLanguage: z.string(),
        childAge: z.number().min(2).max(13),
      })
    )
    .mutation(async ({ input }) => {
      if (!languageService.isValidLanguage(input.fromLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported source language: ${input.fromLanguage}`,
        });
      }

      if (!languageService.isValidLanguage(input.toLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported target language: ${input.toLanguage}`,
        });
      }

      try {
        const translatedPages = await languageService.translateEpisode(
          input.pages,
          input.fromLanguage,
          input.toLanguage,
          input.childAge
        );

        return {
          success: true,
          translatedPages,
          pageCount: input.pages.length,
          fromLanguage: input.fromLanguage,
          toLanguage: input.toLanguage,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Episode translation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Generate a story directly in the target language
   */
  generateStoryInLanguage: protectedProcedure
    .input(
      z.object({
        childName: z.string(),
        childAge: z.number().min(2).max(13),
        interests: z.array(z.string()),
        theme: z.string(),
        targetLanguage: z.string(),
        personality: z.string().optional(),
        pageCount: z.number().min(4).max(20).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!languageService.isValidLanguage(input.targetLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported target language: ${input.targetLanguage}`,
        });
      }

      try {
        const story = await languageService.generateStoryInLanguage(
          {
            childName: input.childName,
            childAge: input.childAge,
            interests: input.interests,
            theme: input.theme,
            personality: input.personality,
            pageCount: input.pageCount,
          },
          input.targetLanguage
        );

        return {
          success: true,
          story,
          targetLanguage: input.targetLanguage,
          pageCount: story.pages.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Story generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get vocabulary highlights for a page
   */
  getVocabularyHighlights: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        language: z.string(),
        learningLanguage: z.string(),
        childAge: z.number().min(2).max(13),
      })
    )
    .mutation(async ({ input }) => {
      if (!languageService.isValidLanguage(input.language)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported language: ${input.language}`,
        });
      }

      if (!languageService.isValidLanguage(input.learningLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported learning language: ${input.learningLanguage}`,
        });
      }

      try {
        const ageGroup =
          input.childAge <= 4
            ? "2-4"
            : input.childAge <= 7
              ? "5-7"
              : input.childAge <= 10
                ? "8-10"
                : "11-13";

        const vocabularyWords = await languageService.getVocabularyHighlights(
          input.text,
          input.language,
          input.learningLanguage,
          ageGroup
        );

        const highlights = generateVocabularyHighlights(
          input.text,
          input.language,
          ageGroup,
          vocabularyWords
        );

        const learningNotes = createLanguageLearningNotes(
          input.text,
          input.language,
          input.learningLanguage,
          ageGroup
        );

        return {
          success: true,
          vocabularyWords,
          highlights,
          learningNotes,
          totalWords: vocabularyWords.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Vocabulary extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get translation of a single word with context
   */
  getWordTranslation: protectedProcedure
    .input(
      z.object({
        word: z.string().min(1).max(100),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!languageService.isValidLanguage(input.sourceLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported source language: ${input.sourceLanguage}`,
        });
      }

      if (!languageService.isValidLanguage(input.targetLanguage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported target language: ${input.targetLanguage}`,
        });
      }

      try {
        // Generate a translation prompt for a single word
        const translationPrompt = `Translate the word "${input.word}" from ${input.sourceLanguage} to ${input.targetLanguage}.${
          input.context ? ` Context: "${input.context}"` : ""
        }

Return ONLY a JSON object with:
{
  "word": "${input.word}",
  "translation": "the translation",
  "pronunciation": "pronunciation guide",
  "partOfSpeech": "noun/verb/adjective/etc",
  "definition": "simple definition"
}`;

        const { getDefaultProvider } = await import("./aiProvider");
        const provider = getDefaultProvider();

        const result = await provider.generateJSON(
          translationPrompt,
          JSON.stringify({
            word: "string",
            translation: "string",
            pronunciation: "string",
            partOfSpeech: "string",
            definition: "string",
          }),
          {
            maxTokens: 500,
            temperature: 0.7,
          }
        );

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Word translation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Detect language of a text
   */
  detectLanguage: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const detectedLanguage = await languageService.detectLanguage(input.text);
        const languageInfo = SUPPORTED_LANGUAGES[detectedLanguage];

        return {
          success: true,
          detectedLanguage,
          languageName: languageInfo?.name || "Unknown",
          nativeName: languageInfo?.nativeName || "Unknown",
          confidence: 0.85, // Placeholder confidence
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Language detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get language metadata
   */
  getLanguageMetadata: protectedProcedure
    .input(z.object({ languageCode: z.string() }))
    .query(({ input }) => {
      const language = SUPPORTED_LANGUAGES[input.languageCode];

      if (!language) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported language: ${input.languageCode}`,
        });
      }

      return {
        success: true,
        ...language,
        displayName: formatLanguageName(input.languageCode, "both"),
      };
    }),

  /**
   * Get vocabulary guidelines for a language
   */
  getVocabularyGuidelines: protectedProcedure
    .input(
      z.object({
        language: z.string(),
        childAge: z.number().min(2).max(13),
      })
    )
    .query(({ input }) => {
      const ageGroup =
        input.childAge <= 4
          ? "2-4"
          : input.childAge <= 7
            ? "5-7"
            : input.childAge <= 10
              ? "8-10"
              : "11-13";

      const guidelines = languageService.getLanguageVocabularyGuidelines(
        input.language,
        ageGroup
      );

      return {
        success: true,
        language: input.language,
        ageGroup,
        guidelines,
      };
    }),
});
