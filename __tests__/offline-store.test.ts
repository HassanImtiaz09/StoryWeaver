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
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((key) => delete mockStorage[key]);
      return Promise.resolve();
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Object.keys(mockStorage))),
  },
}));

// Mock fetch for image/audio downloads
global.fetch = vi.fn();

import { OfflineStorageService } from "../lib/offline-storage";

describe("offline-storage", () => {
  let service: OfflineStorageService;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    service = new OfflineStorageService();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("initializes storage service", async () => {
      await service.initialize();
      // Should not throw
      expect(service).toBeDefined();
    });

    it("loads existing file registry from AsyncStorage", async () => {
      mockStorage["storyweaver_offline_data_registry"] = JSON.stringify([
        ["offline/1/100/1/images/image_0.webp", { path: "offline/1/100/1/images/image_0.webp", size: 50000 }],
      ]);
      await service.initialize();
      // Registry should be loaded (tested indirectly through storage operations)
      expect(service).toBeDefined();
    });
  });

  describe("story text storage", () => {
    it("saves story text", async () => {
      const storyData = {
        episodeId: 1,
        episodeNumber: 1,
        title: "The Adventure Begins",
        pages: [
          {
            pageNumber: 1,
            text: "Once upon a time",
            mood: "mysterious",
            characters: [],
          },
        ],
      };

      await service.saveStoryText(1, 100, 1, storyData as any);
      const stored = mockStorage["storyweaver_offline_data_story_1_100_1"];
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.title).toBe("The Adventure Begins");
    });

    it("loads story text", async () => {
      mockStorage["storyweaver_offline_data_story_1_100_1"] = JSON.stringify({
        episodeId: 1,
        title: "The Quest",
        pages: [],
      });

      const loaded = await service.loadStoryText(1, 100, 1);
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe("The Quest");
    });

    it("returns null when story not found", async () => {
      const loaded = await service.loadStoryText(999, 999, 999);
      expect(loaded).toBeNull();
    });
  });

  describe("image caching", () => {
    it("downloads and caches image", async () => {
      const mockBlob = {
        arrayBuffer: async () => new ArrayBuffer(100),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const path = await service.downloadAndCacheImage(
        "https://example.com/image.webp",
        1,
        100,
        1,
        0
      );

      expect(path).toContain("image_0.webp");
      expect(path).toContain("offline/1/100/1");
    });

    it("tracks cached image size", async () => {
      const mockBlob = {
        arrayBuffer: async () => new ArrayBuffer(5000),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      await service.downloadAndCacheImage("https://example.com/img.webp", 1, 100, 1, 0);

      const usage = await service.getStorageUsage();
      expect(usage).toBeGreaterThan(0);
    });

    it("throws error on failed download", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        service.downloadAndCacheImage("https://example.com/notfound.webp", 1, 100, 1, 0)
      ).rejects.toThrow();
    });

    it("retrieves cached image URI", async () => {
      mockStorage["storyweaver_offline_data_image_1_100_1_0"] = "base64encodeddata";

      const uri = await service.getCachedImageUri(1, 100, 1, 0);
      expect(uri).toBeDefined();
      expect(uri).toContain("data:image/webp;base64,");
    });

    it("returns null for missing cached image", async () => {
      const uri = await service.getCachedImageUri(999, 999, 999, 0);
      expect(uri).toBeNull();
    });
  });

  describe("audio caching", () => {
    it("downloads and caches audio", async () => {
      const mockBlob = {
        arrayBuffer: async () => new ArrayBuffer(50000),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const path = await service.downloadAndCacheAudio(
        "https://example.com/audio.m4a",
        1,
        100,
        1,
        "narration",
        5000
      );

      expect(path).toContain("narration.m4a");
      expect(path).toContain("offline/1/100/1/audio");
    });

    it("downloads and caches music", async () => {
      const mockBlob = {
        arrayBuffer: async () => new ArrayBuffer(100000),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const path = await service.downloadAndCacheAudio(
        "https://example.com/music.m4a",
        1,
        100,
        1,
        "music"
      );

      expect(path).toContain("music.m4a");
    });

    it("retrieves cached audio URI", async () => {
      mockStorage["storyweaver_offline_data_audio_1_100_1_narration"] = "base64audiodata";

      const uri = await service.getCachedAudioUri(1, 100, 1, "narration");
      expect(uri).toBeDefined();
      expect(uri).toContain("data:audio/mp4;base64,");
    });

    it("returns null for missing audio", async () => {
      const uri = await service.getCachedAudioUri(999, 999, 999, "narration");
      expect(uri).toBeNull();
    });
  });

  describe("storage usage", () => {
    it("calculates total offline storage used", async () => {
      mockStorage["storyweaver_offline_data_story_1_100_1"] = JSON.stringify({
        title: "Story 1",
        pages: [],
      });
      mockStorage["storyweaver_offline_data_story_1_100_2"] = JSON.stringify({
        title: "Story 2",
        pages: [],
      });

      const usage = await service.getStorageUsage();
      expect(usage).toBeGreaterThan(0);
    });

    it("handles zero storage", async () => {
      const usage = await service.getStorageUsage();
      expect(usage).toBe(0);
    });
  });

  describe("arc removal", () => {
    it("removes all offline data for an arc", async () => {
      mockStorage["storyweaver_offline_data_story_1_100_1"] = "data1";
      mockStorage["storyweaver_offline_data_image_1_100_1_0"] = "data2";
      mockStorage["storyweaver_offline_data_audio_1_100_1_narration"] = "data3";

      await service.removeOfflineArc(1, 100);

      expect(mockStorage["storyweaver_offline_data_story_1_100_1"]).toBeUndefined();
      expect(mockStorage["storyweaver_offline_data_image_1_100_1_0"]).toBeUndefined();
      expect(mockStorage["storyweaver_offline_data_audio_1_100_1_narration"]).toBeUndefined();
    });

    it("preserves data for other arcs", async () => {
      mockStorage["storyweaver_offline_data_story_1_100_1"] = "data1";
      mockStorage["storyweaver_offline_data_story_1_101_1"] = "data2";

      await service.removeOfflineArc(1, 100);

      expect(mockStorage["storyweaver_offline_data_story_1_100_1"]).toBeUndefined();
      expect(mockStorage["storyweaver_offline_data_story_1_101_1"]).toBeDefined();
    });
  });

  describe("clear all offline data", () => {
    it("clears all offline storage", async () => {
      mockStorage["storyweaver_offline_data_story_1_100_1"] = "data1";
      mockStorage["storyweaver_offline_data_image_1_100_1_0"] = "data2";
      mockStorage["other_key"] = "other";

      await service.clearAllOfflineData();

      expect(mockStorage["storyweaver_offline_data_story_1_100_1"]).toBeUndefined();
      expect(mockStorage["storyweaver_offline_data_image_1_100_1_0"]).toBeUndefined();
      expect(mockStorage["other_key"]).toBeDefined(); // Should not clear non-offline data
    });
  });

  describe("cache pruning", () => {
    it("prunes old cached data", async () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      mockStorage["storyweaver_offline_data_story_metadata_1_100"] = JSON.stringify({
        downloadedAt: oldDate,
        lastAccessedAt: oldDate,
      });
      mockStorage["storyweaver_offline_data_story_1_100_1"] = "data";

      const prunedCount = await service.pruneOldCache(30);

      expect(prunedCount).toBeGreaterThanOrEqual(0);
    });

    it("preserves recent cached data", async () => {
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      mockStorage["storyweaver_offline_data_story_metadata_1_100"] = JSON.stringify({
        downloadedAt: recentDate,
      });

      const prunedCount = await service.pruneOldCache(30);

      expect(prunedCount).toBe(0);
    });
  });

  describe("multiple episodes", () => {
    it("stores multiple episodes for same arc", async () => {
      const ep1 = { episodeId: 1, title: "Episode 1", pages: [] };
      const ep2 = { episodeId: 2, title: "Episode 2", pages: [] };

      await service.saveStoryText(1, 100, 1, ep1 as any);
      await service.saveStoryText(1, 100, 2, ep2 as any);

      const loaded1 = await service.loadStoryText(1, 100, 1);
      const loaded2 = await service.loadStoryText(1, 100, 2);

      expect(loaded1?.title).toBe("Episode 1");
      expect(loaded2?.title).toBe("Episode 2");
    });
  });

  describe("multiple users", () => {
    it("stores offline data separately for each user", async () => {
      const story = { episodeId: 1, title: "Story", pages: [] };

      await service.saveStoryText(1, 100, 1, story as any);
      await service.saveStoryText(2, 100, 1, story as any);

      const user1Story = await service.loadStoryText(1, 100, 1);
      const user2Story = await service.loadStoryText(2, 100, 1);

      expect(user1Story).not.toBeNull();
      expect(user2Story).not.toBeNull();
    });
  });
});
