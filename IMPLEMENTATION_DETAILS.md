# Implementation Details: StoryWeaver Four Improvements

## File-by-File Changes

### 1. `/server/_core/promptTemplates.ts`

#### Change 1.1: Added `buildNarrationPacingPrompt()` function
**Location:** Lines 88-128
**Purpose:** Provides Claude with SSML markup instructions for natural pacing
**Key Elements:**
- `<break time="0.5s"/>` through `<break time="2.0s"/>` pause markers
- Tone modulation: (softly), (excitedly), (slowly, dreamily), (gently, getting quieter)
- Whispered text formatting with asterisks
- 6 pacing rules for natural delivery
- Validation that break times don't exceed 3 seconds

#### Change 1.2: Updated `EPISODE_GENERATION_TEMPLATE()` function
**Location:** Lines 145-342
**Purpose:** Implement all improvements in story generation prompt

**Subchange 1.2.1: Age-based story length (IMPROVEMENT 1)**
- Lines 155-180: Calculates pageCount, wordsPerPage, targetNarrationMinutes based on age
- Lines 182-186: Adjusts for accessibility options
- Updated story length requirement (line 287) to specify word targets and time estimates

**Subchange 1.2.2: Narrative phase guidance (IMPROVEMENT 3)**
- Lines 211-246: episodeNumber and totalEpisodes extracted from context
- Dynamic narrativePhaseGuide that varies by episode position in series
- Five distinct narrative phases for different episode roles

**Subchange 1.2.3: Multiple morals support (IMPROVEMENT 2)**
- Lines 248-262: customElementsContext now includes "MORAL LESSONS" section
- Uses context.customElements.morals array with mapping for natural integration
- Instructions emphasize showing morals through action, not lecturing

**Subchange 1.2.4: Series continuity section (IMPROVEMENT 3)**
- Lines 296-301: New "SERIES CONTINUITY (CRITICAL)" section
- Enforces consistent characters, cumulative growth, event references

**Subchange 1.2.5: Pacing prompt injection (IMPROVEMENT 4)**
- Line 305: Injected buildNarrationPacingPrompt() into template
- Placed after voice format to ensure pacing instructions are clear

---

### 2. `/app/new-story.tsx`

#### Change 2.1: Expanded moral options
**Location:** Lines 27-31
**Content:** STORY_MORAL_OPTIONS array expanded from 4 to 12 options

#### Change 2.2: Changed moral state management
**Location:** Lines 45
**Before:** `const [storyMoral, setStoryMoral] = useState<string | null>(null);`
**After:** `const [storyMorals, setStoryMorals] = useState<string[]>([]);`
**Purpose:** Support multiple selections

#### Change 2.3: Added toggleMoral() function
**Location:** Lines 52-63
**Purpose:** Implements max 3 selections with toggle behavior
**Features:**
- Removes moral if already selected
- Prevents selection beyond 3
- Shows Alert if max reached

#### Change 2.4: Updated validation
**Location:** Line 66
**Before:** `if (!storyLength || !storyTone || !storyMoral)`
**After:** `if (!storyLength || !storyTone || storyMorals.length === 0)`
**Also requires:** At least one moral (changed from exact one)

#### Change 2.5: Updated mutation call
**Location:** Lines 79-86
**Changed:**
- `moralLesson: storyMoral` → `moralLessons: storyMorals` (array)

#### Change 2.6: Updated UI section
**Location:** Lines 217-263
**Changes:**
- Added flex row with counter badge "X/3"
- Changed onClick from `setStoryMoral` to `toggleMoral(option)`
- Changed selected check from `===` to `.includes()`
- Updated section title to include "(Pick up to 3)"

---

### 3. `/server/_core/elevenlabs.ts`

#### Change 3.1: Added processNarrationMarkup() function
**Location:** Lines 266-329
**Purpose:** Process SSML and tone markup from Claude-generated text
**Implementation:**
- Extracts tone modulation markers and adjusts voice config
- Handles 7 tone types with specific config adjustments
- Removes asterisks from whispered text
- Validates break times don't exceed 3s
- Returns { processedText, adjustedConfig }

**Tone adjustments:**
```
(softly/whispered):        +stability, -style, +similarity
(excitedly):               +style, -stability
(slowly, dreamily):        +stability, -style
(gently, getting quieter):  +stability, -style
(urgently):                +style, -stability
(sadly):                   +stability, -style
(happily):                 +style
```

