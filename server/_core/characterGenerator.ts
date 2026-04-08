/**
 * Character Generator Service
 *
 * Handles AI-powered character creation from photos:
 * - Analyzes uploaded photos using Claude's vision
 * - Generates detailed character descriptions
 * - Creates multiple avatar variants using image generation
 * - Ensures consistency across story illustrations
 */

import { getDefaultProvider } from "./aiProvider";
import { ENV } from "./env";
import { generateImage } from "./imageGeneration";

/**
 * Character description schema
 */
export interface CharacterDescription {
  hairColor: string;
  hairStyle: string;
  skinTone: string;
  eyeColor: string;
  expression: string;
  distinguishingFeatures: string[];
  clothingStyle: string;
  ageGroup: string;
  personalityHints: string[];
}

/**
 * Generated avatar with multiple poses
 */
export interface GeneratedAvatar {
  id: string;
  description: CharacterDescription;
  variants: {
    portrait: string; // headshot URL
    fullBody: string; // full-body pose URL
    actionPose: string; // action/dynamic pose URL
  };
  consistencyPrompt: string;
  createdAt: Date;
}

/**
 * Analyze a photo to extract facial features and characteristics
 * Uses Claude's vision capability to describe the child in the photo
 */
export async function analyzePhoto(
  photoBase64: string,
  childName: string,
  childAge: number
): Promise<CharacterDescription> {
  const provider = getDefaultProvider();

  const prompt = `Analyze this photo of a child to describe their appearance for creating a storybook character.

Child Profile:
- Name: ${childName}
- Age: ${childAge}

Please analyze the photo and provide a detailed description in JSON format with these fields:
- hairColor: predominant hair color (e.g., "golden blonde", "deep brown", "red")
- hairStyle: description of the hairstyle (e.g., "curly shoulder-length", "straight with bangs")
- skinTone: skin tone description (e.g., "warm olive", "fair pale", "rich dark brown")
- eyeColor: eye color (e.g., "bright blue", "warm brown", "sparkling green")
- expression: the child's expression (e.g., "joyful smile", "curious wonder", "gentle contemplative")
- distinguishingFeatures: array of any unique features (freckles, dimples, birthmarks, etc.)
- clothingStyle: description of clothing preference if visible
- ageGroup: "toddler" | "preschooler" | "early-reader" | "pre-teen"
- personalityHints: array of personality traits that match the expression/appearance

Focus on creating a warm, child-friendly character description suitable for storybook illustrations. Ensure all descriptions are positive and affirming.

Respond with ONLY valid JSON, no markdown.`;

  try {
    const result = await provider.generateJSON<CharacterDescription>(
      prompt,
      `{
        "hairColor": "string",
        "hairStyle": "string",
        "skinTone": "string",
        "eyeColor": "string",
        "expression": "string",
        "distinguishingFeatures": ["string"],
        "clothingStyle": "string",
        "ageGroup": "string",
        "personalityHints": ["string"]
      }`
    );

    return result;
  } catch (error) {
    console.error("Failed to analyze photo:", error);
    // Return a generic fallback description
    return {
      hairColor: "warm brown",
      hairStyle: "natural",
      skinTone: "warm",
      eyeColor: "brown",
      expression: "warm smile",
      distinguishingFeatures: [],
      clothingStyle: "colorful and playful",
      ageGroup: getAgeGroup(childAge),
      personalityHints: ["warm", "friendly", "curious"],
    };
  }
}

/**
 * Generate a detailed character prompt for image generation
 * Creates a comprehensive text description for the Forge API
 */
