import { getDefaultProvider } from "./aiProvider";
import { moderateStoryContent } from "./contentModeration";
import { generateSpokenResponse } from "./voiceResponseGenerator";

export interface VoiceCommandInput {
  command: string;
  episodeId: number;
  pageNumber: number;
  childId: number;
  storyContext: {
    title: string;
    currentPageText: string;
    previousPages?: string[];
    characters: string[];
    setting: string;
  };
  childProfile: {
    name: string;
    age: number;
    interests?: string[];
    fears?: string[];
  };
}

export type VoiceCommandResponseType =
  | "story_modification"
  | "answer"
  | "navigation"
  | "interaction_effect"
  | "error";

export interface VoiceCommandResponse {
  type: VoiceCommandResponseType;
  content: string;
  spokenText: string; // What the app should speak to the child
  modifiedText?: string;
  pageNumber?: number;
  conversationStarter?: boolean;
  approved: boolean;
  moderationWarning?: string;
}

/**
 * Categorize voice command intent
 */
function categorizeCommand(
  command: string
): "story_modification" | "navigation" | "questions" | "fun_interactions" {
  const lower = command.toLowerCase();

  if (
    /^make\s+(?:the\s+)?(\w+)/.test(lower) ||
    /^add\s+a?\s+(\w+)/.test(lower) ||
    /^change\s+(?:the\s+)?(\w+)/.test(lower)
  ) {
    return "story_modification";
  }

  if (
    /next\s+page|go\s+to\s+next|continue|next/.test(lower) ||
    /previous|go\s+back|back|last/.test(lower) ||
    /read\s+again|replay|start\s+over/.test(lower)
  ) {
    return "navigation";
  }

  if (
    /what\s+happens|who\s+is|tell\s+me|why\s+|how\s+|where\s+|when\s+/.test(lower)
  ) {
    return "questions";
  }

  return "fun_interactions";
}

/**
 * Extract key story elements from context for safe modification
 */
function extractStoryElements(context: VoiceCommandInput["storyContext"]): {
  characters: string[];
  mainCharacter: string;
  setting: string;
} {
  return {
    characters: context.characters || [],
    mainCharacter: context.characters?.[0] || "the character",
    setting: context.setting || "the story",
  };
}

/**
 * Generate a story modification response
 */
async function processStoryModification(
  input: VoiceCommandInput
): Promise<VoiceCommandResponse> {
  const provider = getDefaultProvider();
  const elements = extractStoryElements(input.storyContext);

  // Build a prompt for Claude to modify the story
  const prompt = `You are a creative story assistant for children aged ${input.childProfile.age}.

Current story context:
- Title: ${input.storyContext.title}
- Current page: ${input.storyContext.currentPageText}
- Characters: ${elements.characters.join(", ")}
- Setting: ${elements.setting}

Child's request: "${input.command}"
Child's name: ${input.childProfile.name}
Child's interests: ${input.childProfile.interests?.join(", ") || "general"}

Generate a modified continuation of the story that:
1. Incorporates the child's creative request
2. Maintains the story's original tone and themes
3. Is age-appropriate and safe
4. Uses simple, engaging language for a ${input.childProfile.age}-year-old
5. Is 2-3 sentences long

Respond with ONLY the modified story text, no explanations.`;

  try {
    const modifiedText = await provider.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.8,
    });

    // Moderate the generated content
    const moderation = moderateStoryContent(modifiedText, input.childProfile.fears);

    if (!moderation.approved) {
      return {
        type: "error",
        content: "I couldn't incorporate that change safely. Try something else!",
        spokenText: "I couldn't incorporate that change safely. Try something else!",
        approved: false,
        moderationWarning: moderation.flaggedContent
          .slice(0, 2)
          .map((f) => f.reason)
          .join("; "),
      };
    }

    const displayText = `Great idea, ${input.childProfile.name}! Here's what happens:`;
    const spokenResponse = await generateSpokenResponse({
      commandType: "story_modification",
      aiResponse: modifiedText,
      childAge: input.childProfile.age,
      childName: input.childProfile.name,
      storyTitle: input.storyContext.title,
    });

    return {
      type: "story_modification",
      content: displayText,
      spokenText: spokenResponse.spokenText,
      modifiedText,
      approved: true,
    };
  } catch (error) {
    console.error("Story modification error:", error);
    return {
      type: "error",
      content:
        "Hmm, I had trouble with that. Let's try something else!",
      spokenText:
        "Hmm, I had trouble with that. Let's try something else!",
      approved: false,
    };
  }
}

/**
 * Generate an answer to a story question
 */
