# StoryWeaver Test Suite

Comprehensive test coverage for the StoryWeaver app using Vitest.

## Test Files Created

### Client-Side Store Tests (13 files)

1. **voice-assistant.test.ts** (345 lines, 12 test cases)
   - Command parsing (story modification, navigation, questions, fun interactions)
   - State management (listening, processing, speaking states)
   - Command history tracking (last 50 commands)
   - Error handling for unrecognized commands
   - Persistence to AsyncStorage

2. **collaborative-store.test.ts** (471 lines, 14 test cases)
   - Session creation and joining
   - Turn management and detection
   - Participant tracking
   - Session status transitions (waiting, active, paused, completed)
   - Story segment merging
   - Session persistence

3. **offline-store.test.ts** (334 lines, 12 test cases)
   - Story text storage and retrieval
   - Image download and caching with base64 encoding
   - Audio download and caching (narration and music)
   - Storage usage calculation
   - Arc removal and selective cleanup
   - Cache pruning for old data (>30 days)
   - Multi-user offline support

4. **language-store.test.ts** (365 lines, 13 test cases)
   - Primary/secondary language selection
   - Bilingual mode toggle
   - Translation caching with key generation
   - Learning language tracking
   - Vocabulary highlights toggle
   - Learning progress accumulation
   - RTL language detection
   - Helper hooks (useLanguageDisplay, useLanguageLearning, useTranslationCache)

5. **accessibility-store.test.ts** (441 lines, 13 test cases)
   - Font modes: standard, dyslexia-friendly, large-print
   - Contrast modes: normal, high-contrast, dark, sepia (4 palettes)
   - Text size scaling (0.8x to 2.0x)
   - Line/letter/word spacing adjustments
   - TTS speed control (0.5x to 2.0x)
   - Reading guide and syllable breaks
   - Color overlays (amber, blue, green, pink, purple)
   - Color overlay opacity (10-40)
   - Accessible text style generation

6. **educator-store.test.ts** (532 lines, 15 test cases)
   - Classroom management (create, select, update)
   - Student progress tracking
   - Assignment creation and tracking
   - Assessment management
   - Class analytics (top performers, students needing attention)
   - Loading states for all data types
   - Multiple classroom support

7. **grandparent-store.test.ts** (559 lines, 16 test cases)
   - Family member management with relationships
   - Co-creation session lifecycle (active, paused, completed)
   - Memory prompt submission (5 categories)
   - Family story archive
   - Invite code generation
   - Font size accessibility (1x to 2x multiplier)
   - Grandparent mode toggle
   - Loading states for all operations

8. **sel-store.test.ts** (583 lines, 16 test cases)
   - SEL template filtering by competency and age
   - 5 competencies tracked (self_awareness, self_management, social_awareness, relationship_skills, responsible_decision_making)
   - Emotional check-in tracking with intensity
   - Insights with growth and exploration areas
   - Difficulty filtering (gentle, moderate, challenging)
   - Child progress by competency
   - Age-appropriate template selection

9. **smart-home-store.test.ts** (575 lines, 16 test cases)
   - Device management (Philips Hue, Alexa, Google Home, other)
   - Scene activation and management
   - Bedtime routine creation with 6 step types
   - Step types: dim_lights, play_music, read_story, lights_off, ambient_sound, voice_command
   - Mood lighting (7 moods with HSL values)
   - Ambient sound toggle
   - Device status tracking with connection state
   - Complete bedtime routine workflow

10. **diversity-store.test.ts** (522 lines, 15 test cases)
    - Profile management with 8 diversity categories
    - Ethnicity options (8 options)
    - Family structures (8 options)
    - Diversity levels (mirror_family, balanced, maximum_diversity)
    - Representation statistics tracking
    - Cultural events calendar
    - Category loading and validation
    - Profile reset functionality

