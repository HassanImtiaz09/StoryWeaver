import {
  eq,
  and,
  desc,
  gte,
  lte,
  sql,
  inArray,
  countDistinct,
} from "drizzle-orm";
import { db } from "../db";
import {
  readingActivity,
  readingStreaks,
  achievements,
  storyArcs,
  episodes,
  children,
  vocabularyBank,
} from "../../drizzle/schema";
import { calculateLevel } from "../../constants/gamification";

// ─── Types ────────────────────────────────────────────────────

export interface ReadingSummary {
  totalReadingTime: number; // minutes
  storiesCompleted: number;
  episodesRead: number;
  pagesRead: number;
  averageSessionDuration: number; // minutes
  longestStreak: number;
  currentStreak: number;
  favoriteTheme: string | null;
  favoriteTimeOfDay: "morning" | "afternoon" | "evening" | "bedtime" | null;
  readingLevelProgress: {
    start: string | null;
    current: string | null;
  };
  engagementScore: number; // 0-100
  periodLabel: string;
}

export interface DailyReadingData {
  date: string; // YYYY-MM-DD
  minutes: number;
  storiesCompleted: number;
  sessionCount: number;
}

export interface ThemeBreakdownData {
  theme: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface VocabularyGrowthData {
  date: string; // YYYY-MM-DD
  wordsLearned: number;
  totalWords: number;
  complexity: number; // 1-5 scale
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  achievedDate: Date | null;
  progress: number; // 0-100
  category:
    | "reading"
    | "streak"
    | "vocabulary"
    | "exploration"
    | "collection";
}

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  minutes: number;
  intensity: number; // 0-4 scale
}

export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalReadingTime: number;
  bestDay: {
    day: string;
    minutes: number;
  };
  storiesRead: number;
  newWords: string[];
  achievements: string[];
  mostReadTheme: string | null;
  recommendations: string[];
}

export interface PeerComparison {
  percentile: number; // 0-100
  readingTimePercentile: number;
  storiesCompletedPercentile: number;
  engagementPercentile: number;
}

// ─── Main Analytics Functions ──────────────────────────────────

export async function getReadingSummary(
  childId: number,
  userId: number,
  period: "week" | "month" | "all" = "week"
): Promise<ReadingSummary> {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setDate(now.getDate() - 30);
      break;
    case "all":
      startDate.setFullYear(2000); // Far past
      break;
  }

  // Get reading activity data
  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId),
        gte(readingActivity.createdAt, startDate)
      )
    );

  // Estimate minutes: roughly 2 minutes per page read
  const totalReadingTime = activities.filter(
    (a) => a.activityType === "page_read"
  ).length * 2;

  const storiesCompleted = activities.filter(
    (a) => a.activityType === "story_completed"
  ).length;

  const episodesRead = activities.filter(
    (a) => a.activityType === "episode_completed"
  ).length;

  const pagesRead = activities.filter(
    (a) => a.activityType === "page_read"
  ).length;

  const sessionCount = new Set(
    activities.map((a) => a.createdAt?.toDateString())
  ).size;

  const averageSessionDuration =
    sessionCount > 0 ? Math.round(totalReadingTime / sessionCount) : 0;

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

  // Get favorite theme
  const storyData = await db
    .select()
    .from(storyArcs)
    .where(
      and(
        eq(storyArcs.childId, childId),
        eq(storyArcs.userId, userId)
      )
    );

  const themeCount: Record<string, number> = {};
  for (const story of storyData) {
    themeCount[story.theme] = (themeCount[story.theme] || 0) + 1;
  }

  const favoriteTheme =
    Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Get child's reading level
  const childData = await db
    .select()
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  const child = childData[0];

  // Calculate engagement score
  const engagementScore = calculateEngagementScore(
    totalReadingTime,
    streak?.currentStreak || 0,
    storiesCompleted,
    sessionCount
  );

  const periodLabel =
    period === "week"
      ? "this week"
      : period === "month"
        ? "this month"
        : "all time";

  return {
    totalReadingTime,
    storiesCompleted,
    episodesRead,
    pagesRead,
    averageSessionDuration,
    longestStreak: streak?.longestStreak || 0,
    currentStreak: streak?.currentStreak || 0,
    favoriteTheme,
    favoriteTimeOfDay: null, // Simplified for now
    readingLevelProgress: {
      start: child?.readingLevel || null,
      current: child?.readingLevel || null,
    },
    engagementScore,
    periodLabel,
  };
}

