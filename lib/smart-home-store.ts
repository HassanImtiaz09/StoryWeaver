// @ts-nocheck
import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SmartHomeDevice {
  id: string;
  platform: "philips_hue" | "alexa" | "google_home" | "other";
  deviceName: string;
  deviceId: string;
  isEnabled: boolean;
  settings: Record<string, any>;
}

export interface MoodLightingState {
  mood: string;
  hue: number;
  saturation: number;
  lightness: number;
  brightness: number;
  colorHex: string;
}

export interface BedtimeStep {
  type: "dim_lights" | "play_music" | "read_story" | "lights_off" | "ambient_sound" | "voice_command";
  duration: number;
  config: Record<string, any>;
}

export interface BedtimeRoutine {
  id: number;
  name: string;
  scheduledTime?: string;
  steps: BedtimeStep[];
  isActive: boolean;
  daysOfWeek: number[];
}

export interface DeviceStatus {
  [deviceId: string]: {
    name: string;
    platform: string;
    isEnabled: boolean;
    isConnected: boolean;
    lastSeen: Date;
  };
}

interface SmartHomeStore {
  // State
  connectedDevices: SmartHomeDevice[];
  activeScene: string | null;
  bedtimeRoutines: BedtimeRoutine[];
  isSmartHomeEnabled: boolean;
  currentMoodLighting: MoodLightingState | null;
  deviceStatus: DeviceStatus;
  ambientSoundEnabled: boolean;
  moodLightingEnabled: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setConnectedDevices: (devices: SmartHomeDevice[]) => void;
  addDevice: (device: SmartHomeDevice) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<SmartHomeDevice>) => void;
  setActiveScene: (scene: string | null) => void;
  setBedtimeRoutines: (routines: BedtimeRoutine[]) => void;
  addBedtimeRoutine: (routine: BedtimeRoutine) => void;
  removeBedtimeRoutine: (routineId: number) => void;
  updateBedtimeRoutine: (routineId: number, updates: Partial<BedtimeRoutine>) => void;
  setSmartHomeEnabled: (enabled: boolean) => void;
  setCurrentMoodLighting: (lighting: MoodLightingState) => void;
  setDeviceStatus: (status: DeviceStatus) => void;
  setAmbientSoundEnabled: (enabled: boolean) => void;
  setMoodLightingEnabled: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
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
};

export const useSmartHomeStore = create<SmartHomeStore>()(
  persist(
    (set) => ({
      ...initialState,

      setConnectedDevices: (devices) =>
        set({ connectedDevices: devices, isSmartHomeEnabled: devices.some((d) => d.isEnabled) }),

      addDevice: (device) =>
        set((state) => ({
          connectedDevices: [...state.connectedDevices, device],
          isSmartHomeEnabled: true,
        })),

      removeDevice: (deviceId) =>
        set((state) => {
          const filtered = state.connectedDevices.filter((d) => d.id !== deviceId);
          return {
            connectedDevices: filtered,
            isSmartHomeEnabled: filtered.some((d) => d.isEnabled),
          };
        }),

      updateDevice: (deviceId, updates) =>
        set((state) => ({
          connectedDevices: state.connectedDevices.map((d) =>
            d.id === deviceId ? { ...d, ...updates } : d
          ),
        })),

      setActiveScene: (scene) => set({ activeScene: scene }),

      setBedtimeRoutines: (routines) => set({ bedtimeRoutines: routines }),

      addBedtimeRoutine: (routine) =>
        set((state) => ({
          bedtimeRoutines: [...state.bedtimeRoutines, routine],
        })),

      removeBedtimeRoutine: (routineId) =>
        set((state) => ({
          bedtimeRoutines: state.bedtimeRoutines.filter((r) => r.id !== routineId),
        })),

      updateBedtimeRoutine: (routineId, updates) =>
        set((state) => ({
          bedtimeRoutines: state.bedtimeRoutines.map((r) =>
            r.id === routineId ? { ...r, ...updates } : r
          ),
        })),

      setSmartHomeEnabled: (enabled) => set({ isSmartHomeEnabled: enabled }),

      setCurrentMoodLighting: (lighting) => set({ currentMoodLighting: lighting }),

      setDeviceStatus: (status) => set({ deviceStatus: status }),

      setAmbientSoundEnabled: (enabled) => set({ ambientSoundEnabled: enabled }),

      setMoodLightingEnabled: (enabled) => set({ moodLightingEnabled: enabled }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: "smart-home-store",
      storage: {
        getItem: async (name) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error("Error reading from AsyncStorage:", error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error("Error writing to AsyncStorage:", error);
          }
        },
        removeItem: async (name) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (error) {
            console.error("Error removing from AsyncStorage:", error);
          }
        },
      },
      partialize: (state) => ({
        connectedDevices: state.connectedDevices,
        bedtimeRoutines: state.bedtimeRoutines,
        isSmartHomeEnabled: state.isSmartHomeEnabled,
        ambientSoundEnabled: state.ambientSoundEnabled,
        moodLightingEnabled: state.moodLightingEnabled,
      }),
    }
  )
);
