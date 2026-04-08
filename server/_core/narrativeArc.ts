/**
 * Narrative Arc Manager - Manages multi-episode story continuity
 * Tracks story state, maintains episode context, and manages arc progression
 */

import { db } from "../db";
import { storyArcs, episodes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { cache, CACHE_CONFIG } from "./cache";
import { storyEngine } from "./storyEngine";

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
    completedEpisodes: episodeList.map((e) => e.title),
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
  episodeNumber: number
): Promise<EpisodeContext> {
  const cacheKey = `episode_context:${arcId}:${episodeNumber}`;

  // Try cache
  const cached = await cache.get<EpisodeContext>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch arc and all previous episodes
  const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.id, arcId)).limit(1);

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
      title: e.title,
      summary: e.summary,
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
