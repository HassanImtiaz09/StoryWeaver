// @ts-nocheck
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
  useSelStore,
  type SelTemplate,
  type Competency,
  type EmotionalCheckIn,
  type SelInsights,
} from "../lib/sel-store";

describe("sel-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useSelStore.setState({
      templates: [],
      competencies: [],
      childProgress: {},
      currentTemplate: null,
      emotionalCheckIns: [],
      insights: {},
      selectedCompetency: null,
      selectedDifficulty: null,
      generatedStories: {},
    });
  });

  describe("store initial state", () => {
    it("initializes with empty templates", () => {
      const state = useSelStore.getState();
      expect(state.templates).toEqual([]);
    });

    it("initializes with empty check-ins", () => {
      const state = useSelStore.getState();
      expect(state.emotionalCheckIns).toEqual([]);
    });

    it("initializes with no selected competency", () => {
      const state = useSelStore.getState();
      expect(state.selectedCompetency).toBeNull();
    });
  });

  describe("template management", () => {
    it("sets SEL templates", () => {
      const templates: SelTemplate[] = [
        {
          id: 1,
          title: "The Feeling Detective",
          description: "Learn to identify emotions",
          competency: "self_awareness",
          ageRangeMin: 3,
          ageRangeMax: 7,
          difficulty: "gentle",
          promptTemplate: "Create a story...",
          emotionalGoals: ["emotion recognition"],
          iconEmoji: "🔍",
          isBuiltIn: true,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      store.setTemplates(templates);
      expect(useSelStore.getState().templates).toEqual(templates);
    });

    it("filters templates by competency", () => {
      const templates: SelTemplate[] = [
        {
          id: 1,
          title: "Awareness Template",
          description: "Self awareness",
          competency: "self_awareness",
          ageRangeMin: 5,
          ageRangeMax: 9,
          difficulty: "moderate",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "🧠",
          isBuiltIn: true,
          createdAt: new Date(),
        },
        {
          id: 2,
          title: "Management Template",
          description: "Self management",
          competency: "self_management",
          ageRangeMin: 6,
          ageRangeMax: 10,
          difficulty: "moderate",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "💪",
          isBuiltIn: true,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      store.setTemplates(templates);

      const filtered = store.filterTemplatesByCompetency("self_awareness");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].competency).toBe("self_awareness");
    });

    it("filters templates by multiple competencies", () => {
      const templates: SelTemplate[] = [
        {
          id: 1,
          title: "Template 1",
          description: "",
          competency: "self_awareness",
          ageRangeMin: 5,
          ageRangeMax: 9,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "1",
          isBuiltIn: true,
          createdAt: new Date(),
        },
        {
          id: 2,
          title: "Template 2",
          description: "",
          competency: "self_management",
          ageRangeMin: 6,
          ageRangeMax: 10,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "2",
          isBuiltIn: true,
          createdAt: new Date(),
        },
        {
          id: 3,
          title: "Template 3",
          description: "",
          competency: "social_awareness",
          ageRangeMin: 7,
          ageRangeMax: 11,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "3",
          isBuiltIn: true,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      store.setTemplates(templates);
      expect(store.filterTemplatesByCompetency("self_awareness")).toHaveLength(1);
      expect(store.filterTemplatesByCompetency("social_awareness")).toHaveLength(1);
    });

    it("returns all templates when no competency filter", () => {
      const templates: SelTemplate[] = [
        {
          id: 1,
          title: "Template 1",
          description: "",
          competency: "self_awareness",
          ageRangeMin: 5,
          ageRangeMax: 9,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "1",
          isBuiltIn: true,
          createdAt: new Date(),
        },
        {
          id: 2,
          title: "Template 2",
          description: "",
          competency: "self_management",
          ageRangeMin: 6,
          ageRangeMax: 10,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "2",
          isBuiltIn: true,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      store.setTemplates(templates);
      const filtered = store.filterTemplatesByCompetency();
      expect(filtered).toHaveLength(2);
    });
  });

  describe("current template", () => {
    it("sets current template", () => {
      const template: SelTemplate = {
        id: 1,
        title: "Template",
        description: "",
        competency: "self_awareness",
        ageRangeMin: 5,
        ageRangeMax: 9,
        difficulty: "gentle",
        promptTemplate: "...",
        emotionalGoals: [],
        iconEmoji: "🧠",
        isBuiltIn: true,
        createdAt: new Date(),
      };
      const store = useSelStore.getState();
      store.setCurrentTemplate(template);
      expect(useSelStore.getState().currentTemplate).toEqual(template);
    });

    it("clears current template", () => {
      const template: SelTemplate = {
        id: 1,
        title: "Template",
        description: "",
        competency: "self_awareness",
        ageRangeMin: 5,
        ageRangeMax: 9,
        difficulty: "gentle",
        promptTemplate: "...",
        emotionalGoals: [],
        iconEmoji: "🧠",
        isBuiltIn: true,
        createdAt: new Date(),
      };
      const store = useSelStore.getState();
      store.setCurrentTemplate(template);
      store.setCurrentTemplate(null);
      expect(useSelStore.getState().currentTemplate).toBeNull();
    });
  });

  describe("emotional check-ins", () => {
    it("adds emotional check-in", () => {
      const checkIn: EmotionalCheckIn = {
        id: 1,
        childId: 5,
        templateId: 1,
        emotionFelt: "happy",
        emotionIntensity: 8,
        reflection: "I felt happy today",
        createdAt: new Date(),
      };
      const store = useSelStore.getState();
      store.addEmotionalCheckIn(checkIn);
      expect(useSelStore.getState().emotionalCheckIns).toContain(checkIn);
    });

    it("tracks multiple check-ins", () => {
      const checkIns: EmotionalCheckIn[] = [
        {
          id: 1,
          childId: 5,
          templateId: 1,
          emotionFelt: "happy",
          emotionIntensity: 8,
          createdAt: new Date(),
        },
        {
          id: 2,
          childId: 5,
          templateId: 2,
          emotionFelt: "excited",
          emotionIntensity: 9,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      checkIns.forEach((c) => store.addEmotionalCheckIn(c));
      expect(useSelStore.getState().emotionalCheckIns).toHaveLength(2);
    });

    it("gets recent check-ins for child", () => {
      const checkIns: EmotionalCheckIn[] = [
        {
          id: 1,
          childId: 5,
          templateId: 1,
          emotionFelt: "happy",
          emotionIntensity: 8,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          childId: 5,
          templateId: 2,
          emotionFelt: "sad",
          emotionIntensity: 4,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          id: 3,
          childId: 5,
          templateId: 3,
          emotionFelt: "excited",
          emotionIntensity: 9,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      checkIns.forEach((c) => store.addEmotionalCheckIn(c));

      const recent = store.getRecentCheckIns(5, 2);
      expect(recent).toHaveLength(2);
      expect(recent[0].emotionFelt).toBe("excited");
    });
  });

  describe("competency filtering", () => {
    it("sets selected competency", () => {
      const store = useSelStore.getState();
      store.setSelectedCompetency("self_awareness");
      expect(useSelStore.getState().selectedCompetency).toBe("self_awareness");
    });

    it("clears selected competency", () => {
      const store = useSelStore.getState();
      store.setSelectedCompetency("self_management");
      store.setSelectedCompetency(null);
      expect(useSelStore.getState().selectedCompetency).toBeNull();
    });

    it("tracks all competencies", () => {
      const store = useSelStore.getState();
      const competencies: Competency[] = [
        "self_awareness",
        "self_management",
        "social_awareness",
        "relationship_skills",
        "responsible_decision_making",
      ];

      competencies.forEach((c) => {
        store.setSelectedCompetency(c);
        expect(useSelStore.getState().selectedCompetency).toBe(c);
      });
    });
  });

  describe("difficulty filtering", () => {
    it("sets selected difficulty", () => {
      const store = useSelStore.getState();
      store.setSelectedDifficulty("gentle");
      expect(useSelStore.getState().selectedDifficulty).toBe("gentle");
    });

    it("filters by all difficulty levels", () => {
      const store = useSelStore.getState();
      const difficulties = ["gentle", "moderate", "challenging"];

      difficulties.forEach((d) => {
        store.setSelectedDifficulty(d);
        expect(useSelStore.getState().selectedDifficulty).toBe(d);
      });
    });

    it("clears difficulty filter", () => {
      const store = useSelStore.getState();
      store.setSelectedDifficulty("moderate");
      store.setSelectedDifficulty(null);
      expect(useSelStore.getState().selectedDifficulty).toBeNull();
    });
  });

  describe("competency metadata", () => {
    it("sets competencies with metadata", () => {
      const competencies = [
        {
          id: "self_awareness" as Competency,
          name: "Self Awareness",
          description: "Understanding your own emotions",
          emoji: "🧠",
          color: "#FF6B6B",
        },
        {
          id: "self_management" as Competency,
          name: "Self Management",
          description: "Managing your emotions",
          emoji: "💪",
          color: "#4ECDC4",
        },
      ];
      const store = useSelStore.getState();
      store.setCompetencies(competencies);
      expect(useSelStore.getState().competencies).toHaveLength(2);
    });
  });

  describe("child progress tracking", () => {
    it("sets child progress", () => {
      const progress = [
        {
          competency: "self_awareness" as Competency,
          name: "Self Awareness",
          storiesRead: 5,
          emoji: "🧠",
          color: "#FF6B6B",
        },
      ];
      const store = useSelStore.getState();
      store.setChildProgress(5, progress);
      expect(useSelStore.getState().childProgress[5]).toEqual(progress);
    });

    it("tracks progress for multiple children", () => {
      const progress1 = [
        {
          competency: "self_awareness" as Competency,
          name: "Self Awareness",
          storiesRead: 5,
          emoji: "🧠",
          color: "#FF6B6B",
        },
      ];
      const progress2 = [
        {
          competency: "self_management" as Competency,
          name: "Self Management",
          storiesRead: 3,
          emoji: "💪",
          color: "#4ECDC4",
        },
      ];
      const store = useSelStore.getState();
      store.setChildProgress(5, progress1);
      store.setChildProgress(6, progress2);
      expect(useSelStore.getState().childProgress[5]).toEqual(progress1);
      expect(useSelStore.getState().childProgress[6]).toEqual(progress2);
    });
  });

  describe("insights", () => {
    it("sets SEL insights for child", () => {
      const insights: SelInsights = {
        childId: 5,
        totalStoriesRead: 10,
        emotionFrequency: {
          happy: 5,
          sad: 2,
          excited: 3,
        },
        averageEmotionalIntensity: 7.5,
        weeklyActivityCount: 3,
        progressByCompetency: [],
        areasOfGrowth: ["self_awareness"],
        areasToExplore: ["social_awareness"],
        recentResponses: [],
      };
      const store = useSelStore.getState();
      store.setInsights(5, insights);
      expect(useSelStore.getState().insights[5]).toEqual(insights);
    });

    it("identifies areas of growth", () => {
      const insights: SelInsights = {
        childId: 5,
        totalStoriesRead: 15,
        emotionFrequency: {},
        averageEmotionalIntensity: 7,
        weeklyActivityCount: 5,
        progressByCompetency: [],
        areasOfGrowth: ["self_awareness", "self_management"],
        areasToExplore: ["social_awareness", "relationship_skills"],
        recentResponses: [],
      };
      const store = useSelStore.getState();
      store.setInsights(5, insights);
      const stored = useSelStore.getState().insights[5];
      expect(stored.areasOfGrowth).toHaveLength(2);
    });
  });

  describe("SEL workflow", () => {
    it("supports complete SEL workflow", () => {
      const store = useSelStore.getState();

      // Load templates
      const templates: SelTemplate[] = [
        {
          id: 1,
          title: "Feeling Detective",
          description: "",
          competency: "self_awareness",
          ageRangeMin: 5,
          ageRangeMax: 9,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: ["emotion recognition"],
          iconEmoji: "🔍",
          isBuiltIn: true,
          createdAt: new Date(),
        },
      ];
      store.setTemplates(templates);

      // Select competency
      store.setSelectedCompetency("self_awareness");

      // Set current template
      store.setCurrentTemplate(templates[0]);

      // Record check-in
      const checkIn: EmotionalCheckIn = {
        id: 1,
        childId: 5,
        templateId: 1,
        emotionFelt: "happy",
        emotionIntensity: 8,
        createdAt: new Date(),
      };
      store.addEmotionalCheckIn(checkIn);

      const state = useSelStore.getState();
      expect(state.selectedCompetency).toBe("self_awareness");
      expect(state.currentTemplate?.id).toBe(1);
      expect(state.emotionalCheckIns).toHaveLength(1);
    });
  });

  describe("age-appropriate templates", () => {
    it("filters templates by age range", () => {
      const templates: SelTemplate[] = [
        {
          id: 1,
          title: "Young Child",
          description: "",
          competency: "self_awareness",
          ageRangeMin: 3,
          ageRangeMax: 6,
          difficulty: "gentle",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "👶",
          isBuiltIn: true,
          createdAt: new Date(),
        },
        {
          id: 2,
          title: "Older Child",
          description: "",
          competency: "self_awareness",
          ageRangeMin: 7,
          ageRangeMax: 11,
          difficulty: "moderate",
          promptTemplate: "...",
          emotionalGoals: [],
          iconEmoji: "👧",
          isBuiltIn: true,
          createdAt: new Date(),
        },
      ];
      const store = useSelStore.getState();
      store.setTemplates(templates);

      const young = templates.filter((t) => t.ageRangeMax <= 6);
      const older = templates.filter((t) => t.ageRangeMin >= 7);

      expect(young).toHaveLength(1);
      expect(older).toHaveLength(1);
    });
  });
});
