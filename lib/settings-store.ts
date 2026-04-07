import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "storyweaver_settings";

export interface AppSettings {
  // Bedtime reminder
  bedtimeReminderEnabled: boolean;
  bedtimeHour: number; // 0-23
  bedtimeMinute: number; // 0-59

  // Voice preferences
  voiceMode: "elevenlabs" | "device";
  voiceSpeed: number; // 0.5 - 1.5
  selectedVoicePreset: string; // ElevenLabs voice role key e.g. "narrator", "child_hero"

  // Story preferences
  storyLength: "short" | "medium" | "long"; // 4, 6, 8 pages
  autoPlayAudio: boolean;

  // Subscription
  subscriptionTier: "free" | "premium" | "family";
  storiesRemaining: number;
  storiesPerMonth: number;

  // Display
  fontSize: "small" | "medium" | "large";
  darkMode: "auto" | "light" | "dark";
}

export const DEFAULT_SETTINGS: AppSettings = {
  bedtimeReminderEnabled: true,
  bedtimeHour: 19,
  bedtimeMinute: 30,
  voiceMode: "elevenlabs",
  voiceSpeed: 0.85,
  selectedVoicePreset: "narrator",
  storyLength: "medium",
  autoPlayAudio: false,
  subscriptionTier: "free",
  storiesRemaining: 3,
  storiesPerMonth: 3,
  fontSize: "medium",
  darkMode: "auto",
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

export async function resetSettings(): Promise<AppSettings> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS };
}

export function getStoryPageCount(length: AppSettings["storyLength"]): number {
  switch (length) {
    case "short": return 4;
    case "medium": return 6;
    case "long": return 8;
  }
}

export function formatBedtime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}
