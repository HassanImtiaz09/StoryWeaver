/**
 * First-Time User Tooltip Store
 *
 * Manages contextual tooltips that guide new parents through key flows:
 * 1. Creating their first child profile
 * 2. Creating their first story
 * 3. Exploring the library
 * 4. Using the Create (FAB) button
 *
 * Tooltips are shown once per milestone and dismissed permanently.
 * State is persisted in AsyncStorage so tooltips don't reappear.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────
export type TooltipId =
  | "welcome_create_profile"    // Home empty state: nudge to create first child
  | "first_child_created"       // After child created: nudge to create first story
  | "tap_create_button"         // Highlight the Create FAB/tab
  | "story_created"             // After first story: nudge to explore library
  | "explore_library"           // Library tab: show what's available
  | "family_tab_intro";         // Family tab: manage profiles & settings

export interface TooltipConfig {
  id: TooltipId;
  title: string;
  message: string;
  emoji: string;
  /** Which screen this tooltip appears on */
  screen: "home" | "create" | "library" | "family" | "create-child" | "new-story";
  /** Position relative to anchor element */
  position: "top" | "bottom" | "center";
  /** Optional action button label */
  actionLabel?: string;
  /** Optional route to navigate to when action is tapped */
  actionRoute?: string;
}

// ─── Tooltip Definitions ──────────────────────────────────────────
export const TOOLTIP_CONFIGS: Record<TooltipId, TooltipConfig> = {
  welcome_create_profile: {
    id: "welcome_create_profile",
    title: "Welcome to StoryWeaver!",
    message: "Start by creating a profile for your child. We'll personalize every story just for them.",
    emoji: "🦉",
    screen: "home",
    position: "center",
    actionLabel: "Create Profile",
    actionRoute: "/create-child",
  },
  first_child_created: {
    id: "first_child_created",
    title: "Profile Created!",
    message: "Now let's create your first bedtime story. Tap the golden + button below!",
    emoji: "✨",
    screen: "home",
    position: "bottom",
    actionLabel: "Create Story",
    actionRoute: "/(tabs)/create",
  },
  tap_create_button: {
    id: "tap_create_button",
    title: "Create a Story",
    message: "Choose a theme, set the mood, and we'll weave a magical tale personalized for your child.",
    emoji: "📖",
    screen: "create",
    position: "top",
  },
  story_created: {
    id: "story_created",
    title: "Your First Story!",
    message: "Your story is saved in the Library. You can read it anytime, even offline!",
    emoji: "🎉",
    screen: "home",
    position: "center",
    actionLabel: "View Library",
    actionRoute: "/(tabs)/library",
  },
  explore_library: {
    id: "explore_library",
    title: "Your Story Library",
    message: "All your stories live here. Tap any story to read, continue, or share it with family.",
    emoji: "📚",
    screen: "library",
    position: "top",
  },
  family_tab_intro: {
    id: "family_tab_intro",
    title: "Family Hub",
    message: "Manage child profiles, view reading stats, adjust settings, and explore parenting tools.",
    emoji: "👨‍👩‍👧‍👦",
    screen: "family",
    position: "top",
  },
};

// ─── Storage Keys ─────────────────────────────────────────────────
const DISMISSED_KEY = "sw_tooltips_dismissed";
const MILESTONES_KEY = "sw_tooltips_milestones";

// ─── In-memory cache ──────────────────────────────────────────────
let dismissedCache: Set<TooltipId> | null = null;
let milestonesCache: Set<string> | null = null;

// ─── Core Functions ───────────────────────────────────────────────

/** Load dismissed tooltip IDs from storage */
async function loadDismissed(): Promise<Set<TooltipId>> {
  if (dismissedCache) return dismissedCache;
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    dismissedCache = raw ? new Set(JSON.parse(raw) as TooltipId[]) : new Set();
  } catch {
    dismissedCache = new Set();
  }
  return dismissedCache;
}

/** Load completed milestones from storage */
async function loadMilestones(): Promise<Set<string>> {
  if (milestonesCache) return milestonesCache;
  try {
    const raw = await AsyncStorage.getItem(MILESTONES_KEY);
    milestonesCache = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    milestonesCache = new Set();
  }
  return milestonesCache;
}

/** Dismiss a tooltip permanently */
export async function dismissTooltip(id: TooltipId): Promise<void> {
  const dismissed = await loadDismissed();
  dismissed.add(id);
  dismissedCache = dismissed;
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Non-critical
  }
}

/** Record a milestone (e.g., "child_created", "story_created") */
export async function recordMilestone(milestone: string): Promise<void> {
  const milestones = await loadMilestones();
  milestones.add(milestone);
  milestonesCache = milestones;
  try {
    await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify([...milestones]));
  } catch {
    // Non-critical
  }
}

/** Check if a milestone has been reached */
export async function hasMilestone(milestone: string): Promise<boolean> {
  const milestones = await loadMilestones();
  return milestones.has(milestone);
}

/** Check if a tooltip has been dismissed */
export async function isTooltipDismissed(id: TooltipId): Promise<boolean> {
  const dismissed = await loadDismissed();
  return dismissed.has(id);
}

/**
 * Get the active tooltip for a given screen, considering milestones and dismissals.
 * Returns null if no tooltip should be shown.
 */
export async function getActiveTooltip(
  screen: TooltipConfig["screen"],
  context: {
    hasChildren: boolean;
    hasStories: boolean;
  }
): Promise<TooltipConfig | null> {
  const dismissed = await loadDismissed();
  const milestones = await loadMilestones();

  // Determine which tooltip to show based on screen + context
  const candidates: TooltipId[] = [];

  switch (screen) {
    case "home":
      if (!context.hasChildren && !dismissed.has("welcome_create_profile")) {
        candidates.push("welcome_create_profile");
      }
      if (
        context.hasChildren &&
        !context.hasStories &&
        milestones.has("child_created") &&
        !dismissed.has("first_child_created")
      ) {
        candidates.push("first_child_created");
      }
      if (
        context.hasChildren &&
        context.hasStories &&
        milestones.has("story_created") &&
        !dismissed.has("story_created")
      ) {
        candidates.push("story_created");
      }
      break;

    case "create":
      if (
        context.hasChildren &&
        !context.hasStories &&
        !dismissed.has("tap_create_button")
      ) {
        candidates.push("tap_create_button");
      }
      break;

    case "library":
      if (
        context.hasStories &&
        !dismissed.has("explore_library")
      ) {
        candidates.push("explore_library");
      }
      break;

    case "family":
      if (
        context.hasChildren &&
        !dismissed.has("family_tab_intro")
      ) {
        candidates.push("family_tab_intro");
      }
      break;
  }

  // Return the first (highest priority) candidate
  if (candidates.length > 0) {
    return TOOLTIP_CONFIGS[candidates[0]];
  }

  return null;
}

/** Reset all tooltips (for testing or re-onboarding) */
export async function resetAllTooltips(): Promise<void> {
  dismissedCache = new Set();
  milestonesCache = new Set();
  await AsyncStorage.multiRemove([DISMISSED_KEY, MILESTONES_KEY]);
}