export async function getReadingTrends(
  childId: number,
  userId: number,
  days: number = 30
): Promise<DailyReadingData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId),
        gte(readingActivity.createdAt, startDate)
      )
    );

  const dailyData: Record<string, DailyReadingData> = {};

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    dailyData[dateStr] = {
      date: dateStr,
      minutes: 0,
      storiesCompleted: 0,
      sessionCount: 0,
    };
  }

  for (const activity of activities) {
    if (!activity.createdAt) continue;
    const dateStr = activity.createdAt.toISOString().split("T")[0];

    if (!dailyData[dateStr]) {
      dailyData[dateStr] = {
        date: dateStr,
        minutes: 0,
        storiesCompleted: 0,
        sessionCount: 0,
      };
    }

    if (activity.activityType === "page_read") {
      dailyData[dateStr].minutes += 2; // Estimate 2 min per page
    } else if (activity.activityType === "story_completed") {
      dailyData[dateStr].storiesCompleted += 1;
    }
  }

  // Count sessions per day
  const sessionsByDay: Record<string, Set<string>> = {};
  for (const activity of activities) {
    if (!activity.createdAt) continue;
    const dateStr = activity.createdAt.toISOString().split("T")[0];
    const timeStr = activity.createdAt.toISOString();

    if (!sessionsByDay[dateStr]) {
      sessionsByDay[dateStr] = new Set();
    }
    sessionsByDay[dateStr].add(timeStr.substring(0, 13)); // Group by hour
  }

  for (const [date, sessions] of Object.entries(sessionsByDay)) {
    if (dailyData[date]) {
      dailyData[date].sessionCount = sessions.size;
    }
  }

  return Object.values(dailyData).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export async function getThemeBreakdown(
  childId: number,
  userId: number
): Promise<ThemeBreakdownData[]> {
  const stories = await db
    .select()
    .from(storyArcs)
    .where(
      and(
        eq(storyArcs.childId, childId),
        eq(storyArcs.userId, userId)
      )
    );

  const themeCount: Record<string, number> = {};

  for (const story of stories) {
    themeCount[story.theme] = (themeCount[story.theme] || 0) + 1;
  }

  const total = Object.values(themeCount).reduce((a, b) => a + b, 0);

  const themes = Object.entries(themeCount)
    .map(([theme, count]) => ({
      theme,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: getThemeColor(theme),
    }))
    .sort((a, b) => b.count - a.count);

  return themes;
}

export async function getVocabularyGrowth(
  childId: number,
  userId: number,
  days: number = 90
): Promise<VocabularyGrowthData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get vocabulary entries grouped by date
  const vocabEntries = await db
    .select()
    .from(vocabularyBank)
    .where(
      and(
        eq(vocabularyBank.childId, childId),
        eq(vocabularyBank.userId, userId),
        gte(vocabularyBank.addedAt, startDate)
      )
    )
    .orderBy(vocabularyBank.addedAt);

  // Build timeline
  const dailyVocab: Record<string, number> = {};
  let cumulativeTotal = 0;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    dailyVocab[dateStr] = 0;
  }

  for (const vocab of vocabEntries) {
    if (!vocab.addedAt) continue;
    const dateStr = vocab.addedAt.toISOString().split("T")[0];
    if (dateStr in dailyVocab) {
      dailyVocab[dateStr]++;
    }
  }

  const result: VocabularyGrowthData[] = [];
  let total = 0;

  for (const [date, newWords] of Object.entries(dailyVocab)) {
    total += newWords;
    result.push({
      date,
      wordsLearned: newWords,
      totalWords: total,
      complexity: calculateVocabularyComplexity(vocabEntries, new Date(date)),
    });
  }

  return result;
}

export async function getReadingHeatmap(
  childId: number,
  userId: number,
  weeks: number = 12
): Promise<HeatmapData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId),
        gte(readingActivity.createdAt, startDate)
      )
    );

  const heatmapData: Record<string, number> = {};

  // Initialize all dates
  for (let i = weeks * 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    heatmapData[dateStr] = 0;
  }

  // Aggregate reading time
  for (const activity of activities) {
    if (!activity.createdAt) continue;
    const dateStr = activity.createdAt.toISOString().split("T")[0];

    if (activity.activityType === "page_read") {
      heatmapData[dateStr] = (heatmapData[dateStr] || 0) + 2;
    } else if (activity.activityType === "story_completed") {
      heatmapData[dateStr] = (heatmapData[dateStr] || 0) + 10;
    }
  }

  // Convert to heatmap format with intensity
  const maxMinutes = Math.max(...Object.values(heatmapData));
  const intensityThresholds = [
    0,
    maxMinutes * 0.25,
    maxMinutes * 0.5,
    maxMinutes * 0.75,
  ];

  return Object.entries(heatmapData).map(([date, minutes]) => ({
    date,
    minutes,
    intensity: calculateIntensity(minutes, intensityThresholds),
  }));
}

