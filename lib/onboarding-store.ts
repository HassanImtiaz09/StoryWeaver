import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Helper: Safe AsyncStorage caching ─────────────────────────
async function safeCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("[OnboardingStore] AsyncStorage write failed:", err);
  }
}

// ─── Types ─────────────────────────────────────────────────────
export type NeurodivergentProfile = {
  type: string; // autism, adhd, dyslexia, anxiety, sensory, giftedness
  sensoryPreferences?: string[];
  communicationStyle?: string;
  storyPacing?: string; // calm, moderate, engaging
  customNotes?: string;
};

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
  // Neurodivergent support
  isNeurodivergent?: boolean;
  neurodivergentProfiles?: NeurodivergentProfile[];
  sensoryPreferences?: string[];
  communicationStyle?: string;
  storyPacing?: string;
  // Additional profile fields
  nickname?: string;
  bedtime?: string;
  favoriteCharacter?: string;
  allergiesOrTriggers?: string[];
  createdAt: string;
  updatedAt?: string;
};

export type SubscriptionState = {
  plan: "free" | "monthly" | "yearly";
  storiesUsed: number;
  expiresAt?: string;
};

// ─── Storage Keys ──────────────────────────────────────────────
const CHILDREN_KEY = "storyweaver_children";
const SUBSCRIPTION_KEY = "subscription_plan";
const STORIES_USED_KEY = "stories_used";

// ─── Children CRUD ─────────────────────────────────────────────
export async function getLocalChildren(): Promise<LocalChild[]> {
  try {
    const data = await AsyncStorage.getItem(CHILDREN_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveLocalChild(child: LocalChild): Promise<void> {
  const children = await getLocalChildren();
  const existingIndex = children.findIndex((c) => c.id === child.id);
  if (existingIndex >= 0) {
    children[existingIndex] = { ...child, updatedAt: new Date().toISOString() };
  } else {
    children.push(child);
  }
  await safeCache(CHILDREN_KEY, children);
}

export async function deleteLocalChild(childId: string): Promise<void> {
  const children = await getLocalChildren();
  const filtered = children.filter((c) => c.id !== childId);
  await safeCache(CHILDREN_KEY, filtered);
}

export async function getLocalChild(childId: string): Promise<LocalChild | null> {
  const children = await getLocalChildren();
  return children.find((c) => c.id === childId) ?? null;
}

// ─── Subscription ──────────────────────────────────────────────
export async function getSubscription(): Promise<SubscriptionState> {
  try {
    const plan = (await AsyncStorage.getItem(SUBSCRIPTION_KEY)) ?? "free";
    const used = parseInt((await AsyncStorage.getItem(STORIES_USED_KEY)) ?? "0", 10);
    return {
      plan: plan as "free" | "monthly" | "yearly",
      storiesUsed: used,
    };
  } catch {
    return { plan: "free", storiesUsed: 0 };
  }
}

export async function incrementStoriesUsed(): Promise<number> {
  const sub = await getSubscription();
  const newCount = sub.storiesUsed + 1;
  try {
    await AsyncStorage.setItem(STORIES_USED_KEY, newCount.toString());
  } catch (err) {
    console.warn("[OnboardingStore] AsyncStorage write failed:", err);
  }
  return newCount;
}

export async function canCreateStory(): Promise<boolean> {
  const sub = await getSubscription();
  if (sub.plan !== "free") return true;
  return sub.storiesUsed < 3;
}

export async function getChildCount(): Promise<number> {
  const children = await getLocalChildren();
  return children.length;
}
