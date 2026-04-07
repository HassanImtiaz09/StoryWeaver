import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted — cannot reference top-level variables.
// Use vi.fn() inline and retrieve them via import after mocking.

vi.mock("expo-notifications", () => ({
  scheduleNotificationAsync: vi.fn().mockResolvedValue("mock-notification-id"),
  cancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  SchedulableTriggerInputTypes: {
    DAILY: "daily",
    TIME_INTERVAL: "timeInterval",
    CALENDAR: "calendar",
    DATE: "date",
    MONTHLY: "monthly",
    WEEKLY: "weekly",
    YEARLY: "yearly",
  },
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

const _mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      _store: store,
    },
  };
});

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  configureBedtimeNotifications,
  requestNotificationPermissions,
  hasNotificationPermissions,
  scheduleBedtimeReminder,
  cancelBedtimeReminder,
  isBedtimeReminderScheduled,
  formatBedtimeDisplay,
} from "../lib/bedtime-notifications";

// Get typed references to the mocked functions
const mockSchedule = Notifications.scheduleNotificationAsync as ReturnType<typeof vi.fn>;
const mockCancel = Notifications.cancelScheduledNotificationAsync as ReturnType<typeof vi.fn>;
const mockGetPerms = Notifications.getPermissionsAsync as ReturnType<typeof vi.fn>;
const mockRequestPerms = Notifications.requestPermissionsAsync as ReturnType<typeof vi.fn>;
const mockSetHandler = Notifications.setNotificationHandler as ReturnType<typeof vi.fn>;
const mockGetAll = Notifications.getAllScheduledNotificationsAsync as ReturnType<typeof vi.fn>;
const store = (AsyncStorage as any)._store as Record<string, string>;

describe("Bedtime Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockSchedule.mockResolvedValue("mock-notification-id");
    mockCancel.mockResolvedValue(undefined);
    mockGetPerms.mockResolvedValue({ status: "granted" });
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    mockGetAll.mockResolvedValue([]);
    // Clear store
    Object.keys(store).forEach((key) => delete store[key]);
  });

  describe("configureBedtimeNotifications", () => {
    it("should set the notification handler", () => {
      configureBedtimeNotifications();
      expect(mockSetHandler).toHaveBeenCalledTimes(1);
      expect(mockSetHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          handleNotification: expect.any(Function),
        })
      );
    });

    it("notification handler should return correct config", async () => {
      configureBedtimeNotifications();
      const handler = mockSetHandler.mock.calls[0][0];
      const result = await handler.handleNotification();
      expect(result).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });
  });

  describe("requestNotificationPermissions", () => {
    it("should return true when permissions already granted", async () => {
      mockGetPerms.mockResolvedValueOnce({ status: "granted" });
      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
    });

    it("should request permissions when not yet granted", async () => {
      mockGetPerms.mockResolvedValueOnce({ status: "undetermined" });
      mockRequestPerms.mockResolvedValueOnce({ status: "granted" });
      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(mockRequestPerms).toHaveBeenCalled();
    });

    it("should return false when permissions denied", async () => {
      mockGetPerms.mockResolvedValueOnce({ status: "undetermined" });
      mockRequestPerms.mockResolvedValueOnce({ status: "denied" });
      const result = await requestNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe("hasNotificationPermissions", () => {
    it("should return true when granted", async () => {
      mockGetPerms.mockResolvedValueOnce({ status: "granted" });
      const result = await hasNotificationPermissions();
      expect(result).toBe(true);
    });

    it("should return false when not granted", async () => {
      mockGetPerms.mockResolvedValueOnce({ status: "denied" });
      const result = await hasNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe("scheduleBedtimeReminder", () => {
    it("should schedule a daily notification at the given time", async () => {
      const notificationId = await scheduleBedtimeReminder(19, 30);
      expect(notificationId).toBe("mock-notification-id");
      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            data: expect.objectContaining({ type: "bedtime_reminder" }),
            sound: "default",
          }),
          trigger: expect.objectContaining({
            type: "daily",
            hour: 19,
            minute: 30,
          }),
        })
      );
    });

    it("should cancel existing reminder before scheduling new one", async () => {
      store["storyweaver_bedtime_notification_id"] = "old-id";
      await scheduleBedtimeReminder(20, 0);
      expect(mockCancel).toHaveBeenCalledWith("old-id");
    });

    it("should store the notification ID in AsyncStorage", async () => {
      await scheduleBedtimeReminder(21, 15);
      expect(store["storyweaver_bedtime_notification_id"]).toBe("mock-notification-id");
    });

    it("should return null when permissions denied", async () => {
      mockGetPerms.mockResolvedValueOnce({ status: "undetermined" });
      mockRequestPerms.mockResolvedValueOnce({ status: "denied" });
      const result = await scheduleBedtimeReminder(19, 30);
      expect(result).toBeNull();
    });
  });

  describe("cancelBedtimeReminder", () => {
    it("should cancel the stored notification", async () => {
      store["storyweaver_bedtime_notification_id"] = "test-id";
      await cancelBedtimeReminder();
      expect(mockCancel).toHaveBeenCalledWith("test-id");
    });

    it("should remove the stored ID", async () => {
      store["storyweaver_bedtime_notification_id"] = "test-id";
      await cancelBedtimeReminder();
      expect(store["storyweaver_bedtime_notification_id"]).toBeUndefined();
    });

    it("should not throw when no notification is stored", async () => {
      await expect(cancelBedtimeReminder()).resolves.not.toThrow();
    });
  });

  describe("isBedtimeReminderScheduled", () => {
    it("should return false when no ID stored", async () => {
      const result = await isBedtimeReminderScheduled();
      expect(result).toBe(false);
    });

    it("should return true when notification is in scheduled list", async () => {
      store["storyweaver_bedtime_notification_id"] = "active-id";
      mockGetAll.mockResolvedValueOnce([
        { identifier: "active-id" },
        { identifier: "other-id" },
      ]);
      const result = await isBedtimeReminderScheduled();
      expect(result).toBe(true);
    });

    it("should return false when notification not in scheduled list", async () => {
      store["storyweaver_bedtime_notification_id"] = "stale-id";
      mockGetAll.mockResolvedValueOnce([
        { identifier: "other-id" },
      ]);
      const result = await isBedtimeReminderScheduled();
      expect(result).toBe(false);
    });
  });

  describe("formatBedtimeDisplay", () => {
    it("should format morning times correctly", () => {
      expect(formatBedtimeDisplay(9, 0)).toBe("9:00 AM");
      expect(formatBedtimeDisplay(6, 30)).toBe("6:30 AM");
    });

    it("should format afternoon/evening times correctly", () => {
      expect(formatBedtimeDisplay(19, 30)).toBe("7:30 PM");
      expect(formatBedtimeDisplay(21, 0)).toBe("9:00 PM");
    });

    it("should handle midnight correctly", () => {
      expect(formatBedtimeDisplay(0, 0)).toBe("12:00 AM");
    });

    it("should handle noon correctly", () => {
      expect(formatBedtimeDisplay(12, 0)).toBe("12:00 PM");
    });

    it("should pad minutes with leading zero", () => {
      expect(formatBedtimeDisplay(7, 5)).toBe("7:05 AM");
    });
  });
});
