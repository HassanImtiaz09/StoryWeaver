import {
  getReadingSummary,
  getVocabularyGrowth,
  getMilestones,
  getThemeBreakdown,
  getWeeklyReport,
} from "./analyticsService";
import { db } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  storyArcs,
  readingActivity,
  vocabularyBank,
  achievements,
} from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────

export interface WeeklyDigest {
  childName: string;
  weekStart: string;
  weekEnd: string;
  summary: {
    totalReadingTime: number;
    storiesRead: number;
    newWordsLearned: number;
    bestDay: string;
    currentStreak: number;
  };
  highlights: {
    title: string;
    description: string;
    emoji: string;
  }[];
  achievements: {
    title: string;
    icon: string;
    unlockedDate: Date;
  }[];
  favoriteTheme: string | null;
  newWords: string[];
  recommendations: string[];
}

export interface MonthlyReport {
  childName: string;
  month: string; // YYYY-MM
  summary: {
    totalReadingTime: number;
    totalStoriesRead: number;
    totalWordsLearned: number;
    averageReadingTimePerDay: number;
    longestStreak: number;
  };
  weeklyBreakdown: Array<{
    week: number;
    readingTime: number;
    storiesRead: number;
  }>;
  topThemes: Array<{
    theme: string;
    count: number;
  }>;
  achievements: Array<{
    title: string;
    icon: string;
    unlockedDate: Date;
  }>;
  progressReport: {
    readingLevelGrowth: string | null;
    vocabularyGrowth: number;
    engagementTrend: "improving" | "stable" | "declining";
  };
  recommendations: string[];
}

export interface ProgressReport {
  childName: string;
  dateRange: {
    start: string;
    end: string;
  };
  keyMetrics: {
    totalReadingTime: number;
    storiesCompleted: number;
    pagesRead: number;
    uniqueThemes: number;
    wordsLearned: number;
  };
  progressMetrics: {
    readingConsistency: number; // percentage of days with reading
    averageSessionDuration: number;
    storyCompletionRate: number; // percentage of started stories completed
    themeExploration: number; // percentage of available themes read
  };
  achievements: Array<{
    title: string;
    category: string;
    icon: string;
    unlockedDate: Date;
  }>;
  narrativeInsights: string[];
  recommendations: string[];
}

// ─── Main Report Functions ────────────────────────────────────

export async function generateWeeklyDigest(
  childId: number,
  userId: number,
  childName: string
): Promise<WeeklyDigest> {
  const weeklyReport = await getWeeklyReport(childId, userId);
  const summary = await getReadingSummary(childId, userId, "week");

  // Get achievements unlocked this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const unlockedAchievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.childId, childId),
        eq(achievements.userId, userId),
        gte(achievements.unlockedAt, weekStart)
      )
    );

  const achievementList = unlockedAchievements.map((a) => {
    const ACHIEVEMENTS = require("../../constants/gamification").ACHIEVEMENTS;
    const def = ACHIEVEMENTS.find((x: any) => x.key === a.achievementKey);
    return {
      title: def?.name || a.achievementKey,
      icon: def?.icon || "⭐",
      unlockedDate: a.unlockedAt || new Date(),
    };
  });

  // Build highlights
  const highlights = [];

  if (weeklyReport.bestDay.minutes > 0) {
    highlights.push({
      title: "Best Reading Day",
      description: `You read the most on ${weeklyReport.bestDay.day} with ${weeklyReport.bestDay.minutes} minutes!`,
      emoji: "🌟",
    });
  }

  if (summary.currentStreak > 0) {
    highlights.push({
      title: "Current Streak",
      description: `You've been reading ${summary.currentStreak} days in a row. Keep it up!`,
      emoji: "🔥",
    });
  }

  if (weeklyReport.storiesRead > 0) {
    highlights.push({
      title: "Stories Completed",
      description: `You completed ${weeklyReport.storiesRead} ${weeklyReport.storiesRead === 1 ? "story" : "stories"} this week!`,
      emoji: "📖",
    });
  }

  if (weeklyReport.newWords.length > 0) {
    highlights.push({
      title: "New Vocabulary",
      description: `You learned ${weeklyReport.newWords.length} new words this week`,
      emoji: "📚",
    });
  }

  return {
    childName,
    weekStart: weeklyReport.weekStart,
    weekEnd: weeklyReport.weekEnd,
    summary: {
      totalReadingTime: weeklyReport.totalReadingTime,
      storiesRead: weeklyReport.storiesRead,
      newWordsLearned: weeklyReport.newWords.length,
      bestDay: weeklyReport.bestDay.day,
      currentStreak: summary.currentStreak,
    },
    highlights: highlights.slice(0, 4),
    achievements: achievementList,
    favoriteTheme: weeklyReport.mostReadTheme,
    newWords: weeklyReport.newWords,
    recommendations: weeklyReport.recommendations,
  };
}

