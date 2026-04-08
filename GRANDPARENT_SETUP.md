# Grandparent Co-Creation Mode - Setup Instructions

## Prerequisites

Ensure you have:
- Node.js 18+ installed
- MySQL database running
- Anthropic API key
- React Native/Expo environment set up
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
# If you haven't already installed required packages
npm install zustand @react-native-async-storage/async-storage expo-av expo-speech expo-clipboard

# Or with yarn
yarn add zustand @react-native-async-storage/async-storage expo-av expo-speech expo-clipboard
```

## Step 2: Database Migration

Run the database migration to create new tables:

```bash
# Using Drizzle Kit
npx drizzle-kit push

# Or manually execute SQL:
mysql -u root -p your_database << EOF
  CREATE TABLE family_invites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    inviter_user_id INT NOT NULL,
    family_member_name VARCHAR(255) NOT NULL,
    relationship ENUM('grandparent','aunt_uncle','cousin','family_friend','other') NOT NULL,
    invite_code VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    status ENUM('pending','accepted','expired') DEFAULT 'pending',
    accepted_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (inviter_user_id) REFERENCES users(id),
    FOREIGN KEY (accepted_by_user_id) REFERENCES users(id)
  );

  CREATE TABLE family_connections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    family_member_user_id INT NOT NULL,
    relationship ENUM('grandparent','aunt_uncle','cousin','family_friend','parent','other') NOT NULL,
    family_member_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (family_member_user_id) REFERENCES users(id)
  );

  CREATE TABLE co_creation_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    host_user_id INT NOT NULL,
    family_member_user_id INT NOT NULL,
    child_id INT NOT NULL,
    arc_id INT,
    status ENUM('active','paused','completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (host_user_id) REFERENCES users(id),
    FOREIGN KEY (family_member_user_id) REFERENCES users(id),
    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (arc_id) REFERENCES story_arcs(id)
  );

  CREATE TABLE memory_prompts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    memory_text TEXT NOT NULL,
    category ENUM('childhood','travel','family_tradition','funny_moment','life_lesson') NOT NULL,
    generated_story_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES co_creation_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
EOF
```

## Step 3: Environment Variables

Add to your `.env` file:

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Database (if not already set)
DATABASE_URL=mysql://user:password@localhost:3306/storyweaver_db

# Optional: Voice storage (for future)
VOICE_STORAGE_BUCKET=family-voice-narrations
```

## Step 4: Verify File Structure

Ensure all files are in place:

```
✓ server/_core/grandparentService.ts
✓ server/_core/grandparentRouter.ts
✓ lib/grandparent-store.ts
✓ components/family-invite-card.tsx
✓ components/memory-prompt-input.tsx
✓ components/grandparent-story-view.tsx
✓ components/family-member-card.tsx
✓ components/family-archive-list.tsx
✓ app/grandparent-cocreation.tsx
✓ drizzle/schema.ts (updated)
✓ server/routers.ts (updated)
✓ app/_layout.tsx (updated)
```

## Step 5: Update Type Definitions

If you have a types file, add these type exports:

```typescript
// types/grandparent.ts (optional, for convenience)
export type FamilyInvite = typeof familyInvites.$inferSelect;
export type FamilyConnection = typeof familyConnections.$inferSelect;
export type CoCreationSession = typeof coCreationSessions.$inferSelect;
export type MemoryPrompt = typeof memoryPrompts.$inferSelect;
```

## Step 6: Build & Test

```bash
# Build backend
npm run build

# Start dev server
npm run dev

# Test with Expo
npx expo start

# For iOS
npx expo start --ios

# For Android
npx expo start --android
```

## Step 7: Verify Integration

### Test 1: Check Router Registration
```bash
# In your server logs, should see:
# ✓ Grandparent router registered
# ✓ 10 endpoints available
```

### Test 2: Test API Endpoint
```bash
curl -X POST http://localhost:3000/trpc/grandparent.createInvite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "familyMemberName": "Test Grandma",
    "relationship": "grandparent"
  }'
```

### Test 3: Test UI Navigation
1. Open app and navigate to "Grandparent Co-Creation"
2. Should see 4 tabs: Family, Create, Memories, Archive
3. Create test invite and copy code
4. Verify code is 8 characters

### Test 4: Test Memory Input
1. Go to "Create Together" tab
2. Share a test memory (>10 characters)
3. Select a category
4. Click "Share This Memory"
5. Should appear in list

### Test 5: Test Story Generation
1. After adding memory, click "Generate Story"
2. Should call Claude API
3. Story should appear (takes 2-5 seconds)
4. Verify age-appropriate language

## Troubleshooting

### Database Connection Error
```
Error: Cannot connect to database
```
**Solution:**
- Verify MySQL is running: `mysql -u root -p`
- Check DATABASE_URL in .env
- Ensure database exists: `CREATE DATABASE storyweaver_db`

### Anthropic API Error
```
Error: Invalid API key
```
**Solution:**
- Verify ANTHROPIC_API_KEY is set
- Check key starts with `sk-ant-`
- Confirm API key has permissions
- Check account has credits

### Invite Code Not Generating
```
Error: Failed to create invite
```
**Solution:**
- Check database migrations ran
- Verify user_id exists in users table
- Check database permissions
- Review server logs for details

### tRPC Endpoint Not Found
```
Error: No such route
```
**Solution:**
- Verify router imported in routers.ts
- Check grandparent property added to appRouter
- Restart server: `npm run dev`
- Clear tRPC cache: `rm -rf .next`

