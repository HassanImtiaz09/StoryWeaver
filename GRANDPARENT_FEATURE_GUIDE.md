# Grandparent Co-Creation Mode - Quick Reference Guide

## What Was Built

A complete feature enabling grandparents and extended family to remotely co-create personalized children's stories by sharing memories that are woven into AI-generated narratives.

## Core Components

### 1. Invite System
- Parent creates invite code (8 characters)
- Grandparent receives code via SMS/email/share
- Grandparent enters code to connect
- Invite expires after 30 days

### 2. Memory Sharing
- Grandparent submits memories in 5 categories
- Each memory 10-2000 characters
- Categories: childhood, travel, tradition, funny, lesson
- Memories can be edited before generation

### 3. Story Generation
- Claude API weaves memory into child-appropriate story
- Automatic formatting for page-by-page display
- Preserves emotional core of memory
- Age-appropriate language

### 4. Voice Narration (Optional)
- Grandparent can record voice for each page
- Uses device microphone via expo-av
- Integrates with story playback
- Stored for future listening

### 5. Story Archive
- Completed stories tagged by contributor
- Filterable by family member
- Shows memory count and creation date
- Persistent family record

## File Structure

```
server/
├── _core/
│   ├── grandparentService.ts  ← Business logic
│   └── grandparentRouter.ts   ← API endpoints

lib/
└── grandparent-store.ts       ← State management

components/
├── family-invite-card.tsx     ← Invite display
├── memory-prompt-input.tsx    ← Memory form
├── grandparent-story-view.tsx ← Story reader
├── family-member-card.tsx     ← Family card
└── family-archive-list.tsx    ← Story list

app/
└── grandparent-cocreation.tsx ← Main screen

drizzle/
└── schema.ts                  ← 4 new tables
```

## Key Functions

### Service Layer (grandparentService.ts)

```typescript
// Create an invite code
createFamilyInvite(userId, name, relationship, email?)
→ { id, inviteCode, status, expiresAt }

// Accept invite
acceptFamilyInvite(code, userId)
→ { connectionId, familyMemberName, relationship }

// Get family
getFamilyMembers(userId)
→ FamilyMember[]

// Start session
startCoCreationSession(hostId, familyId, childId)
→ { sessionId, status, createdAt }

// Add memory
addMemoryPrompt(sessionId, userId, text, category)
→ { id, memoryText, category, createdAt }

// Generate story
generateStoryFromMemory(sessionId, memoryId)
→ { memoryPromptId, generatedStory }

// Get archive
getFamilyStoryArchive(userId, filterId?)
→ FamilyStory[]

// Complete session
completeSession(sessionId)
→ { sessionId, status: "completed" }
```

### Router Endpoints (grandparentRouter.ts)

All protected (require auth):
- `POST /grandparent/createInvite`
- `POST /grandparent/acceptInvite`
- `GET /grandparent/getFamilyMembers`
- `POST /grandparent/startSession`
- `POST /grandparent/addMemory`
- `POST /grandparent/generateFromMemory`
- `POST /grandparent/addVoiceNarration`
- `GET /grandparent/getFamilyArchive`
- `GET /grandparent/getSessionStatus`
- `POST /grandparent/completeSession`

### Store Actions (grandparent-store.ts)

```typescript
// Accessibility
setGrandparentMode(true/false)
setFontSize(multiplier) // 0.8 to 2.0

// Data management
setFamilyMembers(members)
setActiveSession(session)
setMemoryPrompts(prompts)
setFamilyArchive(stories)
addMemoryPrompt(prompt)
addStoryToArchive(story)

// Session
clearActiveSession()
reset()
```

## UI Component Props

### FamilyInviteCard
```typescript
{
  inviteCode: string              // "ABC12XYZ"
  familyMemberName: string        // "Grandma Susan"
  relationship: string            // "grandparent"
  status: "pending" | "accepted" | "expired"
  onRefresh?: () => void
}
```

