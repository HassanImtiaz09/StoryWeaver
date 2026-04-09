/**
 * Narrative Arc Manager - Manages multi-episode story continuity
 * Tracks story state, maintains episode context, and manages arc progression
 */

import { db } from "../db";
import { storyArcs, episodes, narrativeMilestones } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { cache, CACHE_CONFIG } from "./cache";
import { storyEngine } from "./storyEngine";

// ─── Narrative Phase System ────────────────────────────────────
// 5-phase arc mapped to episode ranges. For a 5-episode arc each episode
// gets one phase. For 7 episodes, some phases span two episodes.

export type NarrativePhase =
  | "introduction"
  | "rising_action"
  | "midpoint_escalation"
  | "climax_approach"
  | "resolution";

export const PHASE_ORDER: NarrativePhase[] = [
  "introduction",
  "rising_action",
  "midpoint_escalation",
  "climax_approach",
  "resolution",
];

export const PHASE_GOALS: Record<NarrativePhase, string[]> = {
  introduction: [
    "Introduce protagonist and setting",
    "Establish the story world rules",
    "Present the initial situation or problem",
    "Hook the reader with an intriguing element",
  ],
  rising_action: [
    "Introduce complications or obstacles",
    "Deepen character relationships",
    "Build tension and stakes",
    "Introduce or develop the antagonist/challenge",
  ],
  midpoint_escalation: [
    "Major turning point or revelation",
    "Raise the stakes significantly",
    "Character faces a difficult choice",
    "Shift in the story direction",
  ],
  climax_approach: [
    "Build to the climax",
    "All story threads converge",
    "Character demonstrates growth",
    "Highest tension point",
  ],
  resolution: [
    "Resolve the main conflict",
    "Show character transformation",
    "Tie up story threads",
    "End with emotional satisfaction and calm for bedtime",
  ],
};

/**
 * Determine which narrative phase an episode should be in based on
 * episode number and total episode count.
 */
export function getPhaseForEpisode(episodeNumber: number, totalEpisodes: number): NarrativePhase {
  if (totalEpisodes <= 5) {
    // 1:1 mapping — each episode = one phase
    const idx = Math.min(episodeNumber - 1, 4);
    return PHASE_ORDER[idx];
  }

  // For longer arcs (6-7 episodes), distribute phases:
  // Introduction: episode 1
  // Rising Action: episodes 2-3
  // Midpoint: episode 4 (or 3-4 for 7)
  // Climax Approach: episode 5-6 (or 5 for 6)
  // Resolution: final episode
  const ratio = (episodeNumber - 1) / (totalEpisodes - 1); // 0.0 to 1.0

  if (ratio <= 0.15) return "introduction";
  if (ratio <= 0.4) return "rising_action";
  if (ratio <= 0.6) return "midpoint_escalation";
  if (ratio <= 0.85) return "climax_approach";
  return "resolution";
}

/**
 * Create a milestone record when an episode is generated
 */
export async function createMilestone(
  arcId: number,
  episodeId: number,
  episodeNumber: number,
  totalEpisodes: number
): Promise<typeof narrativeMilestones.$inferSelect> {
  const phase = getPhaseForEpisode(episodeNumber, totalEpisodes);
  const goals = PHASE_GOALS[phase];

  const [milestone] = await db.insert(narrativeMilestones).values({
    arcId,
    episodeId,
    episodeNumber,
    narrativePhase: phase,
    phaseGoals: goals,
  }).$returningId();

  // Invalidate cache
  await cache.del(`arc_state:${arcId}`);
  await cache.del(`milestones:${arcId}`);

  const [created] = await db
    .select()
    .from(narrativeMilestones)
    .where(eq(narrativeMilestones.id, milestone.id))
    .limit(1);

  return created;
}

/**
 * Mark a milestone as completed and record what was achieved
 */
export async function completeMilestone(
  arcId: number,
  episodeNumber: number,
  outcome: {
    goalsAchieved: string[];
    charactersIntroduced?: string[];
    plotPointsResolved?: string[];
    cliffhanger?: string;
  }
): Promise<void> {
  await db
    .update(narrativeMilestones)
    .set({
      isCompleted: true,
      phaseOutcome: outcome,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(narrativeMilestones.arcId, arcId),
        eq(narrativeMilestones.episodeNumber, episodeNumber)
      )
    );

  await cache.del(`milestones:${arcId}`);
}

/**
 * Get all milestones for a story arc, useful for narrative continuity context
 */
