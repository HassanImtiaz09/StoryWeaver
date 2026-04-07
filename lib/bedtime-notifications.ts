import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BEDTIME_NOTIFICATION_ID_KEY = "storyweaver_bedtime_notification_id";
const BEDTIME_CHANNEL_ID = "bedtime-reminder";

// Warm, encouraging messages that rotate daily
const BEDTIME_MESSAGES = [
  {
    title: "Story Time!",
    body: "The stars are out and a new adventure awaits. Time to snuggle up and read together.",
  },
  {
    title: "Bedtime Story Awaits",
    body: "A magical tale is waiting just for you. Grab your favorite blanket and let's begin!",
  },
  {
    title: "Once Upon a Bedtime...",
    body: "The moon is shining and it's the perfect time for a story. Ready to explore a new world?",
  },
  {
    title: "Sweet Dreams Start Here",
    body: "Every great night begins with a great story. Let's read one together before sleep.",
  },
  {
    title: "Adventure Calling!",
    body: "Your bedtime story is ready! Cozy up and let the magic begin.",
  },
  {
    title: "Time to Read!",
    body: "The best part of the day is here — story time! What adventure will we discover tonight?",
  },
  {
    title: "Goodnight Story",
    body: "Before you close your eyes, let's share one more wonderful story together.",
  },
];

/**
 * Set up the notification handler so notifications display in-app
 */
export function configureBedtimeNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions from the user.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(BEDTIME_CHANNEL_ID, {
      name: "Bedtime Reminders",
      description: "Gentle reminders when it's time to read a bedtime story",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFD700",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Check if notification permissions are currently granted.
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule a daily bedtime reminder at the given hour and minute.
 * Cancels any existing bedtime reminder first.
 */
export async function scheduleBedtimeReminder(
  hour: number,
  minute: number
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // Cancel any existing bedtime reminder
  await cancelBedtimeReminder();

  // Request permissions if needed
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Pick a random message for variety
  const message = BEDTIME_MESSAGES[Math.floor(Math.random() * BEDTIME_MESSAGES.length)];

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        data: { type: "bedtime_reminder", screen: "/(tabs)" },
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: BEDTIME_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    // Store the notification ID so we can cancel it later
    await AsyncStorage.setItem(BEDTIME_NOTIFICATION_ID_KEY, notificationId);
    return notificationId;
  } catch (error) {
    console.error("Failed to schedule bedtime reminder:", error);
    return null;
  }
}

/**
 * Cancel the currently scheduled bedtime reminder.
 */
export async function cancelBedtimeReminder(): Promise<void> {
  try {
    const existingId = await AsyncStorage.getItem(BEDTIME_NOTIFICATION_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(BEDTIME_NOTIFICATION_ID_KEY);
    }
  } catch (error) {
    console.error("Failed to cancel bedtime reminder:", error);
  }
}

/**
 * Check if a bedtime reminder is currently scheduled.
 */
export async function isBedtimeReminderScheduled(): Promise<boolean> {
  try {
    const existingId = await AsyncStorage.getItem(BEDTIME_NOTIFICATION_ID_KEY);
    if (!existingId) return false;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some((n) => n.identifier === existingId);
  } catch {
    return false;
  }
}

/**
 * Format a bedtime for display (e.g., "7:30 PM").
 */
export function formatBedtimeDisplay(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}