### MemoryPromptInput
```typescript
{
  onSubmit: (text, category) => Promise<void>
  onGenerateStory?: (memoryId) => Promise<void>
  isLoading?: boolean
}
```

### GrandparentStoryView
```typescript
{
  title: string
  pages: StoryPage[]              // { content, audioUrl? }
  onRecord?: (pageNumber) => Promise<void>
  isLoading?: boolean
  highContrast?: boolean
}
```

### FamilyMemberCard
```typescript
{
  id: number
  name: string
  relationship: string
  lastActive?: Date
  storiesCoCreated?: number
  avatarUrl?: string
  onStartStory: (id) => void
}
```

### FamilyArchiveList
```typescript
{
  stories: FamilyStory[]
  contributors?: Record<number, ContributorInfo>
  isLoading?: boolean
  onSelectStory?: (storyId) => void
  onPlayNarration?: (storyId) => void
  filterByFamilyMemberId?: number
  onFilterChange?: (id?) => void
}
```

## Database Tables

### familyInvites
```
- id (PK)
- inviterUserId → users
- familyMemberName
- relationship (enum)
- inviteCode (8-char, unique)
- email
- status (pending|accepted|expired)
- acceptedByUserId → users
- createdAt, expiresAt
```

### familyConnections
```
- id (PK)
- userId → users
- familyMemberUserId → users
- relationship (enum)
- familyMemberName
- createdAt
```

### coCreationSessions
```
- id (PK)
- hostUserId → users
- familyMemberUserId → users
- childId → children
- arcId → storyArcs (optional)
- status (active|paused|completed)
- createdAt, completedAt
```

### memoryPrompts
```
- id (PK)
- sessionId → coCreationSessions
- userId → users
- memoryText
- category (enum: childhood|travel|family_tradition|funny_moment|life_lesson)
- generatedStoryId (optional)
- createdAt
```

## Accessibility Features

### Font Scaling
- Adjust via A−/A+ buttons in header
- Range: 0.8x to 2.0x
- Persistent (saved to device)
- All text scales proportionally

### Grandparent Mode
- Toggle via 👵 button
- Simplifies UI, hides advanced options
- Larger tap targets
- Persistent preference

### High Contrast
- Automatic at fontSize > 1.3x
- Manual override support
- Better readability for vision impairments

### Voice Features
- Text-to-speech at 0.85x speed
- Recording support for all pages
- Clear audio button labels
- Alternative text for all icons

### Navigation
- Large arrow buttons (24pt)
- Clear page numbers
- Page swipe support (future)
- Keyboard navigation ready

## Integration Points

### tRPC Client
```typescript
import { trpc } from "@/lib/trpc"

// Use in components
const mutation = trpc.grandparent.createInvite.useMutation()
const query = trpc.grandparent.getFamilyMembers.useQuery()
```

### Zustand Store
```typescript
import { useGrandparentStore } from "@/lib/grandparent-store"

// Use in components
const { fontSize, isGrandparentMode, setFontSize } = useGrandparentStore()
```

### Colors Hook
```typescript
import { useColors } from "@/hooks/use-colors"

const { colors } = useColors()
// colors.primary, .secondary, .surface, .text, .textSecondary, .border, etc.
```

## Usage Examples

### Create Family Invite
```typescript
const createInvite = trpc.grandparent.createInvite.useMutation()

await createInvite.mutateAsync({
  familyMemberName: "Grandma Susan",
  relationship: "grandparent",
  email: "susan@example.com"
})
```

### Start Co-Creation
```typescript
const startSession = trpc.grandparent.startSession.useMutation()

await startSession.mutateAsync({
  familyMemberId: 5,
  childId: 3
})
```

### Share Memory
```typescript
const addMemory = trpc.grandparent.addMemory.useMutation()

await addMemory.mutateAsync({
  sessionId: 42,
  memoryText: "When we camped at Lake Tahoe...",
  category: "travel"
})
```

