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
  useSmartHomeStore,
  type SmartHomeDevice,
  type BedtimeRoutine,
  type BedtimeStep,
  type MoodLightingState,
} from "../lib/smart-home-store";

describe("smart-home-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useSmartHomeStore.setState({
      connectedDevices: [],
      activeScene: null,
      bedtimeRoutines: [],
      isSmartHomeEnabled: false,
      currentMoodLighting: null,
      deviceStatus: {},
      ambientSoundEnabled: false,
      moodLightingEnabled: false,
      isLoading: false,
      error: null,
    });
  });

  describe("store initial state", () => {
    it("initializes with smart home disabled", () => {
      const state = useSmartHomeStore.getState();
      expect(state.isSmartHomeEnabled).toBe(false);
    });

    it("initializes with no connected devices", () => {
      const state = useSmartHomeStore.getState();
      expect(state.connectedDevices).toEqual([]);
    });

    it("initializes with no bedtime routines", () => {
      const state = useSmartHomeStore.getState();
      expect(state.bedtimeRoutines).toEqual([]);
    });

    it("initializes with no active scene", () => {
      const state = useSmartHomeStore.getState();
      expect(state.activeScene).toBeNull();
    });
  });

  describe("device management", () => {
    it("sets connected devices", () => {
      const devices: SmartHomeDevice[] = [
        {
          id: "device-1",
          platform: "philips_hue",
          deviceName: "Living Room Light",
          deviceId: "hue-123",
          isEnabled: true,
          settings: { brightness: 100 },
        },
      ];
      const store = useSmartHomeStore.getState();
      store.setConnectedDevices(devices);
      expect(useSmartHomeStore.getState().connectedDevices).toEqual(devices);
    });

    it("enables smart home when devices are connected", () => {
      const devices: SmartHomeDevice[] = [
        {
          id: "device-1",
          platform: "alexa",
          deviceName: "Echo Dot",
          deviceId: "alexa-123",
          isEnabled: true,
          settings: {},
        },
      ];
      const store = useSmartHomeStore.getState();
      store.setConnectedDevices(devices);
      expect(useSmartHomeStore.getState().isSmartHomeEnabled).toBe(true);
    });

    it("adds a new device", () => {
      const device: SmartHomeDevice = {
        id: "device-1",
        platform: "google_home",
        deviceName: "Google Home",
        deviceId: "google-123",
        isEnabled: true,
        settings: {},
      };
      const store = useSmartHomeStore.getState();
      store.addDevice(device);
      expect(useSmartHomeStore.getState().connectedDevices).toContain(device);
    });

    it("removes a device", () => {
      const device: SmartHomeDevice = {
        id: "device-1",
        platform: "philips_hue",
        deviceName: "Light",
        deviceId: "hue-123",
        isEnabled: true,
        settings: {},
      };
      const store = useSmartHomeStore.getState();
      store.addDevice(device);
      store.removeDevice("device-1");
      expect(useSmartHomeStore.getState().connectedDevices).not.toContain(device);
    });

    it("updates device settings", () => {
      const device: SmartHomeDevice = {
        id: "device-1",
        platform: "philips_hue",
        deviceName: "Light",
        deviceId: "hue-123",
        isEnabled: true,
        settings: { brightness: 50 },
      };
      const store = useSmartHomeStore.getState();
      store.addDevice(device);
      store.updateDevice("device-1", {
        settings: { brightness: 100, color: "warm" },
      });

      const updated = useSmartHomeStore.getState().connectedDevices.find((d) => d.id === "device-1");
      expect(updated?.settings.brightness).toBe(100);
    });

    it("tracks multiple devices", () => {
      const devices: SmartHomeDevice[] = [
        {
          id: "device-1",
          platform: "philips_hue",
          deviceName: "Living Room",
          deviceId: "hue-1",
          isEnabled: true,
          settings: {},
        },
        {
          id: "device-2",
          platform: "alexa",
          deviceName: "Echo",
          deviceId: "alexa-1",
          isEnabled: true,
          settings: {},
        },
      ];
      const store = useSmartHomeStore.getState();
      store.setConnectedDevices(devices);
      expect(useSmartHomeStore.getState().connectedDevices).toHaveLength(2);
    });
  });

  describe("scene management", () => {
    it("sets active scene", () => {
      const store = useSmartHomeStore.getState();
      store.setActiveScene("bedtime");
      expect(useSmartHomeStore.getState().activeScene).toBe("bedtime");
    });

    it("changes active scene", () => {
      const store = useSmartHomeStore.getState();
      store.setActiveScene("reading");
      store.setActiveScene("adventure");
      expect(useSmartHomeStore.getState().activeScene).toBe("adventure");
    });

    it("clears active scene", () => {
      const store = useSmartHomeStore.getState();
      store.setActiveScene("bedtime");
      store.setActiveScene(null);
      expect(useSmartHomeStore.getState().activeScene).toBeNull();
    });
  });

  describe("bedtime routine management", () => {
    it("sets bedtime routines", () => {
      const routines: BedtimeRoutine[] = [
        {
          id: 1,
          name: "Wind Down",
          scheduledTime: "20:00",
          steps: [],
          isActive: true,
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ];
      const store = useSmartHomeStore.getState();
      store.setBedtimeRoutines(routines);
      expect(useSmartHomeStore.getState().bedtimeRoutines).toEqual(routines);
    });

    it("adds a bedtime routine", () => {
      const routine: BedtimeRoutine = {
        id: 1,
        name: "Evening Ritual",
        scheduledTime: "19:30",
        steps: [
          {
            type: "dim_lights",
            duration: 300,
            config: { brightness: 30 },
          },
        ],
        isActive: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      };
      const store = useSmartHomeStore.getState();
      store.addBedtimeRoutine(routine);
      expect(useSmartHomeStore.getState().bedtimeRoutines).toContain(routine);
    });

    it("removes a bedtime routine", () => {
      const routine: BedtimeRoutine = {
        id: 1,
        name: "Bedtime",
        steps: [],
        isActive: true,
        daysOfWeek: [1, 2, 3],
      };
      const store = useSmartHomeStore.getState();
      store.addBedtimeRoutine(routine);
      store.removeBedtimeRoutine(1);
      expect(useSmartHomeStore.getState().bedtimeRoutines).not.toContain(routine);
    });

    it("updates bedtime routine", () => {
      const routine: BedtimeRoutine = {
        id: 1,
        name: "Bedtime",
        steps: [],
        isActive: true,
        daysOfWeek: [1, 2, 3],
      };
      const store = useSmartHomeStore.getState();
      store.addBedtimeRoutine(routine);
      store.updateBedtimeRoutine(1, { name: "Sleep Time" });

      const updated = useSmartHomeStore.getState().bedtimeRoutines.find((r) => r.id === 1);
      expect(updated?.name).toBe("Sleep Time");
    });
  });

  describe("bedtime steps", () => {
    it("creates routine with dim lights step", () => {
      const step: BedtimeStep = {
        type: "dim_lights",
        duration: 600,
        config: { brightness: 20, color: "warm" },
      };
      const routine: BedtimeRoutine = {
        id: 1,
        name: "Routine",
        steps: [step],
        isActive: true,
        daysOfWeek: [1, 2, 3],
      };
      const store = useSmartHomeStore.getState();
      store.addBedtimeRoutine(routine);

      const stored = useSmartHomeStore.getState().bedtimeRoutines[0];
      expect(stored.steps[0].type).toBe("dim_lights");
      expect(stored.steps[0].duration).toBe(600);
    });

    it("creates routine with multiple steps", () => {
      const steps: BedtimeStep[] = [
        {
          type: "dim_lights",
          duration: 300,
          config: { brightness: 50 },
        },
        {
          type: "play_music",
          duration: 1800,
          config: { genre: "calm" },
        },
        {
          type: "read_story",
          duration: 900,
          config: { category: "peaceful" },
        },
        {
          type: "lights_off",
          duration: 0,
          config: {},
        },
      ];
      const routine: BedtimeRoutine = {
        id: 1,
        name: "Full Routine",
        steps,
        isActive: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      };
      const store = useSmartHomeStore.getState();
      store.addBedtimeRoutine(routine);

      const stored = useSmartHomeStore.getState().bedtimeRoutines[0];
      expect(stored.steps).toHaveLength(4);
    });
  });

  describe("mood lighting", () => {
    it("sets current mood lighting", () => {
      const lighting: MoodLightingState = {
        mood: "calm",
        hue: 220,
        saturation: 60,
        lightness: 50,
        brightness: 30,
        colorHex: "#4A7BA7",
      };
      const store = useSmartHomeStore.getState();
      store.setCurrentMoodLighting(lighting);
      expect(useSmartHomeStore.getState().currentMoodLighting).toEqual(lighting);
    });

    it("enables mood lighting", () => {
      const store = useSmartHomeStore.getState();
      store.setMoodLightingEnabled(true);
      expect(useSmartHomeStore.getState().moodLightingEnabled).toBe(true);
    });

    it("disables mood lighting", () => {
      const store = useSmartHomeStore.getState();
      store.setMoodLightingEnabled(true);
      store.setMoodLightingEnabled(false);
      expect(useSmartHomeStore.getState().moodLightingEnabled).toBe(false);
    });

    it("tracks different moods", () => {
      const store = useSmartHomeStore.getState();
      const moods = ["adventure", "mystery", "happy", "scary", "calm", "magical", "sad"];

      moods.forEach((mood) => {
        store.setCurrentMoodLighting({
          mood,
          hue: 220,
          saturation: 50,
          lightness: 50,
          brightness: 50,
          colorHex: "#808080",
        });
      });

      expect(useSmartHomeStore.getState().currentMoodLighting?.mood).toBe("sad");
    });
  });

  describe("ambient sound", () => {
    it("enables ambient sound", () => {
      const store = useSmartHomeStore.getState();
      store.setAmbientSoundEnabled(true);
      expect(useSmartHomeStore.getState().ambientSoundEnabled).toBe(true);
    });

    it("disables ambient sound", () => {
      const store = useSmartHomeStore.getState();
      store.setAmbientSoundEnabled(true);
      store.setAmbientSoundEnabled(false);
      expect(useSmartHomeStore.getState().ambientSoundEnabled).toBe(false);
    });
  });

  describe("device status tracking", () => {
    it("sets device status", () => {
      const status = {
        "device-1": {
          name: "Living Room Light",
          platform: "philips_hue",
          isEnabled: true,
          isConnected: true,
          lastSeen: new Date(),
        },
      };
      const store = useSmartHomeStore.getState();
      store.setDeviceStatus(status);
      expect(useSmartHomeStore.getState().deviceStatus["device-1"]).toBeDefined();
    });

    it("tracks connection status", () => {
      const status = {
        "device-1": {
          name: "Light",
          platform: "philips_hue",
          isEnabled: true,
          isConnected: true,
          lastSeen: new Date(),
        },
        "device-2": {
          name: "Echo",
          platform: "alexa",
          isEnabled: true,
          isConnected: false,
          lastSeen: new Date(Date.now() - 3600000),
        },
      };
      const store = useSmartHomeStore.getState();
      store.setDeviceStatus(status);

      const state = useSmartHomeStore.getState();
      expect(state.deviceStatus["device-1"].isConnected).toBe(true);
      expect(state.deviceStatus["device-2"].isConnected).toBe(false);
    });
  });

  describe("loading and error states", () => {
    it("sets loading state", () => {
      const store = useSmartHomeStore.getState();
      store.setLoading(true);
      expect(useSmartHomeStore.getState().isLoading).toBe(true);
      store.setLoading(false);
      expect(useSmartHomeStore.getState().isLoading).toBe(false);
    });

    it("sets error message", () => {
      const store = useSmartHomeStore.getState();
      store.setError("Connection failed");
      expect(useSmartHomeStore.getState().error).toBe("Connection failed");
    });

    it("clears error message", () => {
      const store = useSmartHomeStore.getState();
      store.setError("Some error");
      store.setError(null);
      expect(useSmartHomeStore.getState().error).toBeNull();
    });
  });

  describe("smart home enable/disable", () => {
    it("enables smart home", () => {
      const store = useSmartHomeStore.getState();
      store.setSmartHomeEnabled(true);
      expect(useSmartHomeStore.getState().isSmartHomeEnabled).toBe(true);
    });

    it("disables smart home", () => {
      const store = useSmartHomeStore.getState();
      store.setSmartHomeEnabled(true);
      store.setSmartHomeEnabled(false);
      expect(useSmartHomeStore.getState().isSmartHomeEnabled).toBe(false);
    });
  });

  describe("reset functionality", () => {
    it("resets to initial state", () => {
      const store = useSmartHomeStore.getState();
      store.addDevice({
        id: "device-1",
        platform: "philips_hue",
        deviceName: "Light",
        deviceId: "hue-1",
        isEnabled: true,
        settings: {},
      });
      store.setSmartHomeEnabled(true);
      store.setActiveScene("bedtime");

      store.reset();

      const state = useSmartHomeStore.getState();
      expect(state.connectedDevices).toEqual([]);
      expect(state.isSmartHomeEnabled).toBe(false);
      expect(state.activeScene).toBeNull();
    });
  });

  describe("story mood integration", () => {
    it("adjusts lighting for story mood during reading", () => {
      const store = useSmartHomeStore.getState();

      // Adventure mood
      store.setCurrentMoodLighting({
        mood: "adventure",
        hue: 40,
        saturation: 100,
        lightness: 60,
        brightness: 80,
        colorHex: "#FF8C00",
      });
      store.setActiveScene("adventure");

      let state = useSmartHomeStore.getState();
      expect(state.currentMoodLighting?.hue).toBe(40);
      expect(state.activeScene).toBe("adventure");

      // Switch to calm mood
      store.setCurrentMoodLighting({
        mood: "calm",
        hue: 220,
        saturation: 60,
        lightness: 50,
        brightness: 30,
        colorHex: "#4A7BA7",
      });
      store.setActiveScene("bedtime");

      state = useSmartHomeStore.getState();
      expect(state.currentMoodLighting?.brightness).toBe(30);
      expect(state.activeScene).toBe("bedtime");
    });
  });

  describe("bedtime routine workflow", () => {
    it("supports complete bedtime routine", () => {
      const store = useSmartHomeStore.getState();

      // Create devices
      store.addDevice({
        id: "light-1",
        platform: "philips_hue",
        deviceName: "Bedroom Light",
        deviceId: "hue-1",
        isEnabled: true,
        settings: {},
      });

      // Create routine
      const routine: BedtimeRoutine = {
        id: 1,
        name: "Sleep Time",
        scheduledTime: "20:30",
        steps: [
          {
            type: "dim_lights",
            duration: 600,
            config: { brightness: 20 },
          },
          {
            type: "play_music",
            duration: 1800,
            config: { genre: "lullaby" },
          },
          {
            type: "read_story",
            duration: 900,
            config: { category: "peaceful" },
          },
          {
            type: "lights_off",
            duration: 0,
            config: {},
          },
        ],
        isActive: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      };
      store.addBedtimeRoutine(routine);

      const state = useSmartHomeStore.getState();
      expect(state.connectedDevices).toHaveLength(1);
      expect(state.bedtimeRoutines).toHaveLength(1);
      expect(state.bedtimeRoutines[0].steps).toHaveLength(4);
    });
  });
});