export async function getArcMilestones(
  arcId: number
): Promise<Array<typeof narrativeMilestones.$inferSelect>> {
  const cacheKey = `milestones:${arcId}`;
  const cached = await cache.get<Array<typeof narrativeMilestones.$inferSelect>>(cacheKey);
  if (cached) return cached;

  const milestones = await db
    .select()
    .from(narrativeMilestones)
    .where(eq(narrativeMilestones.arcId, arcId))
    .orderBy(narrativeMilestones.episodeNumber);

  await cache.set(cacheKey, milestones, CACHE_CONFIG.storyTemplates.ttl);
  return milestones;
}

/**
 * Build narrative context string for prompt injection.
 * Includes completed milestones, current phase, and upcoming goals.
 */
export async function buildNarrativePhaseContext(
  arcId: number,
  episodeNumber: number,
  totalEpisodes: number
): Promise<string> {
  const milestones = await getArcMilestones(arcId);
  const currentPhase = getPhaseForEpisode(episodeNumber, totalEpisodes);
  const goals = PHASE_GOALS[currentPhase];

  const completedPhases = milestones
    .filter((m) => m.isCompleted && m.phaseOutcome)
    .map((m) => {
      const outcome = m.phaseOutcome as {
        goalsAchieved: string[];
        cliffhanger?: string;
      };
      return `Episode ${m.episodeNumber} (${m.narrativePhase}): ${outcome.goalsAchieved.join(", ")}${outcome.cliffhanger ? ` — Cliffhanger: ${outcome.cliffhanger}` : ""}`;
    });

  let context = `\n=== NARRATIVE PHASE TRACKING ===\n`;
  context += `Current Phase: ${currentPhase.replace(/_/g, " ").toUpperCase()} (Episode ${episodeNumber}/${totalEpisodes})\n`;
  context += `Phase Goals:\n${goals.map((g) => `  - ${g}`).join("\n")}\n`;

  if (completedPhases.length > 0) {
    context += `\nCompleted Phases:\n${completedPhases.map((p) => `  ${p}`).join("\n")}\n`;
  }

  // Add upcoming phase preview for continuity
  if (episodeNumber < totalEpisodes) {
    const nextPhase = getPhaseForEpisode(episodeNumber + 1, totalEpisodes);
    context += `\nNext Phase: ${nextPhase.replace(/_/g, " ")} — prepare a transition that leads naturally into this.\n`;
  }

  context += `=== END NARRATIVE PHASE ===\n`;

  return context;
}

/**
 * Story arc state tracking
 */
export interface ArcState {
  arcId: number;
  currentEpisode: number;
  totalEpisodes: number;
  completedEpisodes: string[]; // episode titles
  nextEpisodeSetup?: string;
}

/**
 * Episode context for narrative continuity
 */
export interface EpisodeContext {
  episodeNumber: number;
  previousEpisodes: Array<{
    title: string;
    summary: string;
  }>;
  nextEpisodeHints?: string[];
}

/**
 * Get the current state of a story arc
 */
export async function getArcState(arcId: number): Promise<ArcState> {
  const cacheKey = `arc_state:${arcId}`;

  // Try cache first
  const cached = await cache.get<ArcState>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, arcId)).limit(1);

  if (!arc) {
    throw new Error(`Story arc ${arcId} not found`);
  }

  const episodeList = await db
    .select()
    .from(episodes)
    .where(eq(episodes.storyArcId, arcId));

  const state: ArcState = {
    arcId: arc.id,
    currentEpisode: episodeList.length + 1,
    totalEpisodes: arc.totalEpisodes ?? 5,
    completedEpisodes: episodeList.map((e) => e.title).filter((t): t is string => t !== null),
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, state, CACHE_CONFIG.storyTemplates.ttl);

  return state;
}

/**
 * Get context for generating the next episode in an arc
 */
export async function getEpisodeContext(
  arcId: number,
  episodeNumber: number,
  /** Pass an already-fetched arc to avoid a duplicate DB query. */
  preloadedArc?: { theme: string; title: string | null; synopsis: string | null; totalEpisodes: number; educationalValue: string | null }
): Promise<EpisodeContext> {
  const cacheKey = `episode_context:${arcId}:${episodeNumber}`;

  // Try cache
  const cached = await cache.get<EpisodeContext>(cacheKey);
  if (cached) {
    return cached;
  }

  // Use preloaded arc if provided, otherwise fetch from DB
  const arc = preloadedArc ?? (await db.select().from(storyArcs).where(eq(storyArcs.id, arcId)).limit(1))[0];

  if (!arc) {
    throw new Error(`Story arc ${arcId} not found`);
  }

  const previousEpisodeList = await db
    .select()
    .from(episodes)
    .where(and(eq(episodes.storyArcId, arcId)))
    .orderBy((t) => t.id);

  const previousEpisodes = previousEpisodeList
    .filter((e) => e.episodeNumber < episodeNumber)
    .map((e) => ({
      title: e.title ?? "",
      summary: e.summary ?? "",
    }));

  const context: EpisodeContext = {
    episodeNumber,
    previousEpisodes,
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, context, CACHE_CONFIG.storyTemplates.ttl);

  return context;
}

