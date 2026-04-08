/**
 * Offline Manager
 *
 * High-level API for managing offline content.
 * Coordinates story downloads, caching, and preloading.
 */

import { offlineStorageService, type StoryTextData } from "./offline-storage";
import { useOfflineStore, type OfflineStoryInfo, type OfflineEpisodeInfo } from "./offline-store";
import { networkMonitor } from "./network-monitor";

type DownloadProgressCallback = (progress: number, status: string) => void;

export interface StoryBundle {
  arcId: number;
  userId: number;
  title: string;
  theme: string;
  coverImageUrl?: string;
  synopsis?: string;
  episodes: EpisodeBundle[];
}

export interface EpisodeBundle {
  episodeId: number;
  episodeNumber: number;
  title: string;
  summary?: string;
  pages: PageBundle[];
  musicUrl?: string;
  fullAudioUrl?: string;
}

export interface PageBundle {
  pageNumber: number;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  mood?: string;
  characters?: Array<{
    name: string;
    traits: string[];
    voiceRole?: string;
  }>;
}

/**
 * Offline Manager
 *
 * Provides high-level API for offline story management.
 */
export class OfflineManager {
  private userId: number;
  private defaultQuotaBytes: number = 500 * 1024 * 1024; // 500MB

  constructor(userId: number) {
    this.userId = userId;
    this.initializeStore();
  }

  /**
   * Initialize the offline store with settings
   */
  private initializeStore(): void {
    useOfflineStore.setState({
      storageQuotaBytes: this.defaultQuotaBytes,
    });
  }

