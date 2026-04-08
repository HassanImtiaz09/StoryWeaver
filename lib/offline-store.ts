/**
 * Offline Store (Zustand)
 *
 * Manages offline story state and synchronization.
 * Tracks downloaded stories, active downloads, storage usage, and network status.
 */

import { create } from "zustand";
import { networkMonitor, type ConnectionType } from "./network-monitor";
import { offlineStorageService } from "./offline-storage";

export interface OfflineEpisodeInfo {
  episodeId: number;
  episodeNumber: number;
  title: string;
  textCached: boolean;
  imagesCached: boolean;
  audioCached: boolean;
  musicCached: boolean;
  totalSize: number;
  downloadedAt: Date;
  lastAccessedAt: Date;
}

export interface OfflineStoryInfo {
  arcId: number;
  userId: number;
  title: string;
  theme: string;
  coverImageUrl?: string;
  synopsis?: string;
  episodes: Map<number, OfflineEpisodeInfo>;
  downloadedAt: Date;
  lastAccessedAt: Date;
  totalSize: number;
}

export interface ActiveDownload {
  arcId: number;
  episodeId?: number;
  type: "story" | "images" | "audio";
  progress: number; // 0-100
  totalBytes: number;
  downloadedBytes: number;
  status: "pending" | "downloading" | "paused" | "completed" | "error";
  error?: string;
  startedAt: Date;
}

export interface OfflineStoreState {
  // Data
  offlineStories: Map<number, OfflineStoryInfo>;
  downloadQueue: ActiveDownload[];
  activeDownloads: Map<string, ActiveDownload>;
  totalStorageUsed: number;
  storageQuotaBytes: number;

  // Network status
  isOnline: boolean;
  connectionType: ConnectionType;
  syncStatus: "idle" | "syncing" | "error";
  lastSyncAt?: Date;

  // Actions
  addOfflineStory: (story: OfflineStoryInfo) => void;
  removeOfflineStory: (arcId: number) => void;
  getOfflineStory: (arcId: number) => OfflineStoryInfo | undefined;
  updateEpisodeProgress: (arcId: number, episodeId: number, progress: Partial<OfflineEpisodeInfo>) => void;

  startDownload: (download: ActiveDownload) => void;
  updateDownloadProgress: (
    arcId: number,
    episodeId: number | undefined,
    progress: number,
    downloadedBytes: number
  ) => void;
  completeDownload: (arcId: number, episodeId: number | undefined) => void;
  cancelDownload: (arcId: number, episodeId: number | undefined) => void;
  setDownloadError: (arcId: number, episodeId: number | undefined, error: string) => void;

  setStorageUsage: (bytes: number) => void;
  setStorageQuota: (bytes: number) => void;
  refreshOnlineStatus: () => void;
  setSyncStatus: (status: "idle" | "syncing" | "error") => void;

  getStorageBreakdown: () => {
    used: number;
    quota: number;
    percentUsed: number;
    remaining: number;
  };

  // Cleanup
  clearAllOfflineData: () => Promise<void>;
  pruneOldStories: (maxAgeDays: number) => Promise<number>;
}