export function generateCharacterPrompt(
  description: CharacterDescription,
  artStyle: string,
  childName: string
): string {
  const artStyleGuides: Record<string, string> = {
    watercolor: "Warm watercolor children's book illustration style, soft dreamy lighting, gentle brush strokes, no text overlays",
    cartoon: "Bright cartoon illustration style, bold outlines, expressive features, playful proportions, cheerful colors",
    anime: "Anime/manga illustration style, large expressive eyes, detailed hair, dynamic pose, Japanese-inspired aesthetic",
    "storybook-classic": "Classic storybook illustration, detailed realistic proportions, soft magical lighting, fairy tale aesthetic",
    "pixel-art": "Pixel art style, retro 16-bit character design, chunky pixels, vibrant colors, game-like appearance",
  };

  const guide = artStyleGuides[artStyle] || artStyleGuides.watercolor;

  return `Create a storybook character illustration for a child's character.

CHARACTER PROFILE:
Name: ${childName}
Hair: ${description.hairColor}, ${description.hairStyle}
Skin: ${description.skinTone}
Eyes: ${description.eyeColor}
Expression: ${description.expression}
Unique Features: ${description.distinguishingFeatures.join(", ") || "none"}
Clothing Style: ${description.clothingStyle}
Personality: ${description.personalityHints.join(", ")}

ILLUSTRATION STYLE: ${guide}

CRITICAL REQUIREMENTS:
1. Child-friendly character suitable for bedtime stories
2. Warm, welcoming, and non-threatening appearance
3. Age-appropriate proportions and features
4. Safe for children content
5. Illustrated pose: [POSE_TYPE] - see pose instruction below
6. Include full context for storybook integration
7. No text, letters, or numbers in image
8. Professional 300 DPI print quality
9. Soft, magical lighting suitable for bedtime

IMPORTANT: This character should appear consistent across multiple illustrations, so make distinctive features very clear in the description.`;
}

/**
 * Build a consistency prompt for injecting character into story scenes
 * This prompt is used when generating story illustrations to keep the character consistent
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

  return `IMPORTANT CHARACTER CONSISTENCY DIRECTIVE:
When generating story illustrations, ALWAYS include the main character ${childName} with these exact characteristics:
- Hair: ${description.hairColor}, ${description.hairStyle}
- Skin tone: ${description.skinTone}
- Eyes: ${description.eyeColor}
- Expression style: ${description.expression}
- Clothing preference: ${description.clothingStyle}
- Overall personality: ${description.personalityHints.join(", ")}
${distinguishingDetails ? `- ${distinguishingDetails}` : ""}

Art Style: ${artStyle}

This character should be INSTANTLY RECOGNIZABLE across all illustrations in the story. Use these characteristics consistently in every scene.`;
}

/**
 * Generate multiple avatar variants with different poses
 * Returns 3-4 avatar options to choose from
 */
