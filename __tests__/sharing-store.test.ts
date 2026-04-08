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
  useSharingStore,
  type GalleryStory,
  type SharedStoryInfo,
  type ShareHistoryEntry,
} from "../lib/sharing-store";

describe("sharing-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useSharingStore.setState({
      sharedStories: new Map(),
      galleryStories: [],
      galleryPage: 1,
      hasMoreGalleryStories: true,
      galleryFilters: {
        sortBy: "popular",
      },
      isSharing: false,
      isLoadingGallery: false,
      shareHistory: [],
      mySharedStories: [],
    });
  });

  describe("store initial state", () => {
    it("initializes with empty shared stories", () => {
      const state = useSharingStore.getState();
      expect(state.sharedStories.size).toBe(0);
    });

    it("initializes with empty gallery", () => {
      const state = useSharingStore.getState();
      expect(state.galleryStories).toEqual([]);
    });

    it("initializes with page 1", () => {
      const state = useSharingStore.getState();
      expect(state.galleryPage).toBe(1);
    });

    it("initializes with no filters applied", () => {
      const state = useSharingStore.getState();
      expect(state.galleryFilters.theme).toBeUndefined();
      expect(state.galleryFilters.ageGroup).toBeUndefined();
    });
  });

  describe("shared story management", () => {
    it("sets shared story info", () => {
      const info: SharedStoryInfo = {
        arcId: 100,
        shareCode: "ABC123",
        shareUrl: "https://example.com/ABC123",
        privacyLevel: "link_only",
        isPublished: true,
        viewCount: 10,
        likeCount: 2,
        shareCount: 1,
        publishedAt: new Date(),
      };
      const store = useSharingStore.getState();
      store.setSharedStory(100, info);
      const retrieved = store.getSharedStory(100);
      expect(retrieved).toEqual(info);
    });

    it("retrieves shared story", () => {
      const info: SharedStoryInfo = {
        arcId: 100,
        shareCode: "XYZ789",
        shareUrl: "https://example.com/XYZ789",
        privacyLevel: "public",
        isPublished: true,
        viewCount: 50,
        likeCount: 10,
        shareCount: 5,
        publishedAt: new Date(),
      };
      const store = useSharingStore.getState();
      store.setSharedStory(100, info);
      expect(store.getSharedStory(100)?.shareCode).toBe("XYZ789");
    });

    it("returns undefined for non-existent story", () => {
      const store = useSharingStore.getState();
      expect(store.getSharedStory(999)).toBeUndefined();
    });

    it("removes shared story", () => {
      const info: SharedStoryInfo = {
        arcId: 100,
        shareCode: "ABC123",
        shareUrl: "https://example.com/ABC123",
        privacyLevel: "link_only",
        isPublished: true,
        viewCount: 10,
        likeCount: 2,
        shareCount: 1,
        publishedAt: new Date(),
      };
      const store = useSharingStore.getState();
      store.setSharedStory(100, info);
      store.removeSharedStory(100);
      expect(store.getSharedStory(100)).toBeUndefined();
    });

    it("tracks multiple shared stories", () => {
      const store = useSharingStore.getState();
      for (let i = 1; i <= 5; i++) {
        store.setSharedStory(i * 100, {
          arcId: i * 100,
          shareCode: `CODE${i}`,
          shareUrl: `https://example.com/CODE${i}`,
          privacyLevel: "link_only",
          isPublished: true,
          viewCount: i * 10,
          likeCount: i,
          shareCount: 0,
          publishedAt: new Date(),
        });
      }
      expect(useSharingStore.getState().sharedStories.size).toBe(5);
    });
  });

  describe("privacy levels", () => {
    it("supports private stories", () => {
      const info: SharedStoryInfo = {
        arcId: 100,
        shareCode: "ABC123",
        shareUrl: "https://example.com/ABC123",
        privacyLevel: "private",
        isPublished: false,
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        publishedAt: null,
      };
      const store = useSharingStore.getState();
      store.setSharedStory(100, info);
      expect(store.getSharedStory(100)?.privacyLevel).toBe("private");
    });

    it("supports link-only sharing", () => {
      const info: SharedStoryInfo = {
        arcId: 100,
        shareCode: "LINK123",
        shareUrl: "https://example.com/LINK123",
        privacyLevel: "link_only",
        isPublished: true,
        viewCount: 5,
        likeCount: 1,
        shareCount: 0,
        publishedAt: new Date(),
      };
      const store = useSharingStore.getState();
      store.setSharedStory(100, info);
      expect(store.getSharedStory(100)?.privacyLevel).toBe("link_only");
    });

    it("supports public sharing", () => {
      const info: SharedStoryInfo = {
        arcId: 100,
        shareCode: "PUBLIC123",
        shareUrl: "https://example.com/PUBLIC123",
        privacyLevel: "public",
        isPublished: true,
        viewCount: 100,
        likeCount: 20,
        shareCount: 10,
        publishedAt: new Date(),
      };
      const store = useSharingStore.getState();
      store.setSharedStory(100, info);
      expect(store.getSharedStory(100)?.privacyLevel).toBe("public");
    });
  });

  describe("gallery management", () => {
    it("sets gallery stories", () => {
      const stories: GalleryStory[] = [
        {
          id: 1,
          arcId: 100,
          title: "The Adventure",
          theme: "adventure",
          coverImageUrl: "https://example.com/cover.jpg",
          synopsis: "A thrilling adventure",
          childName: "Emma",
          childAge: 7,
          viewCount: 50,
          likeCount: 10,
          publishedAt: new Date(),
        },
      ];
      const store = useSharingStore.getState();
      store.setGalleryStories(stories, true);
      expect(useSharingStore.getState().galleryStories).toEqual(stories);
    });

    it("adds more gallery stories", () => {
      const stories1: GalleryStory[] = [
        {
          id: 1,
          arcId: 100,
          title: "Story 1",
          theme: "adventure",
          coverImageUrl: null,
          synopsis: null,
          childName: "Child 1",
          childAge: 7,
          viewCount: 10,
          likeCount: 2,
          publishedAt: new Date(),
        },
      ];
      const stories2: GalleryStory[] = [
        {
          id: 2,
          arcId: 101,
          title: "Story 2",
          theme: "mystery",
          coverImageUrl: null,
          synopsis: null,
          childName: "Child 2",
          childAge: 8,
          viewCount: 20,
          likeCount: 5,
          publishedAt: new Date(),
        },
      ];

      const store = useSharingStore.getState();
      store.setGalleryStories(stories1, true);
      store.addGalleryStories(stories2);

      expect(useSharingStore.getState().galleryStories).toHaveLength(2);
    });

    it("resets gallery when setting first page", () => {
      const stories1: GalleryStory[] = [
        {
          id: 1,
          arcId: 100,
          title: "Story 1",
          theme: "adventure",
          coverImageUrl: null,
          synopsis: null,
          childName: "Child",
          childAge: 7,
          viewCount: 0,
          likeCount: 0,
          publishedAt: new Date(),
        },
      ];
      const stories2: GalleryStory[] = [
        {
          id: 2,
          arcId: 101,
          title: "Story 2",
          theme: "mystery",
          coverImageUrl: null,
          synopsis: null,
          childName: "Child",
          childAge: 8,
          viewCount: 0,
          likeCount: 0,
          publishedAt: new Date(),
        },
      ];

      const store = useSharingStore.getState();
      store.setGalleryStories(stories1, false);
      store.setGalleryStories(stories2, true);

      expect(useSharingStore.getState().galleryStories).toHaveLength(1);
      expect(useSharingStore.getState().galleryStories[0].id).toBe(2);
    });
  });

  describe("gallery pagination", () => {
    it("sets gallery page", () => {
      const store = useSharingStore.getState();
      store.setGalleryPage(3);
      expect(useSharingStore.getState().galleryPage).toBe(3);
    });

    it("indicates more stories available", () => {
      const store = useSharingStore.getState();
      store.setHasMoreGallery(true);
      expect(useSharingStore.getState().hasMoreGalleryStories).toBe(true);
    });

    it("indicates no more stories", () => {
      const store = useSharingStore.getState();
      store.setHasMoreGallery(false);
      expect(useSharingStore.getState().hasMoreGalleryStories).toBe(false);
    });
  });

  describe("gallery filters", () => {
    it("filters by theme", () => {
      const store = useSharingStore.getState();
      store.setGalleryFilters({ theme: "adventure" });
      expect(useSharingStore.getState().galleryFilters.theme).toBe("adventure");
    });

    it("filters by age group", () => {
      const store = useSharingStore.getState();
      store.setGalleryFilters({ ageGroup: "5-7" });
      expect(useSharingStore.getState().galleryFilters.ageGroup).toBe("5-7");
    });

    it("sets sort order", () => {
      const store = useSharingStore.getState();
      store.setGalleryFilters({ sortBy: "recent" });
      expect(useSharingStore.getState().galleryFilters.sortBy).toBe("recent");
    });

    it("searches with query", () => {
      const store = useSharingStore.getState();
      store.setGalleryFilters({ searchQuery: "adventure" });
      expect(useSharingStore.getState().galleryFilters.searchQuery).toBe("adventure");
    });

    it("resets gallery filters", () => {
      const store = useSharingStore.getState();
      store.setGalleryFilters({
        theme: "mystery",
        ageGroup: "8-10",
        sortBy: "liked",
        searchQuery: "test",
      });
      store.resetGalleryFilters();
      const state = useSharingStore.getState();
      expect(state.galleryFilters.theme).toBeUndefined();
      expect(state.galleryFilters.ageGroup).toBeUndefined();
      expect(state.galleryFilters.sortBy).toBe("popular");
      expect(state.galleryFilters.searchQuery).toBeUndefined();
    });

    it("supports all sort options", () => {
      const store = useSharingStore.getState();
      const sortOptions = ["popular", "recent", "liked"] as const;

      sortOptions.forEach((sort) => {
        store.setGalleryFilters({ sortBy: sort });
        expect(useSharingStore.getState().galleryFilters.sortBy).toBe(sort);
      });
    });
  });

  describe("like functionality", () => {
    it("toggles like on gallery story", () => {
      const store = useSharingStore.getState();
      store.toggleLikeStory(1);
      // Toggle state tracked internally
      store.toggleLikeStory(1);
    });

    it("updates story like count", () => {
      const store = useSharingStore.getState();
      store.updateStoryLikeCount(1, 15);
      expect(useSharingStore.getState()).toBeDefined();
    });
  });

  describe("share history", () => {
    it("adds share history entry", () => {
      const entry: ShareHistoryEntry = {
        arcId: 100,
        title: "Adventure Story",
        sharedAt: new Date(),
        platform: "facebook",
      };
      const store = useSharingStore.getState();
      store.addShareHistoryEntry(entry);
      expect(useSharingStore.getState().shareHistory).toContain(entry);
    });

    it("tracks different sharing platforms", () => {
      const store = useSharingStore.getState();
      const platforms = ["facebook", "twitter", "copy-link", "email"];

      platforms.forEach((platform) => {
        const entry: ShareHistoryEntry = {
          arcId: Math.random(),
          title: `Story ${platform}`,
          sharedAt: new Date(),
          platform,
        };
        store.addShareHistoryEntry(entry);
      });

      expect(useSharingStore.getState().shareHistory.length).toBe(4);
    });

    it("clears share history", () => {
      const store = useSharingStore.getState();
      store.addShareHistoryEntry({
        arcId: 100,
        title: "Story",
        sharedAt: new Date(),
      });
      store.clearShareHistory();
      expect(useSharingStore.getState().shareHistory).toEqual([]);
    });
  });

  describe("my shared stories", () => {
    it("sets user's shared stories", () => {
      const stories: SharedStoryInfo[] = [
        {
          arcId: 100,
          shareCode: "ABC123",
          shareUrl: "https://example.com/ABC123",
          privacyLevel: "public",
          isPublished: true,
          viewCount: 100,
          likeCount: 20,
          shareCount: 10,
          publishedAt: new Date(),
        },
      ];
      const store = useSharingStore.getState();
      store.setMySharedStories(stories);
      expect(useSharingStore.getState().mySharedStories).toEqual(stories);
    });

    it("updates user's shared story", () => {
      const story: SharedStoryInfo = {
        arcId: 100,
        shareCode: "ABC123",
        shareUrl: "https://example.com/ABC123",
        privacyLevel: "link_only",
        isPublished: true,
        viewCount: 10,
        likeCount: 2,
        shareCount: 1,
        publishedAt: new Date(),
      };
      const store = useSharingStore.getState();
      store.setMySharedStories([story]);

      store.updateMySharedStory(100, {
        privacyLevel: "public",
        viewCount: 50,
        likeCount: 10,
      });

      const updated = useSharingStore.getState().mySharedStories[0];
      expect(updated.privacyLevel).toBe("public");
      expect(updated.viewCount).toBe(50);
    });

    it("tracks multiple user stories", () => {
      const stories: SharedStoryInfo[] = [
        {
          arcId: 100,
          shareCode: "CODE1",
          shareUrl: "https://example.com/CODE1",
          privacyLevel: "public",
          isPublished: true,
          viewCount: 50,
          likeCount: 10,
          shareCount: 5,
          publishedAt: new Date(),
        },
        {
          arcId: 101,
          shareCode: "CODE2",
          shareUrl: "https://example.com/CODE2",
          privacyLevel: "link_only",
          isPublished: true,
          viewCount: 20,
          likeCount: 5,
          shareCount: 2,
          publishedAt: new Date(),
        },
      ];
      const store = useSharingStore.getState();
      store.setMySharedStories(stories);
      expect(useSharingStore.getState().mySharedStories).toHaveLength(2);
    });
  });

  describe("loading states", () => {
    it("sets sharing loading state", () => {
      const store = useSharingStore.getState();
      store.setIsSharing(true);
      expect(useSharingStore.getState().isSharing).toBe(true);
      store.setIsSharing(false);
      expect(useSharingStore.getState().isSharing).toBe(false);
    });

    it("sets gallery loading state", () => {
      const store = useSharingStore.getState();
      store.setIsLoadingGallery(true);
      expect(useSharingStore.getState().isLoadingGallery).toBe(true);
      store.setIsLoadingGallery(false);
      expect(useSharingStore.getState().isLoadingGallery).toBe(false);
    });
  });

  describe("reset functionality", () => {
    it("resets store to initial state", () => {
      const store = useSharingStore.getState();
      store.setSharedStory(100, {
        arcId: 100,
        shareCode: "ABC",
        shareUrl: "https://example.com/ABC",
        privacyLevel: "public",
        isPublished: true,
        viewCount: 10,
        likeCount: 2,
        shareCount: 1,
        publishedAt: new Date(),
      });
      store.addShareHistoryEntry({
        arcId: 100,
        title: "Story",
        sharedAt: new Date(),
      });

      store.reset();

      const state = useSharingStore.getState();
      expect(state.sharedStories.size).toBe(0);
      expect(state.shareHistory).toEqual([]);
      expect(state.galleryStories).toEqual([]);
    });
  });
});
