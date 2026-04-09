import { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { announce } from "@/lib/a11y-helpers";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { AnimatedPressable, BounceButton } from "@/components/animated-pressable";
import { STORY_THEMES, ASSETS } from "@/constants/assets";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import { getLocalStoryArcs, type LocalStoryArc } from "@/lib/story-store";
import { setSelectedChild as updateSelectedChild } from "@/lib/child-context-store";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  getSubscriptionState,
  getRemainingFreeStories,
  type SubscriptionState,
} from "@/lib/subscription-store";
import { BedtimeModeWrapper } from "@/components/bedtime-mode-wrapper";
import { TonightRecommendation } from "@/components/tonight-recommendation";
import {
  getBedtimeState,
  activateBedtimeMode,
  deactivateBedtimeMode,
  type BedtimeState,
} from "@/lib/bedtime-mode";
import { useGamificationStore } from "@/lib/gamification-store";
import { fetchProgress as fetchGamificationProgress } from "@/lib/gamification-actions";
import { StreakCounter } from "@/components/streak-counter";
import { PointsDisplay } from "@/components/points-display";
import { AchievementToast } from "@/components/achievement-toast";
import { IllustratedEmptyState } from "@/components/illustrated-empty-state";
import { FloatingStars } from "@/components/micro-animations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THEME_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
const REC_CARD_WIDTH = 170;

// ─── Time-aware greeting ────────────────────────────────────────
function getTimeGreeting(childName: string): { greeting: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: `Good morning, ${childName}!`, emoji: "☀️" };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: `Good afternoon, ${childName}!`, emoji: "🌤️" };
  } else if (hour >= 17 && hour < 20) {
    return { greeting: `Story time, ${childName}!`, emoji: "📖" };
  } else {
    return { greeting: `Time for bed, ${childName}!`, emoji: "🌙" };
  }
}

