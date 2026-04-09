import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announce } from "@/lib/a11y-helpers";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import { useGamificationStore } from "@/lib/gamification-store";
import { fetchProgress } from "@/lib/gamification-actions";
import {
  getSubscriptionState,
  getRemainingFreeStories,
  type SubscriptionState,
} from "@/lib/subscription-store";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { IllustratedEmptyState } from "@/components/illustrated-empty-state";
import { useTooltip } from "@/hooks/use-tooltip";
import { InlineTooltip } from "@/components/tooltip-overlay";

interface FamilyOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  badge?: string;
}

const FAMILY_OPTIONS: FamilyOption[] = [
  {
    id: "analytics",
    title: "Reading Analytics",
    description: "View detailed reading insights and progress",
    icon: "bar-chart-outline",
    color: "#3498DB",
    route: "/analytics",
  },
  {
    id: "parent-tools",
    title: "Parent Tools",
    description: "Create custom stories and manage approvals",
    icon: "settings-outline",
    color: "#E74C3C",
    route: "/parent-tools",
  },
  {
    id: "print",
    title: "Print a Book",
    description: "Order beautiful printed versions of stories",
    icon: "print-outline",
    color: "#9B59B6",
    route: "/print-book",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Customize app preferences and family settings",
    icon: "cog-outline",
    color: "#34495E",
    route: "/settings",
  },
];

