/**
 * Image Generation Service
 *
 * Handles image generation using Forge API or similar providers
 * Includes support for character generation and story illustrations
 */

import { ENV } from "./env";

export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  quality?: "low" | "medium" | "high";
  style?: string;
  seed?: number;
}

export interface ImageGenerationResult {
  imageUrl: string;
  width: number;
  height: number;
  format: string;
  seed?: number;
}

/**
 * Create a Forge image generation request
 */
export function createForgeImageRequest(
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    quality?: "low" | "medium" | "high";
    style?: string;
    seed?: number;
  }
): ImageGenerationRequest {
  return {
    prompt,
    width: options?.width || 1024,
    height: options?.height || 1024,
    quality: options?.quality || "high",
    style: options?.style || "illustration",
    seed: options?.seed,
  };
}

/**
 * Execute a Forge image generation request
 *
 * This function handles the actual API call to generate images.
 * In production, this would integrate with Forge API or similar service.
 */
export async function executeForgeRequest(
  request: ImageGenerationRequest
): Promise<ImageGenerationResult> {
  try {
    // Call Forge API endpoint
    const response = await fetch(`${ENV.forgeApiUrl}/v1/images/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        size: `${request.width}x${request.height}`,
        quality: request.quality,
        style: request.style,
        ...(request.seed && { seed: request.seed }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Forge API error ${response.status}: ${error}`
      );
    }

    const data = await response.json();

    return {
      imageUrl: data.url || data.images?.[0]?.url,
      width: request.width || 1024,
      height: request.height || 1024,
      format: "png",
      seed: data.seed,
    };
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
}

/**
 * Generate an image from a prompt
 * Simplified wrapper for image generation
 */
export async function generateImage(options: {
  prompt: string;
  width?: number;
  height?: number;
  quality?: "low" | "medium" | "high";
  style?: string;
}): Promise<string> {
  try {
    const request = createForgeImageRequest(options.prompt, {
      width: options.width,
      height: options.height,
      quality: options.quality,
      style: options.style,
    });

    const result = await executeForgeRequest(request);
    return result.imageUrl;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
}

/**
 * Generate multiple images from a prompt
 * Useful for generating variants
 */
export async function generateImageVariants(
  prompt: string,
  count: number = 3,
  options?: {
    width?: number;
    height?: number;
    quality?: "low" | "medium" | "high";
  }
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const imageUrl = await generateImage({
        prompt: `${prompt}\n\nVariant ${i + 1} of ${count}`,
        width: options?.width,
        height: options?.height,
        quality: options?.quality,
      });
      results.push(imageUrl);
    } catch (error) {
      console.error(`Failed to generate variant ${i + 1}:`, error);
      // Continue with next variant on error
    }
  }

  if (results.length === 0) {
    throw new Error("Failed to generate any image variants");
  }

  return results;
}

/**
 * Batch image generation for multiple prompts
 */
export async function generateImageBatch(
  prompts: string[],
  options?: {
    width?: number;
    height?: number;
    quality?: "low" | "medium" | "high";
    concurrency?: number;
  }
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const concurrency = options?.concurrency || 3;

  // Process prompts in batches
  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    const batchPromises = batch.map((prompt) =>
      generateImage({
        prompt,
        width: options?.width,
        height: options?.height,
        quality: options?.quality,
      }).catch((error) => {
        console.error(`Failed to generate image for prompt: ${error}`);
        return null;
      })
    );

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((url, index) => {
      if (url) {
        results.set(batch[index], url);
      }
    });
  }

  return results;
}
