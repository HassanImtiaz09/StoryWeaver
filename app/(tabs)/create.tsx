import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { AnimatedPressable, BounceButton } from "@/components/animated-pressable";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { STORY_THEMES } from "@/constants/assets";

/* ─── helpers ────────────────────────────────────────────── */
function getQuickStoryDefaults(): { theme: (typeof STORY_THEMES)[0]; greeting: string } {
  const hour = new Date().getHours();
  let greeting = "Quick Story";
  let themePool: string[];

  if (hour >= 5 && hour < 12) {
    greeting = "Morning Adventure";
    themePool = ["safari", "ocean", "jungle", "garden"];
  } else if (hour >= 12 && hour < 17) {
    greeting = "Afternoon Quest";
    themePool = ["space", "robot", "medieval", "pirate"];
  } else if (hour >= 17 && hour < 20) {
    greeting = "Story Time";
    themePool = ["fairy", "forest", "musical", "candy"];
  } else {
    greeting = "Bedtime Tale";
    themePool = ["arctic", "ocean", "forest", "fairy"];
  }

  const pick = themePool[Math.floor(Math.random() * themePool.length)];
  const theme = STORY_THEMES.find((t) => t.id === pick) || STORY_THEMES[0];
  return { theme, greeting };
}

/* ─── Create Options ─────────────────────────────────────── */
interface CreateOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  emoji: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "collaborative",
    title: "Collaborative Story",
    description: "Create stories together with family",
    icon: "people",
    color: "#48C9B0",
    route: "/collaborative-story",
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    id: "character",
    title: "Create Character",
    description: "Design a custom character or avatar",
    icon: "body",
    color: "#9B59B6",
    route: "/create-character",
    emoji: "🎨",
  },
];