const createOfflineStore = () =>
  create<OfflineStoreState>((set, get) => {
    // Setup network monitoring
    const unsubscribeNetworkMonitor = networkMonitor.onConnectivityChange(
      (isOnline, type) => {
        set({ isOnline, connectionType: type });

        // Trigger sync when coming back online
        if (isOnline) {
          set({ syncStatus: "syncing" });
          // In a real app, would trigger actual sync here
          setTimeout(() => {
            set({ syncStatus: "idle", lastSyncAt: new Date() });
          }, 1000);
        }
      }
    );

    return {
      // Initial state
      offlineStories: new Map(),
      downloadQueue: [],
      activeDownloads: new Map(),
      totalStorageUsed: 0,
      storageQuotaBytes: 500 * 1024 * 1024, // 500MB default

      isOnline: networkMonitor.isOnline(),
      connectionType: networkMonitor.getConnectionType(),
      syncStatus: "idle",

      // Story management
      addOfflineStory: (story) => {
        set((state) => {
          const newStories = new Map(state.offlineStories);
          newStories.set(story.arcId, story);
          return { offlineStories: newStories };
        });
      },

      removeOfflineStory: (arcId) => {
        set((state) => {
          const newStories = new Map(state.offlineStories);
          newStories.delete(arcId);
          return { offlineStories: newStories };
        });
      },

      getOfflineStory: (arcId) => {
        return get().offlineStories.get(arcId);
      },

      updateEpisodeProgress: (arcId, episodeId, progress) => {
        set((state) => {
          const story = state.offlineStories.get(arcId);
          if (!story) return {};

          const episodes = new Map(story.episodes);
          const episode = episodes.get(episodeId);
          if (!episode) return {};

          const updated = {
            ...episode,
            ...progress,
            lastAccessedAt: new Date(),
          };
          episodes.set(episodeId, updated);

          const newStory: OfflineStoryInfo = {
            ...story,
            episodes,
            lastAccessedAt: new Date(),
          };

          const newStories = new Map(state.offlineStories);
          newStories.set(arcId, newStory);

          return { offlineStories: newStories };
        });
      },

      // Download management
      startDownload: (download) => {
        set((state) => {
          const key = `${download.arcId}_${download.episodeId || "all"}`;
          const downloads = new Map(state.activeDownloads);
          downloads.set(key, download);

          const queue = [...state.downloadQueue, download].filter(
            (d, i, arr) =>
              arr.findIndex(
                (x) =>
                  x.arcId === d.arcId &&
                  x.episodeId === d.episodeId &&
                  x.type === d.type
              ) === i
          );

          return {
            activeDownloads: downloads,
            downloadQueue: queue,
          };
        });
      },

      updateDownloadProgress: (arcId, episodeId, progress, downloadedBytes) => {
        set((state) => {
          const key = `${arcId}_${episodeId || "all"}`;
          const download = state.activeDownloads.get(key);

          if (!download) return {};

          const updated: ActiveDownload = {
            ...download,
            progress: Math.min(100, Math.max(0, progress)),
            downloadedBytes,
            status: "downloading",
          };

          const downloads = new Map(state.activeDownloads);
          downloads.set(key, updated);

          return { activeDownloads: downloads };
        });
      },

      completeDownload: (arcId, episodeId) => {
        set((state) => {
          const key = `${arcId}_${episodeId || "all"}`;
          const downloads = new Map(state.activeDownloads);
          const download = downloads.get(key);

          if (download) {
            downloads.set(key, {
              ...download,
              progress: 100,
              status: "completed",
            });
          }

          const queue = state.downloadQueue.filter(
            (d) => !(d.arcId === arcId && d.episodeId === episodeId)
          );

          return {
            activeDownloads: downloads,
            downloadQueue: queue,
          };
        });
      },

      cancelDownload: (arcId, episodeId) => {
        set((state) => {
          const key = `${arcId}_${episodeId || "all"}`;
          const downloads = new Map(state.activeDownloads);
          downloads.delete(key);

          const queue = state.downloadQueue.filter(
            (d) => !(d.arcId === arcId && d.episodeId === episodeId)
          );

          return {
            activeDownloads: downloads,
            downloadQueue: queue,
          };
        });
      },

      setDownloadError: (arcId, episodeId, error) => {
        set((state) => {
          const key = `${arcId}_${episodeId || "all"}`;
          const download = state.activeDownloads.get(key);

          if (download) {
            const downloads = new Map(state.activeDownloads);
            downloads.set(key, {
              ...download,
              status: "error",
              error,
            });
            return { activeDownloads: downloads };
          }

          return {};
        });
      },

      // Storage management
      setStorageUsage: (bytes) => {
        set({ totalStorageUsed: bytes });
      },

      setStorageQuota: (bytes) => {
        set({ storageQuotaBytes: bytes });
      },

      getStorageBreakdown: () => {
        const state = get();
        const used = state.totalStorageUsed;
        const quota = state.storageQuotaBytes;
        const percentUsed = (used / quota) * 100;
        const remaining = Math.max(0, quota - used);

        return {
          used,
          quota,
          percentUsed,
          remaining,
        };
      },

      // Network status
      refreshOnlineStatus: () => {
        const isOnline = networkMonitor.isOnline();
        const type = networkMonitor.getConnectionType();
        set({ isOnline, connectionType: type });
      },

      setSyncStatus: (status) => {
        set({
          syncStatus: status,
          lastSyncAt: status === "idle" ? new Date() : get().lastSyncAt,
        });
      },

      // Cleanup
      clearAllOfflineData: async () => {
        await offlineStorageService.clearAllOfflineData();
        set({
          offlineStories: new Map(),
          totalStorageUsed: 0,
          downloadQueue: [],
          activeDownloads: new Map(),
        });
      },

      pruneOldStories: async (maxAgeDays) => {
        const pruned = await offlineStorageService.pruneOldCache(maxAgeDays);

        // Update stories map
        set((state) => {
          const newStories = new Map(state.offlineStories);
          const now = Date.now();
          const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

          for (const [arcId, story] of newStories) {
            if (now - story.lastAccessedAt.getTime() > maxAgeMs) {
              newStories.delete(arcId);
            }
          }

          return { offlineStories: newStories };
        });

        return pruned;
      },
    };
  });

export const useOfflineStore = createOfflineStore();

// Cleanup on unmount
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    // Cleanup could happen here if needed
  });
}
