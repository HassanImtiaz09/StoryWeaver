import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings-store";
import { getScaledTextStyles, getStoryTextExtras, FontFamily, type TextSizePreference, type FontPreference } from "@/lib/typography";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function ReadingPrefsScreen() {
  const router = useRouter();
  const colors = useColors();

  const [fontSize, setFontSize] = useState<TextSizePreference>("medium");
  const [fontPreference, setFontPreference] = useState<FontPreference>("default");
  const [dyslexiaSpacing, setDyslexiaSpacing] = useState(false);
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("medium");

  // Load settings on mount
  useEffect(() => {
    getSettings().then((s) => {
      setFontSize(s.fontSize as TextSizePreference);
      setFontPreference((s.fontPreference ?? "default") as FontPreference);
      setDyslexiaSpacing(s.dyslexiaFriendlySpacing ?? false);
      setStoryLength(s.storyLength);
    });
  }, []);

  // Persist on change
  const updateSetting = useCallback(async (patch: Partial<AppSettings>) => {
    await saveSettings(patch);
  }, []);

  const handleFontSize = (val: TextSizePreference) => {
    setFontSize(val);
    updateSetting({ fontSize: val });
  };

  const handleFontPreference = (val: FontPreference) => {
    setFontPreference(val);
    updateSetting({ fontPreference: val });
  };

  const handleDyslexiaSpacing = (val: boolean) => {
    setDyslexiaSpacing(val);
    updateSetting({ dyslexiaFriendlySpacing: val });
  };

  const handleStoryLength = (val: "short" | "medium" | "long") => {
    setStoryLength(val);
    updateSetting({ storyLength: val });
  };

  // Compute live preview styles
  const previewStyles = getScaledTextStyles(fontSize, fontPreference);
  const previewExtras = getStoryTextExtras(dyslexiaSpacing ? "openDyslexic" : fontPreference);

  const fontSizeOptions: { label: string; value: TextSizePreference; previewSize: number }[] = [
    { label: "S", value: "small", previewSize: 12 },
    { label: "M", value: "medium", previewSize: 14 },
    { label: "L", value: "large", previewSize: 17 },
    { label: "XL", value: "extraLarge", previewSize: 20 },
  ];

  const storyLengthOptions: { label: string; value: "short" | "medium" | "long"; desc: string }[] = [
    { label: "Short", value: "short", desc: "4 pages" },
    { label: "Medium", value: "medium", desc: "6 pages" },
    { label: "Long", value: "long", desc: "8 pages" },
  ];

  const selectedBg = colors.primary;
  const unselectedBg = colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const selectedText = colors.isDark ? "#0A0E1A" : "#FFFFFF";

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Reading Preferences
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Customize text size, fonts, and story display
            </Text>
          </View>
        </Animated.View>

        {/* ─── Text Size ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Text Size
          </Text>
          <View style={styles.optionsContainer}>
            {fontSizeOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleFontSize(option.value)}
                accessibilityLabel={`Text size ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: fontSize === option.value }}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: fontSize === option.value ? selectedBg : unselectedBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: fontSize === option.value ? selectedText : colors.text,
                      fontSize: option.previewSize,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ─── Accessibility Font ─────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Font Style
          </Text>
          <Pressable
            onPress={() => handleFontPreference(fontPreference === "default" ? "openDyslexic" : "default")}
            accessibilityLabel={`Font style: ${fontPreference === "openDyslexic" ? "OpenDyslexic" : "Default"}`}
            accessibilityRole="button"
            style={[
              styles.fontOptionCard,
              {
                backgroundColor: fontPreference === "openDyslexic" ? selectedBg : unselectedBg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.fontOptionTitle,
                  { color: fontPreference === "openDyslexic" ? selectedText : colors.text },
                ]}
              >
                {fontPreference === "openDyslexic" ? "OpenDyslexic" : "Default Fonts"}
              </Text>
              <Text
                style={[
                  styles.fontOptionDesc,
                  { color: fontPreference === "openDyslexic" ? selectedText : colors.textSecondary },
                ]}
              >
                {fontPreference === "openDyslexic"
                  ? "Dyslexia-friendly font with weighted letter bottoms"
                  : "Baloo, Quicksand, and PatrickHand"}
              </Text>
            </View>
            <Ionicons
              name={fontPreference === "openDyslexic" ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={fontPreference === "openDyslexic" ? selectedText : colors.muted}
            />
          </Pressable>
        </Animated.View>

        {/* ─── Dyslexia-Friendly Spacing ─────────────── */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={[styles.settingRow, { backgroundColor: unselectedBg }]}
        >
          <Ionicons name="text-outline" size={24} color={colors.primary} />
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Extra Word Spacing
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Increases space between words for easier reading
            </Text>
          </View>
          <Switch
            value={dyslexiaSpacing}
            onValueChange={handleDyslexiaSpacing}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={dyslexiaSpacing ? "#FFF" : "#F3F4F6"}
            accessibilityLabel="Extra word spacing toggle"
          />
        </Animated.View>

        {/* ─── Story Length ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Default Story Length
          </Text>
          <View style={styles.optionsContainer}>
            {storyLengthOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleStoryLength(option.value)}
                accessibilityLabel={`Story length ${option.label}, ${option.desc}`}
                accessibilityRole="button"
                accessibilityState={{ selected: storyLength === option.value }}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: storyLength === option.value ? selectedBg : unselectedBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    { color: storyLength === option.value ? selectedText : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionSubtext,
                    { color: storyLength === option.value ? selectedText : colors.textSecondary },
                  ]}
                >
                  {option.desc}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ─── Live Preview ───────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            Story Text Preview
          </Text>
          <Text
            style={[
              {
                fontFamily: previewStyles.storyText.fontFamily,
                fontSize: previewStyles.storyText.fontSize,
                lineHeight: previewStyles.storyText.lineHeight,
                letterSpacing: previewStyles.storyText.letterSpacing,
                color: colors.text,
                wordSpacing: previewExtras.wordSpacing,
              },
            ]}
          >
            Once upon a time, in a land of sparkling stars and whispering trees, a little child set
            off on a wonderful adventure.
          </Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 20,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  optionsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionButtonText: {
    fontWeight: "700",
  },
  optionSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  fontOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  fontOptionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  fontOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
  },
});
