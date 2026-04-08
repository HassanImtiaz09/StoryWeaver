// ─── Achievement Definitions ───────────────────────────────────

export type AchievementDef = {
  key: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: "reading" | "streak" | "exploration" | "bedtime" | "collection";
  maxProgress: number; // number needed to unlock
  pointsReward: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // Reading achievements
  {
    key: "first_story",
    name: "Once Upon a Time",
    description: "Complete your first story",
    icon: "📖",
    category: "reading",
    maxProgress: 1,
    pointsReward: 50,
    tier: "bronze",
  },
  {
    key: "bookworm_5",
    name: "Little Bookworm",
    description: "Complete 5 stories",
    icon: "🐛",
    category: "reading",
    maxProgress: 5,
    pointsReward: 100,
    tier: "bronze",
  },
  {
    key: "bookworm_25",
    name: "Story Explorer",
    description: "Complete 25 stories",
    icon: "🧭",
    category: "reading",
    maxProgress: 25,
    pointsReward: 250,
    tier: "silver",
  },
  {
    key: "bookworm_100",
    name: "Master Storyteller",
    description: "Complete 100 stories",
    icon: "👑",
    category: "reading",
    maxProgress: 100,
    pointsReward: 500,
    tier: "gold",
  },

  // Streak achievements
  {
    key: "streak_3",
    name: "Getting Started",
    description: "Read 3 days in a row",
    icon: "🔥",
    category: "streak",
    maxProgress: 3,
    pointsReward: 75,
    tier: "bronze",
  },
  {
    key: "streak_7",
    name: "Week Warrior",
    description: "Read 7 days in a row",
    icon: "⭐",
    category: "streak",
    maxProgress: 7,
    pointsReward: 150,
    tier: "silver",
  },
  {
    key: "streak_30",
    name: "Monthly Champion",
    description: "Read 30 days in a row",
    icon: "🏆",
    category: "streak",
    maxProgress: 30,
    pointsReward: 500,
    tier: "gold",
  },
  {
    key: "streak_100",
    name: "Legendary Reader",
    description: "Read 100 days in a row",
    icon: "💎",
    category: "streak",
    maxProgress: 100,
    pointsReward: 1000,
    tier: "diamond",
  },

  // Exploration achievements
  {
    key: "themes_3",
    name: "Theme Explorer",
    description: "Read stories in 3 different themes",
    icon: "🎨",
    category: "exploration",
    maxProgress: 3,
    pointsReward: 100,
    tier: "bronze",
  },
  {
    key: "themes_all",
    name: "World Traveler",
    description: "Read stories in every theme",
    icon: "🌍",
    category: "exploration",
    maxProgress: 10,
    pointsReward: 300,
    tier: "gold",
  },

  // Bedtime achievements
  {
    key: "bedtime_first",
    name: "Sweet Dreams",
    description: "Complete your first bedtime ritual",
    icon: "🌙",
    category: "bedtime",
    maxProgress: 1,
    pointsReward: 50,
    tier: "bronze",
  },
  {
    key: "bedtime_10",
    name: "Dreamland Regular",
    description: "Complete 10 bedtime rituals",
    icon: "✨",
    category: "bedtime",
    maxProgress: 10,
    pointsReward: 200,
    tier: "silver",
  },
  {
    key: "bedtime_50",
    name: "Sleep Champion",
    description: "Complete 50 bedtime rituals",
    icon: "😴",
    category: "bedtime",
    maxProgress: 50,
    pointsReward: 400,
    tier: "gold",
  },

  // Collection achievements
  {
    key: "print_first",
    name: "Real Book!",
    description: "Order your first printed book",
    icon: "📚",
    category: "collection",
    maxProgress: 1,
    pointsReward: 200,
    tier: "silver",
  },
  {
    key: "voices_3",
    name: "Voice Collector",
    description: "Listen to stories with 3 different voices",
    icon: "🎤",
    category: "collection",
    maxProgress: 3,
    pointsReward: 100,
    tier: "bronze",
  },
];

// ─── Tier Colors ──────────────────────────────────────────────

export const TIER_COLORS = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  diamond: "#B9F2FF",
};

// ─── Points Per Action ────────────────────────────────────────

export const POINTS_PER_ACTION = {
  story_completed: 20,
  episode_completed: 10,
  page_read: 1,
  bedtime_session: 15,
  streak_day: 5,
  streak_bonus_7: 50,
  streak_bonus_30: 200,
};

// ─── Level System ─────────────────────────────────────────────

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 1500, 2500, 3500, 5000, 7500, 10000,
];

export function calculateLevel(totalPoints: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getPointsUntilNextLevel(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  const nextThresholdIndex = currentLevel;
  if (nextThresholdIndex >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  }
  const nextThreshold = LEVEL_THRESHOLDS[nextThresholdIndex];
  return Math.max(0, nextThreshold - totalPoints);
}

export function getCurrentLevelThreshold(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  return LEVEL_THRESHOLDS[currentLevel - 1] || 0;
}

export function getNextLevelThreshold(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}
