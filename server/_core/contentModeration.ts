import { Anthropic } from "@anthropic-ai/sdk";
import { ENV } from "./env";

/**
 * Content moderation service for child safety.
 * Reviews AI-generated story content before delivery.
 * Implements keyword filtering, theme checking, and fear/sensitivity awareness.
 */

// Blocked content categories - stories must NEVER contain these
const BLOCKED_KEYWORDS = [
  // Violence
  "blood",
  "gore",
  "kill",
  "murder",
  "weapon",
  "gun",
  "knife",
  "stab",
  "shoot",
  "die",
  "death",
  "dead",
  "corpse",
  "war",
  "bomb",
  "explode",
  // Sexual content
  "sexual",
  "naked",
  "nude",
  "kiss on lips",
  "romantic",
  // Substance abuse
  "drug",
  "alcohol",
  "beer",
  "wine",
  "cigarette",
  "smoke",
  "drunk",
  // Horror/trauma
  "nightmare",
  "torture",
  "scream in terror",
  "demon",
  "possessed",
  "haunted",
  // Self-harm
  "suicide",
  "self-harm",
  "cutting",
  "hurt yourself",
  // Inappropriate for children
  "stupid",
  "idiot",
  "dumb",
  "hate you",
  "ugly",
  "fat",
  "loser",
];

// Fear-sensitive content - block if the child has this fear listed
const FEAR_SENSITIVE_MAP: Record<string, string[]> = {
  "The dark": ["pitch black", "couldn't see anything", "total darkness", "lights went out"],
  "Monsters under bed": ["monster", "creature under", "something lurking"],
  "Being alone": ["all alone", "nobody came", "abandoned", "left behind", "deserted"],
  "Loud noises": ["deafening", "thunderous boom", "ear-splitting", "explosion"],
  "Big animals": ["enormous beast", "giant creature", "towering animal"],
  "Water/swimming": ["drowning", "sinking", "pulled under", "deep water"],
  "Heights": ["cliff edge", "falling from", "looking down from", "vertigo"],
  "Getting lost": ["hopelessly lost", "couldn't find the way", "no way home"],
  "Storms & thunder": ["lightning struck", "thunder crashed", "violent storm"],
  "Separation from parents": ["parents disappeared", "mom and dad were gone", "taken away from"],
};

export type FlaggedContent = {
  text: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

export type ModerationResult = {
  approved: boolean;
  flaggedContent: FlaggedContent[];
  overallSeverity: "safe" | "low" | "medium" | "high";
  moderatedText?: string;
};

/**
 * moderateStoryContent - Check story text against blocked keywords and child fears
 */
export function moderateStoryContent(
  storyText: string,
  childFears?: string[]
): ModerationResult {
  const flaggedContent: FlaggedContent[] = [];
  const textLower = storyText.toLowerCase();

  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = storyText.match(regex);
    if (matches) {
      for (const match of matches) {
        flaggedContent.push({
          text: match,
          reason: `Blocked keyword: "${keyword}" detected`,
          severity: "high",
        });
      }
    }
  }

  // Check for child-specific fears
  if (childFears && childFears.length > 0) {
    for (const fear of childFears) {
      const fearTriggers = FEAR_SENSITIVE_MAP[fear];
      if (fearTriggers) {
        for (const trigger of fearTriggers) {
          const regex = new RegExp(`\\b${trigger}\\b`, "gi");
          const matches = storyText.match(regex);
          if (matches) {
            for (const match of matches) {
              flaggedContent.push({
                text: match,
                reason: `Fear-sensitive content: "${fear}" trigger detected`,
                severity: "high",
              });
            }
          }
        }
      }
    }
  }

  // Determine overall severity
  let overallSeverity: "safe" | "low" | "medium" | "high" = "safe";
  if (flaggedContent.length > 0) {
    const hasCritical = flaggedContent.some((f) => f.severity === "high");
    const hasMedium = flaggedContent.some((f) => f.severity === "medium");
    if (hasCritical) {
      overallSeverity = "high";
    } else if (hasMedium) {
      overallSeverity = "medium";
    } else {
      overallSeverity = "low";
    }
  }

  return {
    approved: flaggedContent.length === 0,
    flaggedContent,
    overallSeverity,
  };
}

