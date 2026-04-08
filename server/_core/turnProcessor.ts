/**
 * Turn Processor - Handles AI enhancement of collaborative turn inputs
 */

import { getDefaultProvider } from "./aiProvider";
import { moderateStoryContent } from "./contentModeration";
import { db } from "../db";
import { storySegments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────

export interface EnhancedTurn {
  enhancedText: string;
  imagePrompt: string;
  mood: "exciting" | "calm" | "mysterious" | "adventurous" | "warm" | "funny" | "reassuring" | "triumphant";
}

export interface TurnPromptSuggestions {
  options: string[];
}

// ─── Enhancement ──────────────────────────────────────────────

/**
 * Enhance raw user input into polished story prose
 */
export async function enhanceTurnInput(
  rawInput: string,
  storyContext: {
    currentStory: string;
    theme: string;
    childAge: number;
    previousSegments: Array<{ text: string }>;
  },
  enhancementLevel: "light" | "moderate" | "heavy" = "moderate"
): Promise<EnhancedTurn> {
  const provider = getDefaultProvider();

  // Build context from previous segments
  const previousText = storyContext.previousSegments
    .slice(-3) // Last 3 segments
    .map((s) => s.text)
    .join("\n\n");

  const ageGuideMap: Record<number, string> = {
    2: "Toddler (2-4): Very simple words, short sentences, repetition, onomatopoeia.",
    5: "Preschooler (5-7): Simple but varied vocabulary, sentences 8-12 words, light humor.",
    8: "Early reader (8-10): Rich vocabulary, metaphors, 2-3 paragraphs per page.",
    11: "Independent reader (11-13): Sophisticated vocabulary, literary devices, complex sentences.",
  };

  const getAgeGuide = (age: number) => {
    if (age <= 4) return ageGuideMap[2];
    if (age <= 7) return ageGuideMap[5];
    if (age <= 10) return ageGuideMap[8];
    return ageGuideMap[11];
  };

  const enhancementPrompt = `You are a children's story author enhancing a collaborative story turn.

CURRENT STORY CONTEXT:
${previousText || "This is the start of the story."}

THEME: ${storyContext.theme}
CHILD AGE: ${storyContext.childAge}
AGE GUIDELINE: ${getAgeGuide(storyContext.childAge)}

RAW USER INPUT:
"${rawInput}"

ENHANCEMENT LEVEL: ${enhancementLevel}
${
  enhancementLevel === "light"
    ? "Make minimal changes - keep the user's voice but fix any grammar and add just a little polish."
    : enhancementLevel === "moderate"
      ? "Add descriptive details, improve flow, and make it sound like a professional children's story page."
      : "Fully transform into rich, polished story prose with vivid sensory details, character emotions, and narrative coherence."
}

Your task:
1. Transform the raw input into a polished story page (4-8 sentences, 100-150 words for ages 2-4; 150-250 words for ages 5+)
2. Match the theme and reading level
3. Maintain narrative continuity with the previous story
4. Include vivid descriptions and character emotions
5. Keep it age-appropriate and engaging

Return a JSON object:
{
  "enhancedText": "The polished story text here...",
  "mood": "exciting|calm|mysterious|adventurous|warm|funny|reassuring|triumphant",
  "suggestedImagePrompt": "A detailed description for illustration..."
}`;

  const schema = JSON.stringify({
    enhancedText: "string",
    mood: "string",
    suggestedImagePrompt: "string",
  });

  const result = await provider.generateJSON<{
    enhancedText: string;
    mood: string;
    suggestedImagePrompt: string;
  }>(enhancementPrompt, schema, { maxTokens: 1000 });

  // Generate proper image prompt
  const imagePrompt = generateTurnImage(
    result.enhancedText,
    storyContext.theme,
    storyContext.childAge
  );

  // Content moderation check
  const moderation = moderateStoryContent(result.enhancedText);
  if (moderation.overallSeverity === "high") {
    throw new Error(
      `Enhanced content flagged during moderation: ${moderation.flaggedContent[0]?.reason}`
    );
  }

  return {
    enhancedText: result.enhancedText,
    imagePrompt,
    mood: (result.mood || "warm") as EnhancedTurn["mood"],
  };
}

/**
 * Generate 3 suggested direction options for the next turn
 */
export async function generateTurnPrompts(
  currentStory: string,
  theme: string,
  childAge: number,
  participantRole: "host" | "contributor"
): Promise<TurnPromptSuggestions> {
  const provider = getDefaultProvider();

  const prompt = `You are a creative storyteller helping guide a collaborative story for a ${childAge}-year-old.

CURRENT STORY SO FAR:
${currentStory}

THEME: ${theme}

Generate 3 interesting direction options for the next story turn. These should be:
1. Age-appropriate (${childAge} years old)
2. Specific enough to inspire but open-ended
3. Varied in tone/direction
4. Building on what came before

Return a JSON object:
{
  "options": [
    "First option (10-20 words)",
    "Second option (10-20 words)",
    "Third option (10-20 words)"
  ]
}`;

  const schema = JSON.stringify({
    options: ["string", "string", "string"],
  });

  const result = await provider.generateJSON<{ options: string[] }>(
    prompt,
    schema,
    { maxTokens: 300 }
  );

  return {
    options: result.options || [
      "What happens next?",
      "Add a new character or discovery",
      "Create a challenge to overcome",
    ],
  };
}

/**
 * Merge all segments into a cohesive final story
 */
export function mergeSegmentsIntoStory(
  segments: Array<{ text: string; participantId?: number }>
): string {
  return segments.map((seg) => seg.text).join("\n\n");
}

/**
 * Generate an image prompt for a turn's content
 */
export function generateTurnImage(
  segmentText: string,
  theme: string,
  childAge: number
): string {
  // Extract key visual elements from the text
  const artStyleMap: Record<string, string> = {
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

  const artStyle = artStyleMap[theme.toLowerCase()] || "Warm children's book illustration";

  // Extract first 200 characters as scene description
  const sceneDesc = segmentText.substring(0, 200);

  return `${artStyle}. Scene: ${sceneDesc}. Child-friendly, warm colors, magical and engaging for a ${childAge}-year-old. No text or letters. 300 DPI print quality.`;
}

/**
 * Update a story segment in the database with enhanced content
 */
export async function updateSegmentWithEnhancement(
  segmentId: number,
  enhancement: EnhancedTurn
): Promise<void> {
  await db
    .update(storySegments)
    .set({
      enhancedText: enhancement.enhancedText,
      imagePrompt: enhancement.imagePrompt,
    })
    .where(eq(storySegments.id, segmentId));
}
