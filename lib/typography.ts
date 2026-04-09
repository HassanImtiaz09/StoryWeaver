// Typography System for StoryWeaver
// Pre-configured fonts and text styles with dynamic scaling, age-adaptive sizing,
// accessibility font support, and dyslexia-friendly reading options.

// ─── Text Size Preference ────────────────────────────────────
export type TextSizePreference = "small" | "medium" | "large" | "extraLarge";

/** Scale multipliers for each text size preference */
export const TEXT_SIZE_SCALES: Record<TextSizePreference, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.2,
  extraLarge: 1.4,
};

// ─── Accessibility Font ──────────────────────────────────────
export type FontPreference = "default" | "openDyslexic";

// ─── Font Families ───────────────────────────────────────────
export const FontFamily = {
  // Headings - playful, rounded, child-friendly
  heading: 'Baloo2_700Bold',
  headingMedium: 'Baloo2_600SemiBold',
  headingLight: 'Baloo2_500Medium',

  // Body text - clean, highly readable
  body: 'Quicksand_400Regular',
  bodyMedium: 'Quicksand_500Medium',
  bodySemiBold: 'Quicksand_600SemiBold',
  bodyBold: 'Quicksand_700Bold',

  // Story narrative - handwritten, immersive
  story: 'PatrickHand_400Regular',

  // Fun/special - badges, callouts, celebrations
  fun: 'BubblegumSans_400Regular',

  // Accessibility - dyslexia-friendly
  openDyslexic: 'OpenDyslexic_400Regular',
  openDyslexicBold: 'OpenDyslexic_700Bold',
};

/**
 * Get the resolved font family, swapping to OpenDyslexic when accessibility mode is active.
 * OpenDyslexic replaces body, story, and caption fonts but keeps heading/fun fonts
 * for visual personality.
 */
export function getResolvedFontFamily(
  baseFontFamily: string,
  fontPref: FontPreference = "default"
): string {
  if (fontPref !== "openDyslexic") return baseFontFamily;

  // Map standard fonts to OpenDyslexic equivalents
  const dyslexicMap: Record<string, string> = {
    [FontFamily.body]: FontFamily.openDyslexic,
    [FontFamily.bodyMedium]: FontFamily.openDyslexic,
    [FontFamily.bodySemiBold]: FontFamily.openDyslexicBold,
    [FontFamily.bodyBold]: FontFamily.openDyslexicBold,
    [FontFamily.story]: FontFamily.openDyslexic,
  };

  return dyslexicMap[baseFontFamily] ?? baseFontFamily;
}

// ─── Base Text Style Definitions (at scale=1.0) ─────────────
// These are the "medium" defaults. Scaled dynamically by getScaledTextStyles().

interface BaseTextStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  /** Minimum font size in px — never scale below this */
  minFontSize?: number;
}

const BASE_STYLES: Record<string, BaseTextStyle> = {
  screenTitle: {
    fontFamily: FontFamily.heading,
    fontSize: 28,
    lineHeight: 36,
  },
  sectionHeader: {
    fontFamily: FontFamily.headingMedium,
    fontSize: 20,
    lineHeight: 28,
  },
  cardTitle: {
    fontFamily: FontFamily.headingLight,
    fontSize: 16,
    lineHeight: 22,
  },
  bodyLarge: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyRegular: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,           // Increased from 20 → 22 for 1.57 ratio (closer to 1.6 target)
  },
  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: 13,             // Increased from 12 → 13 minimum
    lineHeight: 18,
    minFontSize: 13,          // Never go below 13px
  },
  bodyBold: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 22,
  },
  storyText: {
    fontFamily: FontFamily.story,
    fontSize: 24,             // Increased from 22 → 24 (meets 24pt minimum for young readers)
    lineHeight: 38,           // 1.58 ratio
    letterSpacing: 0.3,
    minFontSize: 22,          // Never shrink story text below 22
  },
  storyTextLarge: {
    fontFamily: FontFamily.story,
    fontSize: 28,             // Increased from 26 → 28
    lineHeight: 44,           // 1.57 ratio
    letterSpacing: 0.3,
    minFontSize: 24,
  },
  badge: {
    fontFamily: FontFamily.fun,
    fontSize: 14,
    lineHeight: 18,
  },
  celebration: {
    fontFamily: FontFamily.fun,
    fontSize: 24,
    lineHeight: 32,
  },
  streakCount: {
    fontFamily: FontFamily.fun,
    fontSize: 32,
    lineHeight: 40,
  },
  tabLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,             // Increased from 11 → 13
    lineHeight: 16,
    minFontSize: 12,          // Tab labels stay readable
  },
  buttonPrimary: {
    fontFamily: FontFamily.headingMedium,
    fontSize: 16,
    lineHeight: 22,
    minFontSize: 14,
  },
  buttonSecondary: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    minFontSize: 13,
  },
  caption: {
    fontFamily: FontFamily.body,
    fontSize: 13,             // Increased from 11 → 13
    lineHeight: 18,           // Increased from 14 → 18 for readability
    letterSpacing: 0.2,
    minFontSize: 12,
  },
  metadata: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,             // Increased from 12 → 13
    lineHeight: 18,
    minFontSize: 12,
  },
};

