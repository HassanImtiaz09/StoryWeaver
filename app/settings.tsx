import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert, Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  getSettings, saveSettings, formatBedtime,
  type AppSettings,
} from "@/lib/settings-store";

const STORY_LENGTH_OPTIONS: { value: AppSettings["storyLength"]; label: string; pages: number }[] = [
  { value: "short", label: "Short", pages: 4 },
  { value: "medium", label: "Medium", pages: 6 },
  { value: "long", label: "Long", pages: 8 },
];

const FONT_SIZE_OPTIONS: { value: AppSettings["fontSize"]; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const SUBSCRIPTION_TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "Free",
    features: ["3 stories per month", "Device TTS voice", "6 story themes"],
    color: "#9BA1A6",
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "\u00A34.99/mo",
    features: ["Unlimited stories", "ElevenLabs HD voices", "All themes", "AI illustrations", "Print book discount"],
    color: "#FFD700",
    recommended: true,
  },
  {
    id: "family" as const,
    name: "Family",
    price: "\u00A37.99/mo",
    features: ["Everything in Premium", "Up to 5 child profiles", "Priority generation", "Free shipping on books"],
    color: "#6C63FF",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
    }, [])
  );

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings({ [key]: value });
  };

  const adjustBedtime = (direction: "hour_up" | "hour_down" | "min_up" | "min_down") => {
    if (!settings) return;
    let { bedtimeHour, bedtimeMinute } = settings;
    switch (direction) {
      case "hour_up": bedtimeHour = (bedtimeHour + 1) % 24; break;
      case "hour_down": bedtimeHour = (bedtimeHour - 1 + 24) % 24; break;
      case "min_up": bedtimeMinute = (bedtimeMinute + 15) % 60; break;
      case "min_down": bedtimeMinute = (bedtimeMinute - 15 + 60) % 60; break;
    }
    const updated = { ...settings, bedtimeHour, bedtimeMinute };
    setSettings(updated);
    saveSettings({ bedtimeHour, bedtimeMinute });
  };

  const handleSubscriptionSelect = (tier: typeof SUBSCRIPTION_TIERS[0]) => {
    if (tier.id === "free") {
      updateSetting("subscriptionTier", "free");
      return;
    }
    Alert.alert(
      `Upgrade to ${tier.name}`,
      `Subscribe for ${tier.price} to unlock ${tier.name} features. This is a demo - no actual payment will be processed.`,
      [
        {
          text: "Subscribe",
          onPress: () => {
            updateSetting("subscriptionTier", tier.id);
            updateSetting("storiesPerMonth", tier.id === "family" ? 999 : 999);
            updateSetting("storiesRemaining", tier.id === "family" ? 999 : 999);
            Alert.alert("Subscribed!", `You are now on the ${tier.name} plan.`);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  if (!settings) return null;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Bedtime Reminder */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="bell.fill" size={22} color="#FFD700" />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Bedtime Reminder</Text>
            <Switch
              value={settings.bedtimeReminderEnabled}
              onValueChange={(v) => updateSetting("bedtimeReminderEnabled", v)}
              trackColor={{ false: colors.border, true: "#FFD70066" }}
              thumbColor={settings.bedtimeReminderEnabled ? "#FFD700" : "#f4f3f4"}
            />
          </View>
          {settings.bedtimeReminderEnabled && (
            <View style={styles.bedtimeSection}>
              <Text style={[styles.bedtimeLabel, { color: colors.muted }]}>
                Remind at:
              </Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timeColumn}>
                  <Pressable onPress={() => adjustBedtime("hour_up")} style={styles.timeArrow}>
                    <Text style={styles.timeArrowText}>{"\u25B2"}</Text>
                  </Pressable>
                  <Text style={[styles.timeValue, { color: colors.foreground }]}>
                    {settings.bedtimeHour === 0 ? "12" : settings.bedtimeHour > 12 ? (settings.bedtimeHour - 12).toString().padStart(2, "0") : settings.bedtimeHour.toString().padStart(2, "0")}
                  </Text>
                  <Pressable onPress={() => adjustBedtime("hour_down")} style={styles.timeArrow}>
                    <Text style={styles.timeArrowText}>{"\u25BC"}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.timeSeparator, { color: colors.foreground }]}>:</Text>
                <View style={styles.timeColumn}>
                  <Pressable onPress={() => adjustBedtime("min_up")} style={styles.timeArrow}>
                    <Text style={styles.timeArrowText}>{"\u25B2"}</Text>
                  </Pressable>
                  <Text style={[styles.timeValue, { color: colors.foreground }]}>
                    {settings.bedtimeMinute.toString().padStart(2, "0")}
                  </Text>
                  <Pressable onPress={() => adjustBedtime("min_down")} style={styles.timeArrow}>
                    <Text style={styles.timeArrowText}>{"\u25BC"}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.timePeriod, { color: colors.muted }]}>
                  {settings.bedtimeHour >= 12 ? "PM" : "AM"}
                </Text>
              </View>
              <Text style={[styles.bedtimeNote, { color: colors.muted }]}>
                We'll send a gentle reminder when it's story time
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Voice Preferences */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="speaker.wave.2.fill" size={22} color="#6C63FF" />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Voice & Audio</Text>
          </View>
          <View style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Default Voice</Text>
            <View style={styles.segmentedControl}>
              {(["device", "elevenlabs"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => updateSetting("voiceMode", mode)}
                  style={[
                    styles.segment,
                    settings.voiceMode === mode && styles.segmentActive,
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: colors.muted },
                    settings.voiceMode === mode && styles.segmentTextActive,
                  ]}>
                    {mode === "device" ? "Device TTS" : "HD Voice"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Reading Speed</Text>
            <View style={styles.speedRow}>
              <Pressable
                onPress={() => updateSetting("voiceSpeed", Math.max(0.5, settings.voiceSpeed - 0.1))}
                style={styles.speedBtn}
              >
                <Text style={styles.speedBtnText}>-</Text>
              </Pressable>
              <Text style={[styles.speedValue, { color: colors.foreground }]}>
                {settings.voiceSpeed.toFixed(1)}x
              </Text>
              <Pressable
                onPress={() => updateSetting("voiceSpeed", Math.min(1.5, settings.voiceSpeed + 0.1))}
                style={styles.speedBtn}
              >
                <Text style={styles.speedBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Auto-play Audio</Text>
            <Switch
              value={settings.autoPlayAudio}
              onValueChange={(v) => updateSetting("autoPlayAudio", v)}
              trackColor={{ false: colors.border, true: "#6C63FF66" }}
              thumbColor={settings.autoPlayAudio ? "#6C63FF" : "#f4f3f4"}
            />
          </View>
        </Animated.View>

        {/* Story Preferences */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="book.fill" size={22} color="#48C9B0" />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Story Preferences</Text>
          </View>
          <View style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Story Length</Text>
          </View>
          <View style={styles.chipRow}>
            {STORY_LENGTH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => updateSetting("storyLength", opt.value)}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  settings.storyLength === opt.value && styles.chipActive,
                ]}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.foreground },
                  settings.storyLength === opt.value && { color: "#0A0E1A" },
                ]}>
                  {opt.label}
                </Text>
                <Text style={[
                  styles.chipSub,
                  { color: colors.muted },
                  settings.storyLength === opt.value && { color: "#0A0E1A" },
                ]}>
                  {opt.pages} pages
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.optionRow, { marginTop: 12 }]}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Text Size</Text>
          </View>
          <View style={styles.chipRow}>
            {FONT_SIZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => updateSetting("fontSize", opt.value)}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  settings.fontSize === opt.value && styles.chipActive,
                ]}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.foreground },
                  settings.fontSize === opt.value && { color: "#0A0E1A" },
                  opt.value === "small" && { fontSize: 13 },
                  opt.value === "large" && { fontSize: 17 },
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Subscription */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="star.fill" size={22} color="#FFD700" />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Subscription</Text>
          </View>
          <Text style={[styles.currentPlan, { color: colors.muted }]}>
            Current plan: <Text style={{ color: "#FFD700", fontWeight: "700" }}>
              {settings.subscriptionTier.charAt(0).toUpperCase() + settings.subscriptionTier.slice(1)}
            </Text>
            {" \u00B7 "}{settings.storiesRemaining >= 999 ? "Unlimited" : `${settings.storiesRemaining}/${settings.storiesPerMonth}`} stories
          </Text>
          <View style={styles.tierGrid}>
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Pressable
                key={tier.id}
                onPress={() => handleSubscriptionSelect(tier)}
                style={({ pressed }) => [
                  styles.tierCard,
                  { borderColor: settings.subscriptionTier === tier.id ? tier.color : colors.border },
                  settings.subscriptionTier === tier.id && { borderWidth: 2 },
                  tier.recommended && styles.tierRecommended,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {tier.recommended && (
                  <View style={[styles.recommendedBadge, { backgroundColor: tier.color }]}>
                    <Text style={styles.recommendedText}>Best Value</Text>
                  </View>
                )}
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                <Text style={[styles.tierPrice, { color: colors.foreground }]}>{tier.price}</Text>
                {tier.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <IconSymbol name="checkmark.circle.fill" size={14} color={tier.color} />
                    <Text style={[styles.featureText, { color: colors.muted }]}>{feat}</Text>
                  </View>
                ))}
                {settings.subscriptionTier === tier.id && (
                  <View style={[styles.currentBadge, { backgroundColor: tier.color }]}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  card: { borderRadius: 20, padding: 18, marginBottom: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  bedtimeSection: { alignItems: "center", paddingVertical: 8 },
  bedtimeLabel: { fontSize: 14, marginBottom: 12 },
  timePickerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeColumn: { alignItems: "center", gap: 4 },
  timeArrow: { padding: 8 },
  timeArrowText: { fontSize: 14, color: "#FFD700" },
  timeValue: { fontSize: 36, fontWeight: "800", minWidth: 60, textAlign: "center" },
  timeSeparator: { fontSize: 36, fontWeight: "800" },
  timePeriod: { fontSize: 18, fontWeight: "600", marginLeft: 8 },
  bedtimeNote: { fontSize: 13, marginTop: 12, textAlign: "center" },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  optionLabel: { fontSize: 15, fontWeight: "500" },
  segmentedControl: { flexDirection: "row", borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)" },
  segment: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  segmentActive: { backgroundColor: "#6C63FF" },
  segmentText: { fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#FFFFFF" },
  speedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  speedBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,215,0,0.15)", justifyContent: "center", alignItems: "center" },
  speedBtnText: { fontSize: 18, color: "#FFD700", fontWeight: "700" },
  speedValue: { fontSize: 16, fontWeight: "600", minWidth: 40, textAlign: "center" },
  chipRow: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 2 },
  chipActive: { backgroundColor: "#FFD700", borderColor: "#FFD700" },
  chipText: { fontSize: 15, fontWeight: "600" },
  chipSub: { fontSize: 11 },
  currentPlan: { fontSize: 14, marginBottom: 14 },
  tierGrid: { gap: 12 },
  tierCard: { borderRadius: 16, borderWidth: 1, padding: 16, position: "relative" },
  tierRecommended: { borderWidth: 2 },
  recommendedBadge: { position: "absolute", top: -10, right: 16, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  recommendedText: { color: "#0A0E1A", fontSize: 11, fontWeight: "700" },
  tierName: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  tierPrice: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  featureText: { fontSize: 13 },
  currentBadge: { position: "absolute", top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  currentBadgeText: { color: "#0A0E1A", fontSize: 11, fontWeight: "700" },
});
