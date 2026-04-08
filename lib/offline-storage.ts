/**
 * Offline Storage Layer
 *
 * Low-level abstraction for storing/retrieving offline content.
 * Handles story text via AsyncStorage and binary files via file system.
 *
 * Storage structure:
 * offline/{userId}/{arcId}/
 *   - metadata.json
 *   - episodes/
 *     {episodeId}/
 *       - story.json
 *       - images/
 *         image_0.webp, image_1.webp, ...
 *       - audio/
 *         narration.m4a
 *         music.m4a
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

interface StoryTextData {
  episodeId: number;
  episodeNumber: number;
  title: string;
  summary?: string;
  pages: PageData[];
  musicUrl?: string;
  fullAudioUrl?: string;
}

interface PageData {
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

interface StoredImage {
  episodeId: number;
  pageNumber: number;
  localPath: string;
  fileSize: number;
  format: string;
}

interface StoredAudio {
  episodeId: number;
  type: "narration" | "music";
  localPath: string;
  fileSize: number;
  durationMs: number;
}

/**
 * Offline Storage Service
 *
 * Provides low-level storage operations for offline content.
 * Uses AsyncStorage for JSON and simulates file system for binaries.
 */
export class OfflineStorageService {
  private offlineDataKey = "storyweaver_offline_data";
  private fileRegistry: Map<string, { path: string; size: number }> = new Map();

  /**
   * Initialize storage service
   * Load file registry from AsyncStorage
   */
  async initialize(): Promise<void> {
    try {
      const registry = await AsyncStorage.getItem(`${this.offlineDataKey}_registry`);
      if (registry) {
        const entries = JSON.parse(registry) as Array<[string, { path: string; size: number }]>;
        this.fileRegistry = new Map(entries);
      }
    } catch (error) {
      console.error("Failed to initialize offline storage:", error);
    }
  }

  /**
   * Save story text to AsyncStorage
   */
  async saveStoryText(
    userId: number,
    arcId: number,
    episodeId: number,
    data: StoryTextData
  ): Promise<void> {
    const key = `${this.offlineDataKey}_story_${userId}_${arcId}_${episodeId}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Load story text from AsyncStorage
   */
  async loadStoryText(
    userId: number,
    arcId: number,
    episodeId: number
  ): Promise<StoryTextData | null> {
    try {
      const key = `${this.offlineDataKey}_story_${userId}_${arcId}_${episodeId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to load story text:", error);
      return null;
    }
  }

  /**
   * Download and cache an image
   * Simulates file system storage with base64 encoding
   */
  async downloadAndCacheImage(
    url: string,
    userId: number,
    arcId: number,
    episodeId: number,
    pageNumber: number
  ): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = this.bufferToBase64(buffer);

      // Store in AsyncStorage with size tracking
      const fileKey = `${this.offlineDataKey}_image_${userId}_${arcId}_${episodeId}_${pageNumber}`;
      const fileSize = Math.ceil((base64.length * 3) / 4); // Estimate actual file size

      await AsyncStorage.setItem(fileKey, base64);

      const filePath = `offline/${userId}/${arcId}/${episodeId}/images/image_${pageNumber}.webp`;
      this.fileRegistry.set(filePath, { path: filePath, size: fileSize });

      // Persist registry
      await this.persistRegistry();