// ─── Age-Adaptive Story Text Sizing ──────────────────────────
/**
 * Returns additional font size boost for story text based on child age.
 * Younger children get larger text for readability.
 */
export function getAgeStoryTextBoost(age: number | undefined): number {
  if (age === undefined) return 0;
  if (age <= 5) return 4;     // +4px for ages 3-5 (story text becomes 28px base)
  if (age <= 7) return 2;     // +2px for ages 6-7
  return 0;                   // Ages 8+ use standard size
}

// ─── Dynamic Style Generator ─────────────────────────────────
export type ScaledTextStyles = Record<string, {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}>;

/**
 * Generate scaled text styles based on user preferences.
 *
 * @param sizePreference - User's text size setting (small/medium/large/extraLarge)
 * @param fontPreference - Font family preference (default/openDyslexic)
 * @param childAge - Optional child age for age-adaptive story text sizing
 * @returns Complete set of text styles scaled to the user's preferences
 */
export function getScaledTextStyles(
  sizePreference: TextSizePreference = "medium",
  fontPreference: FontPreference = "default",
  childAge?: number,
): ScaledTextStyles {
  const scale = TEXT_SIZE_SCALES[sizePreference];
  const ageBoost = getAgeStoryTextBoost(childAge);
  const result: ScaledTextStyles = {};

  for (const [key, base] of Object.entries(BASE_STYLES)) {
    // Apply age boost only to story text styles
    const isStoryText = key === "storyText" || key === "storyTextLarge";
    const ageAdjust = isStoryText ? ageBoost : 0;

    // Scale fontSize and enforce minimum
    const scaledSize = Math.round((base.fontSize + ageAdjust) * scale);
    const fontSize = Math.max(scaledSize, base.minFontSize ?? 10);

    // Scale lineHeight proportionally to maintain ratio
    const ratio = base.lineHeight / base.fontSize;
    const lineHeight = Math.round(fontSize * ratio);

    result[key] = {
      fontFamily: getResolvedFontFamily(base.fontFamily, fontPreference),
      fontSize,
      lineHeight,
      ...(base.letterSpacing != null ? { letterSpacing: base.letterSpacing } : {}),
    };
  }

  return result;
}

// ─── Story Text Extras ───────────────────────────────────────
/**
 * Additional style properties for story reading text to improve readability.
 * Apply these alongside the scaled storyText/storyTextLarge styles.
 */
export const STORY_TEXT_EXTRAS = {
  /** Increased word spacing for dyslexia-friendly reading (≈0.05em equivalent at 24px) */
  wordSpacing: 1.2,
};

/**
 * Get story text extras with dyslexia-friendly enhancements.
 * Returns increased word spacing for both default and OpenDyslexic modes,
 * with extra spacing when OpenDyslexic is active.
 */
export function getStoryTextExtras(fontPreference: FontPreference = "default") {
  return {
    wordSpacing: fontPreference === "openDyslexic" ? 2.0 : STORY_TEXT_EXTRAS.wordSpacing,
  };
}

// ─── Static Export (backward-compatible, "medium" scale) ─────
// Components that haven't been migrated to dynamic styles can still import TextStyles.
export const TextStyles = getScaledTextStyles("medium", "default");
