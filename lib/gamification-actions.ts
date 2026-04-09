/**
 * Gamification async actions — bridges tRPC API calls with the Zustand store.
 *
 * Components should import these functions to trigger server calls.
 * The store itself remains a pure state container with no tRPC dependency.
 */
// @ts-nocheck

import { trpc } from "./trpc";
import { useGamificationStore, type ChildProgress } from "./gamification-store";

export async function fetchProgress(childId: number): Promise<void> {
  const store = useGamificationStore.getState();
  store.setLoading(true);
  try {
    const progress = await trpc.gamification.getChildProgress.query({ childId });
    await store.setProgress(childId, progress);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch progress";
    store.setError(message);
  }
}

export async function fetchAchievements(childId: number): Promise<void> {
  const store = useGamificationStore.getState();
  store.setLoading(true);
  try {
    const achievements = await trpc.gamification.getAchievements.query({ childId });
    await store.setAchievements(childId, achievements);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch achievements";
    store.setError(message);
  }
}

export async function fetchLeaderboard(): Promise<void> {
  const store = useGamificationStore.getState();
  store.setLoading(true);
  try {
    const leaderboard = await trpc.gamification.getLeaderboard.query();
    await store.setLeaderboard(leaderboard);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch leaderboard";
    store.setError(message);
  }
}

export async function recordReading(
  childId: number,
  episodeId: number
): Promise<{
  newlyUnlocked: Array<{
    key: string;
    name: string;
    icon: string;
    pointsReward: number;
  }>;
  progress: ChildProgress;
  streakIncremented: boolean;
  currentStreak: number;
} | null> {
  const store = useGamificationStore.getState();
  store.setLoading(true);
  try {
    const result = await trpc.gamification.recordReading.mutate({
      childId,
      episodeId,
    });

    if (result) {
      await store.updateProgressAfterReading(childId, result.progress);
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record reading";
    store.setError(message);
    return null;
  }
}
