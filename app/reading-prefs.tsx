// @ts-nocheck
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
import { BreadcrumbHeader } from "@/components/breadcrumb-header";
import { useAccessibilityStore } from "@/lib/accessibility-store";

export default function ReadingPrefsScreen() {
  const router = useRouter();
  const colors = useColors();
  const accessibility = useAccessibilityStore();

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
        {/* Breadcrumb Header */}
        <BreadcrumbHeader
          title="Reading Preferences"
          crumbs={[
            { label: "Home", route: "/(tabs)" },
            { label: "Settings", route: "/settings" },
            { label: "Reading" },
          ]}
        />

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

        {/* ─── Reading Guide ──────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(400)}
          style={[styles.settingRow, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
        >
          <Ionicons name="swap-horizontal-outline" size={24} color={colors.primary} />
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Reading Guide
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Shows a ruler line to focus on one line of text at a time
            </Text>
          </View>
          <Switch
            value={accessibility.readingGuide}
            onValueChange={(val) => accessibility.setReadingGuide(val)}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={accessibility.readingGuide ? "#FFF" : "#F3F4F6"}
            accessibilityLabel="Reading guide toggle"
          />
        </Animated.View>

        {/* ─── Color Overlay ──────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(275).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Color Overlay
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Reduce visual stress with a colored tint. Choose a color or None.
          </Text>

          {/* Color Picker */}
          <View style={styles.colorPickerContainer}>
            {/* None Button */}
            <Pressable
              onPress={() => accessibility.setColorOverlay(null)}
              style={[
                styles.colorOption,
                {
                  borderColor: accessibility.colorOverlay === null ? colors.primary : colors.border,
                  borderWidth: accessibility.colorOverlay === null ? 3 : 1,
                  backgroundColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                },
              ]}
              accessibilityLabel="No color overlay"
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.colorOverlay === null }}
            >
              <Text style={[styles.colorLabel, { color: colors.text }]}>None</Text>
            </Pressable>

            {/* Amber */}
            <Pressable
              onPress={() => accessibility.setColorOverlay("amber")}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: "#FFD700",
                  borderColor: accessibility.colorOverlay === "amber" ? colors.primary : "transparent",
                  borderWidth: accessibility.colorOverlay === "amber" ? 3 : 1,
                },
              ]}
              accessibilityLabel="Amber color overlay"
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.colorOverlay === "amber" }}
            />

            {/* Blue */}
            <Pressable
              onPress={() => accessibility.setColorOverlay("blue")}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: "#4FC3F7",
                  borderColor: accessibility.colorOverlay === "blue" ? colors.primary : "transparent",
                  borderWidth: accessibility.colorOverlay === "blue" ? 3 : 1,
                },
              ]}
              accessibilityLabel="Blue color overlay"
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.colorOverlay === "blue" }}
            />

            {/* Green */}
            <Pressable
              onPress={() => accessibility.setColorOverlay("green")}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: "#81C784",
                  borderColor: accessibility.colorOverlay === "green" ? colors.primary : "transparent",
                  borderWidth: accessibility.colorOverlay === "green" ? 3 : 1,
                },
              ]}
              accessibilityLabel="Green color overlay"
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.colorOverlay === "green" }}
            />

            {/* Pink */}
            <Pressable
              onPress={() => accessibility.setColorOverlay("pink")}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: "#F48FB1",
                  borderColor: accessibility.colorOverlay === "pink" ? colors.primary : "transparent",
                  borderWidth: accessibility.colorOverlay === "pink" ? 3 : 1,
                },
              ]}
              accessibilityLabel="Pink color overlay"
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.colorOverlay === "pink" }}
            />

            {/* Purple */}
            <Pressable
              onPress={() => accessibility.setColorOverlay("purple")}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: "#CE93D8",
                  borderColor: accessibility.colorOverlay === "purple" ? colors.primary : "transparent",
                  borderWidth: accessibility.colorOverlay === "purple" ? 3 : 1,
                },
              ]}
              accessibilityLabel="Purple color overlay"
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.colorOverlay === "purple" }}
            />
          </View>

          {/* Opacity Slider */}
          {accessibility.colorOverlay && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.opacityControlContainer}>
              <Text style={[styles.opacityLabel, { color: colors.text }]}>
                Opacity: {Math.round(accessibility.colorOverlayOpacity / 40 * 100)}%
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>Light</Text>
                <View style={{ flex: 1 }}>
                  {/* Simple opacity control using Pressable row */}
                  <View style={styles.opacityPreview}>
                    <View
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        backgroundColor: accessibility.colorOverlay
                          ? {
                              amber: `rgba(255, 215, 0, ${accessibility.colorOverlayOpacity * 0.01})`,
                              blue: `rgba(79, 195, 247, ${accessibility.colorOverlayOpacity * 0.01})`,
                              green: `rgba(129, 199, 132, ${accessibility.colorOverlayOpacity * 0.01})`,
                              pink: `rgba(244, 143, 177, ${accessibility.colorOverlayOpacity * 0.01})`,
                              purple: `rgba(206, 147, 216, ${accessibility.colorOverlayOpacity * 0.01})`,
                            }[accessibility.colorOverlay] || "transparent"
                          : "transparent",
                      }}
                    />
                    <Text style={[styles.previewText, { color: colors.text }]}>Preview</Text>
                  </View>
                </View>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>Dark</Text>
              </View>

              {/* Opacity buttons */}
              <View style={styles.opacityButtonRow}>
                {[10, 20, 30, 40].map((opacity) => (
                  <Pressable
                    key={opacity}
                    onPress={() => accessibility.setColorOverlayOpacity(opacity)}
                    style={[
                      styles.opacityButton,
                      {
                        backgroundColor: accessibility.colorOverlayOpacity === opacity ? colors.primary : colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.opacityButtonText,
                        { color: accessibility.colorOverlayOpacity === opacity ? "#FFF" : colors.text },
                      ]}
                    >
                      {Math.round(opacity / 40 * 100)}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}
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
  sectionDescription: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  colorPickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  colorOption: {
    flex: 1,
    minWidth: "48%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  colorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  opacityControlContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  opacityLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 11,
    minWidth: 40,
  },
  opacityPreview: {
    height: 60,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  previewText: {
    fontSize: 12,
    fontWeight: "600",
  },
  opacityButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  opacityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  opacityButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
