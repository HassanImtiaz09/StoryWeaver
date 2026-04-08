/**
 * Character Consistency Engine
 *
 * Ensures generated characters look consistent across all story illustrations
 * by maintaining a character "sheet" and injecting character descriptions
 * into ALL image generation prompts.
 */

import { db } from "../db";
import { characterAvatars } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { CharacterDescription } from "./characterGenerator";

/**
 * Character sheet stored in database
 * Contains the canonical description used across all stories
 */
export interface CharacterSheet {
  childId: number;
  characterDescription: CharacterDescription;
  artStyle: string;
  consistencyPrompt: string;
  portraitImageUrl: string;
  fullBodyImageUrl: string;
  actionPoseImageUrl: string;
  updatedAt: Date;
}

/**
 * Get the character directive for a child
 * Returns the stored character description to inject into image generation prompts
 */
export async function getCharacterDirective(
  childId: number
): Promise<string | null> {
  try {
    const result = await db
      .select()
      .from(characterAvatars)
      .where(eq(characterAvatars.childId, childId));

    if (result.length === 0) {
      return null;
    }

    const avatar = result[0];
    return avatar.consistencyPrompt || null;
  } catch (error) {
    console.error("Failed to get character directive:", error);
    return null;
  }
}

/**
 * Build a consistency prompt from a character description
 * This ensures the character appears consistently in all story illustrations
 */
export function buildConsistencyPrompt(
  description: CharacterDescription,
  childName: string,
  artStyle: string
): string {
  const distinguishingDetails =
    description.distinguishingFeatures.length > 0
      ? `Distinctive features: ${description.distinguishingFeatures.join(", ")}`
      : "";

  return `CHARACTER CONSISTENCY DIRECTIVE - MANDATORY FOR ALL ILLUSTRATIONS:

Character Name: ${childName}
Appearance:
- Hair: ${description.hairColor}, ${description.hairStyle}
- Skin: ${description.skinTone}
- Eyes: ${description.eyeColor}
- Expression: ${description.expression}
- Clothing Style: ${description.clothingStyle}
- Personality: ${description.personalityHints.join(", ")}
${distinguishingDetails ? `- ${distinguishingDetails}` : ""}

Art Style: ${artStyle}

CRITICAL INSTRUCTION:
Include ${childName} in this scene looking EXACTLY like this. The character must be INSTANTLY RECOGNIZABLE across all story illustrations through:
1. Exact hair color and style
2. Exact skin tone
3. Exact eye color
4. Consistent personality expression
5. Consistent clothing preferences
6. All distinctive features present

This character is the protagonist of ${childName}'s stories. They appear in EVERY illustration. Consistency is essential for emotional connection.`;
}

/**
 * Inject character directive into an existing image generation prompt
 * Call this before sending a prompt to the image generation API
 */
export function injectCharacterIntoPrompt(
  originalPrompt: string,
  characterDirective: string | null,
  childName: string
): string {
  if (!characterDirective) {
    return originalPrompt;
  }

  // Insert the character directive at the beginning, right after any scene description
  const sceneMarker = "SCENE:";
  if (originalPrompt.includes(sceneMarker)) {
    const parts = originalPrompt.split(sceneMarker);
    return (
      parts[0] +
      characterDirective +
      "\n\n" +
      sceneMarker +
      parts.slice(1).join(sceneMarker)
    );
  }

  // If no scene marker, insert at the beginning
  return characterDirective + "\n\n" + originalPrompt;
}

/**
 * Get character's portrait image for display
 */
export async function getCharacterPortrait(childId: number): Promise<string | null> {
  try {
    const result = await db
      .select()
      .from(characterAvatars)
      .where(eq(characterAvatars.childId, childId));

    if (result.length === 0) {
      return null;
    }

    const avatar = result[0];
    const variants = avatar.selectedVariantId ? avatar.variants as any : null;

    if (variants && variants.portrait) {
      return variants.portrait;
    }

    return null;
  } catch (error) {
    console.error("Failed to get character portrait:", error);
    return null;
  }
}

/**
 * Get all character variants for a child
 */
export async function getCharacterVariants(childId: number) {
  try {
    const result = await db
      .select()
      .from(characterAvatars)
      .where(eq(characterAvatars.childId, childId));

    if (result.length === 0) {
      return null;
    }

    return result[0].variants;
  } catch (error) {
    console.error("Failed to get character variants:", error);
    return null;
  }
}

/**
 * Update the consistency prompt for a character
 * Call this when regenerating or updating a character
 */
export async function updateConsistencyPrompt(
  childId: number,
  newPrompt: string
): Promise<void> {
  try {
    await db
      .update(characterAvatars)
      .set({
        consistencyPrompt: newPrompt,
        updatedAt: new Date(),
      })
      .where(eq(characterAvatars.childId, childId));
  } catch (error) {
    console.error("Failed to update consistency prompt:", error);
    throw error;
  }
}

/**
 * Check if a child has a character avatar
 */
export async function hasCharacterAvatar(childId: number): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(characterAvatars)
      .where(eq(characterAvatars.childId, childId));

    return result.length > 0;
  } catch (error) {
    console.error("Failed to check character avatar:", error);
    return false;
  }
}

/**
 * Clear/delete a character avatar for a child
 */
export async function clearCharacterAvatar(childId: number): Promise<void> {
  try {
    await db
      .delete(characterAvatars)
      .where(eq(characterAvatars.childId, childId));
  } catch (error) {
    console.error("Failed to clear character avatar:", error);
    throw error;
  }
}
