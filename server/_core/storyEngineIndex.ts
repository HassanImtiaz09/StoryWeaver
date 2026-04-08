/**
 * Story Engine Module Index
 * Central export point for the new Story Engine architecture
 */

// Core AI Provider Abstraction
export { getAIProvider, getDefaultProvider } from "./aiProvider";
export type { AIProvider, GenerateOptions } from "./aiProvider";

// Story Engine - Main generation pipeline
export { storyEngine } from "./storyEngine";
export { StoryEngine } from "./storyEngine";
export type {
  StoryContext,
  GeneratedEpisode,
  StoryArcPlan,
  QualityScore,
} from "./storyEngine";

// Prompt Templates
export {
  STORY_SYSTEM_PROMPT,
  AGE_VOCABULARY_GUIDELINES,
  ART_STYLE_PROMPTS,
  buildVoiceFormatPrompt,
  EPISODE_GENERATION_TEMPLATE,
  STORY_ARC_TEMPLATE,
  IMAGE_PROMPT_TEMPLATE,
  READING_LEVEL_ADAPTATION,
  QUALITY_ASSESSMENT_TEMPLATE,
} from "./promptTemplates";

// Narrative Arc Management
export {
  getArcState,
  getEpisodeContext,
  updateArcProgress,
  generateRecap,
  suggestNextStoryArc,
  planNarrativeArc,
} from "./narrativeArc";
export type {
  ArcState,
  EpisodeContext,
} from "./narrativeArc";

// Story Quality Scoring
export {
  scoreStory,
  passesQualityThreshold,
  validateEpisodeStructure,
} from "./storyQuality";

// Backwards Compatibility Bridge
export {
  generateEpisodeWithClaudeBridge,
  generateStoryArcWithClaudeBridge,
} from "./storyEngineBridge";