// ─── Animated Waving Mascot ─────────────────────────────────────
function WavingMascot({ reducedMotion }: { reducedMotion: boolean }) {
  const waveRotation = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      waveRotation.value = withRepeat(
        withSequence(
          withTiming(15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration: 250, easing: Easing.inOut(Easing.ease) }),
          withTiming(12, { duration: 250, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withDelay(2000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      );
    }
  }, [reducedMotion]);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveRotation.value}deg` }],
  }));

  return (
    <Animated.View style={waveStyle}>
      <Text style={styles.mascotEmoji}>👋</Text>
    </Animated.View>
  );
}

// ─── Illustrated Recommendation Card ────────────────────────────
function IllustratedRecCard({
  title,
  theme,
  emoji,
  reason,
  colors,
  onPress,
}: {
  title: string;
  theme: string;
  emoji: string;
  reason: string;
  colors: any;
  onPress: () => void;
}) {
  // Look up CloudFront image for this theme
  const themeData = STORY_THEMES.find((t) => t.id === theme);
  const imageUrl = themeData?.image;

  return (
    <AnimatedPressable
      style={styles.recCard}
      onPress={onPress}
      accessibilityLabel={`${title} - ${theme} story`}
      accessibilityRole="button"
      accessibilityHint="Double-tap to read this story"
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.recImage} contentFit="cover" accessibilityLabel={title} />
      ) : (
        <View style={[styles.recImageFallback, { backgroundColor: colors.surface }]}>
          <Text style={styles.recFallbackEmoji}>{emoji}</Text>
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        locations={[0.2, 1]}
        style={styles.recOverlay}
      >
        <Text style={styles.recTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.recReason} numberOfLines={1}>
          {reason}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

// ─── ScrollReveal Component ─────────────────────────────────────
function ScrollReveal({
  children,
  scrollY,
  threshold,
  delay = 0,
  reducedMotion = false,
}: {
  children: React.ReactNode;
  scrollY: Animated.SharedValue<number>;
  threshold: number;
  delay?: number;
  reducedMotion?: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 1, transform: [] };
    }

    const triggerOffset = threshold - 300;
    const distance = scrollY.value - triggerOffset;
    const progress = Math.min(Math.max(distance / 200, 0), 1);

    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 30 }],
    };
  });

  if (reducedMotion) {
    return <View>{children}</View>;
  }

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// ─── Subscription Banner ────────────────────────────────────────
function SubscriptionBanner({
  remainingStories,
  onDismiss,
  onUnlock,
  reducedMotion,
  colors,
}: {
  remainingStories: number;
  onDismiss: () => void;
  onUnlock: () => void;
  reducedMotion: boolean;
  colors: any;
}) {
  return (
    <Animated.View
      entering={
        reducedMotion
          ? FadeIn.duration(300)
          : FadeInDown.delay(800).duration(400)
      }
      style={[styles.bannerContainer]}
      accessibilityRole="alert"
      accessibilityLabel={`${remainingStories} free stories remaining this month`}
    >
      <LinearGradient
        colors={["rgba(255,215,0,0.15)", "rgba(255,215,0,0.05)"]}
        locations={[0, 1]}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerText}>
            <Text
              style={[styles.bannerEmoji, { color: colors.text }]}
              accessibilityLabel=""
            >
              ✨
            </Text>
            <Text
              style={[styles.bannerMessage, { color: colors.text }]}
              accessibilityLabel=""
            >
              {remainingStories === 1
                ? "1 free story remaining"
                : `${remainingStories} free stories remaining`}
            </Text>
          </View>
          <Pressable
            onPress={onUnlock}
            style={styles.bannerCTA}
            accessibilityRole="link"
            accessibilityLabel="Unlock Unlimited Stories"
            accessibilityHint="Navigate to subscription plans"
          >
            <Text style={styles.bannerCTAText}>Unlock →</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={onDismiss}
          style={styles.bannerDismiss}
          accessibilityLabel="Dismiss subscription banner"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={[styles.bannerDismissIcon, { color: colors.muted }]}>
            ×
          </Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── AI Recommendations ─────────────────────────────────────────
const RECOMMENDATIONS = [
  { id: "r1", title: "The Moonlight Orchestra", theme: "musical", emoji: "🎵", reason: "Music + imagination" },
  { id: "r2", title: "Captain Starfish's Treasure", theme: "ocean", emoji: "🌊", reason: "Ocean pirate adventure" },
  { id: "r3", title: "The Kindness Robot", theme: "robot", emoji: "🤖", reason: "Tech meets empathy" },
  { id: "r4", title: "Whispers in the Garden", theme: "garden", emoji: "🌻", reason: "Nature + mystery" },
  { id: "r5", title: "Dino Detective Academy", theme: "dinosaur", emoji: "🦕", reason: "Dinos + problem solving" },
  { id: "r6", title: "The Fairy's Lost Melody", theme: "fairy", emoji: "🧚", reason: "Magical quest" },
  { id: "r7", title: "Arctic Penguin Express", theme: "arctic", emoji: "🐧", reason: "Cold weather fun" },
  { id: "r8", title: "The Brave Little Knight", theme: "medieval", emoji: "🏰", reason: "Castle quest" },
  { id: "r9", title: "Jungle Code Breakers", theme: "jungle", emoji: "🐒", reason: "Jungle puzzles" },
  { id: "r10", title: "Candy Cloud Kingdom", theme: "candy", emoji: "🍭", reason: "Sweet dreams" },
];

// ─── Animated Greeting Section with Parallax ───────────────────
function AnimatedGreetingSection({
  scrollY,
  reducedMotion,
  timeGreeting,
  selectedChild,
  colors,
  bedtimeState,
  childProgress,
  toggleBedtimeMode,
  router,
}: {
  scrollY: Animated.SharedValue<number>;
  reducedMotion: boolean;
  timeGreeting: { greeting: string; emoji: string } | null;
  selectedChild: LocalChild | null;
  colors: any;
  bedtimeState: BedtimeState | null;
  childProgress: any;
  toggleBedtimeMode: () => void;
  router: any;
}) {
  const parallaxStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [] };
    }
    return {
      transform: [{ translateY: -scrollY.value * 0.15 }],
    };
  });

  return (
    <Animated.View style={[styles.greetingSection, parallaxStyle]} entering={FadeIn.duration(600)}>
      {/* Floating stars background decoration */}
      <FloatingStars count={3} area={{ width: 200, height: 100 }} />

      <View style={styles.greetingTopRow}>
        <View style={styles.greetingLeft}>
          {timeGreeting && <WavingMascot reducedMotion={reducedMotion} />}
          <View style={styles.greetingTextWrap}>
            <Text
              style={[styles.greeting, { color: colors.text }]}
              accessibilityRole="header"
            >
              {timeGreeting?.greeting ?? "Tonight's Story"}
            </Text>
            <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
              {selectedChild
                ? `What adventure awaits tonight?`
                : "Select a child to begin"}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <AnimatedPressable
            onPress={toggleBedtimeMode}
            style={[
              styles.headerBtn,
              bedtimeState?.isActive && { backgroundColor: "rgba(255,215,0,0.15)" },
            ]}
            accessibilityLabel="Bedtime mode"
            accessibilityRole="button"
            accessibilityHint={bedtimeState?.isActive ? "Double-tap to disable bedtime mode" : "Double-tap to enable bedtime mode"}
            accessibilityState={{ checked: bedtimeState?.isActive }}
          >
            <IconSymbol
              name="moon.fill"
              size={22}
              color={bedtimeState?.isActive ? "#FFD700" : colors.muted}
            />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => router.push("/settings" as any)}
            style={styles.headerBtn}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            accessibilityHint="Double-tap to open settings"
          >
            <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Gamification stats inline */}
      {selectedChild && childProgress && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
          <StreakCounter
            currentStreak={childProgress.currentStreak}
            isActive={childProgress.currentStreak > 0}
            size="sm"
          />
          <Pressable
            onPress={() => router.push("/achievements" as any)}
            style={[styles.pointsBadge, { backgroundColor: colors.card }]}
            accessibilityLabel={`Level ${childProgress.level}, ${childProgress.totalPoints.toLocaleString()} points`}
            accessibilityRole="button"
            accessibilityHint="Double-tap to view achievements"
          >
            <Text style={styles.pointsEmoji}>⭐</Text>
            <View>
              <Text style={[styles.pointsLevel, { color: colors.textSecondary }]}>
                Level {childProgress.level}
              </Text>
              <Text style={[styles.pointsValue, { color: colors.text }]}>
                {childProgress.totalPoints.toLocaleString()} pts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════
// Main Screen
// ═════════════════════════════════════════════════════════════════
export default function TonightScreen() {
  const router = useRouter();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [activeArcs, setActiveArcs] = useState<LocalStoryArc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subState, setSubState] = useState<SubscriptionState | null>(null);
  const [bedtimeState, setBedtimeState] = useState<BedtimeState | null>(null);
  const [remainingStories, setRemainingStories] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Scroll animation shared value
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Gamification
  const gamificationStore = useGamificationStore();
  const [showAchievementToast, setShowAchievementToast] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<{
    name: string;
    icon: string;
    pointsReward: number;
    tier: "bronze" | "silver" | "gold" | "diamond";
  } | null>(null);
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setDataFetchError(null);
      const kids = await getLocalChildren();
      setChildren(kids);
      if (kids.length > 0) {
        const child =
          selectedChild && kids.find((k) => k.id === selectedChild.id)
            ? selectedChild
            : kids[0];
        setSelectedChild(child);
        // Update global child context for theming
        await updateSelectedChild(child.id, child.age);
        const arcs = await getLocalStoryArcs();
        setActiveArcs(arcs.filter((a) => a.childId === child.id && a.status === "active"));
        try {
          await fetchGamificationProgress(child.id);
        } catch (err) {
          // Network error fetching gamification progress
          setDataFetchError("Failed to load gamification data. Check your connection.");
          console.error("Gamification fetch error:", err);
        }
      } else {
        setSelectedChild(null);
        setActiveArcs([]);
      }
      const sub = await getSubscriptionState();
      setSubState(sub);
      const bedtime = await getBedtimeState();
      setBedtimeState(bedtime);
      const remaining = await getRemainingFreeStories();
      setRemainingStories(remaining);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setDataFetchError("Failed to load home screen data. Check your connection.");
      setLoading(false);
    }
  }, [selectedChild, gamificationStore]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const selectChild = async (child: LocalChild) => {
    setSelectedChild(child);
    // Update global child context for theming
    await updateSelectedChild(child.id, child.age);
    const arcs = await getLocalStoryArcs();
    setActiveArcs(arcs.filter((a) => a.childId === child.id && a.status === "active"));
    await gamificationStore.fetchProgress(child.id);
  };

  const toggleBedtimeMode = async () => {
    if (bedtimeState?.isActive) {
      setBedtimeState(await deactivateBedtimeMode());
    } else {
      setBedtimeState(await activateBedtimeMode());
    }
  };

  const childProgress = selectedChild
    ? gamificationStore.childProgress.get(selectedChild.id)
    : null;

  const timeGreeting = useMemo(
    () => (selectedChild ? getTimeGreeting(selectedChild.name) : null),
    [selectedChild?.name]
  );

  // ─── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </ScreenContainer>
    );
  }

  // ─── Network error state ───────────────────────────────────
  if (dataFetchError && children.length > 0) {
    return (
      <ScreenContainer>
        <View style={styles.centerContent}>
          <IllustratedEmptyState
            type="no-network"
            title="No Internet Connection"
            subtitle="Check your connection and try again"
            actionLabel="Retry"
            onAction={() => loadData()}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ─── Empty state (no children) ──────────────────────────────
  if (children.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <Image
          source={{ uri: ASSETS.onboarding[0] }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(10,14,26,0.3)", "rgba(10,14,26,0.85)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <ScreenContainer
          containerClassName="bg-transparent"
          edges={["top", "bottom", "left", "right"]}
        >
          <View style={styles.emptyInner}>
            <IllustratedEmptyState
              type="no-children"
              title="Welcome to StoryWeaver"
              subtitle="Create your first child profile to start generating personalized bedtime stories"
              actionLabel="Create Child Profile"
              onAction={() => router.push("/create-child")}
            />
          </View>
        </ScreenContainer>
      </View>
    );
  }

  // ─── Main Home Screen ───────────────────────────────────────
  return (
    <BedtimeModeWrapper isActive={bedtimeState?.isActive ?? false}>
      <ScreenContainer>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
          }
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Achievement Toast */}
          {currentAchievement && (
            <AchievementToast
              visible={showAchievementToast}
              name={currentAchievement.name}
              icon={currentAchievement.icon}
              pointsReward={currentAchievement.pointsReward}
              tier={currentAchievement.tier}
              onHide={() => setShowAchievementToast(false)}
            />
          )}

          {/* ═══ 1. Personalized Greeting with Time-Aware Message ═══ */}
          <AnimatedGreetingSection
            scrollY={scrollY}
            reducedMotion={reducedMotion}
            timeGreeting={timeGreeting}
            selectedChild={selectedChild}
            colors={colors}
            bedtimeState={bedtimeState}
            childProgress={childProgress}
            toggleBedtimeMode={toggleBedtimeMode}
            router={router}
          />

          {/* Child selector (multi-child only) */}
          {children.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.childScroll}
            >
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => selectChild(child)}
                  style={[
                    styles.childChip,
                    {
                      backgroundColor:
                        selectedChild?.id === child.id ? colors.primary : colors.surface,
                      borderColor:
                        selectedChild?.id === child.id ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityLabel={`Select ${child.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedChild?.id === child.id }}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      { color: selectedChild?.id === child.id ? "#0A0E1A" : colors.text },
                    ]}
                  >
                    {child.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* ═══ 2. Tonight's Featured Story — Hero Card ═══ */}
          {selectedChild && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <TonightRecommendation
                childName={selectedChild.name}
                recommendation={RECOMMENDATIONS[Math.floor(Math.random() * RECOMMENDATIONS.length)]}
                onPress={() => {
                  const rec = RECOMMENDATIONS[Math.floor(Math.random() * RECOMMENDATIONS.length)];
                  router.push({
                    pathname: "/new-story" as any,
                    params: {
                      childId: selectedChild.id,
                      childName: selectedChild.name,
                      theme: rec.theme,
                      themeName: rec.title,
                    },
                  });
                }}
                continueArc={
                  activeArcs.length > 0
                    ? {
                        title: activeArcs[0].title,
                        episodeNumber: activeArcs[0].currentEpisode,
                        totalEpisodes: activeArcs[0].totalEpisodes,
                        coverImageUrl: activeArcs[0].coverImageUrl,
                      }
                    : undefined
                }
                onContinuePress={
                  activeArcs.length > 0
                    ? () =>
                        router.push({
                          pathname: "/story-detail" as any,
                          params: {
                            arcId: activeArcs[0].id,
                            title: activeArcs[0].title,
                            childName: activeArcs[0].childName,
                            theme: activeArcs[0].theme,
                            serverArcId: activeArcs[0].serverArcId?.toString() || "",
                          },
                        })
                    : undefined
                }
              />
            </Animated.View>
          )}

          {/* ═══ 3. Continue Reading — Active Story Arcs ═══ */}
          {activeArcs.length > 0 && (
            <ScrollReveal
              scrollY={scrollY}
              threshold={400}
              reducedMotion={reducedMotion}
            >
              <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                📚 Continue Reading
              </Text>
              {activeArcs.map((arc) => {
                const themeData = STORY_THEMES.find((t) => t.id === arc.theme);
                const progress =
                  arc.totalEpisodes > 0
                    ? (arc.currentEpisode / arc.totalEpisodes) * 100
                    : 0;
                return (
                  <AnimatedPressable
                    key={arc.id}
                    style={[styles.arcCard, { backgroundColor: colors.card }]}
                    onPress={() =>
                      router.push({
                        pathname: "/story-detail" as any,
                        params: {
                          arcId: arc.id,
                          title: arc.title,
                          childName: arc.childName,
                          theme: arc.theme,
                          serverArcId: arc.serverArcId?.toString() || "",
                        },
                      })
                    }
                    accessibilityLabel={arc.title}
                    accessibilityRole="button"
                    accessibilityHint={`Episode ${arc.currentEpisode} of ${arc.totalEpisodes}. Double-tap to continue reading`}
                  >
                    {themeData?.image ? (
                      <Image source={{ uri: themeData.image }} style={styles.arcImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.arcImage, { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }]}>
                        <Text style={{ fontSize: 28 }}>{themeData?.emoji || "📖"}</Text>
                      </View>
                    )}
                    <View style={styles.arcInfo}>
                      <Text style={[styles.arcTitle, { color: colors.text }]}>{arc.title}</Text>
                      <Text style={[styles.arcMeta, { color: colors.textSecondary }]}>
                        Episode {arc.currentEpisode}/{arc.totalEpisodes} · {arc.themeName}
                      </Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                      </View>
                    </View>
                  </AnimatedPressable>
                );
              })}
              </View>
            </ScrollReveal>
          )}

          {/* ═══ 3.5. Subscription Banner (Free Users) ═══ */}
          {selectedChild &&
            !subState?.isSubscribed &&
            remainingStories <= 5 &&
            !bannerDismissed && (
              <SubscriptionBanner
                remainingStories={remainingStories}
                onDismiss={() => setBannerDismissed(true)}
                onUnlock={() =>
                  router.push({
                    pathname: "/settings" as any,
                    params: { tab: "subscription" },
                  })
                }
                reducedMotion={reducedMotion}
                colors={colors}
              />
            )}

          {/* ═══ 4. Recommended Stories — Illustrated Cards ═══ */}
          {selectedChild && (
            <ScrollReveal
              scrollY={scrollY}
              threshold={600}
              reducedMotion={reducedMotion}
            >
              <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ✨ Recommended for {selectedChild.name}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recScroll}
              >
                {RECOMMENDATIONS.map((rec) => (
                  <IllustratedRecCard
                    key={rec.id}
                    title={rec.title}
                    theme={rec.theme}
                    emoji={rec.emoji}
                    reason={rec.reason}
                    colors={colors}
                    onPress={() =>
                      router.push({
                        pathname: "/new-story" as any,
                        params: {
                          childId: selectedChild.id,
                          childName: selectedChild.name,
                          theme: rec.theme,
                          themeName: rec.title,
                        },
                      })
                    }
                  />
                ))}
              </ScrollView>
              </View>
            </ScrollReveal>
          )}

          {/* ═══ 5. Browse All Themes ═══ */}
          <ScrollReveal
            scrollY={scrollY}
            threshold={800}
            reducedMotion={reducedMotion}
          >
            <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.text }]}
              accessibilityRole="header"
            >
              🎨 Browse All Themes
            </Text>
            <View style={styles.themeGrid}>
              {STORY_THEMES.map((theme) => (
                <AnimatedPressable
                  key={theme.id}
                  style={styles.themeCard}
                  onPress={() => {
                    if (selectedChild) {
                      router.push({
                        pathname: "/new-story" as any,
                        params: {
                          childId: selectedChild.id,
                          childName: selectedChild.name,
                          theme: theme.id,
                          themeName: theme.name,
                        },
                      });
                    }
                  }}
                  accessibilityLabel={`${theme.name} theme`}
                  accessibilityRole="button"
                  accessibilityHint="Double-tap to browse stories in this theme"
                >
                  {theme.image ? (
                    <Image
                      source={{ uri: theme.image }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surface }]} />
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    locations={[0.3, 1]}
                    style={styles.themeGradient}
                  >
                    <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                    <Text style={styles.themeLabel}>{theme.name}</Text>
                  </LinearGradient>
                </AnimatedPressable>
              ))}
            </View>
            </View>
          </ScrollReveal>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </ScreenContainer>
    </BedtimeModeWrapper>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyRoot: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContent: { alignItems: "center", gap: 16, paddingHorizontal: 32 },
  emptyLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 8 },
  emptyTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    color: "rgba(255,255,255,0.7)",
  },
  emptyBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
    minHeight: 44,
    minWidth: 44,
  },
  emptyBtnText: { color: "#0A0E1A", fontSize: 17, fontWeight: "700" },

  // Main scroll
  scrollContent: { padding: 20 },

  // ── 1. Greeting ──
  greetingSection: { marginBottom: 16 },
  greetingTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  mascotEmoji: { fontSize: 32 },
  greetingTextWrap: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: "800", lineHeight: 30 },
  subGreeting: { fontSize: 14, marginTop: 3 },
  headerButtons: { flexDirection: "row", gap: 6, marginLeft: 8, marginTop: 2 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 44,
    minWidth: 44,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    minHeight: 44,
    minWidth: 44,
  },
  pointsEmoji: { fontSize: 20 },
  pointsLevel: { fontSize: 11, fontWeight: "600" },
  pointsValue: { fontSize: 14, fontWeight: "700" },

  // Child selector
  childScroll: { marginBottom: 14 },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 44,
  },
  childChipText: { fontSize: 14, fontWeight: "600" },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 14 },

  // ── 4. Illustrated Recommendation Cards ──
  recScroll: { paddingLeft: 2 },
  recCard: {
    width: REC_CARD_WIDTH,
    height: 200,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 44,
    minWidth: 44,
  },
  recImage: {
    ...StyleSheet.absoluteFillObject,
  },
  recImageFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  recFallbackEmoji: { fontSize: 48 },
  recOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 12,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  recReason: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },

  // ── 3. Continue Reading ──
  arcCard: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    minHeight: 44,
    minWidth: 44,
  },
  arcImage: { width: 80, height: 80 },
  arcInfo: { flex: 1, padding: 12, justifyContent: "center" },
  arcTitle: { fontSize: 15, fontWeight: "600" },
  arcMeta: { fontSize: 12, marginTop: 4 },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: 2,
    marginTop: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },

  // ── 5. Theme Grid ──
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard: {
    width: THEME_CARD_WIDTH,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 44,
    minWidth: 44,
  },
  themeGradient: { flex: 1, justifyContent: "flex-end", padding: 12 },
  themeEmoji: { fontSize: 28, marginBottom: 4 },
  themeLabel: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // ── Subscription Banner ──
  bannerContainer: {
    marginBottom: 20,
  },
  bannerGradient: {
    borderRadius: 12,
    padding: 14,
    paddingRight: 44, // Space for dismiss button
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    minHeight: 44,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    gap: 12,
  },
  bannerText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  bannerEmoji: {
    fontSize: 16,
  },
  bannerMessage: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  bannerCTA: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,215,0,0.2)",
  },
  bannerCTAText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFD700",
  },
  bannerDismiss: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerDismissIcon: {
    fontSize: 28,
    fontWeight: "300",
  },
});
