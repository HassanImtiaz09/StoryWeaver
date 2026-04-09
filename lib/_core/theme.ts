// @ts-nocheck
import { Platform } from "react-native";

import themeConfig from "@/theme.config";

export type ColorScheme = "light" | "dark";
export type AgeGroup = "toddler" | "child" | "tween" | "default";

export const ThemeColors = themeConfig.themeColors;
export const AgeThemes = themeConfig.ageThemes;
export const StoryThemeAccents = themeConfig.storyThemeAccents;

type ThemeColorTokens = typeof ThemeColors;
type ThemeColorName = keyof ThemeColorTokens;
type SchemePalette = Record<ColorScheme, Record<ThemeColorName, string>>;
type SchemePaletteItem = SchemePalette[ColorScheme];

function buildSchemePalette(colors: ThemeColorTokens): SchemePalette {
  const palette: SchemePalette = {
    light: {} as SchemePalette["light"],
    dark: {} as SchemePalette["dark"],
  };

  (Object.keys(colors) as ThemeColorName[]).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name] = swatch.dark;
  });

  return palette;
}

export const SchemeColors = buildSchemePalette(ThemeColors);

/**
 * Get age-adaptive colors by merging age theme overrides onto the base theme.
 * Falls back to base theme for any tokens not overridden by the age theme.
 */
export function getAgeAdaptiveColors(
  scheme: ColorScheme,
  ageGroup: AgeGroup = "default"
): Record<ThemeColorName, string> {
  const base = SchemeColors[scheme];
  if (ageGroup === "default" || !AgeThemes[ageGroup]) return base;

  const ageOverrides = AgeThemes[ageGroup];
  const merged = { ...base };

  (Object.keys(ageOverrides) as ThemeColorName[]).forEach((name) => {
    if (ageOverrides[name]?.[scheme]) {
      merged[name] = ageOverrides[name][scheme];
    }
  });

  return merged;
}

/**
 * Determine age group from a child's age.
 */
export function ageToGroup(age: number | undefined): AgeGroup {
  if (age === undefined) return "default";
  if (age <= 5) return "toddler";
  if (age <= 8) return "child";
  if (age <= 12) return "tween";
  return "default";
}

/**
 * Get the accent color and gradient for a story theme.
 */
export function getStoryThemeAccent(
  theme: string
): { accent: string; gradient: [string, string] } {
  const key = theme.toLowerCase().replace(/\s+/g, "");
  const entry = StoryThemeAccents[key as keyof typeof StoryThemeAccents];
  if (entry) return { accent: entry.accent, gradient: entry.gradient as [string, string] };
  return { accent: "#FFD700", gradient: ["#1A1A2E", "#16213E"] };
}

type RuntimePalette = SchemePaletteItem & {
  text: string;
  textSecondary: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
  card: string;
  placeholder: string;
};

function buildRuntimePalette(scheme: ColorScheme): RuntimePalette {
  const base = SchemeColors[scheme];
  return {
    ...base,
    text: base.foreground,
    textSecondary: base.muted,
    background: base.background,
    tint: base.primary,
    icon: base.muted,
    tabIconDefault: base.muted,
    tabIconSelected: base.primary,
    border: base.border,
    card: base.surface,
    placeholder: base.muted,
  };
}

export const Colors = {
  light: buildRuntimePalette("light"),
  dark: buildRuntimePalette("dark"),
} satisfies Record<ColorScheme, RuntimePalette>;

export type ThemeColorPalette = (typeof Colors)[ColorScheme];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
