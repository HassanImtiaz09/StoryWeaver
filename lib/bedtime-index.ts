/**
 * Central export file for bedtime-related functionality.
 * Import from @/lib/bedtime-index for convenient access to all bedtime features.
 */

export {
  DEFAULT_BEDTIME_STATE,
  BEDTIME_THEME,
  type BedtimeState,
  getBedtimeState,
  saveBedtimeState,
  activateBedtimeMode,
  deactivateBedtimeMode,
  startSleepTimer,
  cancelSleepTimer,
  advanceWindDownPhase,
  setAmbientSound,
  getSleepTimerRemaining,
  isSleepTimerExpired,
} from "./bedtime-mode";