export default function CreateScreen() {
  const router = useRouter();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickDefaults] = useState(() => getQuickStoryDefaults());

  /* ── Quick-story sparkle animation ── */
  const sparkleRotate = useSharedValue(0);
  const sparkleScale = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      sparkleRotate.value = withRepeat(
        withSequence(
          withTiming(15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(-15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      );
      sparkleScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [reducedMotion]);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sparkleRotate.value}deg` },
      { scale: sparkleScale.value },
    ],
  }));

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

  const handleQuickStory = () => {
    if (!selectedChild) return;
    router.push({
      pathname: "/new-story" as any,
      params: {
        childId: selectedChild.id,
        childName: selectedChild.name,
        quickStory: "true",
        theme: quickDefaults.theme.id,
        themeName: quickDefaults.theme.name,
      },
    });
  };

  const handleNewStory = () => {
    if (!selectedChild) return;
    router.push({
      pathname: "/new-story" as any,
      params: {
        childId: selectedChild.id,
        childName: selectedChild.name,
      },
    });
  };

  const handleOptionPress = (option: CreateOption) => {
    if (selectedChild) {
      router.push({
        pathname: option.route as any,
        params: {
          childId: selectedChild.id,
          childName: selectedChild.name,
        },
      });
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  if (children.length === 0) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="create-outline" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Child Profile
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create a child profile first to start creating stories
          </Text>
          <BounceButton
            onPress={() => router.push("/create-child")}
            accessibilityLabel="Create a child profile"
            accessibilityRole="button"
            accessibilityHint="Double-tap to create a child profile"
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonText}>Create Profile</Text>
          </BounceButton>
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
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose what to create for {selectedChild?.name}
          </Text>
        </Animated.View>

        {/* Child Selector */}
        {children.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.childSelector}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => setSelectedChild(child)}
                  accessibilityLabel={child.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedChild?.id === child.id }}
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

        {/* ✨ Quick Story — one-tap hero card */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <BounceButton
            onPress={handleQuickStory}
            accessibilityLabel={`Quick Story: ${quickDefaults.greeting} with ${quickDefaults.theme.name}`}
            accessibilityRole="button"
            accessibilityHint="Double-tap to instantly generate a story with smart defaults"
            style={styles.quickStoryCard}
          >
            <LinearGradient
              colors={["#FF6B6B", "#FF8E53", "#FFD700"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickStoryGradient}
            >
              {/* Background illustration (if available) */}
              {quickDefaults.theme.image && (
                <Image
                  source={{ uri: quickDefaults.theme.image }}
                  style={styles.quickStoryBg}
                  resizeMode="cover"
                />
              )}
              <View style={styles.quickStoryOverlay}>
                <View style={styles.quickStoryTop}>
                  <Animated.View style={sparkleStyle}>
                    <Text style={styles.quickStoryIcon}>⚡</Text>
                  </Animated.View>
                  <View style={styles.quickStoryBadge}>
                    <Text style={styles.quickStoryBadgeText}>One Tap</Text>
                  </View>
                </View>
                <View style={styles.quickStoryBottom}>
                  <Text style={styles.quickStoryTitle}>
                    {quickDefaults.greeting}
                  </Text>
                  <Text style={styles.quickStoryDesc}>
                    {quickDefaults.theme.emoji} {quickDefaults.theme.name} — smart
                    defaults from {selectedChild?.name}'s profile
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </BounceButton>
        </Animated.View>

        {/* 📖 Custom Story — wizard entry */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <BounceButton
            onPress={handleNewStory}
            accessibilityLabel="Custom Story wizard"
            accessibilityRole="button"
            accessibilityHint="Double-tap to create a story step by step"
            style={styles.wizardCard}
          >
            <LinearGradient
              colors={["#6C5CE7", "#A29BFE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.wizardGradient}
            >
              <View style={styles.wizardContent}>
                <Text style={styles.wizardEmoji}>📖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wizardTitle}>Custom Story</Text>
                  <Text style={styles.wizardDesc}>
                    Pick theme, tone, morals — step by step
                  </Text>
                </View>
                <View style={styles.wizardSteps}>
                  {[1, 2, 3, 4].map((n) => (
                    <View key={n} style={styles.wizardStepDot}>
                      <Text style={styles.wizardStepNum}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </BounceButton>
        </Animated.View>

        {/* Other create options */}
        <View style={styles.otherGrid}>
          {CREATE_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(300 + index * 80).duration(400)}
            >
              <BounceButton
                onPress={() => handleOptionPress(option)}
                accessibilityLabel={`${option.title}: ${option.description}`}
                accessibilityRole="button"
                accessibilityHint="Double-tap to start"
                style={styles.optionCard}
              >
                <LinearGradient
                  colors={[option.color, option.color + "CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionGradient}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                    <View style={styles.optionArrow}>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </View>
                  </View>
                </LinearGradient>
              </BounceButton>
            </Animated.View>
          ))}
        </View>

        {/* Tips */}
        <Animated.View
          entering={FadeInDown.delay(480).duration(400)}
          style={styles.tipsSection}
        >
          <View
            style={[styles.tipCard, { backgroundColor: "rgba(255,215,0,0.1)" }]}
          >
            <Ionicons name="lightbulb-outline" size={20} color="#FFD700" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Creating Stories
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Each story is personalized based on {selectedChild?.name}'s
                interests, age, and preferences for the perfect bedtime
                experience.
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  childSelector: {
    marginBottom: 20,
  },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    minHeight: 44,
  },
  childChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* ── Quick Story hero card ── */
  quickStoryCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    minHeight: 44,
  },
  quickStoryGradient: {
    minHeight: 170,
  },
  quickStoryBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  quickStoryOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  quickStoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickStoryIcon: {
    fontSize: 36,
  },
  quickStoryBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  quickStoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  quickStoryBottom: {
    marginTop: 16,
  },
  quickStoryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  quickStoryDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },

  /* ── Custom Story wizard card ── */
  wizardCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    minHeight: 44,
  },
  wizardGradient: {
    padding: 18,
  },
  wizardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  wizardEmoji: {
    fontSize: 32,
  },
  wizardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  wizardDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  wizardSteps: {
    flexDirection: "row",
    gap: 4,
  },
  wizardStepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  wizardStepNum: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* ── Other options ── */
  otherGrid: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 44,
  },
  optionGradient: {
    padding: 18,
    minHeight: 120,
    justifyContent: "space-between",
  },
  optionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  optionEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 16,
    marginBottom: 8,
  },
  optionArrow: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 8,
  },

  /* ── Tips ── */
  tipsSection: {
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },

  /* ── Empty state ── */
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
