import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Sharing State Store
 * Manages sharing state, gallery stories, and share history locally
 */

export interface GalleryStory {
  id: number;
  arcId: number;
  title: string;
  theme: string;
  coverImageUrl: string | null;
  synopsis: string | null;
  childName: string;
  childAge: number;
  viewCount: number;
  likeCount: number;
  publishedAt: Date | null;
  isLiked?: boolean;
}

export interface SharedStoryInfo {
  arcId: number;
  shareCode: string;
  shareUrl: string;
  privacyLevel: "private" | "link_only" | "public";
  isPublished: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  publishedAt: Date | null;
  isLiked?: boolean;
}

export interface ShareHistoryEntry {
  arcId: number;
  title: string;
  sharedAt: Date;
  platform?: string; // "facebook", "twitter", "copy-link", etc.
}

export interface SharingState {
  // Shared stories mapping
  sharedStories: Map<number, SharedStoryInfo>;

  // Gallery browsing
  galleryStories: GalleryStory[];
  galleryPage: number;
  hasMoreGalleryStories: boolean;
  galleryFilters: {
    theme?: string;
    ageGroup?: string;
    sortBy: "popular" | "recent" | "liked";
    searchQuery?: string;
  };

  // Loading states
  isSharing: boolean;
  isLoadingGallery: boolean;

  // Share history
  shareHistory: ShareHistoryEntry[];

  // User's shared stories
  mySharedStories: SharedStoryInfo[];

  // Actions
  setSharedStory: (arcId: number, info: SharedStoryInfo) => void;
  getSharedStory: (arcId: number) => SharedStoryInfo | undefined;
  removeSharedStory: (arcId: number) => void;

  // Gallery actions
  setGalleryStories: (stories: GalleryStory[], isFirstPage: boolean) => void;
  addGalleryStories: (stories: GalleryStory[]) => void;
  setGalleryPage: (page: number) => void;
  setHasMoreGallery: (hasMore: boolean) => void;
  setGalleryFilters: (filters: Partial<SharingState["galleryFilters"]>) => void;
  resetGalleryFilters: () => void;

  // Loading
  setIsSharing: (loading: boolean) => void;
  setIsLoadingGallery: (loading: boolean) => void;

  // Like/unlike
  toggleLikeStory: (storyId: number) => void;
  updateStoryLikeCount: (storyId: number, likeCount: number) => void;

  // Share history
  addShareHistoryEntry: (entry: ShareHistoryEntry) => void;
  clearShareHistory: () => void;

  // My shared stories
  setMySharedStories: (stories: SharedStoryInfo[]) => void;
  updateMySharedStory: (arcId: number, updates: Partial<SharedStoryInfo>) => void;

  // Clear all
  reset: () => void;
}

const initialState = {
  sharedStories: new Map(),
  galleryStories: [],
  galleryPage: 0,
  hasMoreGalleryStories: true,
  galleryFilters: {
    sortBy: "recent" as const,
  },
  isSharing: false,
  isLoadingGallery: false,
  shareHistory: [],
  mySharedStories: [],
};

export const useSharingStore = create<SharingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSharedStory: (arcId: number, info: SharedStoryInfo) => {
        set((state) => {
          const newShared = new Map(state.sharedStories);
          newShared.set(arcId, info);
          return { sharedStories: newShared };
        });
      },

      getSharedStory: (arcId: number) => {
        return get().sharedStories.get(arcId);
      },

      removeSharedStory: (arcId: number) => {
        set((state) => {
          const newShared = new Map(state.sharedStories);
          newShared.delete(arcId);
          return { sharedStories: newShared };
        });
      },

      setGalleryStories: (stories: GalleryStory[], isFirstPage: boolean) => {
        set({
          galleryStories: stories,
          galleryPage: isFirstPage ? 1 : get().galleryPage + 1,
        });
      },

      addGalleryStories: (stories: GalleryStory[]) => {
        set((state) => ({
          galleryStories: [...state.galleryStories, ...stories],
        }));
      },

      setGalleryPage: (page: number) => {
        set({ galleryPage: page });
      },

      setHasMoreGallery: (hasMore: boolean) => {
        set({ hasMoreGalleryStories: hasMore });
      },

      setGalleryFilters: (filters: Partial<SharingState["galleryFilters"]>) => {
        set((state) => ({
          galleryFilters: {
            ...state.galleryFilters,
            ...filters,
          },
          galleryPage: 0, // Reset pagination when filters change
          galleryStories: [],
        }));
      },

      resetGalleryFilters: () => {
        set({
          galleryFilters: {
            sortBy: "popular",
          },
          galleryPage: 0,
          galleryStories: [],
        });
      },

      setIsSharing: (loading: boolean) => {
        set({ isSharing: loading });
      },

      setIsLoadingGallery: (loading: boolean) => {
        set({ isLoadingGallery: loading });
      },

      toggleLikeStory: (storyId: number) => {
        set((state) => {
          const updated = state.galleryStories.map((story) => {
            if (story.id === storyId) {
              return {
                ...story,
                isLiked: !story.isLiked,
                likeCount: story.isLiked ? story.likeCount - 1 : story.likeCount + 1,
              };
            }
            return story;
          });
          return { galleryStories: updated };
        });
      },

      updateStoryLikeCount: (storyId: number, likeCount: number) => {
        set((state) => {
          const updated = state.galleryStories.map((story) => {
            if (story.id === storyId) {
              return { ...story, likeCount };
            }
            return story;
          });
          return { galleryStories: updated };
        });
      },

      addShareHistoryEntry: (entry: ShareHistoryEntry) => {
        set((state) => ({
          shareHistory: [entry, ...state.shareHistory].slice(0, 50), // Keep last 50
        }));
      },

      clearShareHistory: () => {
        set({ shareHistory: [] });
      },

      setMySharedStories: (stories: SharedStoryInfo[]) => {
        set({ mySharedStories: stories });
      },

      updateMySharedStory: (arcId: number, updates: Partial<SharedStoryInfo>) => {
        set((state) => ({
          mySharedStories: state.mySharedStories.map((story) => {
            if (story.arcId === arcId) {
              return { ...story, ...updates };
            }
            return story;
          }),
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "storyweaver_sharing",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        shareHistory: state.shareHistory,
        galleryFilters: state.galleryFilters,
      }),
    }
  )
);
