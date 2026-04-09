import { useColorScheme } from "react-native";
import {
  SchemeColors,
  getAgeAdaptiveColors,
  ageToGroup,
  type ColorScheme,
  type AgeGroup,
} from "@/lib/_core/theme";

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
 * @param childAge - Optional child age for age-adaptive theming
 */
export function useColors(childAge?: number): Colors {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === "dark";
  const scheme: ColorScheme = isDark ? "dark" : "light";
  const ageGroup: AgeGroup = ageToGroup(childAge);

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
