import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "storyweaver_settings";

// ─── Helper: Safe AsyncStorage caching ─────────────────────────
async function safeCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("[SettingsStore] AsyncStorage write failed:", err);
  }
}

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
  fontSize: "small" | "medium" | "large" | "extraLarge";
  darkMode: "auto" | "light" | "dark";

  // Typography & Accessibility
  fontPreference: "default" | "openDyslexic";   // Accessibility font choice
  dyslexiaFriendlySpacing: boolean;              // Extra word-spacing in story text

  // Bedtime mode
  bedtimeModeEnabled: boolean;
  sleepTimerDefault: number; // default timer in minutes (0 = disabled)
  ambientSoundDefault: "rain" | "ocean" | "forest" | "white_noise" | "none";
  autoActivateBedtimeMode: boolean; // auto-activate at bedtime hour

  // Voice assistant
  voiceAssistantEnabled: boolean;
  voiceCommandHints: boolean;
  voiceLanguage: string; // e.g., "en-US", "es-ES"

  // Voice response (TTS - app speaking back)
  voiceResponseEnabled: boolean; // Whether app speaks responses back
  voiceResponseSpeed: number; // 0.75-1.25, default 1.0
  voiceResponseMode: "quick" | "rich" | "auto"; // quick = device TTS, rich = ElevenLabs, auto = smart choice

  // Character avatars
  characterAvatarEnabled: boolean;
  preferredCharacterArtStyle: "watercolor" | "cartoon" | "anime" | "storybook-classic" | "pixel-art";

  // Collaborative storytelling (Family Mode)
  collaborativeModeEnabled: boolean;
  defaultMaxParticipants: number;
  defaultTurnTimeLimit: number;
  aiEnhancementLevel: "light" | "moderate" | "heavy";

  // Multilingual features
  storyLanguage: string; // Language code for story generation (e.g., 'en', 'es', 'fr')
  bilingualModeEnabled: boolean; // Enable bilingual display mode
  learningLanguage: string | null; // Language child is learning (e.g., 'es')
  vocabularyHighlightsEnabled: boolean; // Show educational vocabulary highlights
  bilingualDisplayFormat: "side-by-side" | "stacked"; // How to display bilingual content
  showLanguageLearningNotes: boolean; // Show language learning tips

  // Offline mode
  offlineModeEnabled: boolean; // Enable offline story access
  offlineStorageQuota: number; // Max storage in MB (100-2000, default 500)
  autoDownloadOnWifi: boolean; // Auto-download new episodes on WiFi
  preloadNextEpisode: boolean; // Smart preload of next likely episode
  downloadQuality: "high" | "medium" | "low"; // Image download quality
  wifiOnlyDownload: boolean; // Only download over WiFi, not cellular
  autoPruneDays: number; // Auto-remove stories not accessed in X days

  // Social Sharing & Gallery
  sharingEnabled: boolean; // Enable social sharing features
  defaultPrivacyLevel: "private" | "link_only" | "public"; // Default privacy setting
  showInGallery: boolean; // Show stories in public gallery by default
  allowLikes: boolean; // Allow others to like your shared stories

  // Analytics Settings
  analyticsEnabled: boolean; // Enable reading analytics dashboard
  weeklyDigestNotification: boolean; // Send weekly digest notifications
  shareAnalyticsWithFamily: boolean; // Allow family members to view analytics
  analyticsDataRetention: number; // Days to keep analytics data (default 365)
  trackVocabularyGrowth: boolean; // Track vocabulary learning progress
  trackReadingPatterns: boolean; // Track reading time patterns

  // Accessibility
  accessibilityEnabled: boolean; // Show accessibility button in story reader

  // Educator Mode
  educatorModeEnabled: boolean; // Enable teacher dashboard and classroom features
  defaultGradeLevel: string; // Default grade level for new classrooms

  // Navigation mode
  navMode: "parent" | "child"; // child = simplified 3-tab nav, parent = full 5-tab nav

  // Theme & Display preferences
  kidFriendlyLightModeEnabled: boolean; // Force light mode for young children (3-7) with high contrast

  // Sound effects
  soundEffectsEnabled: boolean; // Enable/disable gamification sound effects
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
  fontPreference: "default",
  dyslexiaFriendlySpacing: false,
  bedtimeModeEnabled: true,
  sleepTimerDefault: 30,
  ambientSoundDefault: "rain",
  autoActivateBedtimeMode: true,
  voiceAssistantEnabled: true,
  voiceCommandHints: true,
  voiceLanguage: "en-US",
  voiceResponseEnabled: true,
  voiceResponseSpeed: 1.0,
  voiceResponseMode: "auto",
  characterAvatarEnabled: true,
  preferredCharacterArtStyle: "watercolor",
  collaborativeModeEnabled: true,
  defaultMaxParticipants: 4,
  defaultTurnTimeLimit: 120,
  aiEnhancementLevel: "moderate",
  storyLanguage: "en",
  bilingualModeEnabled: false,
  learningLanguage: null,
  vocabularyHighlightsEnabled: true,
  bilingualDisplayFormat: "side-by-side",
  showLanguageLearningNotes: true,
  offlineModeEnabled: true,
  offlineStorageQuota: 500,
  autoDownloadOnWifi: true,
  preloadNextEpisode: true,
  downloadQuality: "medium",
  wifiOnlyDownload: true,
  autoPruneDays: 30,
  sharingEnabled: true,
  defaultPrivacyLevel: "private",
  showInGallery: false,
  allowLikes: true,
  analyticsEnabled: true,
  weeklyDigestNotification: true,
  shareAnalyticsWithFamily: true,
  analyticsDataRetention: 365,
  trackVocabularyGrowth: true,
  trackReadingPatterns: true,
  accessibilityEnabled: false,
  educatorModeEnabled: false,
  defaultGradeLevel: "K",
  navMode: "parent",
  kidFriendlyLightModeEnabled: false,
  soundEffectsEnabled: true,
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
  await safeCache(SETTINGS_KEY, updated);
  return updated;
}

export async function resetSettings(): Promise<AppSettings> {
  await safeCache(SETTINGS_KEY, DEFAULT_SETTINGS);
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