/**
 * Mark an episode as complete and update arc state
 */
export async function updateArcProgress(arcId: number, episodeId: number): Promise<ArcState> {
  // Invalidate relevant caches
  await cache.del(`arc_state:${arcId}`);
  await cache.del(`episode_context:${arcId}:*`);

  // Arc state will be recalculated on next access
  return getArcState(arcId);
}

/**
 * Generate a "Previously on..." recap for returning readers
 */
export async function generateRecap(arcId: number): Promise<string> {
  const cacheKey = `recap:${arcId}`;

  // Try cache
  const cached = await cache.get<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, arcId)).limit(1);

  if (!arc) {
    throw new Error(`Story arc ${arcId} not found`);
  }

  const episodeList = await db
    .select()
    .from(episodes)
    .where(eq(episodes.storyArcId, arcId))
    .orderBy((t) => t.episodeNumber);

  if (episodeList.length === 0) {
    return "This is the beginning of the adventure...";
  }

  // Build recap from last 2-3 episodes
  const recentEpisodes = episodeList.slice(Math.max(0, episodeList.length - 3));
  const recap = `Previously on "${arc.title}":\n\n${recentEpisodes.map((e) => `Episode ${e.episodeNumber}: ${e.summary}`).join("\n\n")}`;

  // Cache for 1 day
  await cache.set(cacheKey, recap, CACHE_CONFIG.storyTemplates.ttl);

  return recap;
}

/**
 * Suggest the next story arc based on reading history
 */
export async function suggestNextStoryArc(
  childId: number
): Promise<{
  theme: string;
  educationalValue: string;
  reasoning: string;
} | null> {
  const childArcs = await db
    .select()
    .from(storyArcs)
    .where(eq(storyArcs.childId, childId))
    .orderBy((t) => t.createdAt || new Date());

  if (childArcs.length === 0) {
    return null;
  }

  const lastArc = childArcs[childArcs.length - 1];
  const recentThemes = childArcs.map((a) => a.theme);
  const recentValues = childArcs.map((a) => a.educationalValue);

  // Simple heuristic: suggest a different theme and educational value
  const themes = [
    "Space Adventure",
    "Ocean Exploration",
    "Enchanted Forest",
    "Dinosaur World",
    "Pirate Voyage",
    "Robot Friends",
    "Fairy Kingdom",
    "Safari Journey",
    "Arctic Expedition",
    "Medieval Quest",
    "Jungle Trek",
    "Candy Land",
    "Musical Adventure",
    "Secret Garden",
  ];

  const values = [
    "Kindness",
    "Bravery",
    "Sharing",
    "Honesty",
    "Curiosity",
    "Friendship",
    "Patience",
    "Empathy",
    "Resilience",
    "Gratitude",
    "Teamwork",
    "Creativity",
    "Respect",
    "Responsibility",
    "Perseverance",
    "Generosity",
  ];

  // Find themes/values not recently used
  const unusedThemes = themes.filter((t) => !recentThemes.includes(t));
  const unusedValues = values.filter((v) => !recentValues.includes(v));

  const suggestedTheme =
    unusedThemes.length > 0
      ? unusedThemes[Math.floor(Math.random() * unusedThemes.length)]
      : themes[Math.floor(Math.random() * themes.length)];

  const suggestedValue =
    unusedValues.length > 0
      ? unusedValues[Math.floor(Math.random() * unusedValues.length)]
      : values[Math.floor(Math.random() * values.length)];

  return {
    theme: suggestedTheme,
    educationalValue: suggestedValue,
    reasoning: `Based on your interest in ${lastArc.theme} and focus on ${lastArc.educationalValue}, try a new adventure!`,
  };
}

/**
 * Plan entire narrative arc with episode outlines
 */
export async function planNarrativeArc(
  theme: string,
  childAge: number,
  numEpisodes: number,
  childName: string,
  interests: string[]
): Promise<{
  title: string;
  synopsis: string;
  episodeOutlines: Array<{
    episodeNumber: number;
    title: string;
    summary: string;
  }>;
}> {
  const cacheKey = `narrative_plan:${theme}:${childAge}:${numEpisodes}`;

  // Try cache first
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate plan using story engine
  const plan = await storyEngine.generateStoryArc(
    {
      child: {
        name: childName,
        age: childAge,
        interests,
      },
      theme,
    },
    numEpisodes
  );

  // Cache for 7 days
  await cache.set(cacheKey, plan, CACHE_CONFIG.storyTemplates.ttl);

  return plan;
}