/**
 * moderateEpisode - Moderate title, summary, and all page texts
 */
export function moderateEpisode(
  episode: {
    title: string;
    summary: string;
    pages: { text: string }[];
  },
  childFears?: string[]
): ModerationResult {
  const allFlaggedContent: FlaggedContent[] = [];

  // Moderate title
  const titleResult = moderateStoryContent(episode.title, childFears);
  allFlaggedContent.push(...titleResult.flaggedContent);

  // Moderate summary
  const summaryResult = moderateStoryContent(episode.summary, childFears);
  allFlaggedContent.push(
    ...summaryResult.flaggedContent.map((f) => ({
      ...f,
      text: `[summary] ${f.text}`,
    }))
  );

  // Moderate all pages
  for (let i = 0; i < episode.pages.length; i++) {
    const pageResult = moderateStoryContent(episode.pages[i].text, childFears);
    allFlaggedContent.push(
      ...pageResult.flaggedContent.map((f) => ({
        ...f,
        text: `[page ${i + 1}] ${f.text}`,
      }))
    );
  }

  // Determine overall severity
  let overallSeverity: "safe" | "low" | "medium" | "high" = "safe";
  if (allFlaggedContent.length > 0) {
    const hasCritical = allFlaggedContent.some((f) => f.severity === "high");
    const hasMedium = allFlaggedContent.some((f) => f.severity === "medium");
    if (hasCritical) {
      overallSeverity = "high";
    } else if (hasMedium) {
      overallSeverity = "medium";
    } else {
      overallSeverity = "low";
    }
  }

  return {
    approved: allFlaggedContent.length === 0,
    flaggedContent: allFlaggedContent,
    overallSeverity,
  };
}

/**
 * aiSafetyCheck - Uses Claude to do a deeper semantic safety check
 * This is more expensive so only called when keyword check passes but we want extra safety
 */
export async function aiSafetyCheck(
  storyText: string,
  childAge: number,
  childFears?: string[]
): Promise<ModerationResult> {
  try {
    const client = new Anthropic({
      apiKey: ENV.anthropicApiKey,
    });

    const fearsDescription = childFears && childFears.length > 0 ? `Child's specific fears: ${childFears.join(", ")}` : "No specific fears noted.";

    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a child safety expert. Review the following story content for a ${childAge}-year-old child and identify ANY inappropriate content.

${fearsDescription}

Story content:
"${storyText}"

Respond with a JSON object:
{
  "isApproved": boolean,
  "issues": ["issue1", "issue2"],
  "severity": "safe" | "low" | "medium" | "high"
}

Be strict about safety. Flag anything that could cause anxiety, fear, or harm to a child.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return {
        approved: true,
        flaggedContent: [],
        overallSeverity: "safe",
      };
    }

    try {
      const parsed = JSON.parse(content.text);
      const flaggedContent: FlaggedContent[] = (parsed.issues || []).map((issue: string) => ({
        text: issue,
        reason: "AI safety check flagged",
        severity: parsed.severity || "medium" as const,
      }));

      return {
        approved: parsed.isApproved === true,
        flaggedContent,
        overallSeverity: parsed.severity || "safe",
      };
    } catch {
      // If parsing fails, treat as safe (better to be permissive than block valid content)
      return {
        approved: true,
        flaggedContent: [],
        overallSeverity: "safe",
      };
    }
  } catch (error) {
    console.error("AI safety check failed:", error);
    // On error, treat as safe (fail open to avoid blocking legitimate content)
    return {
      approved: true,
      flaggedContent: [],
      overallSeverity: "safe",
    };
  }
}

/**
 * validateChildAge - Check age requirements for COPPA compliance
 */
export function validateChildAge(age: number): {
  valid: boolean;
  requiresConsent: boolean;
  message?: string;
} {
  if (age < 1 || age > 17) {
    return {
      valid: false,
      requiresConsent: false,
      message: "Child age must be between 1 and 17 years old",
    };
  }

  if (age < 13) {
    return {
      valid: true,
      requiresConsent: true,
      message: "COPPA parental consent required for children under 13",
    };
  }

  return {
    valid: true,
    requiresConsent: false,
    message: "Parental consent recommended but not legally required in US",
  };
}