export async function getMilestones(
  childId: number,
  userId: number
): Promise<Milestone[]> {
  const progress = await getReadingSummary(childId, userId, "all");
  const achievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.childId, childId),
        eq(achievements.userId, userId)
      )
    );

  const achievedKeys = new Set(achievements.map((a) => a.achievementKey));

  const milestones: Milestone[] = [
    {
      id: "first_story",
      title: "First Story",
      description: "Complete your first story",
      icon: "📖",
      achievedDate: achievements.find((a) => a.achievementKey === "first_story")
        ?.unlockedAt || null,
      progress: progress.storiesCompleted > 0 ? 100 : 0,
      category: "reading",
    },
    {
      id: "stories_5",
      title: "5 Stories Read",
      description: "Complete 5 stories",
      icon: "📚",
      achievedDate: achievements.find((a) => a.achievementKey === "bookworm_5")
        ?.unlockedAt || null,
      progress: Math.min(100, (progress.storiesCompleted / 5) * 100),
      category: "reading",
    },
    {
      id: "stories_25",
      title: "25 Stories Read",
      description: "Complete 25 stories",
      icon: "🏆",
      achievedDate: achievements.find((a) => a.achievementKey === "bookworm_25")
        ?.unlockedAt || null,
      progress: Math.min(100, (progress.storiesCompleted / 25) * 100),
      category: "reading",
    },
    {
      id: "stories_100",
      title: "100 Stories Read",
      description: "Complete 100 stories",
      icon: "👑",
      achievedDate: achievements.find((a) => a.achievementKey === "bookworm_100")
        ?.unlockedAt || null,
      progress: Math.min(100, (progress.storiesCompleted / 100) * 100),
      category: "reading",
    },
    {
      id: "streak_3",
      title: "3-Day Streak",
      description: "Read 3 days in a row",
      icon: "🔥",
      achievedDate: achievements.find((a) => a.achievementKey === "streak_3")
        ?.unlockedAt || null,
      progress: Math.min(100, (progress.currentStreak / 3) * 100),
      category: "streak",
    },
    {
      id: "streak_7",
      title: "Week Warrior",
      description: "Read 7 days in a row",
      icon: "⭐",
      achievedDate: achievements.find((a) => a.achievementKey === "streak_7")
        ?.unlockedAt || null,
      progress: Math.min(100, (progress.currentStreak / 7) * 100),
      category: "streak",
    },
    {
      id: "streak_30",
      title: "Monthly Champion",
      description: "Read 30 days in a row",
      icon: "🏆",
      achievedDate: achievements.find((a) => a.achievementKey === "streak_30")
        ?.unlockedAt || null,
      progress: Math.min(100, (progress.currentStreak / 30) * 100),
      category: "streak",
    },
  ];

  return milestones;
}

export async function getEngagementScore(
  childId: number,
  userId: number
): Promise<number> {
  const summary = await getReadingSummary(childId, userId, "week");
  return summary.engagementScore;
}

export async function getWeeklyReport(
  childId: number,
  userId: number
): Promise<WeeklyReport> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, childId),
        eq(readingActivity.userId, userId),
        gte(readingActivity.createdAt, weekStart),
        lte(readingActivity.createdAt, weekEnd)
      )
    );

  // Calculate daily totals
  const dailyMinutes: Record<string, number> = {};
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    dailyMinutes[dateStr] = 0;
  }

  for (const activity of activities) {
    if (!activity.createdAt) continue;
    const dateStr = activity.createdAt.toISOString().split("T")[0];
    if (activity.activityType === "page_read") {
      dailyMinutes[dateStr] = (dailyMinutes[dateStr] || 0) + 2;
    }
  }

  // Find best day
  let bestDay = { day: "N/A", minutes: 0 };
  for (const [dateStr, minutes] of Object.entries(dailyMinutes)) {
    if (minutes > bestDay.minutes) {
      const dateObj = new Date(dateStr);
      bestDay = { day: dayNames[dateObj.getDay()], minutes };
    }
  }

  const storiesRead = activities.filter(
    (a) => a.activityType === "story_completed"
  ).length;

  // Get new vocabulary words
  const vocabEntries = await db
    .select()
    .from(vocabularyBank)
    .where(
      and(
        eq(vocabularyBank.childId, childId),
        eq(vocabularyBank.userId, userId),
        gte(vocabularyBank.addedAt, weekStart)
      )
    );

  const newWords = vocabEntries.map((v) => v.word).slice(0, 5);

  // Get achieved achievements this week
  const weekAchievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.childId, childId),
        eq(achievements.userId, userId),
        gte(achievements.unlockedAt, weekStart)
      )
    );

  const achievementNames = weekAchievements
    .map((a) => {
      const def = require("../../constants/gamification").ACHIEVEMENTS.find(
        (x: any) => x.key === a.achievementKey
      );
      return def?.name || a.achievementKey;
    })
    .slice(0, 3);

  // Get favorite theme
  const themes = await getThemeBreakdown(childId, userId);
  const mostReadTheme = themes[0]?.theme || null;

  return {
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
    totalReadingTime: Object.values(dailyMinutes).reduce((a, b) => a + b, 0),
    bestDay,
    storiesRead,
    newWords,
    achievements: achievementNames,
    mostReadTheme,
    recommendations: generateRecommendations(storiesRead, mostReadTheme),
  };
}

