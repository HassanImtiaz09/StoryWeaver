/**
 * Character Avatar Store
 *
 * Zustand store managing the character creation flow:
 * - Stores uploaded photos and generated avatars
 * - Manages avatar selection per child
 * - Handles image generation progress
 * - Persists state to AsyncStorage
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist } from "zustand/middleware";
import type { CharacterDescription } from "@/server/_core/characterGenerator";

export type ArtStyle = "watercolor" | "cartoon" | "anime" | "storybook-classic" | "pixel-art";

/**
 * Uploaded photo info
 */
export interface UploadedPhoto {
  id: string;
  uri: string;
  childId: number;
  uploadedAt: Date;
  base64?: string; // For server transmission
}

/**
 * Generated avatar variant
 */
export interface AvatarVariant {
  id: string;
  portrait: string; // URL to portrait/headshot
  fullBody: string; // URL to full-body pose
  actionPose: string; // URL to action pose
  description: CharacterDescription;
  artStyle: ArtStyle;
  createdAt: Date;
}

/**
 * Character Avatar Store State
 */
interface CharacterAvatarState {
  // Storage
  uploadedPhotos: Record<number, UploadedPhoto>; // childId -> photo
  generatedAvatars: Record<number, AvatarVariant[]>; // childId -> variants
  selectedAvatarId: Record<number, string>; // childId -> selected avatar ID

  // UI State
  isGenerating: boolean;
  generationProgress: number; // 0-100
  currentStep: "upload" | "style" | "generate" | "select" | "confirm" | null;
  error: string | null;

  // Settings
  enableCharacterAvatar: boolean;
  preferredArtStyle: ArtStyle;

  // Actions
  uploadPhoto: (childId: number, photoUri: string, base64: string) => Promise<void>;
  setGenerating: (isGenerating: boolean, progress?: number) => void;
  setProgress: (progress: number) => void;
  setCurrentStep: (
    step: "upload" | "style" | "generate" | "select" | "confirm" | null
  ) => void;
  setError: (error: string | null) => void;
  addGeneratedAvatars: (childId: number, avatars: AvatarVariant[]) => void;
  selectAvatar: (childId: number, avatarId: string) => void;
  getSelectedAvatar: (childId: number) => AvatarVariant | null;
  getAvatarForChild: (childId: number) => AvatarVariant | null;
  getUploadedPhoto: (childId: number) => UploadedPhoto | null;
  clearAvatars: (childId: number) => void;
  clearAll: () => void;
  setPreferredStyle: (style: ArtStyle) => void;
  setCharacterAvatarEnabled: (enabled: boolean) => void;
}

/**
 * Create the character avatar store
 */
