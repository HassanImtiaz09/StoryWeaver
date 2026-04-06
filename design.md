# StoryWeaver - Design Document

## App Concept
A premium bedtime story app where parents create a persistent child avatar. The app generates continuous, episodic nightly bedtime stories featuring the child as the hero, with AI-generated illustrations and soothing audio narration. Dark, cinematic golden theme designed for nighttime use.

## Screen List

### 1. Onboarding (5 slides)
- Slide 1: Hero — App logo, tagline "Every Night, A New Chapter", star counter
- Slide 2: Features — Personalized stories, AI illustrations, soothing narration, printed books
- Slide 3: How It Works — 3 steps: Create Avatar → Choose Theme → Listen & Dream
- Slide 4: Subscription — Free (3 stories/arc) vs Premium ($7.99/mo unlimited)
- Slide 5: Get Started — Continue as Guest / Create Account

### 2. Home Screen (Tab 1: "Tonight")
- Top: Greeting "Good evening, [Parent Name]" with moon/stars motif
- Hero card: Tonight's story episode with cover illustration, title, episode number
- "Start Tonight's Story" golden CTA button
- Below: Active story arcs carousel (horizontal scroll of arc cards)
- Bottom: "Create New Adventure" secondary button

### 3. Create Avatar Screen
- Child's name input
- Age selector (2-10)
- Gender/appearance picker (hair color, skin tone, simple avatar builder)
- Interests multi-select chips: Space, Dinosaurs, Ocean, Magic, Animals, Princesses, Pirates, Robots, Nature, Superheroes
- "Create [Name]'s Universe" golden button

### 4. New Story Arc Screen
- Select child avatar (if multiple children)
- Theme picker: grid of illustrated theme cards (Space, Underwater, Enchanted Forest, Dinosaur Land, Pirate Seas, Robot City)
- Educational value picker: Kindness, Bravery, Sharing, Honesty, Curiosity, Friendship
- Number of episodes slider (5-15, default 10)
- "Begin the Adventure" golden button

### 5. Story Reading Screen (Full-screen immersive)
- Full-screen AI-generated illustration as background
- Story text overlay at bottom in large, readable font
- Swipe left/right for next/previous page
- Audio play/pause floating button
- Progress dots at top
- "Continue Tomorrow" button at episode end

### 6. Story Library (Tab 2: "Library")
- Segmented control: Active Arcs | Completed Arcs
- Each arc card shows: cover image, title, child name, episode progress (e.g., "Episode 4 of 10")
- Tap arc → episode list
- Completed arcs show "Print as Book" golden upsell button

### 7. Profile (Tab 3: "Family")
- Parent profile section
- Children avatars list (tap to edit)
- "Add Another Child" button
- Subscription status card
- Bedtime reminder toggle + time picker
- Settings gear icon

### 8. Settings Screen
- Narration voice selector (warm female, gentle male, storyteller)
- Reading speed slider
- Push notification preferences
- Dark mode (always on by default for bedtime)
- About / Privacy / Terms

## Primary Content and Functionality

### Home Screen
- Tonight's episode card with AI cover art, story title, episode number
- Active story arcs as horizontal carousel
- Quick-start button for tonight's bedtime story

### Story Reading
- 6-8 pages per episode, each with AI illustration + 2-3 paragraphs
- Audio narration auto-plays with page turns
- Background audio continues when screen locks
- Episode ends with cliffhanger and "Continue Tomorrow" prompt

### Library
- All story arcs organized by status (active/completed)
- Episode-level access within each arc
- Re-read/re-listen to any past episode

### Profile
- Manage multiple children profiles
- Subscription management
- Bedtime reminder scheduling

## Key User Flows

### Flow 1: First-Time Setup
Onboarding slides → Create Account/Guest → Create Child Avatar → Choose First Story Theme → Generate Episode 1 → Read/Listen → "See you tomorrow!"

### Flow 2: Nightly Bedtime (Returning User)
Push notification at bedtime → Open app → Home shows tonight's episode → Tap "Start Tonight's Story" → Full-screen reading with audio → Episode ends → "Continue Tomorrow" → App closes

### Flow 3: Print Book Upsell
Library → Completed Arc → "Print as Book" → Preview book layout → Enter shipping details → Purchase ($39.99) → Order confirmation

### Flow 4: New Story Arc
Home → "Create New Adventure" → Select child → Choose theme → Set educational value → Set episodes → Generate Arc → Episode 1 ready

## Color Choices (Bedtime/Night Theme)

| Token | Light | Dark (Primary) | Usage |
|-------|-------|----------------|-------|
| background | #1A1A2E | #0A0E1A | Deep night sky base |
| foreground | #ECEDEE | #F5F5F5 | Primary text (soft white) |
| primary | #FFD700 | #FFD700 | Golden accent, stars, buttons |
| primaryAlt | #FFA500 | #FFA500 | Gradient end for buttons |
| surface | #16213E | #0F1428 | Cards, story panels |
| muted | #9BA1A6 | #8B8FA3 | Secondary text |
| border | rgba(255,215,0,0.15) | rgba(255,215,0,0.1) | Subtle golden borders |
| accent | #7B68EE | #6C5CE7 | Purple accent for magic elements |

## Typography
- Story text: Large, serif-like font for readability (System serif or custom)
- UI text: System default (San Francisco / Roboto)
- Story titles: Bold, golden, with text shadow

## Navigation Structure
- Tab bar with 3 tabs: Tonight (home), Library (book), Family (person)
- Story reading is a full-screen modal (no tab bar)
- Onboarding is a separate stack before tabs
- Settings pushed from Profile tab
