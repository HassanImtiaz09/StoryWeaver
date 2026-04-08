import { db } from "../db";
import { smartHomeConfigs, bedtimeRoutines } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface SmartHomeDevice {
  id: string;
  userId: number;
  platform: "philips_hue" | "alexa" | "google_home" | "other";
  deviceName: string;
  deviceId: string;
  isEnabled: boolean;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SmartHomeConfig {
  devices: SmartHomeDevice[];
  isSmartHomeEnabled: boolean;
  ambientSoundEnabled: boolean;
  moodLightingEnabled: boolean;
}

export interface BedtimeRoutine {
  id: number;
  userId: number;
  childId?: number;
  name: string;
  scheduledTime?: string;
  steps: BedtimeStep[];
  isActive: boolean;
  daysOfWeek: number[];
  createdAt: Date;
}

export interface BedtimeStep {
  type: "dim_lights" | "play_music" | "read_story" | "lights_off" | "ambient_sound" | "voice_command";
  duration: number;
  config: Record<string, any>;
}

export interface StoryMood {
  name: "adventure" | "mystery" | "happy" | "scary" | "calm" | "magical" | "sad";
  hue: number;
  saturation: number;
  lightness: number;
  brightness: number;
}

export interface MoodLighting {
  mood: string;
  hue: number;
  saturation: number;
  lightness: number;
  brightness: number;
  colorHex: string;
}

const STORY_MOOD_LIGHTING: Record<string, StoryMood> = {
  adventure: { name: "adventure", hue: 40, saturation: 100, lightness: 60, brightness: 80 },
  mystery: { name: "mystery", hue: 270, saturation: 80, lightness: 40, brightness: 50 },
  happy: { name: "happy", hue: 50, saturation: 100, lightness: 70, brightness: 90 },
  scary: { name: "scary", hue: 180, saturation: 70, lightness: 30, brightness: 40 },
  calm: { name: "calm", hue: 220, saturation: 60, lightness: 50, brightness: 30 },
  magical: { name: "magical", hue: 300, saturation: 80, lightness: 60, brightness: 70 },
  sad: { name: "sad", hue: 210, saturation: 50, lightness: 45, brightness: 45 },
};

const AMBIENT_SOUNDS: Record<string, string> = {
  rain: "https://example.com/sounds/rain.mp3",
  ocean: "https://example.com/sounds/ocean.mp3",
  forest: "https://example.com/sounds/forest.mp3",
  campfire: "https://example.com/sounds/campfire.mp3",
  wind: "https://example.com/sounds/wind.mp3",
  stars: "https://example.com/sounds/stars.mp3",
};

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const x = Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return x.toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export async function getSmartHomeConfig(userId: number): Promise<SmartHomeConfig> {
  try {
    const devices = await db
      .select()
      .from(smartHomeConfigs)
      .where(eq(smartHomeConfigs.userId, userId));

    return {
      devices: devices.map((d) => ({
        id: d.id.toString(),
        userId: d.userId,
        platform: d.platform,
        deviceName: d.deviceName,
        deviceId: d.deviceId,
        isEnabled: d.isEnabled,
        settings: d.settings || {},
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      isSmartHomeEnabled: devices.some((d) => d.isEnabled),
      ambientSoundEnabled: devices.some((d) => d.settings?.ambientSoundEnabled),
      moodLightingEnabled: devices.some((d) => d.settings?.moodLightingEnabled),
    };
  } catch (error) {
    console.error("Error fetching smart home config:", error);
    return {
      devices: [],
      isSmartHomeEnabled: false,
      ambientSoundEnabled: false,
      moodLightingEnabled: false,
    };
  }
}

export async function updateSmartHomeConfig(
  userId: number,
  platform: string,
  deviceName: string,
  deviceId: string,
  accessToken?: string,
  settings?: Record<string, any>
): Promise<SmartHomeDevice> {
  try {
    const existingDevice = await db
      .select()
      .from(smartHomeConfigs)
      .where(and(eq(smartHomeConfigs.userId, userId), eq(smartHomeConfigs.deviceId, deviceId)))
      .then((res) => res[0]);

    if (existingDevice) {
      const updated = await db
        .update(smartHomeConfigs)
        .set({
          platform: platform as any,
          deviceName,
          settings: { ...existingDevice.settings, ...settings },
          updatedAt: new Date(),
        })
        .where(eq(smartHomeConfigs.id, existingDevice.id))
        .returning();

      const device = updated[0];
      return {
        id: device.id.toString(),
        userId: device.userId,
        platform: device.platform,
        deviceName: device.deviceName,
        deviceId: device.deviceId,
        isEnabled: device.isEnabled,
        settings: device.settings || {},
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      };
    } else {
      const created = await db
        .insert(smartHomeConfigs)
        .values({
          userId,
          platform: platform as any,
          deviceName,
          deviceId,
          accessToken,
          isEnabled: true,
          settings: settings || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const device = created[0];
      return {
        id: device.id.toString(),
        userId: device.userId,
        platform: device.platform,
        deviceName: device.deviceName,
        deviceId: device.deviceId,
        isEnabled: device.isEnabled,
        settings: device.settings || {},
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      };
    }
  } catch (error) {
    console.error("Error updating smart home config:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update smart home config",
    });
  }
}

export function getStoryMoodLighting(storyMood: string): MoodLighting {
  const mood = STORY_MOOD_LIGHTING[storyMood] || STORY_MOOD_LIGHTING["calm"];
  return {
    mood: mood.name,
    hue: mood.hue,
    saturation: mood.saturation,
    lightness: mood.lightness,
    brightness: mood.brightness,
    colorHex: hslToHex(mood.hue, mood.saturation, mood.lightness),
  };
}

export async function triggerLightingScene(
  userId: number,
  scene: string,
  brightness?: number,
  color?: string
): Promise<boolean> {
  try {
    const config = await getSmartHomeConfig(userId);

    // Filter enabled Hue devices
    const hueDevices = config.devices.filter((d) => d.platform === "philips_hue" && d.isEnabled);

    if (hueDevices.length === 0) {
      console.log("No Philips Hue devices connected");
      return false;
    }

    // Placeholder for actual Philips Hue API calls
    // In production, this would send HTTP requests to Hue Bridge
    for (const device of hueDevices) {
      const payload = {
        scene,
        brightness: brightness || 100,
        color: color || "#FFFFFF",
      };
      console.log(`Triggering Hue device ${device.deviceName}:`, payload);
      // await sendHueCommand(device.deviceId, payload);
    }

    return true;
  } catch (error) {
    console.error("Error triggering lighting scene:", error);
    return false;
  }
}

export function getAmbientSoundForMood(mood: string): { soundType: string; url: string } {
  const soundMap: Record<string, string> = {
    adventure: "campfire",
    mystery: "wind",
    happy: "birds", // fallback to default
    scary: "wind",
    calm: "rain",
    magical: "stars",
    sad: "ocean",
  };

  const soundType = soundMap[mood] || "rain";
  return {
    soundType,
    url: AMBIENT_SOUNDS[soundType] || AMBIENT_SOUNDS["rain"],
  };
}

export async function triggerBedtimeRoutine(
  userId: number,
  routineId: number,
  childId?: number
): Promise<boolean> {
  try {
    const routine = await db
      .select()
      .from(bedtimeRoutines)
      .where(and(eq(bedtimeRoutines.userId, userId), eq(bedtimeRoutines.id, routineId)))
      .then((res) => res[0]);

    if (!routine) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Bedtime routine not found",
      });
    }

    const config = await getSmartHomeConfig(userId);
    const enabledDevices = config.devices.filter((d) => d.isEnabled);

    if (enabledDevices.length === 0) {
      console.log("No smart home devices enabled");
      return false;
    }

    // Execute routine steps sequentially
    for (const step of routine.steps) {
      switch (step.type) {
        case "dim_lights":
          await triggerLightingScene(userId, "bedtime", 30);
          break;
        case "play_music":
          // Placeholder for music playback
          console.log("Playing bedtime music:", step.config.musicType);
          break;
        case "ambient_sound":
          // Placeholder for ambient sounds
          console.log("Playing ambient sound:", step.config.soundType);
          break;
        case "lights_off":
          await triggerLightingScene(userId, "off", 0);
          break;
        default:
          console.log("Unknown routine step:", step.type);
      }

      // Wait for step duration
      if (step.duration > 0) {
        await new Promise((resolve) => setTimeout(resolve, step.duration * 1000));
      }
    }

    return true;
  } catch (error) {
    console.error("Error triggering bedtime routine:", error);
    return false;
  }
}

export async function getBedtimeRoutines(userId: number, childId?: number): Promise<BedtimeRoutine[]> {
  try {
    let query = db.select().from(bedtimeRoutines).where(eq(bedtimeRoutines.userId, userId));

    if (childId) {
      query = query.where(eq(bedtimeRoutines.childId, childId));
    }

    const routines = await query;
    return routines.map((r) => ({
      id: r.id,
      userId: r.userId,
      childId: r.childId,
      name: r.name,
      scheduledTime: r.scheduledTime,
      steps: r.steps,
      isActive: r.isActive,
      daysOfWeek: r.daysOfWeek,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching bedtime routines:", error);
    return [];
  }
}

export async function createBedtimeRoutine(
  userId: number,
  childId: number | undefined,
  name: string,
  steps: BedtimeStep[],
  scheduledTime?: string,
  daysOfWeek?: number[]
): Promise<BedtimeRoutine> {
  try {
    const created = await db
      .insert(bedtimeRoutines)
      .values({
        userId,
        childId: childId,
        name,
        scheduledTime: scheduledTime || "21:00",
        steps,
        isActive: true,
        daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        createdAt: new Date(),
      })
      .returning();

    const routine = created[0];
    return {
      id: routine.id,
      userId: routine.userId,
      childId: routine.childId,
      name: routine.name,
      scheduledTime: routine.scheduledTime,
      steps: routine.steps,
      isActive: routine.isActive,
      daysOfWeek: routine.daysOfWeek,
      createdAt: routine.createdAt,
    };
  } catch (error) {
    console.error("Error creating bedtime routine:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create bedtime routine",
    });
  }
}

export async function getDeviceStatus(userId: number): Promise<Record<string, any>> {
  try {
    const config = await getSmartHomeConfig(userId);

    const statusMap: Record<string, any> = {};
    for (const device of config.devices) {
      statusMap[device.deviceId] = {
        name: device.deviceName,
        platform: device.platform,
        isEnabled: device.isEnabled,
        isConnected: true, // Placeholder - in production, verify actual connection
        lastSeen: new Date(),
      };
    }

    return statusMap;
  } catch (error) {
    console.error("Error getting device status:", error);
    return {};
  }
}

export async function disconnectDevice(userId: number, deviceId: string): Promise<boolean> {
  try {
    const device = await db
      .select()
      .from(smartHomeConfigs)
      .where(and(eq(smartHomeConfigs.userId, userId), eq(smartHomeConfigs.deviceId, deviceId)))
      .then((res) => res[0]);

    if (!device) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Device not found",
      });
    }

    // For now, just disable the device instead of deleting
    await db
      .update(smartHomeConfigs)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(eq(smartHomeConfigs.id, device.id));

    return true;
  } catch (error) {
    console.error("Error disconnecting device:", error);
    return false;
  }
}

export async function enableDevice(userId: number, deviceId: string): Promise<boolean> {
  try {
    const device = await db
      .select()
      .from(smartHomeConfigs)
      .where(and(eq(smartHomeConfigs.userId, userId), eq(smartHomeConfigs.deviceId, deviceId)))
      .then((res) => res[0]);

    if (!device) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Device not found",
      });
    }

    await db
      .update(smartHomeConfigs)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(eq(smartHomeConfigs.id, device.id));

    return true;
  } catch (error) {
    console.error("Error enabling device:", error);
    return false;
  }
}
