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

import { useDiversityStore } from "../lib/diversity-store";

describe("diversity-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useDiversityStore.setState({
      profile: null,
      categories: [],
      representationStats: null,
      culturalEvents: [],
      loading: false,
      error: null,
    });
  });

  describe("store initial state", () => {
    it("initializes with no profile", () => {
      const state = useDiversityStore.getState();
      expect(state.profile).toBeNull();
    });

    it("initializes with empty categories", () => {
      const state = useDiversityStore.getState();
      expect(state.categories).toEqual([]);
    });

    it("initializes with no stats", () => {
      const state = useDiversityStore.getState();
      expect(state.representationStats).toBeNull();
    });

    it("initializes with loading false", () => {
      const state = useDiversityStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  describe("profile management", () => {
    it("sets diversity profile", () => {
      const profile = {
        ethnicities: ["african", "asian", "latinx"],
        familyStructures: ["two-parent", "single-parent"],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: ["traditional", "non-stereotypical"],
        bodyTypes: ["average", "athletic"],
        languages: ["english", "spanish"],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "balanced" as const,
      };
      const store = useDiversityStore.getState();
      store.setProfile(profile);
      expect(useDiversityStore.getState().profile).toEqual(profile);
    });

    it("tracks all ethnicity options", () => {
      const profile = {
        ethnicities: [
          "caucasian",
          "african",
          "asian",
          "latinx",
          "middle_eastern",
          "indigenous",
          "pacific",
          "multiracial",
        ],
        familyStructures: [],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: [],
        bodyTypes: [],
        languages: [],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "maximum_diversity" as const,
      };
      const store = useDiversityStore.getState();
      store.setProfile(profile);
      expect(useDiversityStore.getState().profile?.ethnicities).toHaveLength(8);
    });

    it("tracks all family structure options", () => {
      const profile = {
        ethnicities: [],
        familyStructures: [
          "two-parent",
          "single-parent",
          "grandparent-led",
          "foster",
          "same-sex",
          "blended",
          "multigenerational",
          "extended",
        ],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: [],
        bodyTypes: [],
        languages: [],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "maximum_diversity" as const,
      };
      const store = useDiversityStore.getState();
      store.setProfile(profile);
      expect(useDiversityStore.getState().profile?.familyStructures).toHaveLength(8);
    });

    it("supports diversity level settings", () => {
      const mirrorProfile = {
        ethnicities: ["caucasian"],
        familyStructures: ["two-parent"],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: ["traditional"],
        bodyTypes: ["average"],
        languages: ["english"],
        religiousSpiritual: [],
        preferMirrorFamily: true,
        diversityLevel: "mirror_family" as const,
      };

      const balancedProfile = {
        ethnicities: ["african", "asian", "latinx"],
        familyStructures: ["two-parent", "single-parent"],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: ["traditional", "non-stereotypical"],
        bodyTypes: ["average", "athletic"],
        languages: ["english", "spanish"],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "balanced" as const,
      };

      const maxProfile = {
        ethnicities: ["african", "asian", "caucasian", "latinx", "middle_eastern"],
        familyStructures: ["two-parent", "single-parent", "same-sex", "blended"],
        abilities: ["mobility", "visual", "hearing"],
        culturalBackgrounds: ["american", "african", "asian"],
        genderExpression: ["traditional", "non-stereotypical"],
        bodyTypes: ["average", "athletic", "plus-size"],
        languages: ["english", "spanish", "mandarin"],
        religiousSpiritual: ["christian", "muslim", "jewish"],
        preferMirrorFamily: false,
        diversityLevel: "maximum_diversity" as const,
      };

      const store = useDiversityStore.getState();

      store.setProfile(mirrorProfile);
      expect(useDiversityStore.getState().profile?.diversityLevel).toBe("mirror_family");

      store.setProfile(balancedProfile);
      expect(useDiversityStore.getState().profile?.diversityLevel).toBe("balanced");

      store.setProfile(maxProfile);
      expect(useDiversityStore.getState().profile?.diversityLevel).toBe("maximum_diversity");
    });
  });

  describe("categories", () => {
    it("sets diversity categories", () => {
      const categories = [
        {
          id: "ethnicities",
          label: "Ethnicity & Race",
          description: "Character diversity in ethnicity",
          options: [
            {
              id: "asian",
              label: "Asian",
              description: "Asian heritage",
            },
          ],
        },
      ];
      const store = useDiversityStore.getState();
      store.setCategories(categories as any);
      expect(useDiversityStore.getState().categories).toHaveLength(1);
    });

    it("tracks all 8 diversity categories", () => {
      const categories = [
        { id: "ethnicities", label: "Ethnicity & Race", description: "", options: [] },
        { id: "familyStructures", label: "Family Structure", description: "", options: [] },
        { id: "abilities", label: "Abilities & Disabilities", description: "", options: [] },
        { id: "culturalBackgrounds", label: "Cultural Backgrounds", description: "", options: [] },
        { id: "genderExpression", label: "Gender Expression", description: "", options: [] },
        { id: "bodyTypes", label: "Body Types", description: "", options: [] },
        { id: "languages", label: "Languages", description: "", options: [] },
        { id: "religiousSpiritual", label: "Religious & Spiritual", description: "", options: [] },
      ];
      const store = useDiversityStore.getState();
      store.setCategories(categories as any);
      expect(useDiversityStore.getState().categories).toHaveLength(8);
    });
  });

  describe("representation statistics", () => {
    it("sets representation stats", () => {
      const stats = {
        totalStories: 100,
        ethnicityDistribution: {
          asian: 20,
          african: 15,
          caucasian: 30,
          latinx: 20,
          middle_eastern: 15,
        },
        familyStructureDistribution: {
          "two-parent": 60,
          "single-parent": 30,
          "same-sex": 10,
        },
        abilitiesIncluded: {
          mobility: 5,
          visual: 3,
          hearing: 4,
        },
        culturalsRepresented: {
          american: 40,
          african: 15,
          asian: 20,
        },
        representationScore: 75,
      };
      const store = useDiversityStore.getState();
      store.setRepresentationStats(stats as any);
      expect(useDiversityStore.getState().representationStats).toEqual(stats);
    });

    it("calculates representation score", () => {
      const stats = {
        totalStories: 50,
        ethnicityDistribution: {
          african: 15,
          asian: 10,
          latinx: 12,
          middle_eastern: 8,
          caucasian: 5,
        },
        familyStructureDistribution: {
          "two-parent": 20,
          "single-parent": 15,
          "same-sex": 8,
          blended: 7,
        },
        abilitiesIncluded: {
          mobility: 5,
          visual: 3,
        },
        culturalsRepresented: {
          american: 20,
          african: 15,
          asian: 15,
        },
        representationScore: 82,
      };
      const store = useDiversityStore.getState();
      store.setRepresentationStats(stats as any);
      expect(useDiversityStore.getState().representationStats?.representationScore).toBe(82);
    });
  });

  describe("cultural events", () => {
    it("sets cultural events", () => {
      const events = [
        {
          id: "event-1",
          name: "Lunar New Year",
          date: "2026-02-17",
          cultures: ["asian", "chinese"],
          description: "Celebration of new year in Asian cultures",
          storyIdeas: ["Family gathering", "Traditional celebrations"],
          icon: "🧧",
        },
      ];
      const store = useDiversityStore.getState();
      store.setCulturalEvents(events as any);
      expect(useDiversityStore.getState().culturalEvents).toHaveLength(1);
    });

    it("tracks multiple cultural events", () => {
      const events = [
        {
          id: "event-1",
          name: "Lunar New Year",
          date: "2026-02-17",
          cultures: ["asian"],
          description: "",
          storyIdeas: [],
          icon: "🧧",
        },
        {
          id: "event-2",
          name: "Diwali",
          date: "2026-10-29",
          cultures: ["indian", "hindu"],
          description: "",
          storyIdeas: [],
          icon: "🪔",
        },
        {
          id: "event-3",
          name: "Kwanzaa",
          date: "2026-12-26",
          cultures: ["african", "african-american"],
          description: "",
          storyIdeas: [],
          icon: "🕯️",
        },
      ];
      const store = useDiversityStore.getState();
      store.setCulturalEvents(events as any);
      expect(useDiversityStore.getState().culturalEvents).toHaveLength(3);
    });
  });

  describe("loading and error states", () => {
    it("sets loading state", () => {
      const store = useDiversityStore.getState();
      store.setLoading(true);
      expect(useDiversityStore.getState().loading).toBe(true);
      store.setLoading(false);
      expect(useDiversityStore.getState().loading).toBe(false);
    });

    it("sets error message", () => {
      const store = useDiversityStore.getState();
      store.setError("Failed to load categories");
      expect(useDiversityStore.getState().error).toBe("Failed to load categories");
    });

    it("clears error on successful load", () => {
      const store = useDiversityStore.getState();
      store.setError("Some error");
      store.setError(null);
      expect(useDiversityStore.getState().error).toBeNull();
    });
  });

  describe("reset functionality", () => {
    it("resets store to initial state", () => {
      const store = useDiversityStore.getState();
      const profile = {
        ethnicities: ["asian"],
        familyStructures: ["two-parent"],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: ["traditional"],
        bodyTypes: ["average"],
        languages: ["english"],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "balanced" as const,
      };
      store.setProfile(profile);
      store.setLoading(true);
      store.setError("Some error");

      store.reset();

      const state = useDiversityStore.getState();
      expect(state.profile).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.categories).toEqual([]);
    });
  });

  describe("language diversity", () => {
    it("tracks multiple languages in profile", () => {
      const profile = {
        ethnicities: [],
        familyStructures: [],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: [],
        bodyTypes: [],
        languages: ["english", "spanish", "mandarin", "french", "arabic"],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "balanced" as const,
      };
      const store = useDiversityStore.getState();
      store.setProfile(profile);
      expect(useDiversityStore.getState().profile?.languages).toHaveLength(5);
    });
  });

  describe("ability representation", () => {
    it("includes various disability representations", () => {
      const profile = {
        ethnicities: [],
        familyStructures: [],
        abilities: ["mobility", "visual", "hearing", "cognitive", "invisible"],
        culturalBackgrounds: [],
        genderExpression: [],
        bodyTypes: [],
        languages: [],
        religiousSpiritual: [],
        preferMirrorFamily: false,
        diversityLevel: "maximum_diversity" as const,
      };
      const store = useDiversityStore.getState();
      store.setProfile(profile);
      expect(useDiversityStore.getState().profile?.abilities).toHaveLength(5);
    });
  });

  describe("religious and spiritual diversity", () => {
    it("includes various religious traditions", () => {
      const profile = {
        ethnicities: [],
        familyStructures: [],
        abilities: [],
        culturalBackgrounds: [],
        genderExpression: [],
        bodyTypes: [],
        languages: [],
        religiousSpiritual: [
          "christian",
          "muslim",
          "jewish",
          "hindu",
          "buddhist",
          "agnostic",
          "atheist",
        ],
        preferMirrorFamily: false,
        diversityLevel: "maximum_diversity" as const,
      };
      const store = useDiversityStore.getState();
      store.setProfile(profile);
      expect(useDiversityStore.getState().profile?.religiousSpiritual).toHaveLength(7);
    });
  });

  describe("comprehensive diversity workflow", () => {
    it("supports full diversity configuration", () => {
      const store = useDiversityStore.getState();

      // Set comprehensive profile
      const profile = {
        ethnicities: ["african", "asian", "caucasian", "latinx"],
        familyStructures: ["two-parent", "single-parent", "same-sex", "blended"],
        abilities: ["mobility", "visual", "hearing"],
        culturalBackgrounds: ["american", "african", "asian"],
        genderExpression: ["traditional", "non-stereotypical"],
        bodyTypes: ["average", "athletic"],
        languages: ["english", "spanish"],
        religiousSpiritual: ["christian", "muslim", "jewish"],
        preferMirrorFamily: false,
        diversityLevel: "balanced" as const,
      };
      store.setProfile(profile);

      // Set categories
      const categories = [
        { id: "ethnicities", label: "Ethnicity & Race", description: "", options: [] },
        { id: "familyStructures", label: "Family Structure", description: "", options: [] },
      ];
      store.setCategories(categories as any);

      // Set stats
      const stats = {
        totalStories: 100,
        ethnicityDistribution: {
          african: 25,
          asian: 25,
          caucasian: 25,
          latinx: 25,
        },
        familyStructureDistribution: {},
        abilitiesIncluded: {},
        culturalsRepresented: {},
        representationScore: 85,
      };
      store.setRepresentationStats(stats as any);

      // Set cultural events
      const events = [
        {
          id: "event-1",
          name: "Lunar New Year",
          date: "2026-02-17",
          cultures: ["asian"],
          description: "",
          storyIdeas: [],
        },
      ];
      store.setCulturalEvents(events as any);

      const state = useDiversityStore.getState();
      expect(state.profile?.ethnicities).toHaveLength(4);
      expect(state.categories).toHaveLength(2);
      expect(state.representationStats?.representationScore).toBe(85);
      expect(state.culturalEvents).toHaveLength(1);
    });
  });
});