export async function generateMonthlyReport(
  childId: number,
  userId: number,
  childName: string
): Promise<MonthlyReport> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthLabel = monthStart.toISOString().substring(0, 7);

  const summary = await getReadingSummary(childId, userId, "month");
  const themes = await getThemeBreakdown(childId, userId);

  // Get all activities for this month
  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId),
        gte(readingActivity.createdAt, monthStart),
        lte(readingActivity.createdAt, monthEnd)
      )
    );

  // Calculate weekly breakdown
  const weeklyBreakdown = [];
  for (let week = 0; week < 5; week++) {
    const weekStart = new Date(monthStart);
    weekStart.setDate(monthStart.getDate() + week * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    if (weekStart.getMonth() !== monthStart.getMonth()) break;

    const weekActivities = activities.filter(
      (a) =>
        a.createdAt &&
        a.createdAt >= weekStart &&
        a.createdAt <= weekEnd
    );

    const readingTime = weekActivities.filter(
      (a) => a.activityType === "page_read"
    ).length * 2;
    const storiesRead = weekActivities.filter(
      (a) => a.activityType === "story_completed"
    ).length;

    weeklyBreakdown.push({
      week: week + 1,
      readingTime,
      storiesRead,
    });
  }

  // Get achievements for this month
  const monthAchievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.childId, childId),
        eq(achievements.userId, userId),
        gte(achievements.unlockedAt, monthStart),
        lte(achievements.unlockedAt, monthEnd)
      )
    );

  const achievementList = monthAchievements.map((a) => {
    const ACHIEVEMENTS = require("../../constants/gamification").ACHIEVEMENTS;
    const def = ACHIEVEMENTS.find((x: any) => x.key === a.achievementKey);
    return {
      title: def?.name || a.achievementKey,
      icon: def?.icon || "⭐",
      unlockedDate: a.unlockedAt || new Date(),
    };
  });

  // Get vocabulary growth
  const vocabGrowth = await getVocabularyGrowth(childId, userId, 30);
  const totalNewWords = vocabGrowth.reduce((sum, v) => sum + v.wordsLearned, 0);

  const daysInMonth = monthEnd.getDate();
  const daysWithReading = new Set(
    activities.map((a) => a.createdAt?.toDateString())
  ).size;

  const recommendations = generateMonthlyRecommendations(
    summary,
    themes,
    daysWithReading,
    daysInMonth
  );

  return {
    childName,
    month: monthLabel,
    summary: {
      totalReadingTime: summary.totalReadingTime,
      totalStoriesRead: summary.storiesCompleted,
      totalWordsLearned: totalNewWords,
      averageReadingTimePerDay:
        daysWithReading > 0 ? Math.round(summary.totalReadingTime / daysWithReading) : 0,
      longestStreak: summary.longestStreak,
    },
    weeklyBreakdown,
    topThemes: themes.slice(0, 5),
    achievements: achievementList,
    progressReport: {
      readingLevelGrowth: summary.readingLevelProgress.current,
      vocabularyGrowth: totalNewWords,
      engagementTrend: getEngagementTrend(weeklyBreakdown),
    },
    recommendations,
  };
}

export async function generateProgressReport(
  childId: number,
  userId: number,
  childName: string,
  startDate: Date,
  endDate: Date
): Promise<ProgressReport> {
  // Get activities in date range
  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId),
        gte(readingActivity.createdAt, startDate),
        lte(readingActivity.createdAt, endDate)
      )
    );

  const stories = await db
    .select()
    .from(storyArcs)
    .where(
      and(
        eq(storyArcs.childId, childId),
        eq(storyArcs.userId, userId)
      )
    );

  const achievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.childId, childId),
        eq(achievements.userId, userId),
        gte(achievements.unlockedAt, startDate),
        lte(achievements.unlockedAt, endDate)
      )
    );

  // Calculate metrics
  const pagesRead = activities.filter(
    (a) => a.activityType === "page_read"
  ).length;
  const storiesCompleted = activities.filter(
    (a) => a.activityType === "story_completed"
  ).length;
  const totalReadingTime = pagesRead * 2;

  const themes = await getThemeBreakdown(childId, userId);
  const uniqueThemes = themes.length;

  const vocabGrowth = await getVocabularyGrowth(childId, userId);
  const totalWordsLearned = vocabGrowth[vocabGrowth.length - 1]?.totalWords || 0;

  // Calculate progress metrics
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysWithReading = new Set(
    activities.map((a) => a.createdAt?.toDateString())
  ).size;
  const readingConsistency =
    totalDays > 0 ? Math.round((daysWithReading / totalDays) * 100) : 0;

  const sessionCount = new Set(
    activities.map((a) => a.createdAt?.toISOString().substring(0, 10))
  ).size;
  const averageSessionDuration =
    sessionCount > 0 ? Math.round(totalReadingTime / sessionCount) : 0;

  const achievementList = achievements.map((a) => {
    const ACHIEVEMENTS = require("../../constants/gamification").ACHIEVEMENTS;
    const def = ACHIEVEMENTS.find((x: any) => x.key === a.achievementKey);
    return {
      title: def?.name || a.achievementKey,
      category: def?.category || "general",
      icon: def?.icon || "⭐",
      unlockedDate: a.unlockedAt || new Date(),
    };
  });

  const narrativeInsights = generateNarrativeInsights(
    storiesCompleted,
    totalReadingTime,
    daysWithReading,
    totalWordsLearned,
    readingConsistency
  );

  const recommendations = generateCustomRecommendations(
    readingConsistency,
    totalWordsLearned,
    uniqueThemes,
    storiesCompleted
  );

  return {
    childName,
    dateRange: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    keyMetrics: {
      totalReadingTime,
      storiesCompleted,
      pagesRead,
      uniqueThemes,
      wordsLearned: totalWordsLearned,
    },
    progressMetrics: {
      readingConsistency,
      averageSessionDuration,
      storyCompletionRate:
        stories.length > 0
          ? Math.round((storiesCompleted / stories.length) * 100)
          : 0,
      themeExploration: Math.round((uniqueThemes / 10) * 100),
    },
    achievements: achievementList,
    narrativeInsights,
    recommendations,
  };
}

