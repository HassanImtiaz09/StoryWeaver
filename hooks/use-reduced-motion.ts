/**
 * useReducedMotion — Respects system "Reduce Motion" setting and
 * app-level preference from settings store.
 *
 * Usage:
 *   const reducedMotion = useReducedMotion();
 *   // In animated styles:
 *   const entering = reducedMotion ? FadeIn.duration(0) : FadeInDown.duration(400);
 *   // For shared values:
 *   const springConfig = reducedMotion
 *     ? { duration: 0 }
 *     : { damping: 12, stiffness: 100 };
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion as useReanimatedReducedMotion } from "react-native-reanimated";
import { useAccessibilityStore } from "@/lib/accessibility-store";

/**
 * Returns `true` if the user has enabled "Reduce Motion" at either
 * the system level (iOS Settings / Android Accessibility) or the
 * app level (accessibility store).
 *
 * Checks three sources:
 *   1. react-native-reanimated UI-thread flag (system)
 *   2. RN AccessibilityInfo JS-thread API (system)
 *   3. App-level accessibility store setting (user preference)
 */
export function useReducedMotion(): boolean {
  // react-native-reanimated provides its own hook that reads the
  // system accessibility flag on the UI thread — best for shared values.
  const reanimatedReduced = useReanimatedReducedMotion();

  // App-level preference from accessibility store
  const appReduced = useAccessibilityStore((s) => s.reduceMotion);

  // Also listen to the RN AccessibilityInfo API for JS-thread decisions
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduced);

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduced
    );
    return () => sub.remove();
  }, []);

  return reanimatedReduced || systemReduced || appReduced;
}

/**
 * Helper to get a safe animation duration — returns 0 when reduced
 * motion is on, otherwise returns the provided duration.
 */
export function useAnimationDuration(defaultMs: number): number {
  const reduced = useReducedMotion();
  return reduced ? 0 : defaultMs;
}

/**
 * Helper to choose between animated entering/exiting props.
 * Returns `undefined` (no animation) when reduced motion is on.
 */
export function useEntryAnimation<T>(animation: T): T | undefined {
  const reduced = useReducedMotion();
  return reduced ? undefined : animation;
}
