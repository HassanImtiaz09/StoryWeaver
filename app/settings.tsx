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
import {
  getSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings-store";
import Animated, { FadeInDown, FadeIn, Layout } from "react-native-reanimated";

// ─── Section configuration ─────────────────────────────────────
interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  /** Quick-toggle items shown directly in the collapsed section header area */
  quickToggles?: QuickToggle[];
  /** Navigation link to the full detail screen (kept for power users) */
  detailRoute?: string;
  /** Inline setting items shown when section is expanded */
  inlineItems?: InlineItem[];
}

interface QuickToggle {
  key: keyof AppSettings;
  label: string;
  description: string;
}

interface InlineItem {
  type: "navigate";
  label: string;
  icon: string;
  route: string;
  description: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "accessibility",
    title: "Accessibility",
    icon: "accessibility-outline",
    description: "Fonts, contrast, reading aids",
    inlineItems: [
      {
        type: "navigate",
        label: "Reading Preferences",
        icon: "book-outline",
        route: "/reading-prefs",
        description: "Text size, font style, story length",
      },
      {
        type: "navigate",
        label: "Full Accessibility Panel",
        icon: "options-outline",
        route: "/accessibility-settings",
        description: "Contrast, overlays, reading guides, screen reader",
      },
    ],
    quickToggles: [
      {
        key: "accessibilityEnabled",
        label: "Show Accessibility Button",
        description: "Display accessibility button in the story reader",
      },
    ],
  },
  {
    id: "language",
    title: "Language & Bilingual",
    icon: "globe-outline",
    description: "Story language, bilingual mode, vocabulary",
    inlineItems: [
      {
        type: "navigate",
        label: "Language Settings",
        icon: "language-outline",
        route: "/language-settings",
        description: "Primary language, bilingual display, learning mode",
      },
    ],
    quickToggles: [
      {
        key: "bilingualModeEnabled",
        label: "Bilingual Mode",
        description: "Show stories in two languages",
      },
      {
        key: "vocabularyHighlightsEnabled",
        label: "Vocabulary Highlights",
        description: "Highlight new words during reading",
      },
    ],
  },
  {
    id: "diversity",
    title: "Diversity & Representation",
    icon: "earth-outline",
    description: "Character diversity, cultural calendar",
    inlineItems: [
      {
        type: "navigate",
        label: "Diversity Preferences",
        icon: "people-circle-outline",
        route: "/diversity-settings",
        description: "Ethnicities, family structures, cultural backgrounds",
      },
    ],
  },
  {
    id: "offline",
    title: "Offline & Storage",
    icon: "cloud-download-outline",
    description: "Downloads, cache, storage quota",
    inlineItems: [
      {
        type: "navigate",
        label: "Offline Settings",
        icon: "cloud-offline-outline",
        route: "/offline-settings",
        description: "Storage quota, auto-download, cache management",
      },
    ],
    quickToggles: [
      {
        key: "offlineModeEnabled",
        label: "Offline Mode",
        description: "Enable offline story access",
      },
      {
        key: "autoDownloadOnWifi",
        label: "Auto-Download on WiFi",
        description: "Download new episodes automatically",
      },
    ],
  },
  {
    id: "smarthome",
    title: "Smart Home",
    icon: "bulb-outline",
    description: "Lights, ambient sounds, bedtime routines",
    inlineItems: [
      {
        type: "navigate",
        label: "Smart Home Settings",
        icon: "home-outline",
        route: "/smart-home-settings",
        description: "Connect devices, mood lighting, ambient sounds",
      },
    ],
  },
];