      return filePath;
    } catch (error) {
      console.error("Failed to download and cache image:", error);
      throw error;
    }
  }

  /**
   * Download and cache audio file
   */
  async downloadAndCacheAudio(
    url: string,
    userId: number,
    arcId: number,
    episodeId: number,
    type: "narration" | "music",
    durationMs: number = 0
  ): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = this.bufferToBase64(buffer);

      // Store in AsyncStorage
      const fileKey = `${this.offlineDataKey}_audio_${userId}_${arcId}_${episodeId}_${type}`;
      const fileSize = Math.ceil((base64.length * 3) / 4);

      await AsyncStorage.setItem(fileKey, base64);

      const filePath = `offline/${userId}/${arcId}/${episodeId}/audio/${type}.m4a`;
      this.fileRegistry.set(filePath, { path: filePath, size: fileSize });

      await this.persistRegistry();

      return filePath;
    } catch (error) {
      console.error("Failed to download and cache audio:", error);
      throw error;
    }
  }

  /**
   * Get cached image URI (local path)
   */
  async getCachedImageUri(
    userId: number,
    arcId: number,
    episodeId: number,
    pageNumber: number
  ): Promise<string | null> {
    try {
      const fileKey = `${this.offlineDataKey}_image_${userId}_${arcId}_${episodeId}_${pageNumber}`;
      const base64 = await AsyncStorage.getItem(fileKey);

      if (!base64) return null;

      // Return a data URI for use in Image components
      return `data:image/webp;base64,${base64}`;
    } catch (error) {
      console.error("Failed to get cached image URI:", error);
      return null;
    }
  }

  /**
   * Get cached audio URI (local path)
   */
  async getCachedAudioUri(
    userId: number,
    arcId: number,
    episodeId: number,
    type: "narration" | "music"
  ): Promise<string | null> {
    try {
      const fileKey = `${this.offlineDataKey}_audio_${userId}_${arcId}_${episodeId}_${type}`;
      const base64 = await AsyncStorage.getItem(fileKey);

      if (!base64) return null;

      // Return a data URI for audio playback
      return `data:audio/mp4;base64,${base64}`;
    } catch (error) {
      console.error("Failed to get cached audio URI:", error);
      return null;
    }
  }

  /**
   * Calculate total offline storage used
   */
  async getStorageUsage(): Promise<number> {
    try {
      let totalSize = 0;

      // Estimate from file registry
      for (const { size } of this.fileRegistry.values()) {
        totalSize += size;
      }

      // Estimate AsyncStorage items
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        if (key.startsWith(this.offlineDataKey)) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            totalSize += data.length;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Failed to get storage usage:", error);
      return 0;
    }
  }

  /**
   * Remove offline data for an arc
   */
  async removeOfflineArc(userId: number, arcId: number): Promise<void> {
    try {
      // Remove story texts
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(
        (key) =>
          key.startsWith(`${this.offlineDataKey}_story_${userId}_${arcId}_`) ||
          key.startsWith(`${this.offlineDataKey}_image_${userId}_${arcId}_`) ||
          key.startsWith(`${this.offlineDataKey}_audio_${userId}_${arcId}_`)
      );

      await AsyncStorage.multiRemove(keysToRemove);

      // Update registry
      for (const filePath of this.fileRegistry.keys()) {
        if (filePath.includes(`/${userId}/${arcId}/`)) {
          this.fileRegistry.delete(filePath);
        }
      }

      await this.persistRegistry();
    } catch (error) {
      console.error("Failed to remove offline arc:", error);
      throw error;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllOfflineData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((key) => key.startsWith(this.offlineDataKey));
      await AsyncStorage.multiRemove(keysToRemove);
      this.fileRegistry.clear();
      await this.persistRegistry();
    } catch (error) {
      console.error("Failed to clear offline data:", error);
      throw error;
    }
  }

  /**
   * Prune old cached data not accessed in X days
   */
  async pruneOldCache(maxAgeDays: number = 30): Promise<number> {
    try {
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

      // Get metadata for all arcs
      const keys = await AsyncStorage.getAllKeys();
      const arcMetadataKeys = keys.filter(
        (key) => key.startsWith(this.offlineDataKey) && key.endsWith("_metadata")
      );

      let prunedCount = 0;

      for (const key of arcMetadataKeys) {
        try {
          const metadata = await AsyncStorage.getItem(key);
          if (!metadata) continue;

          const parsed = JSON.parse(metadata);
          const lastAccessedAt = parsed.lastAccessedAt || parsed.downloadedAt;

          if (now - new Date(lastAccessedAt).getTime() > maxAgeMs) {
            // Extract userId and arcId from key
            const match = key.match(/story_metadata_(\d+)_(\d+)/);
            if (match) {
              const userId = parseInt(match[1]);
              const arcId = parseInt(match[2]);
              await this.removeOfflineArc(userId, arcId);
              prunedCount++;
            }
          }
        } catch (error) {
          console.error("Error pruning metadata:", error);
        }
      }

      return prunedCount;
    } catch (error) {
      console.error("Failed to prune old cache:", error);
      return 0;
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Persist file registry to AsyncStorage
   */
  private async persistRegistry(): Promise<void> {
    try {
      const entries = Array.from(this.fileRegistry.entries());
      await AsyncStorage.setItem(`${this.offlineDataKey}_registry`, JSON.stringify(entries));
    } catch (error) {
      console.error("Failed to persist registry:", error);
    }
  }
}

// Global instance
export const offlineStorageService = new OfflineStorageService();

export type { StoryTextData, PageData, StoredImage, StoredAudio };
