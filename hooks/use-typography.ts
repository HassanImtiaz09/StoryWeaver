import { useState, useEffect, useMemo } from "react";
import {
  getScaledTextStyles,
  getStoryTextExtras,
  type TextSizePreference,
  type FontPreference,
  type ScaledTextStyles,
} from "@/lib/typography";
import { getSettings } from "@/lib/settings-store";

interface TypographyResult {
  /** All text styles scaled to the user's preference */
  styles: ScaledTextStyles;
  /** Extra story text properties (word-spacing) */
  storyExtras: { wordSpacing: number };
  /** Current size preference */
  sizePreference: TextSizePreference;
  /** Current font preference */
  fontPreference: FontPreference;
  /** Whether dyslexia-friendly spacing is enabled */
  dyslexiaSpacing: boolean;
}

/**
 * React hook providing dynamic typography scaled to user preferences.
 *
 * Reads fontSize, fontPreference, and dyslexiaFriendlySpacing from the settings store
 * and returns fully scaled text styles. Optionally accepts a child age for age-adaptive
 * story text sizing (ages 3-5 get larger story text).
 *
 * @param childAge - Optional child age for age-adaptive story text sizing
 */
export function useTypography(childAge?: number): TypographyResult {
  const [sizePreference, setSizePreference] = useState<TextSizePreference>("medium");
  const [fontPreference, setFontPreference] = useState<FontPreference>("default");
  const [dyslexiaSpacing, setDyslexiaSpacing] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSettings().then((settings) => {
      if (!mounted) return;
      setSizePreference(settings.fontSize as TextSizePreference);
      setFontPreference((settings.fontPreference ?? "default") as FontPreference);
      setDyslexiaSpacing(settings.dyslexiaFriendlySpacing ?? false);
    });
    return () => { mounted = false; };
  }, []);

  const styles = useMemo(
    () => getScaledTextStyles(sizePreference, fontPreference, childAge),
    [sizePreference, fontPreference, childAge]
  );

  const storyExtras = useMemo(
    () => getStoryTextExtras(dyslexiaSpacing ? "openDyslexic" : fontPreference),
    [fontPreference, dyslexiaSpacing]
  );

  return { styles, storyExtras, sizePreference, fontPreference, dyslexiaSpacing };
}