// ─── Collapsible Section Component ─────────────────────────────
function CollapsibleSection({
  section,
  expanded,
  onToggle,
  settings,
  onSettingChange,
  selectedChild,
  colors,
  router,
}: {
  section: SettingsSection;
  expanded: boolean;
  onToggle: () => void;
  settings: AppSettings;
  onSettingChange: (key: keyof AppSettings, value: any) => void;
  selectedChild: LocalChild | null;
  colors: any;
  router: any;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
      {/* Section header — tap to expand/collapse */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${section.title} section, ${expanded ? "collapse" : "expand"}`}
      >
        <Ionicons
          name={section.icon as any}
          size={22}
          color={colors.primary}
        />
        <View style={styles.sectionHeaderText}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {section.title}
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.textSecondary }]}
          >
            {section.description}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.muted}
        />
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.sectionBody}
        >
          {/* Quick toggles */}
          {section.quickToggles?.map((toggle) => (
            <View key={toggle.key} style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  {toggle.label}
                </Text>
                <Text
                  style={[styles.toggleDescription, { color: colors.textSecondary }]}
                >
                  {toggle.description}
                </Text>
              </View>
              <Switch
                value={!!settings[toggle.key]}
                onValueChange={(val) => onSettingChange(toggle.key, val)}
                trackColor={{ false: "#9CA3AF", true: colors.primary }}
                thumbColor={settings[toggle.key] ? "#FFF" : "#F3F4F6"}
              />
            </View>
          ))}

          {/* Navigation items to detail screens */}
          {section.inlineItems?.map((item) => (
            <Pressable
              key={item.route}
              onPress={() =>
                router.push({
                  pathname: item.route,
                  params: selectedChild
                    ? { childId: selectedChild.id, childName: selectedChild.name }
                    : undefined,
                })
              }
              style={({ pressed }) => [
                styles.inlineNavItem,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <View style={styles.inlineNavContent}>
                <Text style={[styles.inlineNavLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
                <Text
                  style={[styles.inlineNavDescription, { color: colors.textSecondary }]}
                >
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Quick Setting Row ─────────────────────────────────────────
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
    <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
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
        trackColor={{ false: "#9CA3AF", true: colors.primary }}
        thumbColor={enabled ? "#FFF" : "#F3F4F6"}
      />
    </View>
  );
}

// ─── Main Settings Screen ──────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    const [kids, currentSettings] = await Promise.all([
      getLocalChildren(),
      getSettings(),
    ]);
    setChildren(kids);
    if (kids.length > 0) setSelectedChild(kids[0]);
    setSettingsState(currentSettings);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSettingChange = useCallback(
    async (key: keyof AppSettings, value: any) => {
      if (!settings) return;
      const updated = { ...settings, [key]: value };
      setSettingsState(updated);
      await saveSettings({ [key]: value });
    },
    [settings]
  );

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (loading || !settings) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
            accessibilityLabel="Go back"
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
            <Text style={[styles.groupTitle, { color: colors.text }]}>
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
                          : colors.surface,
                      borderWidth: 1,
                      borderColor:
                        selectedChild?.id === child.id
                          ? colors.primary
                          : colors.border,
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
          style={styles.group}
        >
          <Text style={[styles.groupTitle, { color: colors.text }]}>
            Quick Settings
          </Text>

          <SettingRow
            icon="moon"
            title="Bedtime Mode"
            description="Warm colors and reduced brightness"
            enabled={settings.bedtimeModeEnabled}
            onToggle={(val) => handleSettingChange("bedtimeModeEnabled", val)}
            colors={colors}
          />
          <SettingRow
            icon="mic"
            title="Voice Assistant"
            description="Enable voice commands and narration"
            enabled={settings.voiceAssistantEnabled}
            onToggle={(val) => handleSettingChange("voiceAssistantEnabled", val)}
            colors={colors}
          />

          {/* Navigation mode toggle */}
          <View style={[styles.navModeCard, { backgroundColor: colors.card }]}>
            <Ionicons name="apps-outline" size={24} color={colors.primary} />
            <View style={styles.navModeContent}>
              <Text style={[styles.settingRowTitle, { color: colors.text }]}>
                Navigation Mode
              </Text>
              <Text
                style={[styles.settingRowDescription, { color: colors.textSecondary }]}
              >
                {settings.navMode === "child"
                  ? "Child mode: 3 simple tabs"
                  : "Parent mode: all 5 tabs"}
              </Text>
            </View>
            <View style={styles.navModeToggle}>
              <Pressable
                onPress={() => handleSettingChange("navMode", "child")}
                style={[
                  styles.navModeButton,
                  settings.navMode === "child" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.navModeButtonText,
                    {
                      color:
                        settings.navMode === "child" ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  Child
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleSettingChange("navMode", "parent")}
                style={[
                  styles.navModeButton,
                  settings.navMode === "parent" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.navModeButtonText,
                    {
                      color:
                        settings.navMode === "parent" ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  Parent
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Consolidated Settings Sections */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.group}
        >
          <Text style={[styles.groupTitle, { color: colors.text }]}>
            Preferences
          </Text>

          {SETTINGS_SECTIONS.map((section) => (
            <CollapsibleSection
              key={section.id}
              section={section}
              expanded={!!expandedSections[section.id]}
              onToggle={() => toggleSection(section.id)}
              settings={settings}
              onSettingChange={handleSettingChange}
              selectedChild={selectedChild}
              colors={colors}
              router={router}
            />
          ))}
        </Animated.View>

        {/* Account Section */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(400)}
          style={styles.group}
        >
          <Text style={[styles.groupTitle, { color: colors.text }]}>
            Account & Support
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.accountItem,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="card-outline" size={24} color={colors.primary} />
            <View style={styles.settingRowContent}>
              <Text style={[styles.settingRowTitle, { color: colors.text }]}>
                Subscription
              </Text>
              <Text
                style={[styles.settingRowDescription, { color: colors.textSecondary }]}
              >
                Manage your subscription and payment
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.accountItem,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
            <View style={styles.settingRowContent}>
              <Text style={[styles.settingRowTitle, { color: colors.text }]}>
                Help & Support
              </Text>
              <Text
                style={[styles.settingRowDescription, { color: colors.textSecondary }]}
              >
                FAQs, contact us, and report issues
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.accountItem,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.primary}
            />
            <View style={styles.settingRowContent}>
              <Text style={[styles.settingRowTitle, { color: colors.text }]}>
                About StoryWeaver
              </Text>
              <Text
                style={[styles.settingRowDescription, { color: colors.textSecondary }]}
              >
                Version 1.0.0
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

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

  // Child selector
  childSection: {
    marginBottom: 24,
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

  // Section groups
  group: {
    marginBottom: 24,
    gap: 10,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    opacity: 0.7,
  },

  // Quick setting row
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

  // Nav mode toggle
  navModeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  navModeContent: {
    flex: 1,
  },
  navModeToggle: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  navModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navModeButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Collapsible section card
  sectionCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 12,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },

  // Toggle row inside section
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 1,
  },
  toggleDescription: {
    fontSize: 11,
  },

  // Inline navigation item
  inlineNavItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  inlineNavContent: {
    flex: 1,
  },
  inlineNavLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 1,
  },
  inlineNavDescription: {
    fontSize: 11,
  },

  // Account items
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
});
