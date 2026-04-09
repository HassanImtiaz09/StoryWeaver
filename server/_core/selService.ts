import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { selTemplates, selProgress, selResponses } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

type Competency =
  | "self_awareness"
  | "self_management"
  | "social_awareness"
  | "relationship_skills"
  | "responsible_decision_making";

const anthropic = new Anthropic();

// Built-in SEL template library
const BUILTIN_TEMPLATES: Array<{
  title: string;
  description: string;
  competency: Competency;
  ageRangeMin: number;
  ageRangeMax: number;
  difficulty: "gentle" | "moderate" | "challenging";
  promptTemplate: string;
  emotionalGoals: string[];
  iconEmoji: string;
}> = [
  // Self-Awareness (5 templates)
  {
    title: "The Feeling Detective",
    description:
      "A curious character learns to identify emotions by observing facial expressions and physical sensations.",
    competency: "self_awareness",
    ageRangeMin: 3,
    ageRangeMax: 7,
    difficulty: "gentle",
    promptTemplate:
      "Create a story about a young detective who solves mysteries by noticing how people feel. Include examples of sad faces, happy faces, and worried expressions. The character learns that everyone has feelings.",
    emotionalGoals: ["emotion recognition", "self-observation"],
    iconEmoji: "🔍",
  },
  {
    title: "Mirror Magic",
    description:
      "A child discovers self-reflection through a magical mirror that shows their true feelings.",
    competency: "self_awareness",
    ageRangeMin: 4,
    ageRangeMax: 8,
    difficulty: "gentle",
    promptTemplate:
      "Tell a story about a child who finds a magical mirror that reveals their real feelings inside. When they feel sad but smile, the mirror shows the sadness too. Teach accurate self-perception without judgment.",
    emotionalGoals: ["self-perception", "emotional honesty"],
    iconEmoji: "🪞",
  },
  {
    title: "My Emotion Weather",
    description:
      "Emotions are compared to weather patterns—sunny, rainy, stormy—helping children understand mood fluctuations.",
    competency: "self_awareness",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Create a story where a child's emotions are like weather: happy is sunny, sad is rainy, angry is stormy. Show how weather changes throughout the day and that all weather is normal. Include how to prepare for different emotional weather.",
    emotionalGoals: ["mood awareness", "emotional normalization"],
    iconEmoji: "🌤️",
  },
  {
    title: "Inside My Heart",
    description:
      "A character explores the layers of their emotions and what makes them unique.",
    competency: "self_awareness",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "moderate",
    promptTemplate:
      "Write a story about a child who opens their heart (metaphorically) and discovers all their feelings living there: joy, sadness, fear, excitement, and love. Each emotion has a voice and purpose. Celebrate emotional diversity.",
    emotionalGoals: ["emotional complexity", "self-acceptance"],
    iconEmoji: "💛",
  },
  {
    title: "The Color of Feelings",
    description:
      "Children learn to express emotions through colors and creative association.",
    competency: "self_awareness",
    ageRangeMin: 4,
    ageRangeMax: 8,
    difficulty: "gentle",
    promptTemplate:
      "Tell a story where each emotion has a color: red for excited/angry, blue for sad, yellow for happy, purple for calm. A child artist uses these colors to paint their feelings and learns what each color means.",
    emotionalGoals: ["emotion expression", "creative processing"],
    iconEmoji: "🎨",
  },

  // Self-Management (5 templates)
  {
    title: "The Patience Turtle",
    description:
      "A slow-moving turtle teaches the value of patience and waiting.",
    competency: "self_management",
    ageRangeMin: 3,
    ageRangeMax: 7,
    difficulty: "gentle",
    promptTemplate:
      "Create a story about a turtle who moves slowly but always reaches their destination. A fast rabbit learns that patience and steady effort matter more than rushing. Show how patience helps solve problems.",
    emotionalGoals: ["impulse control", "patience"],
    iconEmoji: "🐢",
  },
  {
    title: "Breathing with Bear",
    description:
      "A friendly bear teaches calming breathing techniques through a soothing story.",
    competency: "self_management",
    ageRangeMin: 4,
    ageRangeMax: 8,
    difficulty: "gentle",
    promptTemplate:
      "Write a story where a peaceful bear teaches a worried child to breathe slowly. Use rhythmic language: 'In through the nose, out through the mouth.' Show how breathing calms the body and mind.",
    emotionalGoals: ["stress management", "coping skills"],
    iconEmoji: "🐻",
  },
  {
    title: "When I Feel Angry",
    description:
      "A character navigates anger with healthy coping strategies and emotional expression.",
    competency: "self_management",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Create a story about a child who feels very angry but learns healthy ways to express it: running, drawing, talking, or taking space. Show that anger is okay, but how we act matters. Include regret and repair.",
    emotionalGoals: ["anger management", "emotional regulation"],
    iconEmoji: "🔥",
  },
  {
    title: "My Calm Down Plan",
    description:
      "A child creates a personalized toolkit of calming strategies.",
    competency: "self_management",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "moderate",
    promptTemplate:
      "Tell a story about a child who makes a 'calm down plan' with different strategies: a sensory toolkit with soft textures, favorite songs, safe places, and trusted people. When upset, they use their plan successfully.",
    emotionalGoals: ["self-soothing", "planning"],
    iconEmoji: "🧘",
  },
  {
    title: "The Worry Monster",
    description:
      "A child befriends and tames the worry monster with rational thinking.",
    competency: "self_management",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Write a story about a Worry Monster who lives in a child's mind and says scary things. The child learns that worries are just thoughts, not facts. By challenging worries with facts, the monster becomes smaller and less scary.",
    emotionalGoals: ["anxiety management", "cognitive reframing"],
    iconEmoji: "👹",
  },

  // Social Awareness (5 templates)
  {
    title: "Walking in Their Shoes",
    description:
      "A character learns empathy by experiencing life from different perspectives.",
    competency: "social_awareness",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Create a story where a child literally or metaphorically walks in someone else's shoes and understands their feelings. Show how the same situation feels different to different people. Teach perspective-taking.",
    emotionalGoals: ["empathy", "perspective-taking"],
    iconEmoji: "👟",
  },
  {
    title: "The Kindness Chain",
    description:
      "Small acts of kindness create a ripple effect of positive change.",
    competency: "social_awareness",
    ageRangeMin: 4,
    ageRangeMax: 8,
    difficulty: "gentle",
    promptTemplate:
      "Tell a story about one act of kindness that spreads to others. A child helps a sad friend, who then helps someone else, creating a chain reaction. Show how kindness makes a real difference.",
    emotionalGoals: ["kindness", "social impact"],
    iconEmoji: "🔗",
  },
  {
    title: "Different is Beautiful",
    description:
      "A child learns to appreciate diversity and respect differences.",
    competency: "social_awareness",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Create a story with characters of different abilities, appearances, and backgrounds. Show how differences make the community richer. A child learns that 'different' is not 'bad'—it's interesting and valuable.",
    emotionalGoals: ["diversity appreciation", "respect"],
    iconEmoji: "🌈",
  },
  {
    title: "The Listening Ear",
    description:
      "A character learns the power of truly listening to others.",
    competency: "social_awareness",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "moderate",
    promptTemplate:
      "Write a story about a child with big, wise ears who listens carefully to a friend's problem. By listening without interrupting, they help their friend feel heard and understood. Show how listening is a gift.",
    emotionalGoals: ["active listening", "compassion"],
    iconEmoji: "👂",
  },
  {
    title: "Understanding Others",
    description:
      "A child learns to recognize and validate others' emotions.",
    competency: "social_awareness",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Tell a story where a child notices a peer is upset and asks why. By listening and validating their feelings, they help. Show phrases like 'That sounds hard' and 'Your feelings matter.' Teach emotional validation.",
    emotionalGoals: ["emotional validation", "social awareness"],
    iconEmoji: "💭",
  },

  // Relationship Skills (5 templates)
  {
    title: "Making Friends",
    description:
      "A shy character overcomes hesitation and builds meaningful friendships.",
    competency: "relationship_skills",
    ageRangeMin: 4,
    ageRangeMax: 8,
    difficulty: "gentle",
    promptTemplate:
      "Create a story about a shy child who wants to make friends but feels nervous. With encouragement, they say hello, share interests, and discover friendship. Show that everyone wants connection.",
    emotionalGoals: ["social courage", "friendship building"],
    iconEmoji: "👫",
  },
  {
    title: "The Sharing Circle",
    description:
      "Children learn cooperation and generosity through sharing.",
    competency: "relationship_skills",
    ageRangeMin: 3,
    ageRangeMax: 7,
    difficulty: "gentle",
    promptTemplate:
      "Tell a story about children in a circle sharing toys, snacks, and ideas. Show how sharing makes everyone happy. Include a child who struggles to share, learns it's safe, and enjoys the benefit.",
    emotionalGoals: ["cooperation", "generosity"],
    iconEmoji: "🤝",
  },
  {
    title: "Words That Help",
    description:
      "A character discovers how specific words can repair hurt and build connection.",
    competency: "relationship_skills",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Write a story where a child accidentally hurts a friend's feelings. They learn powerful words: 'I'm sorry,' 'I didn't mean to,' 'Can we still be friends?' Show how these words heal and reconnect.",
    emotionalGoals: ["communication", "repair"],
    iconEmoji: "💬",
  },
  {
    title: "Working Together",
    description:
      "A team discovers that collaboration accomplishes more than individual effort.",
    competency: "relationship_skills",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "moderate",
    promptTemplate:
      "Create a story where characters with different strengths work on a shared goal. One is strong, one is creative, one is organized. Together they succeed where alone they would fail. Celebrate teamwork.",
    emotionalGoals: ["teamwork", "complementary strengths"],
    iconEmoji: "🏗️",
  },
  {
    title: "Saying Sorry",
    description:
      "A child learns the steps of genuine apology and forgiveness.",
    competency: "relationship_skills",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Tell a story about a child who makes a mistake, feels remorse, and gives a real apology: acknowledge the wrong, explain why it was wrong, say sorry, make amends. Show forgiveness and moving forward.",
    emotionalGoals: ["accountability", "conflict resolution"],
    iconEmoji: "🕊️",
  },

  // Responsible Decision-Making (5 templates)
  {
    title: "Think Before You Act",
    description:
      "A character learns the power of pausing to make thoughtful choices.",
    competency: "responsible_decision_making",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Create a story where a child faces a choice: lie or tell the truth, hit back or walk away. They learn a strategy: STOP (Stop, Think, Observe, Pick). Show how thinking first leads to better choices.",
    emotionalGoals: ["impulse control", "decision-making"],
    iconEmoji: "🛑",
  },
  {
    title: "The Right Choice",
    description:
      "A character navigates moral dilemmas and learns ethical decision-making.",
    competency: "responsible_decision_making",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "challenging",
    promptTemplate:
      "Write a story with a moral dilemma: a child finds money, is invited to cheat, or must choose between fun and responsibility. Show internal struggle, values, and the satisfaction of the right choice even when hard.",
    emotionalGoals: ["ethics", "values-based decisions"],
    iconEmoji: "⚖️",
  },
  {
    title: "Consequences Trail",
    description:
      "A child learns that all choices have consequences, good or bad.",
    competency: "responsible_decision_making",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Tell a story that traces choices and consequences: a kind word leads to friendship, a mean word leads to hurt, helping leads to gratitude. Show the chain reaction of decisions.",
    emotionalGoals: ["consequence awareness", "cause-and-effect thinking"],
    iconEmoji: "⛓️",
  },
  {
    title: "Being Responsible",
    description:
      "A character learns to follow through on commitments and take ownership.",
    competency: "responsible_decision_making",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "moderate",
    promptTemplate:
      "Create a story about a child who makes a commitment to help with something, feels tempted to quit, but pushes through. Show how responsibility earns trust and respect. Include the good feeling of completion.",
    emotionalGoals: ["accountability", "commitment"],
    iconEmoji: "✅",
  },
  {
    title: "Problem Solver",
    description:
      "A character faces a challenge and works through steps to solve it.",
    competency: "responsible_decision_making",
    ageRangeMin: 5,
    ageRangeMax: 9,
    difficulty: "moderate",
    promptTemplate:
      "Write a story where a child faces a problem and uses steps: Identify the problem, brainstorm solutions, try one, evaluate if it worked, adjust or try another. Show resilience and problem-solving.",
    emotionalGoals: ["problem-solving", "resilience"],
    iconEmoji: "🔧",
  },
];