### Components Not Rendering
```
Error: Cannot find module '@/components/...'
```
**Solution:**
- Verify all component files exist
- Check file paths are absolute from root
- Clear node_modules: `rm -rf node_modules && npm install`
- Restart Expo: `npx expo start --clear`

### AsyncStorage Not Persisting
```
Grandparent mode resets on app restart
```
**Solution:**
- Verify AsyncStorage installed: `npm list @react-native-async-storage/async-storage`
- Check persist middleware in store
- For simulator: data may not persist on restart
- Test on physical device

### Voice Recording Not Working
```
Error: Microphone permission denied
```
**Solution:**
- Grant microphone permission:
  - iOS: Info.plist needs NSMicrophoneUsageDescription
  - Android: Check AndroidManifest.xml permissions
- Test on device (simulator may not have mic)
- Check expo-av installation

### Font Scaling Issues
```
Text doesn't scale with fontSize setting
```
**Solution:**
- Verify scaledFontSize() function called
- Check Zustand store has fontSize value
- Ensure component wrapped with useGrandparentStore
- Check NativeWind classes support dynamic sizing

## Configuration Options

### Storage Limits
```typescript
// In grandparentService.ts
const INVITE_EXPIRY_DAYS = 30;
const MAX_MEMORY_LENGTH = 2000;
const MIN_MEMORY_LENGTH = 10;
```

Modify these constants to adjust limits.

### Font Scaling Range
```typescript
// In components
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 2.0;
```

Adjust range in `setFontSize()` clamping.

### Memory Categories
```typescript
// In components/memory-prompt-input.tsx
const MEMORY_CATEGORIES = [
  { id: "childhood", label: "Childhood Memory", emoji: "👶" },
  // ...
];
```

Add or remove categories here.

### Claude Model
```typescript
// In grandparentService.ts
model: "claude-3-5-sonnet-20241022"
```

Change to different Anthropic model if needed.

## Performance Tuning

### Enable Response Caching
```typescript
// In routers.ts
getFamilyArchive: protectedProcedure
  .query(async ({ ctx }) => {
    // Add Redis caching here
    // Cache key: `family-archive-${ctx.userId}`
    // TTL: 5 minutes
  })
```

### Optimize Family Member Queries
```typescript
// Add indexes to schema
CREATE INDEX idx_user_family ON family_connections(user_id);
CREATE INDEX idx_session_host ON co_creation_sessions(host_user_id);
CREATE INDEX idx_memory_session ON memory_prompts(session_id);
```

### Lazy Load Archive
```typescript
// In grandparent-cocreation.tsx
// Only load first 10 stories, load more on scroll
const [page, setPage] = useState(0);
const pageSize = 10;
```

## Monitoring & Logging

### Add Logging
```typescript
// In grandparentService.ts
console.log(`[Grandparent] Creating invite for user ${inviterUserId}`);
console.log(`[Grandparent] Generated code: ${inviteCode}`);
console.log(`[Grandparent] Story generation took ${Date.now() - startTime}ms`);
```

### Monitor Claude API Usage
```typescript
// After each API call
const cost = tokenCount * costPerToken;
await logGenerationCost(userId, cost, "story_generation");
```

### Track Feature Usage
```typescript
// In mutations
await logEvent("grandparent_feature_used", {
  action: "memory_shared",
  category: category,
  textLength: memoryText.length,
  userId: ctx.userId,
});
```

## Security Hardening

### Rate Limiting
```typescript
// In routers.ts
import { rateLimit } from "trpc-plugin-rate-limit";

createInvite: protectedProcedure
  .use(rateLimit({ points: 5, duration: 60 * 60 })) // 5 per hour
  .mutation(...)
```

### Input Sanitization
```typescript
// In grandparentService.ts
const cleanedText = DOMPurify.sanitize(memoryText);
```

### CORS Configuration
```typescript
// In server config
app.use(cors({
  origin: ["https://storyweaver.app", "https://*.storyweaver.app"],
  credentials: true,
}));
```

## Backup & Restore

### Backup Family Data
```bash
# Daily backup
mysqldump -u root -p storyweaver_db family_invites family_connections \
  co_creation_sessions memory_prompts > family_data_backup.sql

# Schedule with cron
0 2 * * * /path/to/backup.sh
```

### Restore from Backup
```bash
mysql -u root -p storyweaver_db < family_data_backup.sql
```

## Cleanup Tasks

### Remove Expired Invites
```typescript
// Run daily
export async function cleanupExpiredInvites() {
  await db
    .update(familyInvites)
    .set({ status: "expired" })
    .where(lt(familyInvites.expiresAt, new Date()))
    .execute();
}
```

### Archive Old Sessions
```typescript
// Run monthly
export async function archiveOldSessions() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await db
    .update(coCreationSessions)
    .set({ status: "completed" })
    .where(and(
      eq(coCreationSessions.status, "paused"),
      lt(coCreationSessions.updatedAt, thirtyDaysAgo)
    ))
    .execute();
}
```

## Next Steps

1. **Test thoroughly** on device and simulator
2. **Gather feedback** from grandparents
3. **Monitor API usage** and costs
4. **Collect metrics** on feature adoption
5. **Plan enhancements** based on user feedback
6. **Consider WebRTC** for video calls
7. **Add story illustrations** with image generation
8. **Implement collaborative** real-time updates

## Support & Documentation

- **API Docs:** See GRANDPARENT_FEATURE_GUIDE.md
- **Implementation Details:** See IMPLEMENTATION_SUMMARY.md
- **Troubleshooting:** See section above
- **Feature Roadmap:** See "Future Enhancements" in guide

---

**Setup Complete!** Your Grandparent Co-Creation Mode is now ready to use.

For questions or issues, refer to the comprehensive documentation files included.
