/**
 * Story Engine Bridge - Backwards compatibility layer
 * Maps old claudeStoryEngine functions to new StoryEngine
 * This allows existing code to work with the new architecture
 */

import { storyEngine, type StoryContext } from "./storyEngine";
import type { ChildProfile, StoryArcContext, GeneratedEpisode } from "./claudeStoryEngine";

/**
 * Convert old ChildProfile to new StoryContext child
 */
function toStoryContextChild(
  child: ChildProfile
): StoryContext["child"] {
  return {
    name: child.nickname ?? child.name,
    age: child.age,
    interests: child.interests ?? [],
    personality: child.personalityTraits?.join(", "),
    fears: child.fears,
  };
}

/**
 * Convert new GeneratedEpisode to old format
 */
function toOldEpisodeFormat(
  newEpisode: any
): any {
  return {
    title: newEpisode.title,
    summary: newEpisode.summary,
    characters: newEpisode.characters ?? [],
    pages: (newEpisode.pages ?? []).map((p: any, i: number) => ({
      text: p.text,
      imagePrompt: p.imagePrompt,
      mood: p.mood ?? "neutral",
      sceneDescription: p.text.substring(0, 100),
      soundEffectHint: "ambient sounds",
    })),
    musicMood: newEpisode.musicMood ?? "whimsical",
    estimatedReadTimeMinutes: newEpisode.estimatedReadTimeMinutes ?? 5,
  };
}

/**
 * Bridge function: generateEpisodeWithClaude -> storyEngine.generateEpisode
 * For backwards compatibility with existing code
 */
export async function generateEpisodeWithClaudeBridge(
  child: ChildProfile,
  arc: StoryArcContext,
  episodeNumber: number
): Promise<any> {
  const context: StoryContext = {
    child: toStoryContextChild(child),
    theme: arc.theme,
    storyArc: {
      title: arc.title,
      totalEpisodes: arc.totalEpisodes,
      currentEpisode: arc.currentEpisode,
    },
    previousEpisodes: arc.previousEpisodeSummary
      ? [
          {
            title: "Previous Episode",
            summary: arc.previousEpisodeSummary,
          },
        ]
      : [],
  };

  const newEpisode = await storyEngine.generateEpisode(context);
  return toOldEpisodeFormat(newEpisode);
}

/**
 * Bridge function for story arc generation
 */
export async function generateStoryArcWithClaudeBridge(
  child: ChildProfile,
  theme: string,
  educationalValue: string,
  totalEpisodes: number
): Promise<{ title: string; synopsis: string }> {
  const context: Omit<StoryContext, "customElements" | "previousEpisodes"> = {
    child: toStoryContextChild(child),
    theme,
  };

  const plan = await storyEngine.generateStoryArc(context, totalEpisodes);

  return {
    title: plan.title,
    synopsis: plan.synopsis,
  };
}
