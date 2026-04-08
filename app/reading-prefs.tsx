import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function ReadingPrefsScreen() {
  const router = useRouter();
  const colors = useColors();

  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [darkMode, setDarkMode] = useState(false);
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("medium");
  const [lineHeight, setLineHeight] = useState<"compact" | "normal" | "spacious">("normal");

  const fontSizeOptions: { label: string; value: "small" | "medium" | "large" }[] = [
    { label: "Small", value: "small" },
    { label: "Medium", value: "medium" },
    { label: "Large", value: "large" },
  ];

  const storyLengthOptions: { label: string; value: "short" | "medium" | "long" }[] = [
    { label: "Short", value: "short" },
    { label: "Medium", value: "medium" },
    { label: "Long", value: "long" },
  ];

  const lineHeightOptions: { label: string; value: "compact" | "normal" | "spacious" }[] = [
    { label: "Compact", value: "compact" },
    { label: "Normal", value: "normal" },
    { label: "Spacious", value: "spacious" },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Reading Preferences
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Customize your reading experience
            </Text>
          </View>
        </Animated.View>

        {/* Font Size */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Font Size
          </Text>
          <View style={styles.optionsContainer}>
            {fontSizeOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setFontSize(option.value)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      fontSize === option.value
                        ? colors.primary
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: fontSize === option.value ? "#0A0E1A" : colors.text,
                      fontSize:
                        option.value === "small"
                          ? 12
                          : option.value === "large"
                            ? 16
                            : 14,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Line Height */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Line Height
          </Text>
          <View style={styles.optionsContainer}>
            {lineHeightOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setLineHeight(option.value)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      lineHeight === option.value
                        ? colors.primary
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: lineHeight === option.value ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Story Length */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Default Story Length
          </Text>
          <View style={styles.optionsContainer}>
            {storyLengthOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setStoryLength(option.value)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      storyLength === option.value
                        ? colors.primary
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: storyLength === option.value ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Dark Mode */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(400)}
          style={styles.settingRow}
        >
          <Ionicons name="moon-outline" size={24} color={colors.primary} />
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Dark Mode
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Easier on the eyes at night
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#9CA3AF", true: "#FFD700" }}
            thumbColor={darkMode ? "#FFF" : "#F3F4F6"}
          />
        </Animated.View>

        {/* Preview */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={[styles.previewCard, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            Preview
          </Text>
          <Text
            style={[
              styles.previewText,
              {
                color: colors.text,
                fontSize:
                  fontSize === "small" ? 14 : fontSize === "large" ? 18 : 16,
                lineHeight:
                  lineHeight === "compact" ? 18 : lineHeight === "spacious" ? 26 : 22,
              },
            ]}
          >
            Once upon a time, there was a little child who loved bedtime stories
            filled with wonder and adventure.
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
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionButtonText: {
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
    marginTop: 20,
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
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  previewText: {
    fontWeight: "500",
  },
});
