/**
 * useOfflineManager Hook
 *
 * React hook for convenient access to offline functionality
 */

import { useCallback, useMemo, useEffect, useState } from "react";
import { createOfflineManager, type OfflineManager, type StoryBundle } from "./offline-manager";
import { useOfflineStore } from "./offline-store";
import { getSettings } from "./settings-store";

interface UseOfflineManagerOptions {
  autoInitialize?: boolean;
}

/**
 * Hook to use offline manager in components
 */
export function useOfflineManager(userId: number, options: UseOfflineManagerOptions = {}) {
  const { autoInitialize = true } = options;

  const [manager] = useState<OfflineManager>(() => createOfflineManager(userId));
  const [isInitialized, setIsInitialized] = useState(false);
  const store = useOfflineStore();

  // Initialize on mount
  useEffect(() => {
    if (!autoInitialize) return;

    (async () => {
      try {
        // Load existing offline stories
        const stories = await manager.getOfflineStories();
        console.log(`Loaded ${stories.length} offline stories`);

        // Apply settings
        const settings = await getSettings();
        if (settings.offlineStorageQuota) {
          manager.setStorageQuota(settings.offlineStorageQuota * 1024 * 1024);
        }

        // Auto-prune if configured
        if (settings.autoPruneDays) {
          const pruned = await manager.pruneOldStories(settings.autoPruneDays);
          if (pruned > 0) {
            console.log(`Auto-pruned ${pruned} old stories`);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize offline manager:", error);
      }
    })();

    return () => {
      // Cleanup if needed
    };
  }, [manager, autoInitialize]);

  const downloadStory = useCallback(
    async (
      bundle: StoryBundle,
      episodeIds?: number[],
      onProgress?: (progress: number, status: string) => void
    ) => {
      return manager.downloadStoryForOffline(bundle, episodeIds, onProgress);
    },
    [manager]
  );

  const removeStory = useCallback(async (arcId: number) => {
    return manager.removeOfflineStory(arcId);
  }, [manager]);

  const getOfflineStories = useCallback(async () => {
    return manager.getOfflineStories();
  }, [manager]);

  const isStoryOffline = useCallback((arcId: number) => {
    return store.offlineStories.has(arcId);
  }, [store]);

  const getStorageUsage = useCallback(async () => {
    return manager.getOfflineStorageUsage();
  }, [manager]);

  const preloadNextEpisode = useCallback(
    async (
      bundle: StoryBundle,
      currentEpisodeNumber: number,
      onProgress?: (progress: number, status: string) => void
    ) => {
      return manager.preloadNextEpisode(bundle, currentEpisodeNumber, onProgress);
    },
    [manager]
  );

  const clearAllOffline = useCallback(async () => {
    return manager.clearAllOfflineData();
  }, [manager]);

  const setStorageQuota = useCallback((quotaMB: number) => {
    manager.setStorageQuota(quotaMB);
  }, [manager]);

  const pruneOldStories = useCallback(async (maxAgeDays: number) => {
    return manager.pruneOldStories(maxAgeDays);
  }, [manager]);

  const isNetworkAvailable = useCallback(() => {
    return manager.isNetworkAvailable();
  }, [manager]);

  const getStorageBreakdown = useCallback(() => {
    return store.getStorageBreakdown();
  }, [store]);

  const offlineStories = useMemo(() => {
    return Array.from(store.offlineStories.values());
  }, [store.offlineStories]);

  const activeDownloads = useMemo(() => {
    return Array.from(store.activeDownloads.values());
  }, [store.activeDownloads]);

  return {
    // Manager instance
    manager,
    isInitialized,

    // Story operations
    downloadStory,
    removeStory,
    getOfflineStories,
    isStoryOffline,
    clearAllOffline,

    // Storage operations
    getStorageUsage,
    getStorageBreakdown,
    setStorageQuota,
    pruneOldStories,

    // Smart preloading
    preloadNextEpisode,

    // Network status
    isNetworkAvailable,

    // Store data
    offlineStories,
    activeDownloads,
    totalStorageUsed: store.totalStorageUsed,
    isOnline: store.isOnline,
    syncStatus: store.syncStatus,
  };
}

/**
 * Hook to get a single offline story with refresh capability
 */
export function useOfflineStory(arcId: number) {
  const store = useOfflineStore();
  const story = store.offlineStories.get(arcId);

  return {
    story,
    isAvailable: story !== undefined,
    lastAccessedAt: story?.lastAccessedAt,
    downloadedAt: story?.downloadedAt,
    episodeCount: story?.episodes.size || 0,
  };
}

/**
 * Hook to monitor storage usage
 */
export function useOfflineStorage() {
  const store = useOfflineStore();
  const [formattedUsage, setFormattedUsage] = useState({
    usedMB: 0,
    quotaMB: 0,
    percentUsed: 0,
  });

  useEffect(() => {
    const breakdown = store.getStorageBreakdown();
    const usedMB = Math.round(breakdown.used / (1024 * 1024));
    const quotaMB = Math.round(breakdown.quota / (1024 * 1024));
    const percentUsed = Math.round((breakdown.used / breakdown.quota) * 100);

    setFormattedUsage({ usedMB, quotaMB, percentUsed });
  }, [store.totalStorageUsed, store.storageQuotaBytes]);

  return {
    ...formattedUsage,
    breakdown: store.getStorageBreakdown(),
  };
}

/**
 * Hook to monitor download progress
 */
export function useDownloadProgress(arcId: number, episodeId?: number) {
  const store = useOfflineStore();
  const key = `${arcId}_${episodeId || "all"}`;
  const download = store.activeDownloads.get(key);

  return {
    isDownloading: download?.status === "downloading",
    progress: download?.progress || 0,
    status: download?.status,
    error: download?.error,
    totalBytes: download?.totalBytes || 0,
    downloadedBytes: download?.downloadedBytes || 0,
  };
}

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const store = useOfflineStore();

  return {
    isOnline: store.isOnline,
    connectionType: store.connectionType,
    lastSyncAt: store.lastSyncAt,
    syncStatus: store.syncStatus,
  };
}
