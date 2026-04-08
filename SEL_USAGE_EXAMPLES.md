# SEL Story Templates - Usage Examples

## Frontend Usage

### 1. Generate a Story

```typescript
// In your component using tRPC
const generateStoryMutation = trpc.sel.generateStory.useMutation();

const handleGenerateStory = async (templateId: number) => {
  const result = await generateStoryMutation.mutateAsync({
    templateId,
    childId: 123,
    childName: "Emma",
    childAge: 7,
    customization: {
      theme: "friendship",
      characterName: "Luna"
    }
  });

  console.log(result);
  // Returns: {
  //   id: "5-1234567890",
  //   templateId: 5,
  //   title: "Making Friends",
  //   competency: "relationship_skills",
  //   emotionalGoals: ["social courage", "friendship building"],
  //   content: "Once upon a time...",
  //   ageAppropriate: true
  // }
};
```

### 2. Submit Emotional Check-In

```typescript
const submitResponseMutation = trpc.sel.submitResponse.useMutation();

const handleCheckIn = async (data) => {
  const result = await submitResponseMutation.mutateAsync({
    childId: 123,
    templateId: 5,
    emotionFelt: "happy",
    emotionIntensity: 4,
    reflection: "I liked how the character made new friends"
  });

  console.log(result);
  // Returns: {
  //   id: 42,
  //   childId: 123,
  //   templateId: 5,
  //   emotionFelt: "happy",
  //   emotionIntensity: 4,
  //   reflection: "I liked how the character made new friends"
  // }
};
```

### 3. Fetch Templates

```typescript
const templatesQuery = trpc.sel.getTemplates.useQuery({
  competency: "relationship_skills",
  ageMin: 5,
  ageMax: 9
});

// Returns: array of templates matching criteria
```

### 4. Get Child Progress

```typescript
const progressQuery = trpc.sel.getProgress.useQuery({
  childId: 123
});

console.log(progressQuery.data);
// Returns: {
//   childId: 123,
//   totalStoriesRead: 7,
//   progressByCompetency: [
//     {
//       competency: "self_awareness",
//       name: "Self-Awareness",
//       storiesRead: 2,
//       emoji: "🪞",
//       color: "emerald"
//     },
//     // ... other 4 competencies
//   ],
//   lastActivity: "2024-01-15T10:30:00Z"
// }
```

### 5. Get Parent Insights

```typescript
const insightsQuery = trpc.sel.getInsights.useQuery({
  childId: 123
});

console.log(insightsQuery.data);
// Returns: {
//   childId: 123,
//   totalStoriesRead: 7,
//   emotionFrequency: {
//     happy: 5,
//     brave: 2
//   },
//   averageEmotionalIntensity: 3.7,
//   weeklyActivityCount: 3,
//   progressByCompetency: [...],
//   areasOfGrowth: ["self_awareness", "relationship_skills"],
//   areasToExplore: ["responsive_decision_making"],
//   recentResponses: [...]
// }
```

### 6. Get Recommendations

```typescript
const recommendedQuery = trpc.sel.getRecommendations.useQuery({
  childId: 123,
  childAge: 7,
  childName: "Emma"
});

// Returns: array of 5 recommended templates
```

### 7. Use Zustand Store

```typescript
import { useSelStore } from "@/lib/sel-store";

// In component:
const {
  templates,
  competencies,
  selectedCompetency,
  setSelectedCompetency,
  addEmotionalCheckIn,
  generatedStories
} = useSelStore();

// Filter templates by selected competency
const filtered = templates.filter(t =>
  t.competency === selectedCompetency
);

// Add check-in to store (persists to AsyncStorage)
useSelStore.setState((state) => ({
  emotionalCheckIns: [newCheckIn, ...state.emotionalCheckIns]
}));
```

### 8. Render Components

```typescript
import SelCompetencyWheel from "@/components/sel-competency-wheel";
import SelTemplateCard from "@/components/sel-template-card";
import EmotionCheckIn from "@/components/emotion-check-in";
import SelProgressChart from "@/components/sel-progress-chart";
import SelInsightsPanel from "@/components/sel-insights-panel";

// Competency Wheel
<SelCompetencyWheel
  progress={childProgress}
  maxStoriesRead={10}
  onCompetencySelect={(comp) => setSelectedCompetency(comp)}
/>

// Template Card
<SelTemplateCard
  template={template}
  onPress={() => handleGenerateStory(template.id)}
  isSelected={currentTemplate?.id === template.id}
/>

// Emotion Check-in
<EmotionCheckIn
  onSubmit={(data) => handleSubmitCheckIn(data)}
  isLoading={isLoading}
/>

// Progress Chart
<SelProgressChart
  progress={childProgress}
  maxStoriesRead={10}
  showBadges={true}
/>

// Insights Panel
<SelInsightsPanel
  insights={insights}
  onExportPdf={() => exportToPdf()}
  isLoading={isLoading}
/>
```

