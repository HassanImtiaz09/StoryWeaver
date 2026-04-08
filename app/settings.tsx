import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import Animated, { FadeInDown } from "react-native-reanimated";

interface SettingSection {
  title: string;
  icon: string;
  route: string;
  description: string;
}

const SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: "Accessibility",
    icon: "accessibility-outline",
    route: "/accessibility-settings",
    description: "Dyslexia fonts, contrast, reading guides, and more",
  },
  {
    title: "Language Settings",
    icon: "globe-outline",
    route: "/language-settings",
    description: "Choose app language and story language",
  },
  {
    title: "Offline Settings",
    icon: "cloud-download-outline",
    route: "/offline-settings",
    description: "Manage downloaded stories and offline mode",
  },
  {
    title: "Reading Preferences",
    icon: "book-outline",
    route: "/reading-prefs",
    description: "Font size, dark mode, story length",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [bedtimeModeEnabled, setBedtimeModeEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(true);

  const loadData = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);
    if (kids.length > 0) {
      setSelectedChild(kids[0]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

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
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 28 }} />
        </Animated.View>

        {/* Child Selector */}
        {children.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.childSection}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Child
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => setSelectedChild(child)}
                  style={[
                    styles.childChip,
                    {
                      backgroundColor:
                        selectedChild?.id === child.id
                          ? colors.primary
                          : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      {
                        color:
                          selectedChild?.id === child.id ? "#0A0E1A" : colors.text,
                      },
                    ]}
                  >
                    {child.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Quick Settings */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.quickSettings}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Settings
          </Text>

          <SettingRow
            icon="moon"
            title="Bedtime Mode"
            description="Warm colors and reduced brightness"
            enabled={bedtimeModeEnabled}
            onToggle={setBedtimeModeEnabled}
            colors={colors}
          />

          <SettingRow
            icon="half-moon"
            title="Dark Mode"
            description="Dark theme for easier nighttime reading"
            enabled={darkModeEnabled}
            onToggle={setDarkModeEnabled}
            colors={colors}
          />

          <SettingRow
            icon="mic"
            title="Voice Assistant"
            description="Enable voice commands and narration"
            enabled={voiceAssistantEnabled}
            onToggle={setVoiceAssistantEnabled}
            colors={colors}
          />
        </Animated.View>

        {/* Navigation Settings */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Preferences
          </Text>

          {SETTINGS_SECTIONS.map((section, index) => (
            <Pressable
              key={section.route}
              onPress={() =>
                router.push({
                  pathname: section.route as any,
                  params: selectedChild
                    ? {
                        childId: selectedChild.id,
                        childName: selectedChild.name,
                      }
                    : undefined,
                })
              }
              style={({ pressed }) => [
                styles.settingItem,
                { backgroundColor: colors.card },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name={section.icon as any}
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingItemContent}>
                <Text style={[styles.settingItemTitle, { color: colors.text }]}>
                  {section.title}
                </Text>
                <Text
                  style={[styles.settingItemDescription, { color: colors.textSecondary }]}
                >
                  {section.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </Animated.View>

        {/* Account Section */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(400)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Account & Support
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.settingItem,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="card-outline" size={24} color={colors.primary} />
            <View style={styles.settingItemContent}>
              <Text style={[styles.settingItemTitle, { color: colors.text }]}>
                Subscription
              </Text>
              <Text
                style={[styles.settingItemDescription, { color: colors.textSecondary }]}
              >
                Manage your subscription and payment
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.settingItem,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
            <View style={styles.settingItemContent}>
              <Text style={[styles.settingItemTitle, { color: colors.text }]}>
                Help & Support
              </Text>
              <Text
                style={[styles.settingItemDescription, { color: colors.textSecondary }]}
              >
                FAQs, contact us, and report issues
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.settingItem,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <View style={styles.settingItemContent}>
              <Text style={[styles.settingItemTitle, { color: colors.text }]}>
                About StoryWeaver
              </Text>
              <Text
                style={[styles.settingItemDescription, { color: colors.textSecondary }]}
              >
                Version 1.0.0 • Privacy • Terms
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  colors,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.settingRow,
        { backgroundColor: colors.card },
      ]}
    >
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <View style={styles.settingRowContent}>
        <Text style={[styles.settingRowTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.settingRowDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: "#9CA3AF", true: "#FFD700" }}
        thumbColor={enabled ? "#FFF" : "#F3F4F6"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  childSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  childChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickSettings: {
    marginBottom: 24,
    gap: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  settingRowContent: {
    flex: 1,
  },
  settingRowTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  settingRowDescription: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
    gap: 10,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  settingItemDescription: {
    fontSize: 12,
  },
});