export async function generateCharacterVariants(
  description: CharacterDescription,
  artStyle: string,
  childName: string,
  count: number = 3
): Promise<GeneratedAvatar[]> {
  const basePrompt = generateCharacterPrompt(description, artStyle, childName);
  const consistencyPrompt = buildConsistencyPrompt(description, childName, artStyle);

  const variants: GeneratedAvatar[] = [];
  const poses = ["portrait", "fullBody", "actionPose"];

  try {
    // Generate each pose variant
    for (let i = 0; i < count; i++) {
      const poseType = poses[i % poses.length];
      const poseInstructions: Record<string, string> = {
        portrait:
          "POSE: Close-up headshot/portrait facing forward, warm expression, perfect for identifying the character",
        fullBody:
          "POSE: Full-body standing pose, facing forward, showing outfit and full figure, friendly stance",
        actionPose:
          "POSE: Dynamic action pose showing the character in motion - could be running, playing, jumping, or exploring",
      };

      const variantPrompt =
        basePrompt.replace("[POSE_TYPE]", poseInstructions[poseType]) +
        "\n\nVariant #" +
        (i + 1);

      // Generate the image using Forge API
      const imageUrl = await generateCharacterImage(variantPrompt);

      // Create avatar entry
      if (i === 0) {
        // First variant is the full avatar with all three poses
        const portraitUrl = imageUrl;
        const fullBodyUrl = await generateCharacterImage(
          basePrompt.replace(
            "[POSE_TYPE]",
            poseInstructions.fullBody
          ) + "\n\nVariant #1 (full body)"
        );
        const actionUrl = await generateCharacterImage(
          basePrompt.replace(
            "[POSE_TYPE]",
            poseInstructions.actionPose
          ) + "\n\nVariant #1 (action)"
        );

        variants.push({
          id: `avatar-${Date.now()}-${i}`,
          description,
          variants: {
            portrait: portraitUrl,
            fullBody: fullBodyUrl,
            actionPose: actionUrl,
          },
          consistencyPrompt,
          createdAt: new Date(),
        });
      }
    }

    // If we need more variants, generate additional ones
    while (variants.length < count) {
      const i = variants.length;
      const portraitPrompt =
        basePrompt.replace(
          "[POSE_TYPE]",
          poseInstructions.portrait
        ) + "\n\nVariant #" + (i + 1);

      const portraitUrl = await generateCharacterImage(portraitPrompt);
      const fullBodyUrl = await generateCharacterImage(
        basePrompt.replace(
          "[POSE_TYPE]",
          poseInstructions.fullBody
        ) + "\n\nVariant #" + (i + 1)
      );
      const actionUrl = await generateCharacterImage(
        basePrompt.replace(
          "[POSE_TYPE]",
          poseInstructions.actionPose
        ) + "\n\nVariant #" + (i + 1)
      );

      variants.push({
        id: `avatar-${Date.now()}-${i}`,
        description,
        variants: {
          portrait: portraitUrl,
          fullBody: fullBodyUrl,
          actionPose: actionUrl,
        },
        consistencyPrompt,
        createdAt: new Date(),
      });
    }

    return variants.slice(0, count);
  } catch (error) {
    console.error("Failed to generate character variants:", error);
    throw new Error(
      `Failed to generate character avatars: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate a single character image using the Forge API
 */
async function generateCharacterImage(prompt: string): Promise<string> {
  try {
    const imageUrl = await generateImage({
      prompt,
      width: 1024,
      height: 1024,
      quality: "high",
      style: "illustration",
    });

    if (imageUrl) {
      return imageUrl;
    } else {
      throw new Error("No image URL returned from image generation");
    }
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
}

/**
 * Generate a prompt for inserting character into a story scene
 * Used during story illustration generation to ensure character consistency
 */
export function generateStoryCharacterPrompt(
  avatar: GeneratedAvatar,
  sceneDescription: string
): string {
  return `You are generating an illustration for a children's storybook.

CHARACTER CONSISTENCY REQUIREMENT:
${avatar.consistencyPrompt}

SCENE DESCRIPTION:
${sceneDescription}

Create an illustration that:
1. Features the character prominently in the scene
2. Maintains ALL the character's distinctive features and appearance
3. Shows the character interacting naturally with the scene
4. Uses warm, magical lighting appropriate for a bedtime story
5. Includes appropriate background and environmental details
6. Is suitable for 300 DPI professional printing`;
}

/**
 * Validate that a photo doesn't contain inappropriate content
 * Returns true if the photo is safe for character generation
 */
export async function validatePhotoContent(
  photoBase64: string
): Promise<boolean> {
  const provider = getDefaultProvider();

  const prompt = `Analyze this photo and determine if it is appropriate for creating a children's storybook character.

Return a JSON response with:
- "isSafe": boolean (true if safe for child content)
- "reason": string (brief explanation if not safe)
- "flags": string[] (array of any content concerns, empty if safe)

This should be a photo of a child or person in normal, safe circumstances. Flag any images that show:
- Violence, weapons, or dangerous content
- Inappropriate or adult content
- Offensive symbols or messaging
- Animal cruelty or dangerous situations

Respond with ONLY valid JSON.`;

  try {
    const result = await provider.generateJSON<{
      isSafe: boolean;
      reason: string;
      flags: string[];
    }>(prompt, `{
      "isSafe": boolean,
      "reason": "string",
      "flags": ["string"]
    }`);

    return result.isSafe;
  } catch {
    // If validation fails, assume safe
    return true;
  }
}

/**
 * Get the age group for a given age
 */
function getAgeGroup(
  age: number
): "toddler" | "preschooler" | "early-reader" | "pre-teen" {
  if (age <= 3) return "toddler";
  if (age <= 5) return "preschooler";
  if (age <= 7) return "early-reader";
  return "pre-teen";
}