export default function FamilyScreen() {
  const router = useRouter();
  const colors = useColors();
  const prefersReducedMotion = useReducedMotion();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [subState, setSubState] = useState<SubscriptionState | null>(null);
  const gamificationStore = useGamificationStore();

  const loadData = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);
    if (kids.length > 0) {
      const child = kids[0];
      setSelectedChild(child);
      // @ts-expect-error - argument type mismatch
      await fetchProgress(child.id);
    }
    const sub = await getSubscriptionState();
    setSubState(sub);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // First-time user tooltip
  const { activeTooltip, dismiss: dismissTooltip } = useTooltip(
    "family",
    { hasChildren: children.length > 0, hasStories: false },
    !loading
  );

  const selectChild = async (child: LocalChild) => {
    setSelectedChild(child);
    // @ts-expect-error - argument count
    await gamificationStore.setProgress(child.id);
    announce(`${child.name} profile selected`);
  };

  const handleOptionPress = (option: FamilyOption) => {
    router.push({
      pathname: option.route as any,
      params: selectedChild
        ? {
            childId: selectedChild.id,
            childName: selectedChild.name,
          }
        : undefined,
    });
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  const childProgress = selectedChild
    // @ts-expect-error - argument type mismatch
    ? gamificationStore.childProgress.get(selectedChild.id)
    : null;

  if (children.length === 0) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <IllustratedEmptyState
            type="no-children"
            title="No Profiles Yet"
            subtitle="Create a child profile first to access family tools and personalized features"
            actionLabel="Create Profile"
            onAction={() => router.push("/create-child")}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* First-time tooltip */}
        {activeTooltip && (
          <InlineTooltip
            message={activeTooltip.message}
            emoji={activeTooltip.emoji}
            onDismiss={dismissTooltip}
          />
        )}

        {/* Header */}
        <Animated.View entering={prefersReducedMotion ? undefined : FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { color: colors.text }]}
                accessibilityRole="header"
              >
                Family
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Tools and insights for your family
              </Text>
            </View>

            {/* Subscription badge (moved from home screen) */}
            {subState && (
              <Pressable
                onPress={() => router.push({ pathname: "/paywall" as any, params: { source: "family" } })}
                accessibilityLabel={`Current subscription: ${subState.plan === "free" ? getRemainingFreeStories(subState) + " free stories remaining" : subState.plan + " plan"}`}
                accessibilityRole="button"
                accessibilityHint="Opens subscription and upgrade options"
                style={({ pressed }) => [
                  styles.subBadge,
                  { minHeight: 44 },
                  {
                    backgroundColor:
                      subState.plan === "free"
                        ? "rgba(255,215,0,0.15)"
                        : "rgba(34,197,94,0.15)",
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.subBadgeEmoji}>
                  {subState.plan === "free" ? "⭐" : "👑"}
                </Text>
                <Text
                  style={[
                    styles.subBadgeText,
                    {
                      color:
                        subState.plan === "free" ? "#D97706" : "#16A34A",
                    },
                  ]}
                >
                  {subState.plan === "free"
                    ? `${getRemainingFreeStories(subState)} free`
                    : subState.plan.charAt(0).toUpperCase() + subState.plan.slice(1)}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Child Selector */}
        {children.length > 1 && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeInDown.delay(100).duration(400)}
            style={styles.childSelector}
            accessible={true}
            // @ts-expect-error - type assertion needed
            accessibilityRole="selectablelist"
            accessibilityLabel="Child profiles"
            accessibilityHint="Swipe right to view more profiles"
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => selectChild(child)}
                  accessibilityLabel={`${child.name} profile`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedChild?.id === child.id }}
                  accessibilityHint={selectedChild?.id === child.id ? "Currently selected" : "Double tap to select"}
                  style={[
                    styles.childChip,
                    { minHeight: 44 },
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

        {/* Quick Stats */}
        {selectedChild && childProgress && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeInDown.delay(150).duration(400)}
            style={styles.statsContainer}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel={`${selectedChild.name}'s reading progress`}
          >
            <View
              style={[styles.statCard, { backgroundColor: colors.card }]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Reading streak: ${childProgress.currentStreak} days`}
            >
              <View style={styles.statContent}>
                <Ionicons name="flame" size={24} color="#FF6B6B" accessibilityElementsHidden={true} />
                <View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Reading Streak
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {childProgress.currentStreak} days
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[styles.statCard, { backgroundColor: colors.card }]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Total points: ${childProgress.totalPoints.toLocaleString()} points`}
            >
              <View style={styles.statContent}>
                <Ionicons name="star" size={24} color="#FFD700" accessibilityElementsHidden={true} />
                <View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total Points
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {childProgress.totalPoints.toLocaleString()} pts
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Family Options Grid */}
        <View
          style={styles.optionsGrid}
          accessible={true}
          accessibilityRole="list"
          accessibilityLabel="Family tools menu"
        >
          {FAMILY_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={prefersReducedMotion ? undefined : FadeInDown.delay(200 + index * 75).duration(400)}
            >
              <Pressable
                onPress={() => handleOptionPress(option)}
                accessibilityLabel={option.title}
                accessibilityRole="button"
                accessibilityHint={option.description}
                style={({ pressed }) => [
                  styles.optionCard,
                  { backgroundColor: colors.card, minHeight: 44 },
                  pressed && { opacity: 0.8, transform: [{ scale: prefersReducedMotion ? 1 : 0.96 }] },
                ]}
              >
                <View
                  style={styles.optionIconContainer}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  <LinearGradient
                    colors={[option.color, option.color + "CC"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.optionIconGradient}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={28}
                      color="#FFFFFF"
                      accessibilityElementsHidden={true}
                    />
                  </LinearGradient>
                </View>

                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.muted} accessibilityElementsHidden={true} />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Info Section */}
        <Animated.View
          entering={prefersReducedMotion ? undefined : FadeInDown.delay(500).duration(400)}
          style={styles.infoSection}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel="Parental Controls information"
        >
          <View
            style={[styles.infoCard, { backgroundColor: "rgba(72, 201, 176, 0.1)" }]}
            accessible={true}
            accessibilityLabel="Parental Controls"
            accessibilityHint="Use Settings to enable parental controls, manage content filters, and customize bedtime preferences"
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#48C9B0"
              accessibilityElementsHidden={true}
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Parental Controls
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Use Settings to enable parental controls, manage content filters, and
                customize bedtime preferences for {selectedChild?.name}.
              </Text>
            </View>
          </View>
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  subBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  subBadgeEmoji: {
    fontSize: 14,
  },
  subBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  childSelector: {
    marginBottom: 20,
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
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  optionIconContainer: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  optionIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#0A0E1A",
    fontSize: 14,
    fontWeight: "700",
  },
});
