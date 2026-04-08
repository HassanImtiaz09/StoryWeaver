/**
 * Story Quality Scoring System
 * Post-generation quality assessment and validation
 */

import { storyEngine, GeneratedEpisode, QualityScore } from "./storyEngine";

/**
 * Flesch-Kincaid Grade Level calculation
 * Returns estimated school grade level
 */
function calculateFleschKincaidGrade(text: string): number {
  // Simple implementation based on syllables and sentence structure
  const sentences = text.match(/[.!?]+/g) || [];
  const words = text.split(/\s+/);
  const syllables = countSyllables(text);

  if (words.length === 0 || sentences.length === 0) {
    return 0;
  }

  const grade =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59;

  return Math.max(0, Math.round(grade));
}

/**
 * Simple syllable counter (approximate)
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;

  for (const word of words) {
    count += estimateSyllables(word);
  }

  return count;
}

/**
 * Estimate syllables in a word
 */
function estimateSyllables(word: string): number {
  word = word.toLowerCase();
  let syllables = 0;
  const vowels = "aeiouy";
  let previousWasVowel = false;

  for (const char of word) {
    const isVowel = vowels.includes(char);
    if (isVowel && !previousWasVowel) {
      syllables++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for common patterns
  if (word.endsWith("e")) {
    syllables--;
  }
  if (word.endsWith("le") && word.length > 2) {
    syllables++;
  }

  return Math.max(1, syllables);
}

/**
 * Calculate readability score (0-100)
 * Higher score = more readable
 */
function scoreReadability(episode: GeneratedEpisode, childAge: number): number {
  let score = 100;

  const totalWords = episode.pages.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0);
  const avgWordsPerPage = totalWords / episode.pages.length;

  // Check if word count is reasonable for age
  const targetWordsPerPage = childAge <= 5 ? 50 : childAge <= 8 ? 100 : 150;
  const wordCountVariance = Math.abs(avgWordsPerPage - targetWordsPerPage) / targetWordsPerPage;

  if (wordCountVariance > 0.3) {
    score -= 15; // Penalize if too verbose or too short
  }

  // Check reading grade level
  const sampleText = episode.pages
    .slice(0, 3)
    .map((p) => p.text)
    .join(" ");
  const gradeLevel = calculateFleschKincaidGrade(sampleText);
  const targetGrade = Math.max(1, childAge - 2);

  if (Math.abs(gradeLevel - targetGrade) > 2) {
    score -= 10; // Penalize if grade level is off
  }

  // Check for dialogue presence (good for engagement)
  const dialogueCount = (sampleText.match(/["']/g) || []).length;
  if (dialogueCount < 4) {
    score -= 10; // Penalize if too little dialogue
  }

  return Math.max(0, score);
}

/**
 * Calculate engagement score (0-100)
 * Based on narrative hooks, variety, and pacing
 */
function scoreEngagement(episode: GeneratedEpisode): number {
  let score = 75;

  // Check for narrative hooks in final pages
  if (episode.narrativeHooks && episode.narrativeHooks.length > 0) {
    score += 15;
  }

  // Check for emotional arc (variation in mood)
  const moods = episode.pages
    .map((p) => p.mood)
    .filter((m) => m !== undefined);

  const uniqueMoods = new Set(moods);
  if (uniqueMoods.size >= 3) {
    score += 10; // Good variety
  }

  // Check page length consistency (stories feel rushed if highly variable)
  const pageLengths = episode.pages.map((p) => p.text.split(/\s+/).length);
  const avgLength = pageLengths.reduce((a, b) => a + b, 0) / pageLengths.length;
  const variance = pageLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / pageLengths.length;

  if (variance > 5000) {
    // High variance is okay for pacing
    score += 10;
  }

  // Check for music mood
  if (episode.musicMood) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Calculate age appropriateness score (0-100)
 */
function scoreAgeAppropriateness(episode: GeneratedEpisode, childAge: number): number {
  let score = 100;

  // Check content length matches age
  const totalWords = episode.pages.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0);
  const targetWords = childAge <= 5 ? 400 : childAge <= 8 ? 1000 : 2000;

  if (totalWords < targetWords * 0.7) {
    score -= 20; // Too short for age
  } else if (totalWords > targetWords * 1.5) {
    score -= 10; // Too long for age
  }

  // Check complexity of summary
  const summaryWords = episode.summary.split(/\s+/).length;
  if (summaryWords > 50) {
    score -= 5; // Summary might be too complex
  }

  return Math.max(0, score);
}

/**
 * Calculate educational value score (0-100)
 */
function scoreEducationalValue(episode: GeneratedEpisode): number {
  let score = 50; // Default base

  // Check for educational elements
  if (episode.educationalElements && episode.educationalElements.length > 0) {
    score += 25;
  }

  // Check for vocabulary words (indicates learning opportunities)
  if (episode.vocabularyWords && episode.vocabularyWords.length > 0) {
    score += 15;
  }

  // Check summary for learning-related keywords
  const educationalKeywords = [
    "learn",
    "discover",
    "understand",
    "wisdom",
    "lesson",
    "growth",
  ];
  const summaryLower = episode.summary.toLowerCase();
  const keywordCount = educationalKeywords.filter((kw) =>
    summaryLower.includes(kw)
  ).length;

  if (keywordCount > 0) {
    score += 10 * keywordCount;
  }

  return Math.min(100, score);
}

/**
 * Calculate narrative coherence score (0-100)
 */
function scoreNarrativeCoherence(episode: GeneratedEpisode): number {
  let score = 80;

  // Check for characters consistency
  if (episode.characters && episode.characters.length > 0) {
    const hasMainCharacter = episode.characters.some((c) =>
      c.voiceRole?.includes("hero")
    );
    if (!hasMainCharacter) {
      score -= 20; // Missing clear protagonist
    }
  }

  // Check page count (should be consistent)
  if (episode.pages.length < 6) {
    score -= 20; // Too short for coherent arc
  } else if (episode.pages.length < 8) {
    score -= 10; // Below ideal minimum
  }

  // Check for beginning-middle-end structure
  const firstPageText = episode.pages[0]?.text.toLowerCase() || "";
  const lastPageText = episode.pages[episode.pages.length - 1]?.text.toLowerCase() || "";

  if (
    (firstPageText.includes("once") ||
      firstPageText.includes("one day") ||
      firstPageText.includes("there")) &&
    (lastPageText.includes("ever") ||
      lastPageText.includes("happy") ||
      lastPageText.includes("dream") ||
      lastPageText.includes("sleep"))
  ) {
    score += 10; // Good narrative structure
  }

  return Math.max(0, score);
}

/**
 * Score an entire episode
 */
export async function scoreStory(
  episode: GeneratedEpisode,
  childAge: number
): Promise<QualityScore> {
  const readability = scoreReadability(episode, childAge);
  const engagement = scoreEngagement(episode);
  const ageAppropriateness = scoreAgeAppropriateness(episode, childAge);
  const educationalValue = scoreEducationalValue(episode);
  const narrativeCoherence = scoreNarrativeCoherence(episode);

  // Overall score is weighted average
  const overall = Math.round(
    readability * 0.2 +
      engagement * 0.25 +
      ageAppropriateness * 0.2 +
      educationalValue * 0.15 +
      narrativeCoherence * 0.2
  );

  return {
    overall,
    readability,
    engagement,
    ageAppropriateness,
    educationalValue,
    narrativeCoherence,
  };
}

/**
 * Check if story meets quality threshold
 */
export function passesQualityThreshold(score: QualityScore, threshold: number = 70): boolean {
  // Story must pass on multiple dimensions
  return (
    score.overall >= threshold &&
    score.readability >= 60 &&
    score.engagement >= 60 &&
    score.narrativeCoherence >= 60
  );
}

/**
 * Validate episode for generation
 */
export function validateEpisodeStructure(episode: GeneratedEpisode): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!episode.title) {
    errors.push("Episode missing title");
  }

  if (!episode.summary) {
    errors.push("Episode missing summary");
  }

  if (!episode.pages || episode.pages.length === 0) {
    errors.push("Episode missing pages");
  } else if (episode.pages.length < 6) {
    errors.push(`Episode has only ${episode.pages.length} pages, minimum is 6`);
  }

  // Validate each page
  for (let i = 0; i < (episode.pages?.length || 0); i++) {
    const page = episode.pages![i];
    if (!page.text || page.text.trim().length < 50) {
      errors.push(`Page ${i + 1} has insufficient content`);
    }
    if (!page.imagePrompt) {
      errors.push(`Page ${i + 1} missing image prompt`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