#### Change 3.2: Updated generatePageAudio()
**Location:** Lines 414-416
**Before:**
```typescript
const enhancedText = addVocalQuirks(...);
const audioBuffer = await generateSpeech({ text: enhancedText, voiceConfig, language });
```
**After:**
```typescript
const enhancedText = addVocalQuirks(...);
const { processedText, adjustedConfig } = processNarrationMarkup(enhancedText, voiceConfig);
const audioBuffer = await generateSpeech({ text: processedText, voiceConfig: adjustedConfig, language });
```

#### Change 3.3: Updated generateEpisodeAudio()
**Location:** Lines 510-512
**Same change as 3.2, applied to episode-level audio generation**
**Ensures consistent pacing across entire episodes**

---

### 4. `/server/routers.ts`

#### Change 4.1: Added stories router
**Location:** Lines 754-819
**Purpose:** New router for story generation with multiple morals support

**Details:**
- Accepts moralLessons as `z.array(z.string()).optional()`
- Joins array into string with ", " separator for storage
- Maps to storyArcs creation
- Returns arcId, serverArcId, and title
- Tracks story usage

#### Change 4.2: Updated episodes.generate mutation
**Location:** Lines 907-933
**Purpose:** Pass moral lessons through to story context

**Subchange 4.2.1: Parse moral lessons from arc**
```typescript
const moralLessons = arc.educationalValue
  ? arc.educationalValue.split(",").map((m) => m.trim())
  : undefined;
```

**Subchange 4.2.2: Add to storyContext**
```typescript
customElements: moralLessons ? { morals: moralLessons } : undefined,
```

---

## Data Flow

### Improvement 1: Bedtime Story Length
```
StoryContext.child.age → EPISODE_GENERATION_TEMPLATE
  → Calculate pageCount, wordsPerPage, targetNarrationMinutes
  → Include in prompt to Claude
  → Claude generates age-appropriate length
```

### Improvement 2: Multiple Morals
```
new-story.tsx: User selects 1-3 morals
  → storyMorals array
  → stories.generateStory(moralLessons: string[])
  → educationalValue: string (joined with ", ")
  → In episodes.generate: parse back to array
  → customElements.morals passed to EPISODE_GENERATION_TEMPLATE
  → Claude receives "MORAL LESSONS TO WEAVE" section
  → Incorporates naturally in narrative
```

### Improvement 3: Episode Consistency
```
StoryContext.storyArc.currentEpisode, totalEpisodes
  → EPISODE_GENERATION_TEMPLATE
  → Calculate episode phase (Introduction/Rising/Midpoint/Climax/Resolution)
  → Include narrativePhaseGuide and SERIES CONTINUITY section
  → Claude follows phase-specific narrative structure
  → Maintains character/setting consistency through "CRITICAL" section
```

### Improvement 4: Narration Pacing
```
EPISODE_GENERATION_TEMPLATE includes buildNarrationPacingPrompt()
  → Claude generates text with:
    - <break time="Xs"/> SSML tags
    - (tone) modulation markers
    - *whispered* text
  → generatePageAudio/generateEpisodeAudio:
    - Call processNarrationMarkup()
    - Extract tone, adjust voiceConfig
    - Remove markers
    - Keep SSML breaks
  → ElevenLabs processes final text with:
    - SSML breaks for pacing
    - Adjusted voice settings for tone
```

---

## Testing Checklist

- [ ] Story generation works with new stories.generateStory endpoint
- [ ] Multiple morals (1-3) can be selected in UI
- [ ] Counter shows "X/3" correctly
- [ ] Alert appears when trying to select 4th moral
- [ ] Story arc created with moralLessons joined as educationalValue
- [ ] Episode generation correctly parses morals from arc
- [ ] SSML breaks are present in generated story text
- [ ] Tone modulation markers are processed correctly
- [ ] Voice config adjustments apply based on tone
- [ ] Age-appropriate page counts are used
- [ ] Word targets match bedtime narration durations
- [ ] Episode number affects narrative phase guidance
- [ ] Series continuity requirements appear in prompt
- [ ] Multi-episode stories maintain character consistency
- [ ] Audio generation completes without errors
- [ ] Generated audio files are playable

---

## Backward Compatibility

- Existing `storyArcs.generate` endpoint unchanged
- Existing `episodes.generate` endpoint enhanced (customElements optional)
- New `stories.generateStory` endpoint provides enhanced flow
- All existing functionality preserved
- Optional improvements activate only when data is provided

---

## Performance Considerations

- `processNarrationMarkup()`: O(n) where n = text length, minimal overhead
- Array operations in `toggleMoral()`: O(n) where n ≤ 3, negligible
- String joining for educationalValue: O(1) for typical 1-3 items
- Prompt generation: Slightly larger templates, but offset by more focused Claude responses
