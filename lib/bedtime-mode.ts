import AsyncStorage from "@react-native-async-storage/async-storage";

const BEDTIME_MODE_KEY = "storyweaver_bedtime_mode";

// ─── Helper: Safe AsyncStorage caching ─────────────────────────
async function safeCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("[BedtimeMode] AsyncStorage write failed:", err);
  }
}

export interface BedtimeState {
  isActive: boolean;
  activatedAt: string | null;
  sleepTimerMinutes: number | null; // null = no timer
  sleepTimerEndsAt: string | null;
  windDownPhase: "none" | "story" | "wind_down" | "ambient" | "sleep";
  ambientSound: "rain" | "ocean" | "forest" | "white_noise" | "none";
  screenBrightness: number; // 0.0 to 1.0
}

export const DEFAULT_BEDTIME_STATE: BedtimeState = {
  isActive: false,
  activatedAt: null,
  sleepTimerMinutes: null,
  sleepTimerEndsAt: null,
  windDownPhase: "none",
  ambientSound: "rain",
  screenBrightness: 0.4,
};

/**
 * Retrieve the current bedtime mode state from AsyncStorage.
 * Returns default state if not found or on error.
 */
export async function getBedtimeState(): Promise<BedtimeState> {
  try {
    const raw = await AsyncStorage.getItem(BEDTIME_MODE_KEY);
    if (!raw) return { ...DEFAULT_BEDTIME_STATE };
    return { ...DEFAULT_BEDTIME_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BEDTIME_STATE };
  }
}

/**
 * Save partial updates to the bedtime state.
 */
export async function saveBedtimeState(updates: Partial<BedtimeState>): Promise<BedtimeState> {
  const current = await getBedtimeState();
  const updated = { ...current, ...updates };
  await safeCache(BEDTIME_MODE_KEY, updated);
  return updated;
}

/**
 * Activate bedtime mode: set isActive to true, initialize phase to "story".
 */
export async function activateBedtimeMode(): Promise<BedtimeState> {
  return saveBedtimeState({
    isActive: true,
    activatedAt: new Date().toISOString(),
    windDownPhase: "story",
  });
}

/**
 * Deactivate bedtime mode: reset to defaults.
 */
export async function deactivateBedtimeMode(): Promise<BedtimeState> {
  await AsyncStorage.removeItem(BEDTIME_MODE_KEY);
  return { ...DEFAULT_BEDTIME_STATE };
}

/**
 * Start a sleep timer for the given number of minutes.
 */
export async function startSleepTimer(minutes: number): Promise<BedtimeState> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + minutes * 60000);
  return saveBedtimeState({
    sleepTimerMinutes: minutes,
    sleepTimerEndsAt: endsAt.toISOString(),
  });
}

/**
 * Cancel the current sleep timer.
 */
export async function cancelSleepTimer(): Promise<BedtimeState> {
  return saveBedtimeState({
    sleepTimerMinutes: null,
    sleepTimerEndsAt: null,
  });
}

/**
 * Progress the wind-down phase: story -> wind_down -> ambient -> sleep.
 */
export async function advanceWindDownPhase(): Promise<BedtimeState> {
  const current = await getBedtimeState();
  let nextPhase: BedtimeState["windDownPhase"] = "none";

  switch (current.windDownPhase) {
    case "none":
    case "story":
      nextPhase = "wind_down";
      break;
    case "wind_down":
      nextPhase = "ambient";
      break;
    case "ambient":
      nextPhase = "sleep";
      break;
    case "sleep":
      nextPhase = "none";
      break;
  }

  return saveBedtimeState({ windDownPhase: nextPhase });
}

/**
 * Set the ambient sound preference.
 */
export async function setAmbientSound(
  sound: "rain" | "ocean" | "forest" | "white_noise" | "none"
): Promise<BedtimeState> {
  return saveBedtimeState({ ambientSound: sound });
}

/**
 * Calculate remaining minutes on the sleep timer.
 * Returns null if no timer is active or if timer has expired.
 */
export function getSleepTimerRemaining(state: BedtimeState): number | null {
  if (!state.sleepTimerEndsAt) return null;

  const now = new Date();
  const endsAt = new Date(state.sleepTimerEndsAt);
  const diffMs = endsAt.getTime() - now.getTime();

  if (diffMs <= 0) return null;
  return Math.ceil(diffMs / 60000); // Return minutes, rounded up
}

/**
 * Check if sleep timer has expired.
 */
export function isSleepTimerExpired(state: BedtimeState): boolean {
  if (!state.sleepTimerEndsAt) return false;
  const remaining = getSleepTimerRemaining(state);
  return remaining === null || remaining <= 0;
}

// Bedtime mode visual configuration
export const BEDTIME_THEME = {
  backgroundColor: "#1a1025", // Deep purple-black
  cardBackground: "#2a1f3d", // Muted purple
  textColor: "#d4c5e8", // Soft lavender
  accentColor: "#7c6daa", // Muted purple accent
  warmOverlay: "rgba(255, 180, 100, 0.05)", // Very subtle warm tint
  starColor: "#ffd700", // Gold for stars/accents
};
