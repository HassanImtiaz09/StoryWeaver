# Social-Emotional Learning (SEL) Story Templates Implementation

This document summarizes the complete SEL feature implementation for the StoryWeaver app.

## Overview

The SEL Story Templates feature provides curated stories targeting the 5 CASEL competencies:
1. Self-Awareness
2. Self-Management
3. Social Awareness
4. Relationship Skills
5. Responsible Decision-Making

## Files Created

### Backend Services

#### `/server/_core/selService.ts` (~600 lines)
Core service implementing the SEL business logic:
- **getSelTemplates()** - Fetch templates with optional filters by competency and age range
- **getSelCompetencies()** - Return the 5 CASEL competencies with descriptions and visual properties
- **generateSelStory()** - AI-powered story generation using Claude 3.5 Sonnet
- **assessEmotionalResponse()** - Record emotional check-in after story reading
- **getSelProgress()** - Track which competencies child has explored
- **getRecommendedTemplates()** - AI-recommend templates based on child profile and progress
- **createCustomSelTemplate()** - Allow parents/therapists to create custom templates
- **getSelInsights()** - Parent-facing emotional growth analytics
- **initializeBuiltinTemplates()** - Seed database with 25 built-in templates

**Built-in Templates (25 total):**
- Self-Awareness: "The Feeling Detective", "Mirror Magic", "My Emotion Weather", "Inside My Heart", "The Color of Feelings"
- Self-Management: "The Patience Turtle", "Breathing with Bear", "When I Feel Angry", "My Calm Down Plan", "The Worry Monster"
- Social Awareness: "Walking in Their Shoes", "The Kindness Chain", "Different is Beautiful", "The Listening Ear", "Understanding Others"
- Relationship Skills: "Making Friends", "The Sharing Circle", "Words That Help", "Working Together", "Saying Sorry"
- Responsible Decision-Making: "Think Before You Act", "The Right Choice", "Consequences Trail", "Being Responsible", "Problem Solver"

### tRPC Router

#### `/server/_core/selRouter.ts` (~200 lines)
tRPC endpoints for frontend communication:
- `getTemplates` - Public query with competency/age filtering
- `getCompetencies` - Public query for CASEL competencies
- `generateStory` - Protected mutation for AI story generation
- `submitResponse` - Protected mutation for emotional check-ins
- `getProgress` - Protected query for child progress tracking
- `getRecommendations` - Protected query for personalized template recommendations
- `createTemplate` - Protected mutation for custom template creation
- `getInsights` - Protected query for parent insights dashboard

### Client State Management

#### `/lib/sel-store.ts` (~200 lines)
Zustand store with AsyncStorage persistence:
- **State:** templates, competencies, childProgress, currentTemplate, emotionalCheckIns, insights, filters
- **Methods:**
  - setTemplates, filterTemplatesByCompetency
  - setCompetencies
  - setChildProgress
  - setCurrentTemplate
  - addEmotionalCheckIn, getRecentCheckIns
  - setInsights
  - setSelectedCompetency, setSelectedDifficulty
  - addGeneratedStory

### React Components

#### `/components/sel-competency-wheel.tsx` (~200 lines)
Visual wheel displaying 5 CASEL competencies:
- Circular arrangement with color-coded segments
- Progress indicators per competency
- Interactive selection to filter templates
- Animated effects and tap interactions

#### `/components/sel-template-card.tsx` (~180 lines)
Template preview cards showing:
- Icon emoji and title
- Competency badge (color-coded)
- Age range indicator
- Difficulty level (gentle/moderate/challenging)
- Emotional goals (skills targeted)
- "Generate Story" button

#### `/components/emotion-check-in.tsx` (~220 lines)
Post-story emotional assessment UI:
- 5 emotion faces (happy, sad, worried, brave, calm) - large, tappable
- Intensity slider (1-5)
- Optional reflection text input
- Saves responses for parent insights

#### `/components/sel-progress-chart.tsx` (~180 lines)
Visual progress tracking:
- Progress bars per competency
- Badge system (Seed → Sprout → Growing → Tree → Master)
- Milestone tracking
- Completion celebration

#### `/components/sel-insights-panel.tsx` (~200 lines)
Parent-facing dashboard showing:
- Key metrics (stories read, weekly activity, avg emotional intensity)
- Most frequent emotion
- Emotional patterns/trends
- Areas of growth and exploration
- Recent emotional responses timeline
- Therapist notes section
- PDF export placeholder

