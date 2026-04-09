import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import {
  getSelectedChildAge,
  onSelectedChildChange,
} from "@/lib/child-context-store";
import { getSettings } from "@/lib/settings-store";
import type { ColorScheme } from "@/lib/_core/theme";

/**
 * Hook that determines the effective color scheme (light/dark) to use.
 * Takes into account:
 * 1. System color scheme preference
 * 2. Kid-friendly light mode setting (forces light for ages 3-7)
 * 3. Settings darkMode preference
 *
 * Returns the effective color scheme to use for theming.
 */
export function useThemeMode(): ColorScheme {
  const systemScheme = useColorScheme();
  const [effectiveScheme, setEffectiveScheme] = useState<ColorScheme>("light");

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      const childAge = getSelectedChildAge();

      // If kid-friendly light mode is enabled and child is 3-7, force light
      if (
        settings.kidFriendlyLightModeEnabled &&
        childAge &&
        childAge >= 3 &&
        childAge <= 7
      ) {
        setEffectiveScheme("light");
        return;
      }

      // Otherwise, respect the darkMode setting
      if (settings.darkMode === "light") {
        setEffectiveScheme("light");
      } else if (settings.darkMode === "dark") {
        setEffectiveScheme("dark");
      } else {
        // auto mode: use system preference
        setEffectiveScheme((systemScheme as ColorScheme) || "light");
      }
    })();
  }, [systemScheme]);

  // Also re-evaluate when selected child changes
  useEffect(() => {
    const unsubscribe = onSelectedChildChange(async () => {
      const settings = await getSettings();
      const childAge = getSelectedChildAge();

      // If kid-friendly light mode is enabled and child is 3-7, force light
      if (
        settings.kidFriendlyLightModeEnabled &&
        childAge &&
        childAge >= 3 &&
        childAge <= 7
      ) {
        setEffectiveScheme("light");
        return;
      }

      // Otherwise, respect the darkMode setting
      if (settings.darkMode === "light") {
        setEffectiveScheme("light");
      } else if (settings.darkMode === "dark") {
        setEffectiveScheme("dark");
      } else {
        // auto mode: use system preference
        setEffectiveScheme((systemScheme as ColorScheme) || "light");
      }
    });

    return unsubscribe;
  }, [systemScheme]);

  return effectiveScheme;
}
