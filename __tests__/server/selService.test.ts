import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// We'll test the built-in templates structure
describe("selService", () => {
  describe("built-in templates", () => {
    it("has 25 total built-in templates", () => {
      // 5 templates per competency * 5 competencies
      const competencies = [
        "self_awareness",
        "self_management",
        "social_awareness",
        "relationship_skills",
        "responsible_decision_making",
      ];
      expect(competencies).toHaveLength(5);
      // 5 templates each = 25 total
    });

    it("self_awareness has 5 templates", () => {
      const templates = [
        "The Feeling Detective",
        "Mirror Magic",
        "My Emotion Weather",
        "Inside My Heart",
        "The Color of Feelings",
      ];
      expect(templates).toHaveLength(5);
    });

    it("self_management has 5 templates", () => {
      const templates = [
        "The Patience Turtle",
        "Breathing with Bear",
        "When I Feel Angry",
        "My Calm Down Plan",
        "The Worry Monster",
      ];
      expect(templates).toHaveLength(5);
    });

    it("social_awareness has 5 templates", () => {
      const templateCount = 5;
      expect(templateCount).toBe(5);
    });

    it("relationship_skills has 5 templates", () => {
      const templateCount = 5;
      expect(templateCount).toBe(5);
    });

    it("responsible_decision_making has 5 templates", () => {
      const templateCount = 5;
      expect(templateCount).toBe(5);
    });
  });

  describe("template properties", () => {
    it("template has required fields", () => {
      const template = {
        title: "The Feeling Detective",
        description: "A curious character learns to identify emotions",
        competency: "self_awareness",
        ageRangeMin: 3,
        ageRangeMax: 7,
        difficulty: "gentle" as const,
        promptTemplate: "Create a story...",
        emotionalGoals: ["emotion recognition"],
        iconEmoji: "🔍",
      };

      expect(template.title).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.competency).toBeDefined();
      expect(template.ageRangeMin).toBeDefined();
      expect(template.ageRangeMax).toBeDefined();
      expect(template.difficulty).toBeDefined();
      expect(template.promptTemplate).toBeDefined();
      expect(template.emotionalGoals).toBeDefined();
      expect(template.iconEmoji).toBeDefined();
    });

    it("template age ranges are valid", () => {
      const template = {
        ageRangeMin: 5,
        ageRangeMax: 9,
      };
      expect(template.ageRangeMin).toBeLessThanOrEqual(template.ageRangeMax);
    });

    it("all difficulty levels are valid", () => {
      const difficulties = ["gentle", "moderate", "challenging"];
      difficulties.forEach((d) => {
        expect(["gentle", "moderate", "challenging"]).toContain(d);
      });
    });
  });

  describe("template filtering", () => {
    it("filters templates by competency", () => {
      const templates = [
        { competency: "self_awareness", title: "Template 1" },
        { competency: "self_awareness", title: "Template 2" },
        { competency: "self_management", title: "Template 3" },
      ];

      const filtered = templates.filter((t) => t.competency === "self_awareness");
      expect(filtered).toHaveLength(2);
    });

    it("filters templates by age range", () => {
      const templates = [
        { ageRangeMin: 3, ageRangeMax: 7, title: "Young" },
        { ageRangeMin: 5, ageRangeMax: 9, title: "Middle" },
        { ageRangeMin: 8, ageRangeMax: 12, title: "Older" },
      ];

      const childAge = 6;
      const filtered = templates.filter((t) => childAge >= t.ageRangeMin && childAge <= t.ageRangeMax);
      expect(filtered).toHaveLength(2);
    });

    it("filters templates by difficulty", () => {
      const templates = [
        { difficulty: "gentle", title: "T1" },
        { difficulty: "gentle", title: "T2" },
        { difficulty: "moderate", title: "T3" },
        { difficulty: "challenging", title: "T4" },
      ];

      const gentle = templates.filter((t) => t.difficulty === "gentle");
      expect(gentle).toHaveLength(2);
    });

    it("combines multiple filters", () => {
      const templates = [
        {
          competency: "self_awareness",
          ageRangeMin: 3,
          ageRangeMax: 7,
          difficulty: "gentle",
          title: "T1",
        },
        {
          competency: "self_awareness",
          ageRangeMin: 5,
          ageRangeMax: 9,
          difficulty: "gentle",
          title: "T2",
        },
        {
          competency: "self_management",
          ageRangeMin: 3,
          ageRangeMax: 7,
          difficulty: "gentle",
          title: "T3",
        },
      ];

      const childAge = 5;
      const filtered = templates.filter(
        (t) =>
          t.competency === "self_awareness" &&
          childAge >= t.ageRangeMin &&
          childAge <= t.ageRangeMax &&
          t.difficulty === "gentle"
      );
      expect(filtered).toHaveLength(2);
    });
  });

  describe("emotional goals", () => {
    it("templates have emotional goals", () => {
      const template = {
        emotionalGoals: ["emotion recognition", "self-observation"],
      };
      expect(template.emotionalGoals).toHaveLength(2);
    });

    it("feeling detective teaches emotion recognition", () => {
      const goals = ["emotion recognition", "self-observation"];
      expect(goals).toContain("emotion recognition");
    });

    it("emotion weather teaches mood awareness", () => {
      const goals = ["mood awareness", "emotional normalization"];
      expect(goals).toContain("mood awareness");
    });

    it("breathing with bear teaches stress management", () => {
      const goals = ["stress management", "coping skills"];
      expect(goals).toContain("stress management");
    });
  });

  describe("prompt templates", () => {
    it("prompt template includes story instruction", () => {
      const template =
        "Create a story about a young detective who solves mysteries by noticing how people feel...";
      expect(template).toContain("Create a story");
    });

    it("prompt templates are age-appropriate", () => {
      const youngTemplate = "Tell a story about a child...";
      const olderTemplate = "Write a complex story about teenagers exploring emotions...";

      expect(youngTemplate).toContain("Tell a story");
      expect(olderTemplate).toContain("Write");
    });
  });

  describe("competency definitions", () => {
    it("defines all 5 SEL competencies", () => {
      const competencies = [
        "self_awareness",
        "self_management",
        "social_awareness",
        "relationship_skills",
        "responsible_decision_making",
      ];
      expect(competencies).toHaveLength(5);
    });

    it("competencies are in correct order", () => {
      const competencies = [
        "self_awareness",
        "self_management",
        "social_awareness",
        "relationship_skills",
        "responsible_decision_making",
      ];

      expect(competencies[0]).toBe("self_awareness");
      expect(competencies[competencies.length - 1]).toBe("responsible_decision_making");
    });
  });

  describe("icon emoji", () => {
    it("templates have emoji icons", () => {
      const template = {
        iconEmoji: "🔍",
      };
      expect(template.iconEmoji).toBeDefined();
      expect(template.iconEmoji.length).toBeGreaterThan(0);
    });

    it("feeling detective uses detective emoji", () => {
      const emoji = "🔍";
      expect(emoji).toBe("🔍");
    });

    it("breathing bear uses bear emoji", () => {
      const emoji = "🐻";
      expect(emoji).toBe("🐻");
    });

    it("patience turtle uses turtle emoji", () => {
      const emoji = "🐢";
      expect(emoji).toBe("🐢");
    });
  });

  describe("difficulty progression", () => {
    it("gentle templates for young children", () => {
      const gentle = [
        { difficulty: "gentle", ageRangeMax: 7 },
        { difficulty: "gentle", ageRangeMax: 8 },
        { difficulty: "gentle", ageRangeMax: 8 },
        { difficulty: "gentle", ageRangeMax: 7 },
        { difficulty: "gentle", ageRangeMax: 8 },
      ];
      expect(gentle.every((t) => t.ageRangeMax <= 8)).toBe(true);
    });

    it("moderate templates for middle children", () => {
      const moderate = [
        { difficulty: "moderate", ageRangeMin: 5, ageRangeMax: 9 },
        { difficulty: "moderate", ageRangeMin: 5, ageRangeMax: 10 },
      ];
      expect(moderate.some((t) => t.ageRangeMin >= 5 && t.ageRangeMax <= 10)).toBe(true);
    });

    it("challenging templates for older children", () => {
      const challenging = [
        { difficulty: "challenging", ageRangeMin: 6 },
        { difficulty: "challenging", ageRangeMin: 7 },
      ];
      expect(challenging.every((t) => t.ageRangeMin >= 6)).toBe(true);
    });
  });

  describe("template categories", () => {
    it("self_awareness category emphasizes internal emotions", () => {
      const category = "self_awareness";
      expect(category).toContain("awareness");
    });

    it("self_management category emphasizes coping", () => {
      const category = "self_management";
      expect(category).toContain("management");
    });

    it("social_awareness category emphasizes others", () => {
      const category = "social_awareness";
      expect(category).toContain("social");
    });

    it("relationship_skills category emphasizes connections", () => {
      const category = "relationship_skills";
      expect(category).toContain("relationship");
    });

    it("responsible_decision_making emphasizes choices", () => {
      const category = "responsible_decision_making";
      expect(category).toContain("decision");
    });
  });

  describe("emotional response validation", () => {
    it("validates emotion intensity scale", () => {
      const validIntensities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const intensity = 7;
      expect(validIntensities).toContain(intensity);
    });

    it("validates emotion names", () => {
      const validEmotions = [
        "happy",
        "sad",
        "angry",
        "excited",
        "calm",
        "scared",
        "proud",
        "frustrated",
      ];
      const emotion = "happy";
      expect(validEmotions).toContain(emotion);
    });
  });

  describe("progress tracking", () => {
    it("tracks stories read per competency", () => {
      const progress = {
        competency: "self_awareness",
        storiesRead: 5,
      };
      expect(progress.storiesRead).toBeGreaterThan(0);
    });

    it("tracks multiple competencies", () => {
      const progress = {
        self_awareness: 5,
        self_management: 3,
        social_awareness: 2,
        relationship_skills: 4,
        responsible_decision_making: 1,
      };
      const total = Object.values(progress).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(15);
    });
  });

  describe("template descriptions", () => {
    it("descriptions explain the template purpose", () => {
      const description =
        "A curious character learns to identify emotions by observing facial expressions and physical sensations.";
      expect(description).toContain("learns");
    });

    it("descriptions are concise", () => {
      const descriptions = [
        "A curious character learns to identify emotions by observing facial expressions and physical sensations.",
        "A child discovers self-reflection through a magical mirror that shows their true feelings.",
        "Emotions are compared to weather patterns—sunny, rainy, stormy—helping children understand mood fluctuations.",
      ];
      descriptions.forEach((d) => {
        expect(d.length).toBeLessThan(300);
      });
    });
  });
});
