import { useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * useSmartHomeSync
 *
 * Automatically syncs the story reader's mood with smart home devices.
 * When the story mood changes (e.g., from "calm" to "adventurous"),
 * this hook triggers the appropriate lighting scene and ambient sound.
 *
 * This bridges the gap between the existing smart home backend and the
 * reading experience, making mood lighting and ambient sounds reactive.
 */

interface UseSmartHomeSyncParams {
  /** Current story page mood (e.g., "calm", "exciting", "mysterious") */
  mood: string | null | undefined;
  /** Whether narration audio is currently playing */
  isNarrating: boolean;
  /** Whether the reader screen is actively mounted */
  isActive: boolean;
  /** Episode ID for tracking */
  episodeId?: number;
}

// Map story-reader moods to smart home mood keys
const MOOD_MAP: Record<string, string> = {
  exciting: 'adventure',
  calm: 'calm',
  mysterious: 'mystery',
  adventurous: 'adventure',
  warm: 'happy',
  funny: 'happy',
  reassuring: 'calm',
  triumphant: 'magical',
};

export function useSmartHomeSync({
  mood,
  isNarrating,
  isActive,
  episodeId,
}: UseSmartHomeSyncParams) {
  const lastMoodRef = useRef<string | null>(null);
  const isSmartHomeAvailable = useRef(false);

  // Check if smart home is configured (won't error if not)
  const configQuery = trpc.smartHome.getConfig.useQuery(undefined, {
    enabled: isActive,
    staleTime: 60_000, // Cache for 1 minute
    retry: false,
  });

  const triggerLightingMutation = trpc.smartHome.triggerLighting.useMutation();
  const getAmbientSoundQuery = trpc.smartHome.getAmbientSound.useQuery(
    { mood: MOOD_MAP[mood ?? ''] ?? 'calm' },
    { enabled: isActive && !!mood && isSmartHomeAvailable.current }
  );

  // Track whether smart home is available
  useEffect(() => {
    if (configQuery.data) {
      const devices = configQuery.data;
      isSmartHomeAvailable.current =
        Array.isArray(devices) && devices.some((d: any) => d.isEnabled);
    }
  }, [configQuery.data]);

  // Auto-trigger mood lighting on mood changes
  useEffect(() => {
    if (!isActive || !mood || !isSmartHomeAvailable.current) return;

    const mappedMood = MOOD_MAP[mood] ?? 'calm';

    // Only trigger if mood actually changed
    if (mappedMood === lastMoodRef.current) return;
    lastMoodRef.current = mappedMood;

    // Debounce: wait 500ms to avoid rapid flickers on fast page turns
    const timer = setTimeout(() => {
      triggerLightingMutation.mutate(
        { mood: mappedMood },
        {
          onError: () => {
            // Smart home trigger failed silently — not critical
          },
        }
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [mood, isActive]);

  // Dim lights when narration starts, restore on pause
  useEffect(() => {
    if (!isSmartHomeAvailable.current || !isActive) return;

    if (isNarrating) {
      // Slightly dim during narration for immersive experience
      triggerLightingMutation.mutate(
        { mood: MOOD_MAP[mood ?? ''] ?? 'calm', brightness: 0.6 },
        { onError: () => {} }
      );
    }
    // When narration stops, restore full brightness
    // (next mood change will re-trigger at normal brightness)
  }, [isNarrating, isActive]);

  // Clean up: restore neutral lighting on unmount
  useEffect(() => {
    return () => {
      if (isSmartHomeAvailable.current) {
        triggerLightingMutation.mutate(
          { mood: 'calm', brightness: 1.0 },
          { onError: () => {} }
        );
      }
    };
  }, []);

  return {
    isSmartHomeConnected: isSmartHomeAvailable.current,
    currentAmbientSound: getAmbientSoundQuery.data ?? null,
  };
}
