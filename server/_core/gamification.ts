import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  readingActivity,
  readingStreaks,
  achievements,
  storyArcs,
  episodes,
} from "../../drizzle/schema";
import {
  ACHIEVEMENTS,
  POINTS_PER_ACTION,
  calculateLevel,
} from "../../constants/gamification";

export interface ChildProgressData {
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  unlockedAchievements: string[];
  recentActivity: Array<{
    type: string;
    points: number;
    date: Date;
  }>;
}

export interface UnlockedAchievement {
  key: string;
  name: string;
  icon: string;
  pointsReward: number;
}

// Record activity and award points
export async function recordActivity(
  userId: number,
  childId: number,
  activityType: string,
  episodeId?: number
): Promise<number> {
  let pointsEarned = 0;

  // Calculate points based on activity type
  switch (activityType) {
    case "story_completed":
      pointsEarned = POINTS_PER_ACTION.story_completed;
      break;
    case "episode_completed":
      pointsEarned = POINTS_PER_ACTION.episode_completed;
      break;
    case "page_read":
      pointsEarned = POINTS_PER_ACTION.page_read;
      break;
    case "bedtime_session":
      pointsEarned = POINTS_PER_ACTION.bedtime_session;
      break;
    case "streak_day":
      pointsEarned = POINTS_PER_ACTION.streak_day;
      break;
  }

  await db.insert(readingActivity).values({
    userId,
    childId,
    episodeId,
    activityType,
    pointsEarned,
  });

  return pointsEarned;
}

// Update reading streak
export async function updateStreak(
  userId: number,
  childId: number
): Promise<{ streakIncremented: boolean; currentStreak: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get or create streak record
  const existing = await db
    .select()
    .from(readingStreaks)
    .where(
      and(
        eq(readingStreaks.childId, childId),
        eq(readingStreaks.userId, userId)
      )
    )
    .limit(1);

  const streak = existing[0];

  if (!streak) {
    // First time reading
    await db.insert(readingStreaks).values({
      userId,
      childId,
      currentStreak: 1,
      longestStreak: 1,
      totalDaysRead: 1,
      lastReadDate: new Date(),
      streakStartDate: new Date(),
    });
    return { streakIncremented: true, currentStreak: 1 };
  }

  const lastRead = streak.lastReadDate ? new Date(streak.lastReadDate) : null;
  lastRead?.setHours(0, 0, 0, 0);

  // Check if already read today
  if (lastRead && lastRead.getTime() === today.getTime()) {
    return { streakIncremented: false, currentStreak: streak.currentStreak };
  }

  // Check if streak continues (yesterday) or resets
  if (lastRead && lastRead.getTime() === yesterday.getTime()) {
    // Streak continues
    const newStreak = streak.currentStreak + 1;
    const newLongest = Math.max(newStreak, streak.longestStreak);

    await db
      .update(readingStreaks)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastReadDate: new Date(),
        totalDaysRead: (streak.totalDaysRead || 0) + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(readingStreaks.childId, childId),
          eq(readingStreaks.userId, userId)
        )
      );

    return { streakIncremented: true, currentStreak: newStreak };
  } else {
    // Streak broken, reset
    await db
      .update(readingStreaks)
      .set({
        currentStreak: 1,
        lastReadDate: new Date(),
        streakStartDate: new Date(),
        totalDaysRead: (streak.totalDaysRead || 0) + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(readingStreaks.childId, childId),
          eq(readingStreaks.userId, userId)
        )
      );

    return { streakIncremented: true, currentStreak: 1 };
  }
}

