import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock languageService BEFORE importing elevenlabs
vi.mock("../../server/_core/languageService", () => ({
  SUPPORTED_LANGUAGES: {
    en: { name: "English", code: "en", ttsSupported: true },
    es: { name: "Spanish", code: "es", ttsSupported: true },
    hi: { name: "Hindi", code: "hi", ttsSupported: false },
    ja: { name: "Japanese", code: "ja", ttsSupported: true },
    xx: { name: "Test Lang", code: "xx", ttsSupported: false },
  },
}));

// Mock env
vi.mock("../../server/_core/env", () => ({
  ENV: {
    elevenLabsApiKey: "test-key",
  },
}));

// Mock storage
vi.mock("../../server/storage", () => ({
  storagePut: vi.fn(() => Promise.resolve("https://cdn.example.com/audio.mp3")),
}));

import {
  validateTTSLanguage,
  batchSegments,
  getSegmentVoiceKey,
  type StorySegment,
} from "../../server/_core/elevenlabs";

describe("TTS Validation & Batching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── validateTTSLanguage ─────────────────────────────────────

  describe("validateTTSLanguage", () => {
    it("returns supported for undefined language (default English)", () => {
      const result = validateTTSLanguage(undefined);
      expect(result.supported).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns supported for English", () => {
      const result = validateTTSLanguage("en");
      expect(result.supported).toBe(true);
    });

    it("returns supported for Spanish", () => {
      const result = validateTTSLanguage("es");
      expect(result.supported).toBe(true);
    });

    it("returns unsupported for Hindi (ttsSupported: false)", () => {
      const result = validateTTSLanguage("hi");
      expect(result.supported).toBe(false);
      expect(result.reason).toContain("Hindi");
    });

    it("returns unsupported for unknown language codes", () => {
      const result = validateTTSLanguage("zz");
      expect(result.supported).toBe(false);
      expect(result.reason).toContain("Unknown language code");
      expect(result.reason).toContain("zz");
    });

    it("returns unsupported with reason for non-TTS language", () => {
      const result = validateTTSLanguage("xx");
      expect(result.supported).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  // ─── getSegmentVoiceKey ──────────────────────────────────────

  describe("getSegmentVoiceKey", () => {
    it("returns role:narrator for narration segments", () => {
      const segment: StorySegment = {
        type: "narration",
        text: "Once upon a time...",
        voiceRole: "narrator",
      };
      expect(getSegmentVoiceKey(segment)).toBe("role:narrator");
    });

    it("returns role:<voiceRole> for narration with custom role", () => {
      const segment: StorySegment = {
        type: "narration",
        text: "Meanwhile...",
        voiceRole: "young_boy",
      };
      expect(getSegmentVoiceKey(segment)).toBe("role:young_boy");
    });

    it("returns char:<NAME> for dialogue segments", () => {
      const segment: StorySegment = {
        type: "dialogue",
        character: "Luna",
        text: "Hello there!",
      };
      expect(getSegmentVoiceKey(segment)).toBe("char:LUNA");
    });

    it("uppercases character names for consistent keying", () => {
      const segment: StorySegment = {
        type: "dialogue",
        character: "captain sparrow",
        text: "Ahoy!",
      };
      expect(getSegmentVoiceKey(segment)).toBe("char:CAPTAIN SPARROW");
    });

    it("falls back to role:narrator when dialogue has no character", () => {
      const segment: StorySegment = {
        type: "dialogue",
        text: "Some words",
      };
      expect(getSegmentVoiceKey(segment)).toBe("role:narrator");
    });
  });

  // ─── batchSegments ───────────────────────────────────────────

  describe("batchSegments", () => {
    it("returns empty array for empty input", () => {
      expect(batchSegments([])).toEqual([]);
    });

    it("returns single batch for one segment", () => {
      const segments: StorySegment[] = [
        { type: "narration", text: "Once upon a time.", voiceRole: "narrator" },
      ];
      const batches = batchSegments(segments);
      expect(batches).toHaveLength(1);
      expect(batches[0].combinedText).toBe("Once upon a time.");
      expect(batches[0].voiceKey).toBe("role:narrator");
    });

    it("merges consecutive same-voice segments", () => {
      const segments: StorySegment[] = [
        { type: "narration", text: "First sentence.", voiceRole: "narrator" },
        { type: "narration", text: "Second sentence.", voiceRole: "narrator" },
        { type: "narration", text: "Third sentence.", voiceRole: "narrator" },
      ];
      const batches = batchSegments(segments);
      expect(batches).toHaveLength(1);
      expect(batches[0].combinedText).toBe(
        "First sentence. Second sentence. Third sentence."
      );
      expect(batches[0].segments).toHaveLength(3);
    });

    it("splits on voice change", () => {
      const segments: StorySegment[] = [
        { type: "narration", text: "The hero spoke.", voiceRole: "narrator" },
        { type: "dialogue", character: "Luna", text: "I am brave!" },
        { type: "narration", text: "She continued.", voiceRole: "narrator" },
      ];
      const batches = batchSegments(segments);
      expect(batches).toHaveLength(3);
      expect(batches[0].voiceKey).toBe("role:narrator");
      expect(batches[1].voiceKey).toBe("char:LUNA");
      expect(batches[2].voiceKey).toBe("role:narrator");
    });

    it("merges consecutive dialogue from same character", () => {
      const segments: StorySegment[] = [
        { type: "dialogue", character: "Luna", text: "Hello!" },
        { type: "dialogue", character: "Luna", text: "How are you?" },
      ];
      const batches = batchSegments(segments);
      expect(batches).toHaveLength(1);
      expect(batches[0].combinedText).toBe("Hello! How are you?");
    });

    it("splits on different characters", () => {
      const segments: StorySegment[] = [
        { type: "dialogue", character: "Luna", text: "Hello!" },
        { type: "dialogue", character: "Max", text: "Hi there!" },
        { type: "dialogue", character: "Luna", text: "Nice day!" },
      ];
      const batches = batchSegments(segments);
      expect(batches).toHaveLength(3);
      expect(batches[0].voiceKey).toBe("char:LUNA");
      expect(batches[1].voiceKey).toBe("char:MAX");
      expect(batches[2].voiceKey).toBe("char:LUNA");
    });

    it("reduces a realistic story to fewer batches than segments", () => {
      // Simulate a typical story page: narration → dialogue → narration → dialogue → narration
      const segments: StorySegment[] = [
        { type: "narration", text: "The sun rose over the meadow.", voiceRole: "narrator" },
        { type: "narration", text: "Birds sang in the trees.", voiceRole: "narrator" },
        { type: "dialogue", character: "Luna", text: "What a beautiful morning!" },
        { type: "dialogue", character: "Luna", text: "Let's go explore!" },
        { type: "narration", text: "They set off on an adventure.", voiceRole: "narrator" },
        { type: "dialogue", character: "Max", text: "Wait for me!" },
        { type: "narration", text: "Max hurried to catch up.", voiceRole: "narrator" },
        { type: "narration", text: "Together they walked into the forest.", voiceRole: "narrator" },
      ];

      const batches = batchSegments(segments);
      // 8 segments → 5 batches (narrator×2, Luna×2, narrator, Max, narrator×2)
      expect(batches).toHaveLength(5);
      expect(batches.length).toBeLessThan(segments.length);
    });
  });
});