  /**
   * Download a complete story arc for offline access
   * Optionally download specific episodes only
   */
  async downloadStoryForOffline(
    bundle: StoryBundle,
    episodeIds?: number[],
    progressCallback?: DownloadProgressCallback
  ): Promise<void> {
    const store = useOfflineStore.getState();

    // Check if enough storage available
    const episodesToDownload = episodeIds
      ? bundle.episodes.filter((e) => episodeIds.includes(e.episodeId))
      : bundle.episodes;

    const estimatedSize = this.estimateDownloadSize(episodesToDownload);
    const breakdown = store.getStorageBreakdown();

    if (breakdown.remaining < estimatedSize) {
      throw new Error(
        `Insufficient storage. Need ${estimatedSize} bytes, have ${breakdown.remaining} bytes.`
      );
    }

    try {
      const storyDownloadKey = `${bundle.arcId}_all`;
      useOfflineStore.getState().startDownload({
        arcId: bundle.arcId,
        type: "story",
        progress: 0,
        totalBytes: estimatedSize,
        downloadedBytes: 0,
        status: "downloading",
        startedAt: new Date(),
      });

      // Download each episode
      const episodes: Map<number, OfflineEpisodeInfo> = new Map();
      let completedBytes = 0;

      for (const episode of episodesToDownload) {
        progressCallback?.((completedBytes / estimatedSize) * 100, "Downloading story text...");

        const episodeInfo = await this.downloadEpisode(
          bundle,
          episode,
          progressCallback
        );

        episodes.set(episode.episodeId, episodeInfo);
        completedBytes += this.estimateDownloadSize([episode]);
      }

      // Create offline story info
      const offlineStory: OfflineStoryInfo = {
        arcId: bundle.arcId,
        userId: this.userId,
        title: bundle.title,
        theme: bundle.theme,
        coverImageUrl: bundle.coverImageUrl,
        synopsis: bundle.synopsis,
        episodes,
        downloadedAt: new Date(),
        lastAccessedAt: new Date(),
        totalSize: estimatedSize,
      };

      useOfflineStore.getState().addOfflineStory(offlineStory);
      useOfflineStore.getState().completeDownload(bundle.arcId, undefined);

      // Update storage usage
      const newUsage = await offlineStorageService.getStorageUsage();
      useOfflineStore.getState().setStorageUsage(newUsage);

      progressCallback?.(100, "Download complete!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      useOfflineStore.getState().setDownloadError(bundle.arcId, undefined, errorMessage);
      throw error;
    }
  }

  /**
   * Download a single episode
   */
  private async downloadEpisode(
    bundle: StoryBundle,
    episode: EpisodeBundle,
    progressCallback?: DownloadProgressCallback
  ): Promise<OfflineEpisodeInfo> {
    const episodeKey = `${bundle.arcId}_${episode.episodeId}`;
    const episodeSize = this.estimateDownloadSize([episode]);

    useOfflineStore.getState().startDownload({
      arcId: bundle.arcId,
      episodeId: episode.episodeId,
      type: "story",
      progress: 0,
      totalBytes: episodeSize,
      downloadedBytes: 0,
      status: "downloading",
      startedAt: new Date(),
    });

    try {
      // Save story text
      const storyData: StoryTextData = {
        episodeId: episode.episodeId,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        summary: episode.summary,
        pages: episode.pages,
        musicUrl: episode.musicUrl,
        fullAudioUrl: episode.fullAudioUrl,
      };

      await offlineStorageService.saveStoryText(
        this.userId,
        bundle.arcId,
        episode.episodeId,
        storyData
      );

      progressCallback?.(
        (episodeSize * 0.3) / episodeSize * 100,
        `Downloading images for episode ${episode.episodeNumber}...`
      );

      // Download images
      let imagesSize = 0;
      const imagesToDownload = episode.pages.filter((p) => p.imageUrl);

      for (let i = 0; i < imagesToDownload.length; i++) {
        const page = imagesToDownload[i];
        if (page.imageUrl) {
          try {
            await offlineStorageService.downloadAndCacheImage(
              page.imageUrl,
              this.userId,
              bundle.arcId,
              episode.episodeId,
              page.pageNumber
            );
            imagesSize += this.estimateImageSize();
            progressCallback?.(
              (0.3 + (imagesSize / episodeSize) * 0.4) * 100,
              `Downloaded ${i + 1}/${imagesToDownload.length} images`
            );
          } catch (error) {
            console.error(`Failed to download image for page ${page.pageNumber}:`, error);
          }
        }
      }

      progressCallback?.(70, `Downloading audio for episode ${episode.episodeNumber}...`);

      // Download audio
      if (episode.fullAudioUrl) {
        try {
          await offlineStorageService.downloadAndCacheAudio(
            episode.fullAudioUrl,
            this.userId,
            bundle.arcId,
            episode.episodeId,
            "narration"
          );
        } catch (error) {
          console.error(`Failed to download audio:`, error);
        }
      }

      if (episode.musicUrl) {
        try {
          await offlineStorageService.downloadAndCacheAudio(
            episode.musicUrl,
            this.userId,
            bundle.arcId,
            episode.episodeId,
            "music"
          );
        } catch (error) {
          console.error(`Failed to download music:`, error);
        }
      }

      useOfflineStore.getState().completeDownload(bundle.arcId, episode.episodeId);

      const episodeInfo: OfflineEpisodeInfo = {
        episodeId: episode.episodeId,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        textCached: true,
        imagesCached: imagesToDownload.length > 0,
        audioCached: !!episode.fullAudioUrl,
        musicCached: !!episode.musicUrl,
        totalSize: episodeSize,
        downloadedAt: new Date(),
        lastAccessedAt: new Date(),
      };

      return episodeInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      useOfflineStore.getState().setDownloadError(bundle.arcId, episode.episodeId, errorMessage);
      throw error;
    }
  }

  /**
   * Remove offline copy of a story
   */
  async removeOfflineStory(arcId: number): Promise<void> {
    try {
      await offlineStorageService.removeOfflineArc(this.userId, arcId);
      useOfflineStore.getState().removeOfflineStory(arcId);

      const newUsage = await offlineStorageService.getStorageUsage();
      useOfflineStore.getState().setStorageUsage(newUsage);
    } catch (error) {
      console.error("Failed to remove offline story:", error);
      throw error;
    }
  }

  /**
   * Get list of available offline stories
   */
  async getOfflineStories(): Promise<OfflineStoryInfo[]> {
    const store = useOfflineStore.getState();
    return Array.from(store.offlineStories.values());
  }

  /**
   * Check if a story is available offline
   */
  async isStoryAvailableOffline(arcId: number): Promise<boolean> {
    const store = useOfflineStore.getState();
    return store.offlineStories.has(arcId);
  }

  /**
   * Get offline storage usage
   */
  async getOfflineStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number }> {
    const store = useOfflineStore.getState();
    const breakdown = store.getStorageBreakdown();

    return {
      usedBytes: breakdown.used,
      quotaBytes: breakdown.quota,
    };
  }

