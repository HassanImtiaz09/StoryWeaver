# Grandparent Co-Creation Mode - Quick Start

## What You Got

A complete feature for remote grandparents and family to co-create personalized children's stories. Grandparents share memories (childhood, travel, traditions, funny moments, lessons), and AI weaves them into child-appropriate stories with optional voice narration.

## Files to Know

**Backend:**
- `server/_core/grandparentService.ts` - Business logic
- `server/_core/grandparentRouter.ts` - API endpoints

**Frontend:**
- `app/grandparent-cocreation.tsx` - Main 4-tab screen
- `components/` - 5 reusable components

**State:**
- `lib/grandparent-store.ts` - Zustand store

**Database:**
- `drizzle/schema.ts` - 4 new tables added

## 5-Minute Setup

```bash
# 1. Install dependencies
npm install zustand @react-native-async-storage/async-storage expo-av expo-speech expo-clipboard

# 2. Add environment variable
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# 3. Run database migration
npx drizzle-kit push

# 4. Start server
npm run dev

# 5. Test on mobile
npx expo start --ios
```

## Test the Feature

1. **Create Invite:**
   - Go to "Grandparent Co-Creation" screen
   - "My Family" tab → "Create Invite Code"
   - Copy the 8-character code

2. **Accept Invite:**
   - On another device/user → Enter code
   - Family member is now connected

3. **Co-Create Story:**
   - "Create Together" tab → Start session with family member
   - Share a memory (e.g., "When we went camping...")
   - Select category (childhood, travel, etc.)
   - Click "Generate Story" → Claude creates story

4. **Voice Narration (Optional):**
   - Click "Record Voice" on any page
   - Narrate the page
   - Save for family archive

5. **Archive:**
   - Click "Finalize & Archive Story"
   - Story appears in "Archive" tab
   - Searchable by contributor

## Core API (3-step flow)

```typescript
// 1. Create invite
const invite = await trpc.grandparent.createInvite.mutate({
  familyMemberName: "Grandma",
  relationship: "grandparent"
})
// → inviteCode: "ABC12XYZ"

// 2. Start session
const session = await trpc.grandparent.startSession.mutate({
  familyMemberId: 5,
  childId: 3
})
// → sessionId: 42, status: "active"

// 3. Share memory & generate story
const memory = await trpc.grandparent.addMemory.mutate({
  sessionId: 42,
  memoryText: "We camped at Lake Tahoe...",
  category: "travel"
})

const story = await trpc.grandparent.generateFromMemory.mutate({
  sessionId: 42,
  memoryPromptId: memory.id
})
// → AI-generated child-friendly story
```

## Key Components

### family-invite-card.tsx
Displays 8-char code with copy/share buttons
```tsx
<FamilyInviteCard
  inviteCode="ABC12XYZ"
  familyMemberName="Grandma Susan"
  relationship="grandparent"
  status="pending"
/>
```

### memory-prompt-input.tsx
Memory form with 5 categories
```tsx
<MemoryPromptInput
  onSubmit={(text, category) => addMemory(text, category)}
/>
```

### grandparent-story-view.tsx
Story reader with read-aloud & voice recording
```tsx
<GrandparentStoryView
  title="Our Camping Adventure"
  pages={storyPages}
  onRecord={(pageNum) => recordNarration(pageNum)}
/>
```

## Database Tables

```
family_invites
├─ id, inviteCode (8-char unique), status (pending|accepted|expired)
├─ inviterUserId → users
└─ expiresAt (30 days)

family_connections
├─ userId, familyMemberUserId → users
└─ relationship, familyMemberName

co_creation_sessions
├─ id, hostUserId, familyMemberUserId → users, childId → children
├─ status (active|paused|completed)
└─ createdAt, completedAt

memory_prompts
├─ sessionId → co_creation_sessions, userId → users
├─ memoryText, category (childhood|travel|family_tradition|funny_moment|life_lesson)
└─ createdAt
```

## Accessibility Features

- **Font Scaling:** A−/A+ buttons scale all text 0.8x to 2.0x
- **Grandparent Mode:** Simplifies UI, larger tap targets
- **High Contrast:** Auto-enabled at larger font sizes
- **Voice Narration:** Read-aloud for stories
- **Recording:** Voice narration for each page
- **Persistent:** Font preference saved to device

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invite code not generating" | Check ANTHROPIC_API_KEY set |
| "Story generation fails" | Verify Claude API quota |
| "Voice recording doesn't work" | Grant microphone permission |
| "Font size not persisting" | Check AsyncStorage access |
| "tRPC endpoint not found" | Restart server, check import in routers.ts |

See `GRANDPARENT_SETUP.md` for detailed troubleshooting.

## Environment Setup

```bash
# .env file
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
DATABASE_URL=mysql://user:password@localhost:3306/db
NODE_ENV=production
```

## Performance Tips

- Archive pagination: Load 10 stories at a time
- Add database indexes: `CREATE INDEX idx_user_family ON family_connections(user_id)`
- Cache family members: 5-minute TTL
- Lazy load story images: Intersection Observer
- Compress voice files: WebM format

## What's Included

✓ 10 backend endpoints (all protected)
✓ 5 React Native components
✓ Full type safety (TypeScript)
✓ State management (Zustand + AsyncStorage)
✓ Database schema (4 tables)
✓ Accessibility first (large text, voice, etc.)
✓ Production-ready error handling
✓ Comprehensive documentation

## What's NOT Included (Future)

- Video calling (WebRTC hooks ready)
- Story illustrations (image gen integration ready)
- Real-time collaboration (WebSocket ready)
- Multi-language (i18n structure ready)
- Print books (integration ready)

## Testing Checklist

- [ ] Create and accept invite codes
- [ ] Submit multiple memories in different categories
- [ ] Generate story from memory
- [ ] Record voice narration
- [ ] Complete and archive session
- [ ] Filter archive by contributor
- [ ] Test font scaling (A−/A+)
- [ ] Test grandparent mode toggle
- [ ] Test on both iOS and Android
- [ ] Check high-contrast rendering

## Documentation

- **IMPLEMENTATION_SUMMARY.md** - Full architecture & design
- **GRANDPARENT_FEATURE_GUIDE.md** - API reference & examples
- **GRANDPARENT_SETUP.md** - Setup, deployment, security
- **IMPLEMENTATION_MANIFEST.txt** - Complete file manifest

## Questions?

See the detailed docs above or check component JSDoc comments. All functions are fully documented with usage examples.

---

**Status:** Production Ready
**Version:** 1.0.0
**Last Updated:** April 2024