async function processQuestion(
  input: VoiceCommandInput
): Promise<VoiceCommandResponse> {
  const provider = getDefaultProvider();
  const elements = extractStoryElements(input.storyContext);

  const prompt = `You are a friendly story guide for a ${input.childProfile.age}-year-old child.

Story context:
- Title: ${input.storyContext.title}
- Current page: ${input.storyContext.currentPageText}
- Previous pages: ${input.storyContext.previousPages?.join(" ") || "N/A"}
- Characters: ${elements.characters.join(", ")}

Child's question: "${input.command}"
Child's name: ${input.childProfile.name}

Answer the question in a fun, age-appropriate way:
1. Keep it short (1-2 sentences for ages 4-7, up to 3 sentences for ages 8+)
2. Use simple words
3. Stay true to the story
4. Make it engaging and exciting

Respond with ONLY the answer, no explanations.`;

  try {
    const answer = await provider.generateText(prompt, {
      maxTokens: 150,
      temperature: 0.7,
    });

    // Moderate the response
    const moderation = moderateStoryContent(answer, input.childProfile.fears);

    if (!moderation.approved) {
      return {
        type: "error",
        content: "I'm not sure how to answer that right now.",
        spokenText: "I'm not sure how to answer that right now.",
        approved: false,
      };
    }

    const spokenResponse = await generateSpokenResponse({
      commandType: "answer",
      aiResponse: answer,
      childAge: input.childProfile.age,
      childName: input.childProfile.name,
      storyTitle: input.storyContext.title,
    });

    return {
      type: "answer",
      content: answer,
      spokenText: spokenResponse.spokenText,
      approved: true,
      conversationStarter: true,
    };
  } catch (error) {
    console.error("Question processing error:", error);
    return {
      type: "error",
      content: "Let me keep reading to find the answer!",
      spokenText: "Let me keep reading to find the answer!",
      approved: false,
    };
  }
}

/**
 * Process navigation commands
 */
function processNavigation(input: VoiceCommandInput): VoiceCommandResponse {
  const command = input.command.toLowerCase();
  let newPage = input.pageNumber;

  if (/next|continue/.test(command)) {
    newPage = input.pageNumber + 1;
  } else if (/previous|back|last/.test(command)) {
    newPage = Math.max(1, input.pageNumber - 1);
  } else if (/read\s+again|replay|start\s+over/.test(command)) {
    newPage = input.pageNumber;
  }

  const messages: Record<string, string> = {
    next: `Turning to the next page!`,
    back: `Going back a page!`,
    replay: `Reading that again!`,
  };

  const key = /next|continue/.test(command)
    ? "next"
    : /back|previous/.test(command)
      ? "back"
      : "replay";

  const message = messages[key];

  return {
    type: "navigation",
    content: message,
    spokenText: message,
    pageNumber: newPage,
    approved: true,
  };
}

/**
 * Process fun interaction commands
 */
async function processFunInteraction(
  input: VoiceCommandInput
): Promise<VoiceCommandResponse> {
  const provider = getDefaultProvider();

  const prompt = `You are a fun story companion for a ${input.childProfile.age}-year-old child.

Story context:
- Title: ${input.storyContext.title}
- Current page: ${input.storyContext.currentPageText}

Child's request: "${input.command}"
Child's name: ${input.childProfile.name}

Respond with a fun story effect or comment that:
1. Matches their request (funny, silly, magical, scary in an age-appropriate way)
2. Keeps the mood light and playful
3. Is 1-2 sentences
4. Uses simple language

Examples of good responses:
- "Booop! Did you hear that silly sound?" for "make it funny"
- "✨ Magic sparkles fill the air! ✨" for "add magic"
- "Boo! Did that give you a tiny chill?" for "make it scary"

Respond with ONLY the interaction response, no explanations.`;

  try {
    const response = await provider.generateText(prompt, {
      maxTokens: 100,
      temperature: 0.85,
    });

    // Moderate the response
    const moderation = moderateStoryContent(response, input.childProfile.fears);

    if (!moderation.approved) {
      return {
        type: "interaction_effect",
        content: "Oops! That didn't work out. Try something else!",
        spokenText: "Oops! That didn't work out. Try something else!",
        approved: false,
      };
    }

    const spokenResponse = await generateSpokenResponse({
      commandType: "interaction_effect",
      aiResponse: response,
      childAge: input.childProfile.age,
      childName: input.childProfile.name,
      storyTitle: input.storyContext.title,
    });

    return {
      type: "interaction_effect",
      content: response,
      spokenText: spokenResponse.spokenText,
      approved: true,
    };
  } catch (error) {
    console.error("Fun interaction error:", error);
    return {
      type: "interaction_effect",
      content: "That's a fun idea! Let's keep reading.",
      spokenText: "That's a fun idea! Let's keep reading.",
      approved: false,
    };
  }
}

/**
 * Main voice command processor
 */
export async function processVoiceCommand(
  input: VoiceCommandInput
): Promise<VoiceCommandResponse> {
  // Early validation
  if (!input.command || input.command.trim().length === 0) {
    return {
      type: "error",
      content: "I didn't catch that. Try again!",
      spokenText: "I didn't catch that. Try again!",
      approved: false,
    };
  }

  // Moderate the command itself
  const commandModeration = moderateStoryContent(input.command, input.childProfile.fears);
  if (!commandModeration.approved) {
    return {
      type: "error",
      content: "Hmm, I can't help with that request. Try something else!",
      spokenText: "Hmm, I can't help with that request. Try something else!",
      approved: false,
      moderationWarning: commandModeration.flaggedContent
        .slice(0, 1)
        .map((f) => f.reason)
        .join("; "),
    };
  }

  // Categorize and process
  const category = categorizeCommand(input.command);

  switch (category) {
    case "story_modification":
      return await processStoryModification(input);
    case "questions":
      return await processQuestion(input);
    case "navigation":
      return processNavigation(input);
    case "fun_interactions":
      return await processFunInteraction(input);
  }
}
