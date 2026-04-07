import AsyncStorage from "@react-native-async-storage/async-storage";

const STORY_ARCS_KEY = "storyweaver_story_arcs";

export type LocalStoryArc = {
  id: string;
  childId: string;
  childName: string;
  title: string;
  theme: string;
  themeName: string;
  educationalValue: string;
  educationalValueName: string;
  totalEpisodes: number;
  currentEpisode: number;
  status: "active" | "completed" | "paused";
  createdAt: string;
  updatedAt: string;
  serverArcId?: number;
  coverImageUrl?: string;
  synopsis?: string;
};

export async function getLocalStoryArcs(): Promise<LocalStoryArc[]> {
  try {
    const value = await AsyncStorage.getItem(STORY_ARCS_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function getStoryArcsForChild(childId: string): Promise<LocalStoryArc[]> {
  const arcs = await getLocalStoryArcs();
  return arcs.filter((a) => a.childId === childId);
}

export async function saveLocalStoryArc(arc: LocalStoryArc): Promise<void> {
  const arcs = await getLocalStoryArcs();
  arcs.push(arc);
  await AsyncStorage.setItem(STORY_ARCS_KEY, JSON.stringify(arcs));
}

export async function updateLocalStoryArc(id: string, updates: Partial<LocalStoryArc>): Promise<void> {
  const arcs = await getLocalStoryArcs();
  const index = arcs.findIndex((a) => a.id === id);
  if (index >= 0) {
    arcs[index] = { ...arcs[index], ...updates, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(STORY_ARCS_KEY, JSON.stringify(arcs));
  }
}

export async function removeLocalStoryArc(id: string): Promise<void> {
  const arcs = await getLocalStoryArcs();
  const filtered = arcs.filter((a) => a.id !== id);
  await AsyncStorage.setItem(STORY_ARCS_KEY, JSON.stringify(filtered));
}
