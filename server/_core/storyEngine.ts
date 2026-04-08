/**
 * Story Engine - Core story generation pipeline
 * Manages episode generation, narrative continuity, and quality assurance
 */

import { getDefaultProvider } from "./aiProvider";
import {
  EPISODE_GENERATION_TEMPLATE,
  STORY_ARC_TEMPLATE,
  IMAGE_PROMPT_TEMPLATE,
  READING_LEVEL_ADAPTATION,
  QUALITY_ASSESSMENT_TEMPLATE,
  STORY_SYSTEM_PROMPT,
} from "./promptTemplates";
import { moderateEpisode } from "./contentModeration";
import { cache, CACHE_CONFIG } from "./cache";

/**
 * Story context for episode generation
 */
export interface StoryContext {
  child: {
    name: string;
    age: number;
    interests: string[];
    personality?: string;
    fears?: string[];
  };
  theme: string;
  storyArc?: {
    title: string;
    totalEpisodes: number;
    currentEpisode: number;
  };
  customElements?: {
    characters?: string[];
    locations?: string[];
    morals?: string[];
  };
  previousEpisodes?: Array<{
    title: string;
    summary: string;
  }>;
  preferences?: {
    readingLevel?: string;
    storyLength?: "short" | "medium" | "long";
    tone?: string;
  };
}

/**
 * Generated episode structure
 */
export interface GeneratedEpisode {
  title: string;
  summary: string;
  pages: Array<{
    text: string;
    imagePrompt: string;
    pageNumber: number;
    mood?: string;
  }>;
  characters?: Array<{
    name: string;
    traits?: string[];
    voiceRole?: string;
  }>;
  musicMood?: string;
  narrativeHooks?: string[];
  educationalElements?: string[];
  vocabularyWords?: Array<{
    word: string;
    definition: string;
    context: string;
  }>;
  estimatedReadTimeMinutes?: number;
}

/**
 * Story arc plan
 */
export interface StoryArcPlan {
  title: string;
  synopsis: string;
  episodeOutlines: Array<{
    episodeNumber: number;
    title: string;
    summary: string;
  }>;
}

/**
 * Quality score for stories
 */
export interface QualityScore {
  overall: number;
  readability: number;
  engagement: number;
  ageAppropriateness: number;
  educationalValue: number;
  narrativeCoherence: number;
  strengths?: string[];
  improvements?: string[];
}

/**
 * Story Engine - Manages all story generation
 */
export class StoryEngine {
  private provider = getDefaultProvider();

  /**
   * Generate a single episode
   */
  async generateEpisode(context: StoryContext): Promise<GeneratedEpisode> {
    if (!context.child || !context.theme) {
      throw new Error("StoryContext must include child and theme");
    }

    // Build the comprehensive prompt
    const prompt = this.buildPrompt(context);

    // Generate episode using AI provider
    const schema = JSON.stringify({
      title: "string",
      summary: "string",
      musicMood: "string",
      estimatedReadTimeMinutes: "number",
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

    const episode = await this.provider.generateJSON<GeneratedEpisode>(
      prompt,
      schema,
      { maxTokens: 16000 }
    );

    // Enrich episode with additional elements
    episode.narrativeHooks = this.extractNarrativeHooks(episode.pages);
    episode.educationalElements = this.extractEducationalElements(
      episode.summary,
      context
    );
    episode.vocabularyWords = this.extractVocabularyWords(
      episode.pages,
      context.child.age
    );

    // Validate episode
    this.validateEpisode(episode, context);

    // Run content moderation
    const moderationResult = moderateEpisode(
      {
        title: episode.title,
        summary: episode.summary,
        pages: episode.pages.map((p) => ({ text: p.text })),
      },
      context.child.fears
    );

    if (moderationResult.overallSeverity === "high") {
      throw new Error(`Episode flagged during moderation: ${JSON.stringify(moderationResult.flaggedContent[0])}`);
    }

    return episode;
  }

  /**
   * Generate a multi-episode story arc
   */
  async generateStoryArc(
    context: Omit<StoryContext, "customElements" | "previousEpisodes">,
    numEpisodes: number
  ): Promise<StoryArcPlan> {
    const prompt = STORY_ARC_TEMPLATE(context, numEpisodes);

    const schema = JSON.stringify({
      title: "string",
      synopsis: "string",
      episodeOutlines: [
        {
          episodeNumber: "number",
          title: "string",
          summary: "string",
        },
      ],
    });

    return this.provider.generateJSON<StoryArcPlan>(prompt, schema, {
      maxTokens: 4000,
    });
  }

  /**
   * Generate image prompts for all pages in an episode
   */
  async generateImagePrompts(
    episode: GeneratedEpisode,
    context: StoryContext
  ): Promise<string[]> {
    const prompts: string[] = [];

    for (const page of episode.pages) {
      const artStyle = this.getArtStyleForTheme(context.theme);
      const prompt = IMAGE_PROMPT_TEMPLATE(
        page.text,
        artStyle,
        context.child.age,
        context.theme
      );

      const imagePrompt = await this.provider.generateText(prompt, {
        maxTokens: 500,
      });

      prompts.push(imagePrompt.trim());
    }

    return prompts;
  }

  /**
   * Adapt text to different reading levels
   */
  async adaptReadingLevel(
    text: string,
    targetAge: number
  ): Promise<string> {
    const prompt = READING_LEVEL_ADAPTATION(text, targetAge);
    return this.provider.generateText(prompt, { maxTokens: 2000 });
  }

  /**
   * Score story quality
   */
  async scoreStory(
    episode: GeneratedEpisode,
    childAge: number
  ): Promise<QualityScore> {
    const prompt = QUALITY_ASSESSMENT_TEMPLATE(
      {
        title: episode.title,
        summary: episode.summary,
        pages: episode.pages,
      },
      childAge
    );

    const schema = JSON.stringify({
      readability: "number",
      engagement: "number",
      ageAppropriateness: "number",
      educationalValue: "number",
      narrativeCoherence: "number",
      overall: "number",
      strengths: ["string"],
      improvements: ["string"],
      passesQuality: "boolean",
    });

    return this.provider.generateJSON<QualityScore>(prompt, schema, {
      maxTokens: 1000,
    });
  }

  /**
   * Build comprehensive prompt from context
   */
  private buildPrompt(context: StoryContext): string {
    const baseTemplate = EPISODE_GENERATION_TEMPLATE(context);

    // Add system context
    let fullPrompt = `${STORY_SYSTEM_PROMPT}\n\n`;

    // Add context-specific instructions
    if (context.preferences?.tone) {
      fullPrompt += `TONE: ${context.preferences.tone}\n`;
    }

    if (context.preferences?.storyLength === "short") {
      fullPrompt += `Keep this episode concise — appropriate for 3-5 minute listening time.\n`;
    } else if (context.preferences?.storyLength === "long") {
      fullPrompt += `Make this episode rich and detailed — appropriate for 8-10 minute listening time.\n`;
    }

    // Add reading level adaptations
    if (context.preferences?.readingLevel) {
      fullPrompt += `READING LEVEL: ${context.preferences.readingLevel}\n`;
    }

    // Add neurodivergent guidance if applicable
    if (context.child.personality?.includes("neurodivergent")) {
      fullPrompt += `\nConsider neurodivergent-friendly storytelling: clear structure, explicit emotional labels, predictable patterns, and sensory awareness.\n`;
    }

    fullPrompt += baseTemplate;

    return fullPrompt;
  }

  /**
   * Extract narrative hooks (cliffhangers/teasers) from pages
   */
  private extractNarrativeHooks(pages: GeneratedEpisode["pages"]): string[] {
    const hooks: string[] = [];

    // Look for cliffhangers or setup for next episode in final pages
    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1];
      const lastPageText = lastPage.text.toLowerCase();

      // Simple heuristics for narrative hooks
      if (
        lastPageText.includes("next") ||
        lastPageText.includes("tomorrow") ||
        lastPageText.includes("adventure")
      ) {
        hooks.push(lastPage.text.substring(0, 150));
      }
    }

    return hooks;
  }