export const useCharacterAvatarStore = create<CharacterAvatarState>()(
  persist(
    (set, get) => ({
      uploadedPhotos: {},
      generatedAvatars: {},
      selectedAvatarId: {},
      isGenerating: false,
      generationProgress: 0,
      currentStep: null,
      error: null,
      enableCharacterAvatar: true,
      preferredArtStyle: "watercolor",

      uploadPhoto: async (childId: number, photoUri: string, base64: string) => {
        const photo: UploadedPhoto = {
          id: `photo-${Date.now()}`,
          uri: photoUri,
          childId,
          uploadedAt: new Date(),
          base64,
        };

        set((state) => ({
          uploadedPhotos: {
            ...state.uploadedPhotos,
            [childId]: photo,
          },
          error: null,
        }));
      },

      setGenerating: (isGenerating: boolean, progress: number = 0) => {
        set({
          isGenerating,
          generationProgress: progress,
        });
      },

      setProgress: (progress: number) => {
        set({
          generationProgress: Math.min(100, Math.max(0, progress)),
        });
      },

      setCurrentStep: (step) => {
        set({
          currentStep: step,
        });
      },

      setError: (error: string | null) => {
        set({
          error,
          isGenerating: false,
        });
      },

      addGeneratedAvatars: (childId: number, avatars: AvatarVariant[]) => {
        set((state) => ({
          generatedAvatars: {
            ...state.generatedAvatars,
            [childId]: avatars,
          },
          error: null,
        }));
      },

      selectAvatar: (childId: number, avatarId: string) => {
        const avatars = get().generatedAvatars[childId];
        if (!avatars || !avatars.find((a) => a.id === avatarId)) {
          set({
            error: "Avatar not found",
          });
          return;
        }

        set((state) => ({
          selectedAvatarId: {
            ...state.selectedAvatarId,
            [childId]: avatarId,
          },
          error: null,
        }));
      },

      getSelectedAvatar: (childId: number) => {
        const state = get();
        const avatarId = state.selectedAvatarId[childId];
        const avatars = state.generatedAvatars[childId];

        if (!avatarId || !avatars) {
          return null;
        }

        return avatars.find((a) => a.id === avatarId) || null;
      },

      getAvatarForChild: (childId: number) => {
        const state = get();
        return state.getSelectedAvatar(childId);
      },

      getUploadedPhoto: (childId: number) => {
        return get().uploadedPhotos[childId] || null;
      },

      clearAvatars: (childId: number) => {
        set((state) => {
          const newUploadedPhotos = { ...state.uploadedPhotos };
          const newGeneratedAvatars = { ...state.generatedAvatars };
          const newSelectedAvatarId = { ...state.selectedAvatarId };

          delete newUploadedPhotos[childId];
          delete newGeneratedAvatars[childId];
          delete newSelectedAvatarId[childId];

          return {
            uploadedPhotos: newUploadedPhotos,
            generatedAvatars: newGeneratedAvatars,
            selectedAvatarId: newSelectedAvatarId,
          };
        });
      },

      clearAll: () => {
        set({
          uploadedPhotos: {},
          generatedAvatars: {},
          selectedAvatarId: {},
          isGenerating: false,
          generationProgress: 0,
          currentStep: null,
          error: null,
        });
      },

      setPreferredStyle: (style: ArtStyle) => {
        set({
          preferredArtStyle: style,
        });
      },

      setCharacterAvatarEnabled: (enabled: boolean) => {
        set({
          enableCharacterAvatar: enabled,
        });
      },
    }),
    {
      name: "character-avatar-store",
      storage: {
        getItem: async (name: string) => {
          const item = await AsyncStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: async (name: string, value: unknown) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name: string) => {
          await AsyncStorage.removeItem(name);
        },
      },
      // Only persist certain fields to avoid issues with large data
      partialize: (state) => ({
        enableCharacterAvatar: state.enableCharacterAvatar,
        preferredArtStyle: state.preferredArtStyle,
        selectedAvatarId: state.selectedAvatarId,
      }),
    }
  )
);

/**
 * Hook to get character avatar for a specific child
 */
export function useCharacterAvatar(childId: number) {
  const store = useCharacterAvatarStore();
  const selectedAvatar = store.getSelectedAvatar(childId);
  const uploadedPhoto = store.getUploadedPhoto(childId);
  const generatedAvatars = store.generatedAvatars[childId] || [];

  return {
    selectedAvatar,
    uploadedPhoto,
    generatedAvatars,
    isGenerating: store.isGenerating,
    progress: store.generationProgress,
    error: store.error,
  };
}

/**
 * Hook to manage character avatar flow
 */
export function useCharacterAvatarFlow(childId: number) {
  const store = useCharacterAvatarStore();

  return {
    uploadPhoto: (photoUri: string, base64: string) =>
      store.uploadPhoto(childId, photoUri, base64),
    selectAvatar: (avatarId: string) => store.selectAvatar(childId, avatarId),
    setGenerating: (isGenerating: boolean, progress?: number) =>
      store.setGenerating(isGenerating, progress),
    setProgress: (progress: number) => store.setProgress(progress),
    setCurrentStep: store.setCurrentStep,
    setError: store.setError,
    addGeneratedAvatars: (avatars: AvatarVariant[]) =>
      store.addGeneratedAvatars(childId, avatars),
    clearAvatars: () => store.clearAvatars(childId),
    currentStep: store.currentStep,
    error: store.error,
  };
}