export async function compareWithPeers(
  childId: number,
  userId: number
): Promise<PeerComparison> {
  // This is a simplified version without exposing individual peer data
  // In production, this would compare anonymized metrics across children
  const summary = await getReadingSummary(childId, userId, "week");

  // Mock percentiles based on engagement
  const basePercentile = summary.engagementScore;

  return {
    percentile: basePercentile,
    readingTimePercentile: Math.min(100, basePercentile + Math.random() * 20),
    storiesCompletedPercentile: Math.min(
      100,
      basePercentile + Math.random() * 20
    ),
    engagementPercentile: basePercentile,
  };
}

// ─── Helper Functions ──────────────────────────────────────────

function calculateEngagementScore(
  readingTime: number,
  streak: number,
  storiesCompleted: number,
  sessions: number
): number {
  let score = 0;

  // Reading time component (max 30 points)
  score += Math.min(30, (readingTime / 60) * 10);

  // Streak component (max 25 points)
  score += Math.min(25, (streak / 7) * 15);

  // Stories component (max 25 points)
  score += Math.min(25, (storiesCompleted / 5) * 10);

  // Session consistency (max 20 points)
  score += Math.min(20, (sessions / 7) * 10);

  return Math.round(Math.min(100, score));
}

function getThemeColor(theme: string): string {
  const colors: Record<string, string> = {
    adventure: "#FF6B6B",
    fantasy: "#9D4EDD",
    mystery: "#3A86FF",
    science: "#00D9FF",
    nature: "#06D6A0",
    history: "#F8C500",
    mythology: "#FF006E",
    comedy: "#FFB703",
    space: "#023E8A",
    animals: "#8ECAE6",
  };

  return colors[theme.toLowerCase()] || "#808080";
}

function calculateVocabularyComplexity(
  entries: any[],
  date: Date
): number {
  // Simplified: return 1-5 based on average mastery level
  const dateStr = date.toISOString().split("T")[0];
  const dayEntries = entries.filter(
    (e) => e.addedAt?.toISOString().split("T")[0] === dateStr
  );

  if (dayEntries.length === 0) return 1;

  const avgMastery =
    dayEntries.reduce((sum, e) => sum + (e.masteryLevel || 0), 0) /
    dayEntries.length;

  return Math.max(1, Math.ceil(avgMastery / 20));
}

function calculateIntensity(
  minutes: number,
  thresholds: number[]
): number {
  if (minutes === 0) return 0;
  if (minutes <= thresholds[1]) return 1;
  if (minutes <= thresholds[2]) return 2;
  if (minutes <= thresholds[3]) return 3;
  return 4;
}

function generateRecommendations(
  storiesRead: number,
  favoriteTheme: string | null
): string[] {
  const recommendations: string[] = [];

  if (storiesRead === 0) {
    recommendations.push("Start by reading your first story to build momentum!");
  }

  if (storiesRead >= 1 && storiesRead < 5) {
    recommendations.push("Keep it up! You're building a great reading habit.");
  }

  if (favoriteTheme) {
    recommendations.push(
      `You love ${favoriteTheme} stories! Try exploring similar themes this week.`
    );
  } else {
    recommendations.push(
      "Try exploring different themes to find your favorites!"
    );
  }

  if (storiesRead >= 5) {
    recommendations.push(
      "Consider challenging yourself with longer stories or new genres!"
    );
  }

  return recommendations.slice(0, 3);
}