// Check and unlock achievements
export async function checkAndUnlockAchievements(
  userId: number,
  childId: number
): Promise<UnlockedAchievement[]> {
  const newlyUnlocked: UnlockedAchievement[] = [];

  // Get current unlock status
  const existing = await db
    .select()
    .from(achievements)
    .where(
      and(eq(achievements.childId, childId), eq(achievements.userId, userId))
    );

  const unlockedKeys = new Set(existing.map((a) => a.achievementKey));

  // Get current stats
  const progress = await getChildProgress(userId, childId);

  // Count stories completed
  const storyCount = await db
    .select()
    .from(storyArcs)
    .where(
      and(eq(storyArcs.userId, userId), eq(storyArcs.childId, childId))
    );

  // Count completed episodes
  const episodeCount = await db
    .select()
    .from(episodes)
    .where(
      and(
        eq(episodes.isRead, true),
        inArray(
          episodes.storyArcId,
          storyCount.map((s) => s.id)
        )
      )
    );

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedKeys.has(achievement.key)) continue;

    let shouldUnlock = false;

    switch (achievement.key) {
      case "first_story":
        shouldUnlock = storyCount.length >= 1;
        break;
      case "bookworm_5":
        shouldUnlock = episodeCount.length >= 5;
        break;
      case "bookworm_25":
        shouldUnlock = episodeCount.length >= 25;
        break;
      case "bookworm_100":
        shouldUnlock = episodeCount.length >= 100;
        break;
      case "streak_3":
        shouldUnlock = progress.currentStreak >= 3;
        break;
      case "streak_7":
        shouldUnlock = progress.currentStreak >= 7;
        break;
      case "streak_30":
        shouldUnlock = progress.currentStreak >= 30;
        break;
      case "streak_100":
        shouldUnlock = progress.currentStreak >= 100;
        break;
      case "bedtime_first":
        shouldUnlock =
          (await db
            .select()
            .from(readingActivity)
            .where(
              and(
                eq(readingActivity.childId, childId),
                eq(readingActivity.userId, userId),
                eq(readingActivity.activityType, "bedtime_session")
              )
            )
            .limit(1)).length >= 1;
        break;
      case "bedtime_10":
        shouldUnlock =
          (await db
            .select()
            .from(readingActivity)
            .where(
              and(
                eq(readingActivity.childId, childId),
                eq(readingActivity.userId, userId),
                eq(readingActivity.activityType, "bedtime_session")
              )
            )).length >= 10;
        break;
      case "bedtime_50":
        shouldUnlock =
          (await db
            .select()
            .from(readingActivity)
            .where(
              and(
                eq(readingActivity.childId, childId),
                eq(readingActivity.userId, userId),
                eq(readingActivity.activityType, "bedtime_session")
              )
            )).length >= 50;
        break;
    }

    if (shouldUnlock) {
      await db.insert(achievements).values({
        userId,
        childId,
        achievementKey: achievement.key,
        progress: 0,
      });

      newlyUnlocked.push({
        key: achievement.key,
        name: achievement.name,
        icon: achievement.icon,
        pointsReward: achievement.pointsReward,
      });

      // Award bonus points
      await recordActivity(userId, childId, "achievement_unlocked");
    }
  }

  return newlyUnlocked;
}

// Get child progress summary
export async function getChildProgress(
  userId: number,
  childId: number
): Promise<ChildProgressData> {
  // Get streak data
  const streakData = await db
    .select()
    .from(readingStreaks)
    .where(
      and(
        eq(readingStreaks.childId, childId),
        eq(readingStreaks.userId, userId)
      )
    )
    .limit(1);

  const streak = streakData[0];

  // Get total points
  const activityData = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId)
      )
    );

  const totalPoints = activityData.reduce((sum, a) => sum + a.pointsEarned, 0);

  // Get unlocked achievements
  const unlockedAchievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.childId, childId),
        eq(achievements.userId, userId)
      )
    );

  // Calculate next level
  const level = calculateLevel(totalPoints);
  const nextLevelPoints = (function () {
    const { LEVEL_THRESHOLDS } = require("../../constants/gamification");
    if (level >= LEVEL_THRESHOLDS.length) {
      return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    }
    return LEVEL_THRESHOLDS[level] || 10000;
  })();

  // Get recent activity
  const recent = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId)
      )
    )
    .orderBy(desc(readingActivity.createdAt))
    .limit(5);

  return {
    currentStreak: streak?.currentStreak || 0,
    longestStreak: streak?.longestStreak || 0,
    totalDaysRead: streak?.totalDaysRead || 0,
    totalPoints,
    level,
    nextLevelPoints,
    unlockedAchievements: unlockedAchievements.map((a) => a.achievementKey),
    recentActivity: recent.map((a) => ({
      type: a.activityType,
      points: a.pointsEarned,
      date: a.createdAt || new Date(),
    })),
  };
}

// Get leaderboard for all children of a user
export async function getLeaderboard(
  userId: number
): Promise<
  Array<{
    childId: number;
    name: string;
    totalPoints: number;
    level: number;
    currentStreak: number;
  }>
> {
  // This would require joining with children table, but we'll return data structure
  return [];
}
