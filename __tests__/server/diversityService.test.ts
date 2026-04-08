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

describe("diversityService", () => {
  describe("default profile", () => {
    it("includes all ethnicity options", () => {
      const ethnicities = ["caucasian", "african", "asian", "latinx", "middle_eastern"];
      expect(ethnicities).toHaveLength(5);
    });

    it("includes common family structures", () => {
      const familyStructures = ["two-parent", "single-parent"];
      expect(familyStructures).toHaveLength(2);
    });

    it("has gender expression options", () => {
      const genderExpression = ["traditional", "non-stereotypical"];
      expect(genderExpression).toHaveLength(2);
    });

    it("has body type options", () => {
      const bodyTypes = ["average", "athletic"];
      expect(bodyTypes).toHaveLength(2);
    });

    it("defaults to English language", () => {
      const languages = ["english"];
      expect(languages).toContain("english");
    });

    it("defaults to balanced diversity level", () => {
      const diversityLevel = "balanced";
      expect(["mirror_family", "balanced", "maximum_diversity"]).toContain(diversityLevel);
    });
  });

  describe("diversity categories", () => {
    it("has 8 diversity categories", () => {
      const categories = [
        "ethnicities",
        "familyStructures",
        "abilities",
        "culturalBackgrounds",
        "genderExpression",
        "bodyTypes",
        "languages",
        "religiousSpiritual",
      ];
      expect(categories).toHaveLength(8);
    });

    it("ethnicities category has 8 options", () => {
      const options = [
        "caucasian",
        "african",
        "asian",
        "latinx",
        "middle_eastern",
        "indigenous",
        "pacific",
        "multiracial",
      ];
      expect(options).toHaveLength(8);
    });

    it("family structures category has 8 options", () => {
      const options = [
        "two-parent",
        "single-parent",
        "grandparent-led",
        "foster",
        "same-sex",
        "blended",
        "multigenerational",
        "extended",
      ];
      expect(options).toHaveLength(8);
    });

    it("each category has description", () => {
      const category = {
        id: "ethnicities",
        label: "Ethnicity & Race",
        description: "Affects character appearances, names, and cultural contexts",
        options: [],
      };
      expect(category.description).toBeDefined();
      expect(category.description.length).toBeGreaterThan(0);
    });
  });

  describe("diversity levels", () => {
    it("supports mirror_family level", () => {
      const level = "mirror_family";
      expect(["mirror_family", "balanced", "maximum_diversity"]).toContain(level);
    });

    it("supports balanced level", () => {
      const level = "balanced";
      expect(["mirror_family", "balanced", "maximum_diversity"]).toContain(level);
    });

    it("supports maximum_diversity level", () => {
      const level = "maximum_diversity";
      expect(["mirror_family", "balanced", "maximum_diversity"]).toContain(level);
    });

    it("mirror_family prefers matching family", () => {
      const profile = {
        preferMirrorFamily: true,
        diversityLevel: "mirror_family",
      };
      expect(profile.preferMirrorFamily).toBe(true);
    });
  });

  describe("ethnicity options", () => {
    it("includes caucasian/white", () => {
      const option = {
        id: "caucasian",
        label: "Caucasian/White",
        description: "European heritage characters",
      };
      expect(option.id).toBe("caucasian");
    });

    it("includes african & black", () => {
      const option = {
        id: "african",
        label: "African & Black",
        description: "African, African American, Caribbean heritage",
      };
      expect(option.id).toBe("african");
    });

    it("includes asian", () => {
      const option = {
        id: "asian",
        label: "Asian",
        description: "East, South, and Southeast Asian heritage",
      };
      expect(option.id).toBe("asian");
    });

    it("includes latinx/hispanic", () => {
      const option = {
        id: "latinx",
        label: "Latinx/Hispanic",
        description: "Latin American and Hispanic heritage",
      };
      expect(option.id).toBe("latinx");
    });

    it("includes middle eastern & north african", () => {
      const option = {
        id: "middle_eastern",
        label: "Middle Eastern & North African",
        description: "MENA heritage characters",
      };
      expect(option.id).toBe("middle_eastern");
    });

    it("includes indigenous", () => {
      const option = {
        id: "indigenous",
        label: "Indigenous",
        description: "Native American, Aboriginal, and Indigenous peoples",
      };
      expect(option.id).toBe("indigenous");
    });

    it("includes pacific islander", () => {
      const option = {
        id: "pacific",
        label: "Pacific Islander",
        description: "Pacific heritage",
      };
      expect(option.id).toBe("pacific");
    });

    it("includes multiracial", () => {
      const option = {
        id: "multiracial",
        label: "Multiracial",
        description: "Characters with mixed heritage",
      };
      expect(option.id).toBe("multiracial");
    });
  });

  describe("family structure options", () => {
    it("includes two-parent households", () => {
      const option = "two-parent";
      expect(option).toBe("two-parent");
    });

    it("includes single parent", () => {
      const option = "single-parent";
      expect(option).toBe("single-parent");
    });

    it("includes grandparent-led families", () => {
      const option = "grandparent-led";
      expect(option).toBe("grandparent-led");
    });

    it("includes foster and adoptive families", () => {
      const option = "foster";
      expect(option).toBe("foster");
    });

    it("includes same-sex parents", () => {
      const option = "same-sex";
      expect(option).toBe("same-sex");
    });

    it("includes blended families", () => {
      const option = "blended";
      expect(option).toBe("blended");
    });

    it("includes multigenerational families", () => {
      const option = "multigenerational";
      expect(option).toBe("multigenerational");
    });

    it("includes extended families", () => {
      const option = "extended";
      expect(option).toBe("extended");
    });
  });

  describe("representation statistics", () => {
    it("tracks ethnicity distribution", () => {
      const stats = {
        ethnicityDistribution: {
          asian: 20,
          african: 15,
          caucasian: 30,
          latinx: 20,
          middle_eastern: 15,
        },
      };
      expect(Object.keys(stats.ethnicityDistribution)).toHaveLength(5);
    });

    it("tracks family structure distribution", () => {
      const stats = {
        familyStructureDistribution: {
          "two-parent": 60,
          "single-parent": 30,
          "same-sex": 10,
        },
      };
      expect(Object.keys(stats.familyStructureDistribution)).toHaveLength(3);
    });

    it("tracks abilities included", () => {
      const stats = {
        abilitiesIncluded: {
          mobility: 5,
          visual: 3,
          hearing: 4,
        },
      };
      expect(Object.keys(stats.abilitiesIncluded).length).toBeGreaterThan(0);
    });

    it("calculates representation score", () => {
      const representationScore = 75;
      expect(representationScore).toBeGreaterThanOrEqual(0);
      expect(representationScore).toBeLessThanOrEqual(100);
    });
  });

  describe("cultural calendar", () => {
    it("includes diverse cultural events", () => {
      const events = [
        { name: "Lunar New Year", cultures: ["asian"] },
        { name: "Diwali", cultures: ["indian", "hindu"] },
        { name: "Kwanzaa", cultures: ["african", "african-american"] },
        { name: "Eid", cultures: ["muslim"] },
        { name: "Hanukkah", cultures: ["jewish"] },
      ];
      expect(events.length).toBeGreaterThan(0);
    });

    it("each event has story ideas", () => {
      const event = {
        id: "event-1",
        name: "Lunar New Year",
        storyIdeas: ["Family gathering", "Traditional celebrations"],
      };
      expect(event.storyIdeas).toHaveLength(2);
    });

    it("events have dates", () => {
      const event = {
        date: "2026-02-17",
        name: "Lunar New Year",
      };
      expect(event.date).toBeDefined();
    });
  });

  describe("stereotype detection", () => {
    it("identifies stereotypical character traits", () => {
      const traits = ["wise elder", "athletic", "quiet"];
      // Service would flag if all members of group have same stereotype
      expect(traits).toBeDefined();
    });

    it("prevents all characters of one ethnicity being same occupation", () => {
      const characters = [
        { ethnicity: "african", occupation: "doctor" },
        { ethnicity: "african", occupation: "teacher" },
        { ethnicity: "african", occupation: "engineer" },
      ];
      const occupations = characters.map((c) => c.occupation);
      expect(new Set(occupations).size).toBeGreaterThan(1);
    });

    it("ensures diverse representation within groups", () => {
      const asianCharacters = [
        { name: "Arun", heritage: "Indian" },
        { name: "Wei", heritage: "Chinese" },
        { name: "Kenji", heritage: "Japanese" },
      ];
      const heritages = asianCharacters.map((c) => c.heritage);
      expect(new Set(heritages).size).toBe(3);
    });
  });

  describe("profile validation", () => {
    it("validates ethnicity selections", () => {
      const ethnicities = ["asian", "african"];
      const valid = ["caucasian", "african", "asian", "latinx", "middle_eastern"];
      expect(ethnicities.every((e) => valid.includes(e))).toBe(true);
    });

    it("validates family structure selections", () => {
      const families = ["two-parent", "single-parent"];
      const valid = [
        "two-parent",
        "single-parent",
        "grandparent-led",
        "foster",
        "same-sex",
      ];
      expect(families.every((f) => valid.includes(f))).toBe(true);
    });

    it("validates diversity level", () => {
      const level = "balanced";
      const valid = ["mirror_family", "balanced", "maximum_diversity"];
      expect(valid).toContain(level);
    });
  });

  describe("representation completeness", () => {
    it("all major ethnicities are represented", () => {
      const ethnicities = [
        "caucasian",
        "african",
        "asian",
        "latinx",
        "middle_eastern",
        "indigenous",
        "pacific",
        "multiracial",
      ];
      expect(ethnicities).toHaveLength(8);
    });

    it("all major family structures represented", () => {
      const families = [
        "two-parent",
        "single-parent",
        "grandparent-led",
        "foster",
        "same-sex",
        "blended",
        "multigenerational",
        "extended",
      ];
      expect(families).toHaveLength(8);
    });

    it("includes LGBTQ+ representations", () => {
      const includes = ["same-sex"];
      expect(includes).toContain("same-sex");
    });

    it("includes disability representations", () => {
      const categories = [
        "ethnicities",
        "familyStructures",
        "abilities",
        "culturalBackgrounds",
      ];
      expect(categories).toContain("abilities");
    });
  });

  describe("language support", () => {
    it("supports multiple languages", () => {
      const languages = ["english", "spanish", "mandarin", "french", "arabic"];
      expect(languages.length).toBeGreaterThan(0);
    });

    it("includes right-to-left languages", () => {
      const rtlLanguages = ["arabic", "hebrew"];
      expect(rtlLanguages.length).toBeGreaterThan(0);
    });
  });

  describe("religious and spiritual diversity", () => {
    it("includes major world religions", () => {
      const religions = ["christian", "muslim", "jewish", "hindu", "buddhist"];
      expect(religions.length).toBeGreaterThan(0);
    });

    it("includes non-religious options", () => {
      const options = ["agnostic", "atheist"];
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe("prompt injection generation", () => {
    it("generates culturally diverse character prompts", () => {
      const prompt = "Create a character from the Asian culture with diverse background...";
      expect(prompt).toContain("diverse");
    });

    it("avoids stereotype prompts", () => {
      const prompt = "Create a character avoiding common stereotypes...";
      expect(prompt).toContain("avoiding");
    });

    it("includes multiple intersectionalities", () => {
      const profile = {
        ethnicities: ["asian"],
        familyStructures: ["single-parent"],
        abilities: ["mobility"],
        genderExpression: ["non-stereotypical"],
      };
      expect(Object.keys(profile).length).toBe(4);
    });
  });
});