export async function getSelTemplates(
  competency?: Competency,
  ageRange?: { min: number; max: number }
) {
  try {
    let query = db.select().from(selTemplates);

    const results = await query;

    // Filter by competency if provided
    let filtered = results;
    if (competency) {
      filtered = filtered.filter((t) => t.competency === competency);
    }

    // Filter by age range if provided
    if (ageRange) {
      filtered = filtered.filter(
        (t) =>
          // @ts-expect-error - possibly null
          t.ageRangeMin <= ageRange.max && t.ageRangeMax >= ageRange.min
      );
    }

    return filtered;
  } catch (error) {
    console.error("Error fetching SEL templates:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch SEL templates",
    });
  }
}

export async function getSelCompetencies() {
  return [
    {
      id: "self_awareness",
      name: "Self-Awareness",
      description:
        "Recognizing and understanding one's own emotions, thoughts, strengths, and values",
      emoji: "🪞",
      color: "emerald",
    },
    {
      id: "self_management",
      name: "Self-Management",
      description:
        "Managing emotions, thoughts, and behaviors effectively to achieve goals and handle stress",
      emoji: "🧘",
      color: "blue",
    },
    {
      id: "social_awareness",
      name: "Social Awareness",
      description:
        "Understanding and empathizing with others' perspectives, feelings, and needs",
      emoji: "💭",
      color: "purple",
    },
    {
      id: "relationship_skills",
      name: "Relationship Skills",
      description:
        "Building and maintaining positive relationships through communication and cooperation",
      emoji: "🤝",
      color: "pink",
    },
    {
      id: "responsible_decision_making",
      name: "Responsible Decision-Making",
      description:
        "Making ethical and constructive choices by considering consequences and values",
      emoji: "⚖️",
      color: "amber",
    },
  ];
}