// ─── Helper Functions ──────────────────────────────────────────

function getEngagementTrend(
  weeklyBreakdown: Array<{ week: number; readingTime: number }>
): "improving" | "stable" | "declining" {
  if (weeklyBreakdown.length < 2) return "stable";

  const firstHalf = weeklyBreakdown
    .slice(0, Math.ceil(weeklyBreakdown.length / 2))
    .reduce((sum, w) => sum + w.readingTime, 0);
  const secondHalf = weeklyBreakdown
    .slice(Math.ceil(weeklyBreakdown.length / 2))
    .reduce((sum, w) => sum + w.readingTime, 0);

  const change = secondHalf - firstHalf;

  if (change > firstHalf * 0.1) return "improving";
  if (change < -firstHalf * 0.1) return "declining";
  return "stable";
}

function generateMonthlyRecommendations(
  summary: any,
  themes: any[],
  daysWithReading: number,
  daysInMonth: number
): string[] {
  const recommendations: string[] = [];

  const consistency = (daysWithReading / daysInMonth) * 100;

  if (consistency < 30) {
    recommendations.push(
      "Try to establish a consistent reading routine. Even 10 minutes daily makes a big difference!"
    );
  } else if (consistency < 50) {
    recommendations.push(
      "Great effort! Aim for reading at least half the days in the month."
    );
  } else {
    recommendations.push(
      "Excellent consistency! You're building a strong reading habit."
    );
  }

  if (summary.storiesCompleted >= 10) {
    recommendations.push(
      "You're a reading champion! Consider exploring new genres or challenging yourself with longer stories."
    );
  } else if (summary.storiesCompleted >= 5) {
    recommendations.push(
      "You're making great progress! Keep reading regularly to reach new milestones."
    );
  }

  if (themes.length < 3) {
    recommendations.push(
      "Try reading stories in different themes to expand your horizons!"
    );
  }

  return recommendations;
}

function generateNarrativeInsights(
  storiesCompleted: number,
  totalReadingTime: number,
  daysWithReading: number,
  wordsLearned: number,
  readingConsistency: number
): string[] {
  const insights: string[] = [];

  if (storiesCompleted > 0) {
    insights.push(
      `Your child completed ${storiesCompleted} ${storiesCompleted === 1 ? "story" : "stories"} during this period.`
    );
  }

  if (totalReadingTime > 0) {
    const hours = Math.floor(totalReadingTime / 60);
    const minutes = totalReadingTime % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    insights.push(`Total reading time: ${timeStr}`);
  }

  if (readingConsistency > 50) {
    insights.push(
      "Your child shows strong reading consistency with a healthy engagement pattern."
    );
  }

  if (wordsLearned > 0) {
    insights.push(`Your child learned ${wordsLearned} new vocabulary words.`);
  }

  return insights;
}

function generateCustomRecommendations(
  readingConsistency: number,
  wordsLearned: number,
  uniqueThemes: number,
  storiesCompleted: number
): string[] {
  const recommendations: string[] = [];

  if (readingConsistency > 70) {
    recommendations.push(
      "Your child has an excellent reading habit. Consider rewarding their consistency!"
    );
  } else if (readingConsistency > 40) {
    recommendations.push(
      "Keep encouraging regular reading sessions to boost engagement."
    );
  } else {
    recommendations.push(
      "Try setting a daily reading goal to build a consistent routine."
    );
  }

  if (wordsLearned > 50) {
    recommendations.push(
      "Your child is expanding their vocabulary wonderfully. Consider bilingual stories to enhance language learning."
    );
  }

  if (uniqueThemes < 3) {
    recommendations.push("Encourage exploring different story themes!");
  }

  if (storiesCompleted > 15) {
    recommendations.push(
      "Your child is reading at an impressive pace. Challenge them with longer or more complex stories."
    );
  }

  return recommendations.slice(0, 3);
}
