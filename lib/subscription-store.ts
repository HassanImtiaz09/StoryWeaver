import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ─────────────────────────────────────────────────────
export type SubscriptionPlan = "free" | "weekly" | "monthly" | "annual";

export type SubscriptionState = {
  plan: SubscriptionPlan;
  storiesUsed: number;
  freeStoriesLimit: number;
  expiresAt: string | null;
  trialActive: boolean;
  trialEndsAt: string | null;
  lastPurchaseDate: string | null;
};

export type PlanDetails = {
  id: SubscriptionPlan;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  savings?: string;
  features: string[];
  color: string;
  recommended?: boolean;
  trialDays?: number;
};

// ─── Plan Definitions ──────────────────────────────────────────
export const PLAN_DETAILS: PlanDetails[] = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$2.99",
    priceValue: 2.99,
    period: "/week",
    features: [
      "Unlimited stories",
      "ElevenLabs HD voices",
      "All 14 story themes",
      "AI illustrations",
    ],
    color: "#48C9B0",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$6.99",
    priceValue: 6.99,
    period: "/month",
    savings: "Save 42%",
    features: [
      "Unlimited stories",
      "ElevenLabs HD voices",
      "All 14 story themes",
      "AI illustrations",
      "Up to 5 child profiles",
      "10% off printed books",
    ],
    color: "#FFD700",
    recommended: true,
    trialDays: 7,
  },
  {
    id: "annual",
    name: "Annual",
    price: "$39.99",
    priceValue: 39.99,
    period: "/year",
    savings: "Save 74%",
    features: [
      "Unlimited stories",
      "ElevenLabs HD voices",
      "All 14 story themes",
      "AI illustrations",
      "Unlimited child profiles",
      "20% off printed books",
      "Neurodivergent story modes",
      "Priority story generation",
    ],
    color: "#6C63FF",
    trialDays: 7,
  },
];

// ─── Storage Keys ──────────────────────────────────────────────
const SUBSCRIPTION_KEY = "storyweaver_subscription";
const FREE_STORIES_LIMIT = 3;

// ─── Helper: Safe AsyncStorage caching ─────────────────────────
async function safeCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("[SubscriptionStore] AsyncStorage write failed:", err);
  }
}

const DEFAULT_STATE: SubscriptionState = {
  plan: "free",
  storiesUsed: 0,
  freeStoriesLimit: FREE_STORIES_LIMIT,
  expiresAt: null,
  trialActive: false,
  trialEndsAt: null,
  lastPurchaseDate: null,
};

// ─── Server-Authoritative Fetch ────────────────────────────────
/**
 * Fetch subscription state from the server (authoritative source).
 * Falls back to AsyncStorage if server is unavailable.
 */
export async function fetchServerSubscription(trpcClient: any): Promise<SubscriptionState> {
  try {
    const response = await trpcClient.subscription.getCurrentPlan.query();

    // Map server response to SubscriptionState format
    const serverState: SubscriptionState = {
      plan: (response.plan as SubscriptionPlan) || "free",
      storiesUsed: 0, // Server doesn't track this in the plan query
      freeStoriesLimit: FREE_STORIES_LIMIT,
      expiresAt: response.expiresAt ? new Date(response.expiresAt).toISOString() : null,
      trialActive: response.status === "trialing",
      trialEndsAt: null, // Would need additional field from server if needed
      lastPurchaseDate: response.expiresAt ? new Date(response.expiresAt).toISOString() : null,
    };

    // Cache in AsyncStorage as fallback
    await safeCache(SUBSCRIPTION_KEY, serverState);
    return serverState;
  } catch (err) {
    console.warn("[Subscription] Failed to fetch from server, using local cache:", err);
    // Fall back to AsyncStorage
    return getSubscriptionState();
  }
}

