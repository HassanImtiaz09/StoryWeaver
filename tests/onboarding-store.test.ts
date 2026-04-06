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
  isOnboardingComplete,
  setOnboardingComplete,
  resetOnboarding,
  getLocalChildren,
  saveLocalChild,
  removeLocalChild,
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

  it("returns false when onboarding not complete", async () => {
    const result = await isOnboardingComplete();
    expect(result).toBe(false);
  });

  it("marks onboarding as complete", async () => {
    await setOnboardingComplete();
    const result = await isOnboardingComplete();
    expect(result).toBe(true);
  });

  it("resets onboarding", async () => {
    await setOnboardingComplete();
    await resetOnboarding();
    const result = await isOnboardingComplete();
    expect(result).toBe(false);
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

  it("removes a child by ID", async () => {
    await saveLocalChild(makeChild({ id: "child-1", name: "Luna" }));
    await saveLocalChild(makeChild({ id: "child-2", name: "Max" }));
    await removeLocalChild("child-1");
    const children = await getLocalChildren();
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe("Max");
  });

  it("preserves child interests array", async () => {
    await saveLocalChild(makeChild({ interests: ["Space", "Dinosaurs", "Pirates"] }));
    const children = await getLocalChildren();
    expect(children[0].interests).toEqual(["Space", "Dinosaurs", "Pirates"]);
  });
});
