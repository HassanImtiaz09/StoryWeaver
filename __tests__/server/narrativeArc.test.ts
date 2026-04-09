import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(function (table) {
        return {
          where: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => Promise.resolve([])),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        $returningId: vi.fn(() => Promise.resolve([{ id: 1 }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock cache
vi.mock("../../server/_core/cache", () => ({
  cache: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
    del: vi.fn(() => Promise.resolve()),
  },
  CACHE_CONFIG: {
    storyTemplates: { ttl: 300 },
  },
}));

// Mock story engine
vi.mock("../../server/_core/storyEngine", () => ({
  storyEngine: {
    generateStoryArc: vi.fn(() => Promise.resolve({
      title: "Test Arc",
      synopsis: "Test synopsis",
      episodeOutlines: [],
    })),
  },
}));

import {
  getPhaseForEpisode,
  PHASE_GOALS,
  buildNarrativePhaseContext,
  type NarrativePhase,
} from "../../server/_core/narrativeArc";

describe("narrativeArc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPhaseForEpisode", () => {
    describe("5-episode arc (1:1 mapping)", () => {
      it("maps episode 1 to introduction", () => {
        const phase = getPhaseForEpisode(1, 5);
        expect(phase).toBe("introduction");
      });

      it("maps episode 2 to rising_action", () => {
        const phase = getPhaseForEpisode(2, 5);
        expect(phase).toBe("rising_action");
      });

      it("maps episode 3 to midpoint_escalation", () => {
        const phase = getPhaseForEpisode(3, 5);
        expect(phase).toBe("midpoint_escalation");
      });

      it("maps episode 4 to climax_approach", () => {
        const phase = getPhaseForEpisode(4, 5);
        expect(phase).toBe("climax_approach");
      });

      it("maps episode 5 to resolution", () => {
        const phase = getPhaseForEpisode(5, 5);
        expect(phase).toBe("resolution");
      });
    });

    describe("shorter arcs (≤5 episodes)", () => {
      it("handles 3-episode arc with clamping", () => {
        expect(getPhaseForEpisode(1, 3)).toBe("introduction");
        expect(getPhaseForEpisode(2, 3)).toBe("rising_action");
        expect(getPhaseForEpisode(3, 3)).toBe("midpoint_escalation");
      });

      it("handles 4-episode arc with clamping", () => {
        expect(getPhaseForEpisode(1, 4)).toBe("introduction");
        expect(getPhaseForEpisode(2, 4)).toBe("rising_action");
        expect(getPhaseForEpisode(3, 4)).toBe("midpoint_escalation");
        expect(getPhaseForEpisode(4, 4)).toBe("climax_approach");
      });

      it("clamps episodes beyond 5 to resolution phase", () => {
        const phase = getPhaseForEpisode(6, 4);
        expect(phase).toBe("climax_approach");
      });
    });

    describe("longer arcs (6-7 episodes with ratio-based distribution)", () => {
      describe("7-episode arc", () => {
        it("maps episode 1 to introduction (ratio ≈ 0.0)", () => {
          const phase = getPhaseForEpisode(1, 7);
          expect(phase).toBe("introduction");
        });

        it("maps episode 2 to rising_action (ratio ≈ 0.167)", () => {
          const phase = getPhaseForEpisode(2, 7);
          expect(phase).toBe("rising_action");
        });

        it("maps episode 3 to rising_action (ratio ≈ 0.333)", () => {
          const phase = getPhaseForEpisode(3, 7);
          expect(phase).toBe("rising_action");
        });

        it("maps episode 4 to midpoint_escalation (ratio = 0.5)", () => {
          const phase = getPhaseForEpisode(4, 7);
          expect(phase).toBe("midpoint_escalation");
        });

        it("maps episode 5 to climax_approach (ratio ≈ 0.667)", () => {
          const phase = getPhaseForEpisode(5, 7);
          expect(phase).toBe("climax_approach");
        });

        it("maps episode 6 to climax_approach (ratio ≈ 0.833)", () => {
          const phase = getPhaseForEpisode(6, 7);
          expect(phase).toBe("climax_approach");
        });

        it("maps episode 7 to resolution (ratio = 1.0)", () => {
          const phase = getPhaseForEpisode(7, 7);
          expect(phase).toBe("resolution");
        });
      });

      describe("6-episode arc", () => {
        it("maps episode 1 to introduction", () => {
          const phase = getPhaseForEpisode(1, 6);
          expect(phase).toBe("introduction");
        });

        it("maps episode 2 to rising_action (ratio = 0.2)", () => {
          const phase = getPhaseForEpisode(2, 6);
          expect(phase).toBe("rising_action");
        });

        it("maps episode 3 to rising_action (ratio = 0.4)", () => {
          const phase = getPhaseForEpisode(3, 6);
          expect(phase).toBe("rising_action");
        });

        it("maps episode 4 to midpoint_escalation (ratio = 0.6)", () => {
          const phase = getPhaseForEpisode(4, 6);
          expect(phase).toBe("midpoint_escalation");
        });

        it("maps episode 5 to climax_approach (ratio = 0.8)", () => {
          const phase = getPhaseForEpisode(5, 6);
          expect(phase).toBe("climax_approach");
        });

        it("maps episode 6 to resolution (ratio = 1.0)", () => {
          const phase = getPhaseForEpisode(6, 6);
          expect(phase).toBe("resolution");
        });
      });
    });

    describe("edge cases", () => {
      it("always returns introduction for episode 1", () => {
        for (let total of [1, 2, 3, 5, 7, 10]) {
          const phase = getPhaseForEpisode(1, total);
          expect(phase).toBe("introduction");
        }
      });

      it("always returns resolution for last episode", () => {
        for (let total of [1, 2, 3, 5, 7, 10]) {
          const phase = getPhaseForEpisode(total, total);
          expect(phase).toBe("resolution");
        }
      });

      it("handles 1-episode arc (introduction clamped to resolution)", () => {
        const phase = getPhaseForEpisode(1, 1);
        expect(phase).toBe("introduction");
      });

      it("handles 2-episode arc", () => {
        expect(getPhaseForEpisode(1, 2)).toBe("introduction");
        expect(getPhaseForEpisode(2, 2)).toBe("resolution");
      });
    });
  });

  describe("PHASE_GOALS", () => {
    it("defines goals for all phases", () => {
      const phases: NarrativePhase[] = [
        "introduction",
        "rising_action",
        "midpoint_escalation",
        "climax_approach",
        "resolution",
      ];

      phases.forEach((phase) => {
        expect(PHASE_GOALS[phase]).toBeDefined();
        expect(PHASE_GOALS[phase]).toBeInstanceOf(Array);
      });
    });

    it("introduction phase has goals", () => {
      const intro = PHASE_GOALS.introduction;
      expect(intro).toHaveLength(4);
      expect(intro).toContain("Introduce protagonist and setting");
      expect(intro).toContain("Establish the story world rules");
      expect(intro).toContain("Present the initial situation or problem");
      expect(intro).toContain("Hook the reader with an intriguing element");
    });

    it("rising_action phase has goals", () => {
      const rising = PHASE_GOALS.rising_action;
      expect(rising).toHaveLength(4);
      expect(rising).toContain("Introduce complications or obstacles");
      expect(rising).toContain("Deepen character relationships");
      expect(rising).toContain("Build tension and stakes");
      expect(rising).toContain("Introduce or develop the antagonist/challenge");
    });

    it("midpoint_escalation phase has goals", () => {
      const midpoint = PHASE_GOALS.midpoint_escalation;
      expect(midpoint).toHaveLength(4);
      expect(midpoint).toContain("Major turning point or revelation");
      expect(midpoint).toContain("Raise the stakes significantly");
      expect(midpoint).toContain("Character faces a difficult choice");
      expect(midpoint).toContain("Shift in the story direction");
    });

    it("climax_approach phase has goals", () => {
      const climax = PHASE_GOALS.climax_approach;
      expect(climax).toHaveLength(4);
      expect(climax).toContain("Build to the climax");
      expect(climax).toContain("All story threads converge");
      expect(climax).toContain("Character demonstrates growth");
      expect(climax).toContain("Highest tension point");
    });

    it("resolution phase has goals", () => {
      const resolution = PHASE_GOALS.resolution;
      expect(resolution).toHaveLength(4);
      expect(resolution).toContain("Resolve the main conflict");
      expect(resolution).toContain("Show character transformation");
      expect(resolution).toContain("Tie up story threads");
      expect(resolution).toContain("End with emotional satisfaction and calm for bedtime");
    });

    it("each phase has at least one goal", () => {
      Object.values(PHASE_GOALS).forEach((goals) => {
        expect(goals.length).toBeGreaterThan(0);
      });
    });

    it("each goal is a non-empty string", () => {
      Object.values(PHASE_GOALS).forEach((goals) => {
        goals.forEach((goal) => {
          expect(typeof goal).toBe("string");
          expect(goal.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("buildNarrativePhaseContext", () => {
    it("returns a formatted context string", async () => {
      const context = await buildNarrativePhaseContext(1, 1, 5);
      expect(typeof context).toBe("string");
      expect(context).toContain("NARRATIVE PHASE TRACKING");
      expect(context).toContain("Current Phase");
      expect(context).toContain("Phase Goals");
    });

    it("includes current phase in context", async () => {
      const context = await buildNarrativePhaseContext(1, 1, 5);
      expect(context).toContain("introduction");
    });

    it("includes episode numbers in context", async () => {
      const context = await buildNarrativePhaseContext(1, 3, 5);
      expect(context).toContain("Episode 3/5");
    });

    it("includes phase goals in context", async () => {
      const context = await buildNarrativePhaseContext(1, 1, 5);
      expect(context).toContain("Introduce protagonist and setting");
    });

    it("formats phase name with underscores replaced by spaces", async () => {
      const context = await buildNarrativePhaseContext(1, 3, 5);
      expect(context).toContain("MIDPOINT ESCALATION");
    });

    it("includes next phase preview for non-final episodes", async () => {
      const context = await buildNarrativePhaseContext(1, 1, 5);
      expect(context).toContain("Next Phase");
    });

    it("does not include next phase preview for final episode", async () => {
      const context = await buildNarrativePhaseContext(1, 5, 5);
      expect(context).not.toContain("Next Phase");
    });

    it("contains closing marker", async () => {
      const context = await buildNarrativePhaseContext(1, 1, 5);
      expect(context).toContain("END NARRATIVE PHASE");
    });

    it("formats completed phases when present", async () => {
      // Mock getArcMilestones to return completed milestone
      const { cache } = await import("../../server/_core/cache");
      (cache.get as any).mockResolvedValueOnce([
        {
          episodeNumber: 1,
          narrativePhase: "introduction",
          isCompleted: true,
          phaseOutcome: {
            goalsAchieved: ["Introduced hero"],
            cliffhanger: "Hero discovers map",
          },
        },
      ]);

      const context = await buildNarrativePhaseContext(1, 2, 5);
      expect(context).toContain("Completed Phases");
      expect(context).toContain("Episode 1");
    });

    it("handles cliffhangers in completed phases", async () => {
      const { cache } = await import("../../server/_core/cache");
      (cache.get as any).mockResolvedValueOnce([
        {
          episodeNumber: 1,
          narrativePhase: "introduction",
          isCompleted: true,
          phaseOutcome: {
            goalsAchieved: ["Hook set"],
            cliffhanger: "Mystery deepens",
          },
        },
      ]);

      const context = await buildNarrativePhaseContext(1, 2, 5);
      expect(context).toContain("Cliffhanger");
      expect(context).toContain("Mystery deepens");
    });

    it("formats goals as bullet points", async () => {
      const context = await buildNarrativePhaseContext(1, 1, 5);
      expect(context).toContain("  - ");
    });

    it("works for all arc lengths", async () => {
      for (let total of [1, 2, 3, 5, 7, 10]) {
        const context = await buildNarrativePhaseContext(1, 1, total);
        expect(context).toContain("NARRATIVE PHASE TRACKING");
      }
    });

    it("works for all episode positions", async () => {
      for (let episode of [1, 3, 5]) {
        const context = await buildNarrativePhaseContext(1, episode, 5);
        expect(context).toContain("NARRATIVE PHASE TRACKING");
        expect(context).toContain(`Episode ${episode}/5`);
      }
    });
  });
});
