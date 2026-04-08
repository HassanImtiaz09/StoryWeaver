/**
 * Voice Response Generator
 *
 * Generates child-friendly spoken responses using AI.
 * Adjusts language complexity based on child's age for natural TTS.
 *
 * Age groups:
 * - 2-4: Very simple, enthusiastic, short sentences
 * - 5-7: Simple but more descriptive
 * - 8-10: More natural conversational tone
 * - 11-13: Casual, peer-like tone
 */

export interface ResponseGenerationInput {
  commandType:
    | "story_modification"
    | "answer"
    | "navigation"
    | "interaction_effect"
    | "error";
  aiResponse: string; // The AI-generated text to be spoken
  childAge: number;
  childName?: string;
  storyTitle?: string;
}

export interface GeneratedResponse {
  displayText: string; // What should appear on screen (can include formatting)
  spokenText: string; // What should be spoken (more natural for TTS)
}

/**
 * Get age-appropriate language tier
 */
function getAgeTier(age: number): "very_young" | "young" | "middle" | "older" {
  if (age <= 4) return "very_young";
  if (age <= 7) return "young";
  if (age <= 10) return "middle";
  return "older";
}

/**
 * Simplify text for very young children (2-4 years)
 * Very short sentences, simple words, high enthusiasm
 */
function simplifyForVeryYoung(text: string): string {
  // Keep to short sentences, remove complex punctuation
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .slice(0, 2); // Keep only first 2 sentences

  return sentences
    .map((s) => {
      // Replace complex words with simpler ones
      return s
        .trim()
        .replace(/amazing/gi, "cool")
        .replace(/incredible/gi, "amazing")
        .replace(/beautiful/gi, "pretty")
        .replace(/wonderful/gi, "great");
    })
    .join(". ")
    .concat(".");
}

/**
 * Simplify for young children (5-7 years)
 * Short sentences, simple vocabulary, engaging tone
 */
function simplifyForYoung(text: string): string {
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .slice(0, 3);

  return sentences
    .map((s) => s.trim())
    .join(". ")
    .concat(".");
}

/**
 * Adjust for middle children (8-10 years)
 * More natural flow, slightly longer, conversational
 */
function adjustForMiddle(text: string): string {
  // Remove emoji and special formatting
  return text
    .replace(/[✨🎭🎪🎨]/g, "")
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .slice(0, 4)
    .map((s) => s.trim())
    .join(". ")
    .concat(".");
}

/**
 * Adjust for older children (11-13 years)
 * Casual, peer-like tone, natural conversation
 */
function adjustForOlder(text: string): string {
  // Remove emoji and special formatting, keep natural tone
  return text
    .replace(/[✨🎭🎪🎨]/g, "")
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .slice(0, 5)
    .map((s) => s.trim())
    .join(". ")
    .concat(".");
}

/**
 * Apply age-appropriate language simplification
 */
function adjustForAge(text: string, age: number): string {
  const tier = getAgeTier(age);

  switch (tier) {
    case "very_young":
      return simplifyForVeryYoung(text);
    case "young":
      return simplifyForYoung(text);
    case "middle":
      return adjustForMiddle(text);
    case "older":
      return adjustForOlder(text);
  }
}

/**
 * Generate appropriate opening phrase for response type
 */
function getOpeningPhrase(
  type: ResponseGenerationInput["commandType"],
  age: number,
  childName?: string
): string {
  const name = childName ? childName : "friend";

  if (age <= 4) {
    // Very simple for toddlers
    if (type === "story_modification") return "Okay!";
    if (type === "answer") return "Here it is!";
    if (type === "navigation") return "Sure!";
    if (type === "interaction_effect") return "Cool!";
    return "Hmm...";
  }

  if (age <= 7) {
    // Simple openings for young kids
    if (type === "story_modification") return `Great idea, ${name}!`;
    if (type === "answer") return "Let me tell you!";
    if (type === "navigation") return "Let's go!";
    if (type === "interaction_effect") return "Fun!";
    return "Hmm...";
  }

  if (age <= 10) {
    // More natural for middle grade
    if (type === "story_modification") return `Awesome, ${name}!`;
    if (type === "answer") return "Here's what I think...";
    if (type === "navigation") return "Let's see what's next!";
    if (type === "interaction_effect") return "That's so fun!";
    return "Let me think about that...";
  }

  // Casual for older kids
  if (type === "story_modification") return `Yeah, ${name}, I love that!`;
  if (type === "answer") return "Good question! Here's what I think...";
  if (type === "navigation") return "Let's keep going!";
  if (type === "interaction_effect") return "That's hilarious!";
  return "Hmm, give me a second...";
}

/**
 * Generate a spoken response for a voice command
 *
 * Returns both display text (what appears on screen) and spoken text (what's spoken).
 * Spoken text is more natural and conversational for TTS.
 */
export async function generateSpokenResponse(
  input: ResponseGenerationInput
): Promise<GeneratedResponse> {
  try {
    const opening = getOpeningPhrase(input.commandType, input.childAge, input.childName);
    const adjustedContent = adjustForAge(input.aiResponse, input.childAge);

    // For display: keep the original content (can include formatting)
    const displayText = input.aiResponse;

    // For speaking: combine opening with adjusted content for natural flow
    let spokenText = opening;

    if (adjustedContent && adjustedContent !== ".") {
      // Only add the content if it's meaningful
      if (opening.endsWith("!") || opening.endsWith("...")) {
        spokenText += " " + adjustedContent;
      } else {
        spokenText += " " + adjustedContent;
      }
    }

    return {
      displayText,
      spokenText: spokenText.trim(),
    };
  } catch (error) {
    console.error("Error generating spoken response:", error);

    // Fallback response
    return {
      displayText: input.aiResponse,
      spokenText: "Let me think about that...",
    };
  }
}

/**
 * Generate a full response for a voice command including both text and spoken versions
 *
 * This is used in the voice command processor to generate comprehensive responses.
 */
export async function generateFullVoiceResponse(
  commandType: ResponseGenerationInput["commandType"],
  mainContent: string,
  childAge: number,
  childName?: string,
  storyTitle?: string
): Promise<{
  displayText: string;
  spokenText: string;
  conversationalPacing: boolean; // Whether to add natural pauses
}> {
  const response = await generateSpokenResponse({
    commandType,
    aiResponse: mainContent,
    childAge,
    childName,
    storyTitle,
  });

  return {
    displayText: response.displayText,
    spokenText: response.spokenText,
    conversationalPacing: childAge <= 7, // Add pauses for younger kids
  };
}
