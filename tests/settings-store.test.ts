import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  getSettings,
  saveSettings,
  resetSettings,
  getStoryPageCount,
  formatBedtime,
  DEFAULT_SETTINGS,
} from "../lib/settings-store";

describe("Settings Store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should return default settings when none saved", async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("should save and retrieve settings", async () => {
    await saveSettings({
      bedtimeHour: 20,
      bedtimeMinute: 30,
      voiceMode: "device",
      storyLength: "long",
    });
    const loaded = await getSettings();
    expect(loaded.bedtimeHour).toBe(20);
    expect(loaded.bedtimeMinute).toBe(30);
    expect(loaded.voiceMode).toBe("device");
    expect(loaded.storyLength).toBe("long");
  });

  it("should merge partial updates with defaults", async () => {
    await saveSettings({ bedtimeReminderEnabled: false });
    const loaded = await getSettings();
    expect(loaded.bedtimeReminderEnabled).toBe(false);
    expect(loaded.bedtimeHour).toBe(DEFAULT_SETTINGS.bedtimeHour);
    expect(loaded.storyLength).toBe(DEFAULT_SETTINGS.storyLength);
  });

  it("should reset settings to defaults", async () => {
    await saveSettings({ bedtimeHour: 22, storyLength: "short" });
    const reset = await resetSettings();
    expect(reset).toEqual(DEFAULT_SETTINGS);
    const loaded = await getSettings();
    expect(loaded.bedtimeHour).toBe(DEFAULT_SETTINGS.bedtimeHour);
  });

  it("should preserve all default setting keys", () => {
    expect(DEFAULT_SETTINGS).toHaveProperty("bedtimeHour");
    expect(DEFAULT_SETTINGS).toHaveProperty("bedtimeMinute");
    expect(DEFAULT_SETTINGS).toHaveProperty("bedtimeReminderEnabled");
    expect(DEFAULT_SETTINGS).toHaveProperty("voiceMode");
    expect(DEFAULT_SETTINGS).toHaveProperty("voiceSpeed");
    expect(DEFAULT_SETTINGS).toHaveProperty("storyLength");
    expect(DEFAULT_SETTINGS).toHaveProperty("autoPlayAudio");
    expect(DEFAULT_SETTINGS).toHaveProperty("subscriptionTier");
    expect(DEFAULT_SETTINGS).toHaveProperty("fontSize");
    expect(DEFAULT_SETTINGS).toHaveProperty("darkMode");
  });
});

describe("Settings Helpers", () => {
  it("should return correct page counts for story lengths", () => {
    expect(getStoryPageCount("short")).toBe(4);
    expect(getStoryPageCount("medium")).toBe(6);
    expect(getStoryPageCount("long")).toBe(8);
  });

  it("should format bedtime correctly", () => {
    expect(formatBedtime(19, 30)).toBe("7:30 PM");
    expect(formatBedtime(7, 0)).toBe("7:00 AM");
    expect(formatBedtime(0, 0)).toBe("12:00 AM");
    expect(formatBedtime(12, 15)).toBe("12:15 PM");
    expect(formatBedtime(23, 45)).toBe("11:45 PM");
  });
});