### Generate Story
```typescript
const generateStory = trpc.grandparent.generateFromMemory.useMutation()

await generateStory.mutateAsync({
  sessionId: 42,
  memoryPromptId: 1
})
```

## Memory Categories

| Category | Emoji | Use Case |
|----------|-------|----------|
| Childhood | 👶 | Growing up stories, school memories |
| Travel | ✈️ | Vacations, adventures, places visited |
| Family Tradition | 🎄 | Holidays, annual events, customs |
| Funny Moment | 😄 | Humorous anecdotes, silly stories |
| Life Lesson | 💡 | Values, wisdom, lessons learned |

## Testing Checklist

### Invite System
- [ ] Generate 8-char code
- [ ] Code copies to clipboard
- [ ] Share via native sheet
- [ ] 30-day expiration
- [ ] Accept with valid code
- [ ] Reject expired code
- [ ] Prevent reuse

### Memory Sharing
- [ ] Min/max length validation
- [ ] Category selection works
- [ ] Character counter accuracy
- [ ] Multiple memories in session
- [ ] Edit before generation

### Story Generation
- [ ] Claude API integration
- [ ] Age-appropriate output
- [ ] Memory preservation
- [ ] Page formatting
- [ ] Error handling

### Accessibility
- [ ] Font scaling 0.8x-2x
- [ ] High contrast rendering
- [ ] Voice narration quality
- [ ] Large tap targets
- [ ] Color contrast ratios

### Performance
- [ ] Archive pagination
- [ ] Family list load time
- [ ] Voice file size
- [ ] Memory on device
- [ ] API response time

## Common Issues & Solutions

### Invite code not generating
- Check Anthropic API key
- Verify database connection
- Check invite code length (should be 8)

### Story not generating
- Confirm Claude API quota
- Check memory text length
- Verify category enum value
- Review API response for errors

### Voice not recording
- Check microphone permissions
- Verify expo-av installed
- Test on device (simulator may lack mic)
- Check audio file permissions

### Font scaling not persisting
- Verify AsyncStorage working
- Check Zustand persist config
- Clear app cache and retry
- Check file permissions

## Security Considerations

### Input Validation
- All fields validated with Zod
- Max lengths enforced
- Category enum restricted
- Email optional but validated

### Access Control
- All endpoints protected
- User ID verified from context
- Session ownership checked
- Archive filtering by user

### Data Privacy
- Voice files stored securely
- Family data isolated by user
- Invite codes one-time use
- Expired codes auto-cleanup

## Performance Tips

### For Developers
- Use `useMemo` for store selectors
- Debounce font size changes
- Lazy load archive on scroll
- Cache family members query
- Paginate large story lists

### For End Users
- Compress voice files before upload
- Archive old sessions regularly
- Clear app cache periodically
- Update to latest version
- Check storage permissions

## Deployment Steps

1. **Backend**
   - Run migrations: `drizzle-kit push`
   - Deploy updated server code
   - Verify Claude API key set
   - Test invite generation

2. **Frontend**
   - Update app version
   - Build for iOS/Android
   - Clear app cache
   - Test on device

3. **Verification**
   - Create test invite
   - Share and accept
   - Submit memory
   - Generate story
   - Archive session

## Future Enhancements

### Ready to Build
- [ ] Real-time WebSocket collaboration
- [ ] Video call integration (WebRTC)
- [ ] Story illustrations (image gen)
- [ ] Multi-language support
- [ ] Family calendar events

### Planned Features
- [ ] Scheduled story times
- [ ] Family comments section
- [ ] Story remixing/continuation
- [ ] System memory prompts
- [ ] Family voting/ratings
- [ ] Ancestor tree view
- [ ] Print-on-demand books

---

**Version:** 1.0.0
**Last Updated:** 2024-04-08
**Status:** Production Ready