export async function generateSelStory(
  templateId: number,
  childId: number,
  childName: string,
  childAge: number,
  customization?: { theme?: string; characterName?: string }
) {
  try {
    // Get template
    const template = await db
      .select()
      .from(selTemplates)
      .where(eq(selTemplates.id, templateId))
      .then((results) => results[0]);

    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found",
      });
    }

    // Build prompt for Claude
    const systemPrompt = `You are a compassionate storyteller specializing in Social-Emotional Learning (SEL) for children.
Create an age-appropriate story that subtly teaches the ${template.competency.replace(/_/g, " ")} competency.

CRITICAL INSTRUCTIONS:
- Tell a narrative story, NOT a lesson. The emotional skill should emerge naturally through the characters' experiences.
- Use relatable situations that ${childAge}-year-olds face.
- Include dialogue that shows emotions and problem-solving.
- The story should be 3-5 paragraphs long.
- Use simple, engaging language appropriate for age ${childAge}.
- End with the character feeling better or having learned something through experience, not through being lectured.
- Make the story memorable and emotionally resonant.`;

    const userPrompt = `Create a story for ${childName} (age ${childAge}) based on this template:

Title: ${template.title}
Emotional Goals: ${template.emotionalGoals.join(", ")}
Template Prompt: ${template.promptTemplate}
${customization?.theme ? `Theme: ${customization.theme}` : ""}
${customization?.characterName ? `Main Character: ${customization.characterName}` : ""}

Remember: Make it a story, not a lesson. Let the child discover the emotional skill through the narrative.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const storyContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Record progress
    await db.insert(selProgress).values({
      childId,
      templateId,
      competency: template.competency,
    });

    return {
      id: `${templateId}-${Date.now()}`,
      templateId,
      title: template.title,
      competency: template.competency,
      emotionalGoals: template.emotionalGoals,
      content: storyContent,
      // @ts-expect-error - possibly null
      ageAppropriate: template.ageRangeMin <= childAge && childAge <= template.ageRangeMax,
    };
  } catch (error) {
    console.error("Error generating SEL story:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate story",
    });
  }
}

export async function assessEmotionalResponse(
  childId: number,
  templateId: number,
  emotionFelt: string,
  emotionIntensity: number,
  reflection?: string
) {
  try {
    const result = await db.insert(selResponses).values({
      childId,
      templateId,
      emotionFelt,
      emotionIntensity,
      reflection: reflection || null,
    });

    return {
      // @ts-expect-error - type mismatch from schema
      id: result.insertId,
      childId,
      templateId,
      emotionFelt,
      emotionIntensity,
      reflection,
    };
  } catch (error) {
    console.error("Error assessing emotional response:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save emotional response",
    });
  }
}

export async function getSelProgress(childId: number) {
  try {
    const progressRecords = await db
      .select()
      .from(selProgress)
      .where(eq(selProgress.childId, childId));

    // Count stories by competency
    const competencies = await getSelCompetencies();
    const progressByCompetency = competencies.map((comp) => {
      const count = progressRecords.filter(
        (p) => p.competency === comp.id
      ).length;
      return {
        competency: comp.id,
        name: comp.name,
        storiesRead: count,
        emoji: comp.emoji,
        color: comp.color,
      };
    });

    const totalStoriesRead = progressRecords.length;

    return {
      childId,
      totalStoriesRead,
      progressByCompetency,
      lastActivity: progressRecords[progressRecords.length - 1]?.completedAt,
    };
  } catch (error) {
    console.error("Error getting SEL progress:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get progress",
    });
  }
}

export async function getRecommendedTemplates(
  childId: number,
  childAge: number,
  childName: string
) {
  try {
    // Get child's progress
    const progressRecords = await db
      .select()
      .from(selProgress)
      .where(eq(selProgress.childId, childId));

    // Find which competencies have fewest stories
    const competencies = await getSelCompetencies();
    const competencyReadCounts = competencies.map((comp) => ({
      competency: comp.id,
      count: progressRecords.filter((p) => p.competency === comp.id).length,
    }));

    // Sort by least read first (areas for growth)
    competencyReadCounts.sort((a, b) => a.count - b.count);

    // Get templates from least-explored competencies
    const allTemplates = await getSelTemplates();
    const ageAppropriate = allTemplates.filter(
      // @ts-expect-error - possibly null
      (t) => t.ageRangeMin <= childAge && t.ageRangeMax >= childAge
    );

    const recommended = [];
    for (const { competency } of competencyReadCounts.slice(0, 3)) {
      const templatesForCompetency = ageAppropriate.filter(
        (t) => t.competency === competency
      );
      if (templatesForCompetency.length > 0) {
        // Pick a template not recently read
        const readTemplateIds = progressRecords.map((p) => p.templateId);
        const unreadTemplate = templatesForCompetency.find(
          (t) => !readTemplateIds.includes(t.id)
        );
        if (unreadTemplate) {
          recommended.push(unreadTemplate);
        }
      }
    }

    return recommended.slice(0, 5);
  } catch (error) {
    console.error("Error getting recommended templates:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get recommendations",
    });
  }
}

export async function createCustomSelTemplate(
  userId: number,
  template: {
    title: string;
    description: string;
    competency: Competency;
    ageRangeMin: number;
    ageRangeMax: number;
    difficulty: "gentle" | "moderate" | "challenging";
    promptTemplate: string;
    emotionalGoals: string[];
    iconEmoji: string;
  }
) {
  try {
    const result = await db.insert(selTemplates).values({
      ...template,
      isBuiltIn: false,
      createdByUserId: userId,
    });

    return {
      // @ts-expect-error - type mismatch from schema
      id: result.insertId,
      ...template,
      isBuiltIn: false,
      createdByUserId: userId,
    };
  } catch (error) {
    console.error("Error creating custom template:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create template",
    });
  }
}

export async function getSelInsights(childId: number) {
  try {
    // Get all responses
    const responses = await db
      .select()
      .from(selResponses)
      .where(eq(selResponses.childId, childId))
      .orderBy(desc(selResponses.createdAt));

    // Get progress
    const progress = await getSelProgress(childId);

    // Analyze emotions
    const emotionCounts: Record<string, number> = {};
    responses.forEach((r) => {
      emotionCounts[r.emotionFelt] = (emotionCounts[r.emotionFelt] || 0) + 1;
    });

    // Calculate average intensity
    const avgIntensity =
      responses.length > 0
        // @ts-expect-error - possibly null
        ? responses.reduce((sum, r) => sum + r.emotionIntensity, 0) /
          responses.length
        : 0;

    // Get last week's responses
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekResponses = responses.filter(
      (r) => new Date(r.createdAt) > oneWeekAgo
    );

    // Identify growth areas
    const mostRecentCompetencies = progress.progressByCompetency.filter(
      (p) => p.storiesRead > 0
    );
    const leastRecentCompetencies = progress.progressByCompetency.filter(
      (p) => p.storiesRead === 0
    );

    return {
      childId,
      totalStoriesRead: progress.totalStoriesRead,
      emotionFrequency: emotionCounts,
      averageEmotionalIntensity: Math.round(avgIntensity * 10) / 10,
      weeklyActivityCount: weekResponses.length,
      progressByCompetency: progress.progressByCompetency,
      areasOfGrowth: mostRecentCompetencies.map((c) => c.competency),
      areasToExplore: leastRecentCompetencies.map((c) => c.competency),
      recentResponses: responses.slice(0, 10),
    };
  } catch (error) {
    console.error("Error getting SEL insights:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get insights",
    });
  }
}

// Initialize built-in templates in database
export async function initializeBuiltinTemplates() {
  try {
    // Check if templates already exist
    const existing = await db
      .select()
      .from(selTemplates)
      .where(eq(selTemplates.isBuiltIn, true));

    if (existing.length === 0) {
      // Insert built-in templates
      for (const template of BUILTIN_TEMPLATES) {
        await db.insert(selTemplates).values({
          ...template,
          isBuiltIn: true,
        });
      }
      console.log("Built-in SEL templates initialized");
    }
  } catch (error) {
    console.error("Error initializing built-in templates:", error);
  }
}