### Main Screen

#### `/app/sel-stories.tsx` (~450 lines)
Main SEL Stories screen with 3 tabs:

**Explore Tab:**
- Competency wheel for visual navigation
- "Recommended For You" section
- Filtered template grid by competency selection
- Story generation with loading states
- Emotional check-in modal

**Progress Tab:**
- SEL progress chart showing competency development
- Badge achievements
- Milestone tracking

**Insights Tab:**
- Parent-facing dashboard
- Emotional trends and patterns
- Personalized recommendations
- Export options

## Database Schema

### `/drizzle/schema.ts` - New Tables

#### `selTemplates`
Stores SEL story templates with metadata:
```sql
- id (PK)
- title, description
- competency (enum: 5 CASEL competencies)
- ageRangeMin, ageRangeMax
- difficulty (gentle/moderate/challenging)
- promptTemplate (for Claude)
- emotionalGoals (JSON array)
- iconEmoji
- isBuiltIn (boolean)
- createdByUserId (for custom templates)
- createdAt
```

#### `selProgress`
Tracks which stories/competencies children have engaged with:
```sql
- id (PK)
- childId (FK)
- templateId (FK)
- arcId (FK, optional)
- competency (enum)
- completedAt
```

#### `selResponses`
Records emotional check-ins after stories:
```sql
- id (PK)
- childId (FK)
- templateId (FK)
- arcId (FK, optional)
- emotionFelt (string)
- emotionIntensity (1-5)
- reflection (optional text)
- createdAt
```

## Integration Points

### Modified Files

#### `/server/routers.ts`
- Added import: `import { selRouter } from "./_core/selRouter"`
- Added to appRouter: `sel: selRouter`

#### `/app/_layout.tsx`
- Added Stack.Screen for "sel-stories" route

#### `/drizzle/schema.ts`
- Added 3 new table definitions (selTemplates, selProgress, selResponses)
- Added type exports (SelTemplate, SelProgress, SelResponse)

## Key Features

### AI Story Generation
Uses Claude 3.5 Sonnet to generate age-appropriate stories that:
- Subtly teach SEL skills through narrative (not lecturing)
- Feature relatable characters and situations
- Include dialogue showing emotional processing
- Are 3-5 paragraphs with engaging, simple language

### Smart Recommendations
Algorithms recommend templates based on:
- Child's age and reading level
- Areas of least exploration (growth opportunities)
- Recent activity and engagement patterns
- Competency balance

### Parent Insights
Dashboard provides:
- Emotion frequency tracking
- Emotional intensity trends
- Weekly activity metrics
- Identified growth areas
- Exploration suggestions
- Recent emotional check-ins timeline

### Progress Tracking
Visual systems for motivation:
- Competency progress bars
- Achievement badges (5 levels)
- Milestone celebrations
- Total stories read counter

## Technical Stack

- **Frontend:** React Native/Expo with NativeWind (Tailwind)
- **State:** Zustand with AsyncStorage persistence
- **Backend:** tRPC + Drizzle ORM
- **Database:** MySQL
- **AI:** Claude 3.5 Sonnet (story generation)
- **Auth:** Protected procedures via ctx.userId

## Future Enhancements

1. **Therapist Integration:**
   - Custom template creation workflow
   - Session notes and observations
   - Export insights as clinical reports

2. **Advanced Analytics:**
   - Longitudinal emotional growth tracking
   - Peer comparison (anonymous)
   - Predictive recommendations

3. **Interactive Features:**
   - Story branching based on emotional choices
   - Multi-chapter SEL story arcs
   - Group story therapy sessions

4. **Content Expansion:**
   - Translations for multilingual support
   - Audio narration for all SEL stories
   - Video demonstrations of SEL skills

5. **Mobile Optimizations:**
   - Offline story caching
   - Audio story playback
   - Haptic feedback for selections

## Usage Example

```typescript
// Generate a personalized story
const story = await generateSelStory(
  templateId: 5,
  childId: 123,
  childName: "Emma",
  childAge: 7,
  customization: { theme: "friendship" }
);

// Record emotional response
await assessEmotionalResponse(
  childId: 123,
  templateId: 5,
  emotionFelt: "happy",
  emotionIntensity: 4,
  reflection: "I liked how the character made new friends"
);

// Get parent insights
const insights = await getSelInsights(childId: 123);
```

## Co-authored by Claude
All files created with Anthropic's Claude 3.5 Sonnet, built for production quality and COPPA compliance.