11. **sharing-store.test.ts** (552 lines, 16 test cases)
    - Share link creation and management
    - Gallery filtering and pagination
    - Privacy levels (private, link_only, public)
    - Like/report state management
    - Share history tracking (multiple platforms)
    - User's shared stories management
    - Gallery filters (theme, age, sort, search)
    - Sort options: popular, recent, liked

12. **analytics-store.test.ts** (404 lines, 13 test cases)
    - Reading summary and stats
    - Time period filtering (week, month, all)
    - Child selection for multi-child tracking
    - Reading trends (daily data)
    - Theme breakdown by count
    - Vocabulary growth tracking
    - Heatmap for activity patterns
    - Milestones tracking (locked/unlocked)
    - Weekly reports and peer comparison
    - Cache operations (5-minute window)

13. **voice-assistant.test.ts** (already exists - 249 lines)
    - Original subscription store tests

### Server-Side Service Tests (3 files)

1. **server/smartHomeService.test.ts** (392 lines, 15 test cases)
   - 7 story moods with HSL mappings
   - Mood to lighting color mapping validation
   - HSL to hex conversion for all moods
   - Bedtime routine step type validation
   - All 6 step types supported
   - Ambient sound library definitions
   - Device platform support (4 platforms)
   - Configuration validation
   - Lighting color attributes (warm/cool tones)
   - Settings merging and preservation

2. **server/selService.test.ts** (391 lines, 18 test cases)
   - 25 built-in templates (5 per competency)
   - All 5 competencies covered
   - Template property validation
   - Age range filtering (child age matching)
   - Difficulty progression (gentle→moderate→challenging)
   - Emotional goals per template
   - Prompt template validation
   - Icon emoji assignment
   - Progress tracking
   - Template descriptions and appropriateness

3. **server/diversityService.test.ts** (459 lines, 20 test cases)
   - Default profile validation
   - All 8 diversity categories
   - Ethnicity options (8 options)
   - Family structure options (8 options)
   - Representation statistics
   - Cultural calendar events
   - Stereotype detection
   - Profile validation
   - Representation completeness
   - Language support (including RTL)
   - Religious/spiritual diversity
   - Prompt injection generation
   - Multi-group intersectionality

## Test Coverage Summary

**Total Lines of Code: 7,173**
**Total Test Files: 16**
**Total Test Cases: 200+**

### Patterns Used

All tests follow the existing pattern from `subscription-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

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

describe("store-name", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useStore.setState({ /* reset state */ });
  });

  // Test cases
});
```

### Running Tests

```bash
vitest run                  # Run all tests once
vitest                      # Watch mode
vitest --ui                 # UI mode
vitest --coverage          # With coverage report
vitest __tests__/voice-assistant.test.ts  # Single file
```

### Key Testing Strategies

1. **State Management**: Test initial state, state updates, and computed properties
2. **Async Operations**: Mock AsyncStorage for persistence tests
3. **Fetch Operations**: Mock global fetch for API calls
4. **Loading States**: Test loading and error states
5. **Edge Cases**: Test boundary values, empty states, multiple items
6. **Workflows**: Test realistic user interactions
7. **Persistence**: Verify AsyncStorage integration
8. **Validation**: Verify data structure and constraints

### Files Covered

- ✅ lib/voice-assistant.ts
- ✅ lib/collaborative-store.ts
- ✅ lib/offline-storage.ts
- ✅ lib/language-store.ts
- ✅ lib/accessibility-store.ts
- ✅ lib/educator-store.ts
- ✅ lib/grandparent-store.ts
- ✅ lib/sel-store.ts
- ✅ lib/smart-home-store.ts
- ✅ lib/diversity-store.ts
- ✅ lib/sharing-store.ts
- ✅ lib/analytics-store.ts
- ✅ server/_core/smartHomeService.ts
- ✅ server/_core/selService.ts
- ✅ server/_core/diversityService.ts

### Next Steps

1. Run tests: `vitest run`
2. Check coverage: `vitest --coverage`
3. Watch mode during development: `vitest`
4. Integrate with CI/CD pipeline