// ─── Core Functions ────────────────────────────────────────────
export async function getSubscriptionState(): Promise<SubscriptionState> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const state = { ...DEFAULT_STATE, ...JSON.parse(raw) };

    // Check if subscription has expired
    if (state.plan !== "free" && state.expiresAt) {
      const expiresDate = new Date(state.expiresAt);
      if (expiresDate < new Date()) {
        state.plan = "free";
        state.expiresAt = null;
        state.trialActive = false;
        state.trialEndsAt = null;
        await safeCache(SUBSCRIPTION_KEY, state);
      }
    }

    // Check if trial has expired
    if (state.trialActive && state.trialEndsAt) {
      const trialEnd = new Date(state.trialEndsAt);
      if (trialEnd < new Date()) {
        state.trialActive = false;
        state.trialEndsAt = null;
        if (state.plan !== "free" && !state.lastPurchaseDate) {
          state.plan = "free";
          state.expiresAt = null;
        }
        await safeCache(SUBSCRIPTION_KEY, state);
      }
    }

    return state;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveSubscriptionState(updates: Partial<SubscriptionState>): Promise<SubscriptionState> {
  const current = await getSubscriptionState();
  const updated = { ...current, ...updates };
  await safeCache(SUBSCRIPTION_KEY, updated);
  return updated;
}

export async function incrementStoriesUsed(): Promise<SubscriptionState> {
  const state = await getSubscriptionState();
  return saveSubscriptionState({ storiesUsed: state.storiesUsed + 1 });
}

// ─── Permission Checks ────────────────────────────────────────
export async function canCreateStory(): Promise<{ allowed: boolean; reason?: string; storiesUsed: number; limit: number }> {
  const state = await getSubscriptionState();

  if (state.plan !== "free" || state.trialActive) {
    return { allowed: true, storiesUsed: state.storiesUsed, limit: -1 };
  }

  if (state.storiesUsed >= state.freeStoriesLimit) {
    return {
      allowed: false,
      reason: `You've enjoyed all ${state.freeStoriesLimit} free stories! Subscribe to unlock unlimited bedtime adventures.`,
      storiesUsed: state.storiesUsed,
      limit: state.freeStoriesLimit,
    };
  }

  return { allowed: true, storiesUsed: state.storiesUsed, limit: state.freeStoriesLimit };
}

export async function canUseHDVoices(): Promise<boolean> {
  const state = await getSubscriptionState();
  return state.plan !== "free" || state.trialActive;
}

export async function canUseNDModes(): Promise<boolean> {
  const state = await getSubscriptionState();
  return state.plan === "annual" || state.trialActive;
}

// ─── Subscription Actions ──────────────────────────────────────
export async function activateSubscription(plan: SubscriptionPlan): Promise<SubscriptionState> {
  const now = new Date();
  let expiresAt: Date;

  switch (plan) {
    case "weekly":
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      break;
    case "annual":
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      break;
    default:
      return saveSubscriptionState({ plan: "free", expiresAt: null });
  }

  return saveSubscriptionState({
    plan,
    expiresAt: expiresAt.toISOString(),
    lastPurchaseDate: now.toISOString(),
    trialActive: false,
    trialEndsAt: null,
  });
}

export async function activateTrial(plan: SubscriptionPlan, trialDays: number = 7): Promise<SubscriptionState> {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  return saveSubscriptionState({
    plan,
    trialActive: true,
    trialEndsAt: trialEndsAt.toISOString(),
    expiresAt: trialEndsAt.toISOString(),
  });
}

export async function restorePurchases(): Promise<{ restored: boolean; plan?: SubscriptionPlan }> {
  const state = await getSubscriptionState();
  if (state.lastPurchaseDate && state.plan !== "free") {
    return { restored: true, plan: state.plan };
  }
  return { restored: false };
}

export async function cancelSubscription(): Promise<SubscriptionState> {
  return saveSubscriptionState({
    plan: "free",
    expiresAt: null,
    trialActive: false,
    trialEndsAt: null,
    lastPurchaseDate: null,
  });
}

// ─── Helpers ───────────────────────────────────────────────────
export function isPremiumPlan(plan: SubscriptionPlan): boolean {
  return plan !== "free";
}

export function formatExpiryDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function getRemainingFreeStories(state: SubscriptionState): number {
  if (state.plan !== "free" || state.trialActive) return -1;
  return Math.max(0, state.freeStoriesLimit - state.storiesUsed);
}