  /**
   * Clear all offline data
   */
  async clearAllOfflineData(): Promise<void> {
    await useOfflineStore.getState().clearAllOfflineData();
  }

  /**
   * Smart preload of the next episode
   * Predicts which episode user is likely to read next
   */
  async preloadNextEpisode(
    bundle: StoryBundle,
    currentEpisodeNumber: number,
    progressCallback?: DownloadProgressCallback
  ): Promise<void> {
    const nextEpisodeNumber = currentEpisodeNumber + 1;
    const nextEpisode = bundle.episodes.find((e) => e.episodeNumber === nextEpisodeNumber);

    if (!nextEpisode) {
      console.log("No next episode to preload");
      return;
    }

    // Check if already downloaded
    const story = useOfflineStore.getState().getOfflineStory(bundle.arcId);
    if (story?.episodes.has(nextEpisode.episodeId)) {
      console.log("Next episode already downloaded");
      return;
    }

    try {
      progressCallback?.(0, `Preloading episode ${nextEpisodeNumber}...`);

      await this.downloadEpisode(bundle, nextEpisode, progressCallback);

      // Update story with new episode
      useOfflineStore.getState().updateEpisodeProgress(
        bundle.arcId,
        nextEpisode.episodeId,
        {
          episodeId: nextEpisode.episodeId,
          episodeNumber: nextEpisode.episodeNumber,
          title: nextEpisode.title,
          textCached: true,
          imagesCached: nextEpisode.pages.some((p) => p.imageUrl),
          audioCached: !!nextEpisode.fullAudioUrl,
          musicCached: !!nextEpisode.musicUrl,
          totalSize: this.estimateDownloadSize([nextEpisode]),
          downloadedAt: new Date(),
          lastAccessedAt: new Date(),
        }
      );

      const newUsage = await offlineStorageService.getStorageUsage();
      useOfflineStore.getState().setStorageUsage(newUsage);

      progressCallback?.(100, "Preload complete!");
    } catch (error) {
      console.error("Failed to preload next episode:", error);
      // Don't throw - preloading failure shouldn't block reading
    }
  }

  /**
   * Set storage quota
   */
  setStorageQuota(quotaBytes: number): void {
    useOfflineStore.getState().setStorageQuota(quotaBytes);
    this.defaultQuotaBytes = quotaBytes;
  }

  /**
   * Prune stories not accessed in specified days
   */
  async pruneOldStories(maxAgeDays: number = 30): Promise<number> {
    return useOfflineStore.getState().pruneOldStories(maxAgeDays);
  }

  /**
   * Get current network status
   */
  isNetworkAvailable(): boolean {
    return networkMonitor.isOnline();
  }

  /**
   * Estimate download size for episodes
   */
  private estimateDownloadSize(episodes: EpisodeBundle[]): number {
    let size = 0;

    for (const episode of episodes) {
      // Text: ~50KB per episode
      size += 50 * 1024;

      // Images: ~200KB per image page
      const imagePages = episode.pages.filter((p) => p.imageUrl).length;
      size += imagePages * 200 * 1024;

      // Audio: ~2MB for narration
      if (episode.fullAudioUrl) {
        size += 2 * 1024 * 1024;
      }

      // Music: ~3MB
      if (episode.musicUrl) {
        size += 3 * 1024 * 1024;
      }
    }

    return size;
  }

  /**
   * Estimate single image size
   */
  private estimateImageSize(): number {
    return 200 * 1024; // 200KB per image
  }
}

// Factory function to create manager for current user
export function createOfflineManager(userId: number): OfflineManager {
  return new OfflineManager(userId);
}
