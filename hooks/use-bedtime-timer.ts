import { useEffect, useState, useCallback } from "react";
import {
  getBedtimeState,
  getSleepTimerRemaining,
  isSleepTimerExpired,
} from "@/lib/bedtime-mode";

/**
 * Hook to monitor sleep timer state and trigger callbacks when expired.
 * Updates remaining time every second when timer is active.
 */
export function useBedtimeTimer(onTimerExpired?: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  const updateTimer = useCallback(async () => {
    const state = await getBedtimeState();
    const mins = getSleepTimerRemaining(state);
    setRemaining(mins);

    const expired = isSleepTimerExpired(state);
    if (expired && !hasExpired) {
      setHasExpired(true);
      onTimerExpired?.();
    }
  }, [onTimerExpired, hasExpired]);

  useEffect(() => {
    // Update immediately
    updateTimer();

    // Then update every second if timer is active
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [updateTimer]);

  return { remainingMinutes: remaining, hasExpired };
}
