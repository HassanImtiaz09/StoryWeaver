import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getLocalStoryArcs,
  saveLocalStoryArc,
  updateLocalStoryArc,
  removeLocalStoryArc,
  getStoryArcsForChild,
  type LocalStoryArc,
} from "../lib/story-store";

const makeArc = (overrides: Partial<LocalStoryArc> = {}): LocalStoryArc => ({
  id: "arc-1",
  childId: "child-1",
  childName: "Luna",
  title: "Luna's Space Adventure",
  theme: "space",
  themeName: "Space Adventure",
  educationalValue: "bravery",
  educationalValueName: "Bravery",
  totalEpisodes: 7,
  currentEpisode: 0,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("Story Store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("returns empty array when no arcs exist", async () => {
    const arcs = await getLocalStoryArcs();
    expect(arcs).toEqual([]);
  });

  it("saves and retrieves a story arc", async () => {
    const arc = makeArc();
    await saveLocalStoryArc(arc);
    const arcs = await getLocalStoryArcs();
    expect(arcs).toHaveLength(1);
    expect(arcs[0].title).toBe("Luna's Space Adventure");
    expect(arcs[0].childName).toBe("Luna");
  });

  it("saves multiple arcs", async () => {
    await saveLocalStoryArc(makeArc({ id: "arc-1" }));
    await saveLocalStoryArc(makeArc({ id: "arc-2", title: "Luna's Ocean Journey" }));
    const arcs = await getLocalStoryArcs();
    expect(arcs).toHaveLength(2);
  });

  it("updates a story arc", async () => {
    await saveLocalStoryArc(makeArc({ id: "arc-1" }));
    await updateLocalStoryArc("arc-1", { currentEpisode: 3, status: "active" });
    const arcs = await getLocalStoryArcs();
    expect(arcs[0].currentEpisode).toBe(3);
  });

  it("removes a story arc", async () => {
    await saveLocalStoryArc(makeArc({ id: "arc-1" }));
    await saveLocalStoryArc(makeArc({ id: "arc-2" }));
    await removeLocalStoryArc("arc-1");
    const arcs = await getLocalStoryArcs();
    expect(arcs).toHaveLength(1);
    expect(arcs[0].id).toBe("arc-2");
  });

  it("filters arcs by child ID", async () => {
    await saveLocalStoryArc(makeArc({ id: "arc-1", childId: "child-1" }));
    await saveLocalStoryArc(makeArc({ id: "arc-2", childId: "child-2" }));
    const arcs = await getStoryArcsForChild("child-1");
    expect(arcs).toHaveLength(1);
    expect(arcs[0].childId).toBe("child-1");
  });
});