## Backend Usage (Direct Service Calls)

### 1. Get Templates with Service

```typescript
import { getSelTemplates } from "@/server/_core/selService";

// All templates
const all = await getSelTemplates();

// Filter by competency
const selfAware = await getSelTemplates("self_awareness");

// Filter by age range
const forAge7 = await getSelTemplates(
  "self_management",
  { min: 5, max: 9 }
);
```

### 2. Generate Story (Direct)

```typescript
import { generateSelStory } from "@/server/_core/selService";

const story = await generateSelStory(
  templateId: 5,
  childId: 123,
  childName: "Emma",
  childAge: 7,
  {
    theme: "overcoming fears",
    characterName: "Brave Bear"
  }
);

console.log(story.content); // AI-generated story text
```

### 3. Get Insights (Direct)

```typescript
import { getSelInsights } from "@/server/_core/selService";

const insights = await getSelInsights(123);

console.log(insights.areasOfGrowth); // competencies to focus on
console.log(insights.emotionFrequency); // emotion distribution
console.log(insights.recentResponses); // last 10 emotional check-ins
```

### 4. Create Custom Template

```typescript
import { createCustomSelTemplate } from "@/server/_core/selService";

const customTemplate = await createCustomSelTemplate(
  userId: 456,
  {
    title: "My Anxiety Hero",
    description: "A story about facing anxiety with courage",
    competency: "self_management",
    ageRangeMin: 6,
    ageRangeMax: 10,
    difficulty: "moderate",
    promptTemplate: "Create a story where...",
    emotionalGoals: ["anxiety management", "self-courage"],
    iconEmoji: "🦸"
  }
);
```

## Complete Screen Flow

### SEL Stories Screen Structure

```typescript
export default function SelStoriesScreen() {
  const [activeTab, setActiveTab] = useState("explore");

  return (
    <ScreenContainer>
      {/* Header with tabs */}
      {activeTab === "explore" && <ExploreTab />}
      {activeTab === "progress" && <ProgressTab />}
      {activeTab === "insights" && <InsightsTab />}

      {/* Emotional check-in modal */}
      {showCheckIn && <EmotionCheckIn {...} />}
    </ScreenContainer>
  );
}
```

### Explore Tab Flow

```
1. Load competencies → SelCompetencyWheel
2. User taps competency → filter templates
3. Display templates → SelTemplateCard grid
4. User taps "Generate Story" → API call
5. Show story → trigger check-in modal
6. User submits emotions → save response
7. Refresh insights and progress
```

### Data Flow Summary

```
App → tRPC Query/Mutation
  ↓
Server Router (selRouter)
  ↓
Service Layer (selService)
  ↓
Database (Drizzle ORM)
  ↓
MySQL (sel_templates, sel_progress, sel_responses)
  ↓
Claude API (for story generation)
```

## TypeScript Types

```typescript
// From Zustand store
interface SelTemplate {
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

interface EmotionalCheckIn {
  id: number;
  childId: number;
  templateId: number;
  emotionFelt: string;
  emotionIntensity: number;
  reflection?: string;
  createdAt: Date;
}

interface SelInsights {
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
```

## Error Handling

```typescript
// tRPC will automatically handle errors
try {
  const result = await generateStoryMutation.mutateAsync({...});
} catch (error) {
  if (error instanceof TRPCError) {
    console.error(error.code, error.message);
  }
}

// In queries
const { data, isLoading, error } = templatesQuery;

if (error) {
  return <ErrorComponent message={error.message} />;
}
```

## Performance Considerations

1. **Caching:** tRPC queries are cached by React Query
2. **Persistence:** AsyncStorage keeps offline data
3. **Lazy Loading:** Templates fetched on demand
4. **Pagination:** Not needed for 25 templates
5. **Debouncing:** Filter changes are debounced

## Security

- All mutations require `protectedProcedure` (authenticated)
- Queries for templates are public (no sensitive data)
- Parent-only endpoints check `ctx.userId`
- Child data access verified by userId ownership
- All inputs validated with Zod schemas

## Testing

```typescript
// Unit test example
describe("selService", () => {
  it("should generate age-appropriate story", async () => {
    const story = await generateSelStory(
      templateId,
      childId,
      "Emma",
      7
    );
    expect(story.ageAppropriate).toBe(true);
  });

  it("should track emotional responses", async () => {
    const response = await assessEmotionalResponse(
      childId,
      templateId,
      "happy",
      4
    );
    expect(response.id).toBeDefined();
  });
});
```
