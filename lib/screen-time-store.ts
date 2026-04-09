import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'sw_screen_time_settings';
const SESSION_KEY = 'sw_screen_time_session';
const HISTORY_KEY = 'sw_screen_time_history';

// ─── Types ────────────────────────────────────────────────────
export interface ScreenTimeSettings {
  enabled: boolean;
  dailyLimitMinutes: number;     // 0 = no limit
  sessionLimitMinutes: number;   // 0 = no limit
  bedtimeCutoff: string | null;  // "20:30" format, null = disabled
  warningAtMinutes: number;      // show warning X minutes before limit
  allowExtension: boolean;       // can child request 5-min extension
  extensionsPerDay: number;      // max extensions allowed per day
}

export interface SessionData {
  startTime: number;             // timestamp
  totalMinutes: number;          // accumulated today
  extensionsUsed: number;        // extensions used today
  lastActiveDate: string;        // "YYYY-MM-DD"
  isWarningShown: boolean;
  isLimitReached: boolean;
}

export interface DailyHistoryEntry {
  date: string;
  totalMinutes: number;
  sessions: number;
  storiesRead: number;
}

const DEFAULT_SETTINGS: ScreenTimeSettings = {
  enabled: false,
  dailyLimitMinutes: 60,
  sessionLimitMinutes: 30,
  bedtimeCutoff: '20:30',
  warningAtMinutes: 5,
  allowExtension: true,
  extensionsPerDay: 2,
};

const DEFAULT_SESSION: SessionData = {
  startTime: Date.now(),
  totalMinutes: 0,
  extensionsUsed: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  isWarningShown: false,
  isLimitReached: false,
};

// ─── Settings ─────────────────────────────────────────────────
export async function getScreenTimeSettings(): Promise<ScreenTimeSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveScreenTimeSettings(settings: Partial<ScreenTimeSettings>): Promise<void> {
  try {
    const current = await getScreenTimeSettings();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch {}
}

// ─── Session tracking ─────────────────────────────────────────
function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getSessionData(): Promise<SessionData> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (!stored) return { ...DEFAULT_SESSION, startTime: Date.now(), lastActiveDate: todayString() };
    const data = JSON.parse(stored) as SessionData;
    // Reset if it's a new day
    if (data.lastActiveDate !== todayString()) {
      const fresh: SessionData = {
        startTime: Date.now(),
        totalMinutes: 0,
        extensionsUsed: 0,
        lastActiveDate: todayString(),
        isWarningShown: false,
        isLimitReached: false,
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return data;
  } catch {
    return { ...DEFAULT_SESSION, startTime: Date.now(), lastActiveDate: todayString() };
  }
}

export async function updateSessionData(updates: Partial<SessionData>): Promise<void> {
  try {
    const current = await getSessionData();
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...updates }));
  } catch {}
}

export async function addSessionMinutes(minutes: number): Promise<void> {
  const session = await getSessionData();
  await updateSessionData({ totalMinutes: session.totalMinutes + minutes });
}

export async function useExtension(): Promise<boolean> {
  const settings = await getScreenTimeSettings();
  const session = await getSessionData();
  if (!settings.allowExtension) return false;
  if (session.extensionsUsed >= settings.extensionsPerDay) return false;
  await updateSessionData({
    extensionsUsed: session.extensionsUsed + 1,
    isLimitReached: false,
    isWarningShown: false,
  });
  return true;
}

// ─── Limit checking ───────────────────────────────────────────
export interface LimitStatus {
  isLimitReached: boolean;
  isWarningZone: boolean;
  isBedtimePassed: boolean;
  minutesRemaining: number;
  totalMinutesToday: number;
  message: string | null;
}

export async function checkLimits(): Promise<LimitStatus> {
  const settings = await getScreenTimeSettings();
  const session = await getSessionData();

  if (!settings.enabled) {
    return {
      isLimitReached: false,
      isWarningZone: false,
      isBedtimePassed: false,
      minutesRemaining: Infinity,
      totalMinutesToday: session.totalMinutes,
      message: null,
    };
  }

  let minutesRemaining = Infinity;
  let isLimitReached = false;
  let isWarningZone = false;
  let isBedtimePassed = false;
  let message: string | null = null;

  // Check daily limit
  if (settings.dailyLimitMinutes > 0) {
    const remaining = settings.dailyLimitMinutes - session.totalMinutes;
    minutesRemaining = Math.min(minutesRemaining, remaining);
    if (remaining <= 0) {
      isLimitReached = true;
      message = "You've reached your reading time for today! Come back tomorrow for more adventures.";
    } else if (remaining <= settings.warningAtMinutes) {
      isWarningZone = true;
      message = `Only ${Math.ceil(remaining)} minutes of reading time left today!`;
    }
  }

  // Check bedtime cutoff
  if (settings.bedtimeCutoff) {
    const [hours, mins] = settings.bedtimeCutoff.split(':').map(Number);
    const now = new Date();
    const bedtime = new Date();
    bedtime.setHours(hours, mins, 0, 0);
    if (now >= bedtime) {
      isBedtimePassed = true;
      isLimitReached = true;
      message = "It's past bedtime! Time to rest and dream about tomorrow's stories.";
    } else {
      const minsUntilBedtime = Math.floor((bedtime.getTime() - now.getTime()) / 60000);
      if (minsUntilBedtime <= settings.warningAtMinutes) {
        isWarningZone = true;
        message = message || `Almost bedtime! ${minsUntilBedtime} minutes until lights out.`;
      }
      minutesRemaining = Math.min(minutesRemaining, minsUntilBedtime);
    }
  }

  return {
    isLimitReached,
    isWarningZone,
    isBedtimePassed,
    minutesRemaining: Math.max(0, minutesRemaining === Infinity ? 999 : minutesRemaining),
    totalMinutesToday: session.totalMinutes,
    message,
  };
}

// ─── History ──────────────────────────────────────────────────
export async function recordDailyHistory(storiesRead: number = 0): Promise<void> {
  try {
    const session = await getSessionData();
    const history = await getDailyHistory();
    const today = todayString();
    const existing = history.find(h => h.date === today);

    if (existing) {
      existing.totalMinutes = session.totalMinutes;
      existing.storiesRead += storiesRead;
      existing.sessions += 1;
    } else {
      history.push({
        date: today,
        totalMinutes: session.totalMinutes,
        sessions: 1,
        storiesRead,
      });
    }

    // Keep 90 days of history
    const trimmed = history.slice(-90);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export async function getDailyHistory(): Promise<DailyHistoryEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function getWeeklyAverage(): Promise<number> {
  const history = await getDailyHistory();
  const last7 = history.slice(-7);
  if (last7.length === 0) return 0;
  const total = last7.reduce((sum, day) => sum + day.totalMinutes, 0);
  return Math.round(total / last7.length);
}
