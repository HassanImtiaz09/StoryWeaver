import { useEffect, useState } from "react";
import {
  SchemeColors,
  getAgeAdaptiveColors,
  ageToGroup,
  type ColorScheme,
  type AgeGroup,
} from "@/lib/_core/theme";
import {
  getSelectedChildAge,
  onSelectedChildChange,
} from "@/lib/child-context-store";
import { useThemeMode } from "@/hooks/use-theme-mode";

export interface Colors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  card: string;
  destructive: string;
  success: string;
  warning: string;
  // New: scheme-aware semantic tokens
  isDark: boolean;
  cardShadow: string;
  overlay: string;
}

/**
 * Primary color hook used across all screens.
 * Now powered by theme.config.js with proper light/dark values,
 * age-adaptive overrides, and improved contrast ratios.
 *
 * Automatically applies age-based theming based on the globally selected child.
 * Also respects kid-friendly light mode setting for young children (3-7).
 * Can optionally override with explicit childAge parameter.
 *
 * @param childAge - Optional explicit child age (overrides selected child's age)
 */
export function useColors(childAge?: number): Colors {
  const scheme = useThemeMode();
  const isDark = scheme === "dark";

  // Use explicit age if provided, otherwise get from selected child store
  const [age, setAge] = useState<number | null>(() => {
    if (childAge !== undefined) return childAge;
    return getSelectedChildAge();
  });

  // Subscribe to global child selection changes
  useEffect(() => {
    if (childAge !== undefined) {
      setAge(childAge);
      return;
    }

    // Only listen if no explicit age was provided
    const unsubscribe = onSelectedChildChange(() => {
      setAge(getSelectedChildAge());
    });

    return unsubscribe;
  }, [childAge]);

  const ageGroup: AgeGroup = ageToGroup(age ?? undefined);

  // Get age-adaptive colors (falls back to base if no age provided)
  const palette = getAgeAdaptiveColors(scheme, ageGroup);

  return {
    primary: palette.primary,
    secondary: "#FF6B6B",                         // Coral (consistent)
    accent: "#48C9B0",                             // Teal (consistent)
    background: palette.background,
    surface: palette.surface,
    foreground: palette.foreground,
    text: palette.foreground,
    textSecondary: palette.muted,
    muted: palette.muted,
    border: palette.border,
    card: palette.surface,
    destructive: palette.error,
    success: palette.success,
    warning: palette.warning,
    // Semantic tokens
    isDark,
    cardShadow: isDark ? "transparent" : "rgba(0,0,0,0.08)",
    overlay: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
  };
}
