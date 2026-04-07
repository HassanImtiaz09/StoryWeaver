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
  getLocalChildren,
  saveLocalChild,
  deleteLocalChild,
  getLocalChild,
  getSubscription,
  incrementStoriesUsed,
  canCreateStory,
  getChildCount,
  type LocalChild,
} from "../lib/onboarding-store";

const makeChild = (overrides: Partial<LocalChild> = {}): LocalChild => ({
  id: "child-1",
  name: "Luna",
  age: 6,
  gender: "Girl",
  hairColor: "brown",
  skinTone: "medium",
  interests: ["Space", "Dinosaurs"],
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("Onboarding Store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("returns empty array when no children", async () => {
    const children = await getLocalChildren();
    expect(children).toEqual([]);
  });

  it("saves and retrieves a child", async () => {
    const child = makeChild();
    await saveLocalChild(child);
    const children = await getLocalChildren();
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe("Luna");
    expect(children[0].age).toBe(6);
  });

  it("saves multiple children", async () => {
    await saveLocalChild(makeChild({ id: "child-1", name: "Luna" }));
    await saveLocalChild(makeChild({ id: "child-2", name: "Max" }));
    const children = await getLocalChildren();
    expect(children).toHaveLength(2);
  });

  it("gets a child by id", async () => {
    await saveLocalChild(makeChild());
    const child = await getLocalChild("child-1");
    expect(child).not.toBeNull();
    expect(child?.name).toBe("Luna");
  });

  it("returns null for non-existent child", async () => {
    const child = await getLocalChild("nonexistent");
    expect(child).toBeNull();
  });

  it("deletes a child by ID", async () => {
    await saveLocalChild(makeChild({ id: "child-1", name: "Luna" }));
    await saveLocalChild(makeChild({ id: "child-2", name: "Max" }));
    await deleteLocalChild("child-1");
    const children = await getLocalChildren();
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe("Max");
  });

  it("preserves child interests array", async () => {
    await saveLocalChild(makeChild({ interests: ["Space", "Dinosaurs", "Pirates"] }));
    const children = await getLocalChildren();
    expect(children[0].interests).toEqual(["Space", "Dinosaurs", "Pirates"]);
  });

  it("counts children correctly", async () => {
    expect(await getChildCount()).toBe(0);
    await saveLocalChild(makeChild({ id: "child-1" }));
    expect(await getChildCount()).toBe(1);
    await saveLocalChild(makeChild({ id: "child-2", name: "Max" }));
    expect(await getChildCount()).toBe(2);
  });

  it("returns default free subscription", async () => {
    const sub = await getSubscription();
    expect(sub.plan).toBe("free");
    expect(sub.storiesUsed).toBe(0);
  });

  it("increments stories used", async () => {
    const count = await incrementStoriesUsed();
    expect(count).toBe(1);
    const sub = await getSubscription();
    expect(sub.storiesUsed).toBe(1);
  });

  it("allows story creation on free plan", async () => {
    const allowed = await canCreateStory();
    expect(allowed).toBe(true);
  });
});
