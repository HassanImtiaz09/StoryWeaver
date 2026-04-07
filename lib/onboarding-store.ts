import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";

const ONBOARDING_KEY = "storyweaver_onboarding_complete";
const CHILD_PROFILES_KEY = "storyweaver_child_profiles";

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, "true");
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export type LocalChild = {
  id: string;
  name: string;
  age: number;
  gender?: string;
  hairColor?: string;
  skinTone?: string;
  interests: string[];
  favoriteColor?: string;
  personalityTraits?: string[];
  fears?: string[];
  readingLevel?: string;
  language?: string;
  createdAt: string;
};

export async function getLocalChildren(): Promise<LocalChild[]> {
  try {
    const value = await AsyncStorage.getItem(CHILD_PROFILES_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function saveLocalChild(child: LocalChild): Promise<void> {
  const children = await getLocalChildren();
  children.push(child);
  await AsyncStorage.setItem(CHILD_PROFILES_KEY, JSON.stringify(children));
}

export async function removeLocalChild(id: string): Promise<void> {
  const children = await getLocalChildren();
  const filtered = children.filter((c) => c.id !== id);
  await AsyncStorage.setItem(CHILD_PROFILES_KEY, JSON.stringify(filtered));
}
