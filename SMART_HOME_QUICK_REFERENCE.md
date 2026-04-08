# Smart Home Integration - Quick Reference

## Core Services

### smartHomeService.ts
Main business logic layer handling:
- `getSmartHomeConfig(userId)` - Fetch connected devices
- `updateSmartHomeConfig(...)` - Add/update devices
- `getStoryMoodLighting(mood)` - Get HSL/brightness for mood
- `triggerLightingScene(...)` - Send commands to Hue
- `triggerBedtimeRoutine(...)` - Execute routine sequence
- `getBedtimeRoutines(...)` - Fetch user routines
- `createBedtimeRoutine(...)` - Save new routine
- `getDeviceStatus(userId)` - Check connection status
- `disconnectDevice(...)` - Disable device

### smartHomeRouter.ts
tRPC API layer with endpoints:
- `smartHome.getConfig` (query)
- `smartHome.updateConfig` (mutation)
- `smartHome.getMoodLighting` (query)
- `smartHome.triggerLighting` (mutation)
- `smartHome.triggerBedtimeRoutine` (mutation)
- `smartHome.getBedtimeRoutines` (query)
- `smartHome.createBedtimeRoutine` (mutation)
- `smartHome.getDeviceStatus` (query)
- `smartHome.disconnectDevice` (mutation)
- `smartHome.enableDevice` (mutation)
- `smartHome.getAmbientSound` (query)
- `smartHome.getAllMoodLightingPresets` (query)

## Client-Side

### smart-home-store.ts
Zustand store managing state:
- `connectedDevices` - Array of SmartHomeDevice
- `bedtimeRoutines` - Array of BedtimeRoutine
- `isSmartHomeEnabled` - Master toggle
- `currentMoodLighting` - Active lighting state
- `activeScene` - Current story scene
- AsyncStorage persistence for offline

## Components

### SmartHomeDeviceCard
Device display with:
- Platform icon (💡🔊🏠🔌)
- Device name and platform label
- Connection status (green/red dot)
- Enable/disable toggle
- Configure button

### MoodLightingPreview
Lighting customization showing:
- Animated color circle preview
- 7 story moods with emoji
- Brightness slider (0-100%)
- Test lights button

### BedtimeRoutineBuilder
Routine creation with:
- Step-by-step builder
- Reorder with up/down arrows
- 5 step types: dim_lights, ambient_sound, play_music, read_story, lights_off
- Duration input per step
- Time picker for scheduling

### AmbientSoundPicker
Sound selection with:
- 8 ambient sounds
- Volume slider
- Play preview button
- Auto-play toggle

### SmartHomeStatusBar
Compact status on reading screens:
- Green dot indicator
- Device count
- Active scene emoji
- Quick disable button

### SmartHomeSettings
Main settings screen with:
- Master enable/disable toggle
- Tab navigation
- Device management
- Mood lighting preview
- Ambient sounds
- Bedtime routines

## Database Tables

### smart_home_configs
```sql
- id: int (PK)
- userId: int (FK)
- platform: enum (philips_hue|alexa|google_home|other)
- deviceName: varchar(255)
- deviceId: varchar(255)
- accessToken: varchar(500)
- refreshToken: varchar(500)
- isEnabled: boolean (default true)
- settings: json
- createdAt: timestamp
- updatedAt: timestamp
```

### bedtimeRoutines
```sql
- id: int (PK)
- userId: int (FK)
- childId: int (nullable FK)
- name: varchar(255)
- scheduledTime: varchar(10) HH:MM format
- steps: json (array of steps)
- isActive: boolean (default true)
- daysOfWeek: json (array 0-6)
- createdAt: timestamp
```

## Integration Points

### Using in your app:

1. **Import components:**
   ```tsx
   import SmartHomeStatusBar from '@/components/smart-home-status-bar';
   import { useSmartHomeStore } from '@/lib/smart-home-store';
   import { trpc } from '@/lib/trpc';
   ```

2. **Display on reading screen:**
   ```tsx
   <SmartHomeStatusBar
     isEnabled={isSmartHomeEnabled}
     activeScene={currentMood}
     connectedDeviceCount={devices.length}
     onToggle={setSmartHomeEnabled}
   />
   ```

3. **Trigger lighting on story mood:**
   ```tsx
   const triggerLightingMutation = trpc.smartHome.triggerLighting.useMutation();
   triggerLightingMutation.mutate({
     scene: 'adventure',
     brightness: 80
   });
   ```

4. **Navigate to settings:**
   ```tsx
   router.push('/smart-home-settings');
   ```

## Story Mood Colors

| Mood | Hue | Saturation | Lightness | Brightness | Color |
|------|-----|-----------|-----------|-----------|-------|
| Adventure | 40° | 100% | 60% | 80% | #FFC857 |
| Mystery | 270° | 80% | 40% | 50% | #7B5BA6 |
| Happy | 50° | 100% | 70% | 90% | #FFD700 |
| Scary | 180° | 70% | 30% | 40% | #1A7F7E |
| Calm | 220° | 60% | 50% | 30% | #6DB5E8 |
| Magical | 300° | 80% | 60% | 70% | #E66EE1 |
| Sad | 210° | 50% | 45% | 45% | #5B9BD5 |

## Error Handling

All API calls are graceful:
- Device not connected → Shows setup prompts
- Routine execution fails → Logs error, continues
- Missing permissions → Shows helpful message
- Network error → Uses cached state (AsyncStorage)

## Platform APIs (Placeholders)

The implementations include placeholder code for:
- Philips Hue API (bridge communication)
- Amazon Alexa Skills Kit
- Google Home Cast protocol

Replace placeholder endpoints in smartHomeService.ts when integrating real APIs.

## Type Safety

All exports include proper types:
```tsx
import type {
  SmartHomeDevice,
  BedtimeRoutine,
  BedtimeStep,
  MoodLightingState,
  DeviceStatus
} from '@/lib/smart-home-store';
```

## Offline Support

Store automatically persists to AsyncStorage:
- Device list
- Bedtime routines
- Preferences
- Last known state

App works offline and syncs when reconnected.