  /**
   * Extract educational elements from episode
   */
  private extractEducationalElements(
    summary: string,
    context: StoryContext
  ): string[] {
    const elements: string[] = [];

    // Check for common educational themes
    const keywords = [
      "learn",
      "discover",
      "understand",
      "realize",
      "wisdom",
      "lesson",
      "growth",
      "courage",
      "kindness",
      "friendship",
    ];

    for (const keyword of keywords) {
      if (summary.toLowerCase().includes(keyword)) {
        elements.push(keyword);
      }
    }

    return elements;
  }

  /**
   * Extract vocabulary words that might need definitions
   */
  private extractVocabularyWords(
    pages: GeneratedEpisode["pages"],
    childAge: number
  ): Array<{ word: string; definition: string; context: string }> {
    // For now, return empty array - in a real implementation,
    // this would use NLP to extract complex words
    return [];
  }

  /**
   * Get art style for theme
   */
  private getArtStyleForTheme(theme: string): string {
    const styleMap: Record<string, string> = {
      space: "Digital illustration with cosmic colors and soft glowing effects",
      ocean: "Watercolor with ocean blues and bioluminescent creatures",
      forest: "Watercolor with misty trees and magical glowing elements",
      dinosaur: "Watercolor with vibrant prehistoric landscapes",
      pirate: "Watercolor adventure illustration with ships and treasure",
      robot: "Digital illustration with friendly colorful robots",
      fairy: "Watercolor fantasy with magical sparkles and ethereal lighting",
      safari: "Watercolor savanna with friendly animals and golden hour lighting",
      arctic: "Watercolor snow scenes with northern lights",
      medieval: "Watercolor fantasy quest with castles and magic",
      jungle: "Watercolor with lush vegetation and tropical creatures",
      candy: "Bright watercolor with candy landscapes and pastel colors",
      musical: "Watercolor with colorful musical notes and dancing characters",
      garden: "Watercolor botanical with blooming flowers and golden sunlight",
    };

    return styleMap[theme.toLowerCase()] || "Watercolor children's book illustration";
  }

  /**
   * Validate episode structure and content
   */
  private validateEpisode(episode: GeneratedEpisode, context: StoryContext): void {
    if (!episode.title || !episode.summary) {
      throw new Error("Episode missing title or summary");
    }

    if (!episode.pages || episode.pages.length < 6) {
      throw new Error(
        `Episode must have at least 6 pages, got ${episode.pages.length}`
      );
    }

    // Validate page content
    for (let i = 0; i < episode.pages.length; i++) {
      const page = episode.pages[i];
      if (!page.text || page.text.trim().length < 50) {
        throw new Error(
          `Page ${i + 1} has insufficient content (minimum 50 characters)`
        );
      }
      if (!page.imagePrompt) {
        throw new Error(`Page ${i + 1} missing image prompt`);
      }
    }
  }
}

/**
 * Create and export singleton instance
 */
export const storyEngine = new StoryEngine();
