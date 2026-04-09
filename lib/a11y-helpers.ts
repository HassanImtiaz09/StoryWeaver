/**
 * a11y-helpers — Shared accessibility prop builders and constants
 * used across all StoryWeaver interactive components.
 *
 * Import pattern:
 *   import { a11y, MIN_TOUCH, announce } from "@/lib/a11y-helpers";
 */
import { AccessibilityInfo, AccessibilityRole } from "react-native";

/* ─── Minimum touch target (Apple HIG + WCAG 2.1 AA) ──────── */
export const MIN_TOUCH = 44;

/* ─── Live region announcements ────────────────────────────── */
export function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/* ─── Prop builders ────────────────────────────────────────── */

/** Accessible button props */
export function a11yButton(
  label: string,
  hint?: string,
  state?: { disabled?: boolean; selected?: boolean; busy?: boolean }
) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "button" as AccessibilityRole,
    ...(hint ? { accessibilityHint: hint } : {}),
    ...(state ? { accessibilityState: state } : {}),
  };
}

/** Accessible image props */
export function a11yImage(label: string) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "image" as AccessibilityRole,
  };
}

/** Accessible header props */
export function a11yHeader(label: string) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "header" as AccessibilityRole,
  };
}

/** Accessible tab props */
export function a11yTab(label: string, selected: boolean) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "tab" as AccessibilityRole,
    accessibilityState: { selected },
  };
}

/** Accessible text input props */
export function a11yInput(label: string, hint?: string) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    ...(hint ? { accessibilityHint: hint } : {}),
  };
}

/** Accessible link/nav props */
export function a11yLink(label: string, hint?: string) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "link" as AccessibilityRole,
    ...(hint ? { accessibilityHint: hint } : {}),
  };
}

/** Live region — use on Views that update dynamically */
export function a11yLive(label: string, assertive = false) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityLiveRegion: (assertive ? "assertive" : "polite") as
      | "assertive"
      | "polite"
      | "none",
  };
}

/** Progress bar props */
export function a11yProgress(
  label: string,
  now: number,
  min = 0,
  max = 100
) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "progressbar" as AccessibilityRole,
    accessibilityValue: { min, max, now },
  };
}

/** Adjustable (slider-like) props */
export function a11yAdjustable(
  label: string,
  valueText: string
) {
  return {
    accessible: true as const,
    accessibilityLabel: label,
    accessibilityRole: "adjustable" as AccessibilityRole,
    accessibilityValue: { text: valueText },
  };
}
