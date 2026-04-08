import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

type Competency =
  | "self_awareness"
  | "self_management"
  | "social_awareness"
  | "relationship_skills"
  | "responsible_decision_making";

export interface SelTemplate {
  id: number;
  title: string;
  description: string;
  competency: Competency;
  ageRangeMin: number;
  ageRangeMax: number;
  difficulty: "gentle" | "moderate" | "challenging";
  promptTemplate: string;
  emotionalGoals: string[];
  iconEmoji: string;
  isBuiltIn: boolean;
  createdByUserId?: number;
  createdAt: Date;
}

export interface SelCompetency {
  id: Competency;
  name: string;
  description: string;
  emoji: string;
  color: string;
}

export interface ChildProgress {
  competency: Competency;
  name: string;
  storiesRead: number;
  emoji: string;
  color: string;
}

export interface EmotionalCheckIn {
  id: number;
  childId: number;
  templateId: number;
  emotionFelt: string;
  emotionIntensity: number;
  reflection?: string;
  createdAt: Date;
}

export interface SelInsights {
  childId: number;
  totalStoriesRead: number;
  emotionFrequency: Record<string, number>;
  averageEmotionalIntensity: number;
  weeklyActivityCount: number;
  progressByCompetency: ChildProgress[];
  areasOfGrowth: Competency[];
  areasToExplore: Competency[];
  recentResponses: EmotionalCheckIn[];
}

interface SelStore {
  // Templates
  templates: SelTemplate[];
  setTemplates: (templates: SelTemplate[]) => void;
  filterTemplatesByCompetency: (competency?: Competency) => SelTemplate[];

  // Competencies
  competencies: SelCompetency[];
  setCompetencies: (competencies: SelCompetency[]) => void;

  // Child Progress
  childProgress: Record<number, ChildProgress[]>;
  setChildProgress: (childId: number, progress: ChildProgress[]) => void;

  // Current Template
  currentTemplate: SelTemplate | null;
  setCurrentTemplate: (template: SelTemplate | null) => void;

  // Emotional Check-in
  emotionalCheckIns: EmotionalCheckIn[];
  addEmotionalCheckIn: (checkIn: EmotionalCheckIn) => void;
  getRecentCheckIns: (childId: number, count?: number) => EmotionalCheckIn[];

  // Insights
  insights: Record<number, SelInsights>;
  setInsights: (childId: number, insights: SelInsights) => void;

  // Filters
  selectedCompetency: Competency | null;
  setSelectedCompetency: (competency: Competency | null) => void;
  selectedDifficulty: string | null;
  setSelectedDifficulty: (difficulty: string | null) => void;

  // Story Generation
  generatedStories: Record<
    string,
    {
      id: string;
      templateId: number;
      title: string;
      competency: Competency;
      emotionalGoals: string[];
      content: string;
      ageAppropriate: boolean;
      generatedAt: Date;
    }
  >;
  addGeneratedStory: (story: any) => void;

  // Utilities
  clearAll: () => void;
}

export const useSelStore = create<SelStore>()(
  persist(
    (set, get) => ({
      // Templates
      templates: [],
      setTemplates: (templates) => set({ templates }),
      filterTemplatesByCompetency: (competency) => {
        const allTemplates = get().templates;
        if (!competency) return allTemplates;
        return allTemplates.filter((t) => t.competency === competency);
      },

      // Competencies
      competencies: [],
      setCompetencies: (competencies) => set({ competencies }),

      // Child Progress
      childProgress: {},
      setChildProgress: (childId, progress) =>
        set((state) => ({
          childProgress: {
            ...state.childProgress,
            [childId]: progress,
          },
        })),

      // Current Template
      currentTemplate: null,
      setCurrentTemplate: (template) => set({ currentTemplate: template }),

      // Emotional Check-in
      emotionalCheckIns: [],
      addEmotionalCheckIn: (checkIn) =>
        set((state) => ({
          emotionalCheckIns: [checkIn, ...state.emotionalCheckIns],
        })),
      getRecentCheckIns: (childId, count = 10) => {
        const allCheckIns = get().emotionalCheckIns;
        return allCheckIns
          .filter((c) => c.childId === childId)
          .slice(0, count);
      },

      // Insights
      insights: {},
      setInsights: (childId, insights) =>
        set((state) => ({
          insights: {
            ...state.insights,
            [childId]: insights,
          },
        })),

      // Filters
      selectedCompetency: null,
      setSelectedCompetency: (competency) =>
        set({ selectedCompetency: competency }),
      selectedDifficulty: null,
      setSelectedDifficulty: (difficulty) =>
        set({ selectedDifficulty: difficulty }),

      // Story Generation
      generatedStories: {},
      addGeneratedStory: (story) =>
        set((state) => ({
          generatedStories: {
            ...state.generatedStories,
            [story.id]: {
              ...story,
              generatedAt: new Date(),
            },
          },
        })),

      // Utilities
      clearAll: () =>
        set({
          templates: [],
          competencies: [],
          childProgress: {},
          currentTemplate: null,
          emotionalCheckIns: [],
          insights: {},
          selectedCompetency: null,
          selectedDifficulty: null,
          generatedStories: {},
        }),
    }),
    {
      name: "sel-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        emotionalCheckIns: state.emotionalCheckIns,
        generatedStories: state.generatedStories,
        selectedCompetency: state.selectedCompetency,
        selectedDifficulty: state.selectedDifficulty,
      }),
    }
  )
);
