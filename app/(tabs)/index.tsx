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
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { STORY_THEMES, ASSETS } from "@/constants/assets";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import { getLocalStoryArcs, type LocalStoryArc } from "@/lib/story-store";
import Animated, {
  FadeIn,
  FadeInDown,
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
function WavingMascot() {
  const waveRotation = useSharedValue(0);

  useEffect(() => {
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
  }, []);

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
    <Pressable
      style={({ pressed }) => [
        styles.recCard,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.recImage} contentFit="cover" />
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
    </Pressable>
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

// ═════════════════════════════════════════════════════════════════
// Main Screen
// ═════════════════════════════════════════════════════════════════
export default function TonightScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [activeArcs, setActiveArcs] = useState<LocalStoryArc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subState, setSubState] = useState<SubscriptionState | null>(null);
  const [bedtimeState, setBedtimeState] = useState<BedtimeState | null>(null);

  // Gamification
  const gamificationStore = useGamificationStore();
  const [showAchievementToast, setShowAchievementToast] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<{
    name: string;
    icon: string;
    pointsReward: number;
    tier: "bronze" | "silver" | "gold" | "diamond";
  } | null>(null);

  const loadData = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);
    if (kids.length > 0) {
      const child =
        selectedChild && kids.find((k) => k.id === selectedChild.id)
          ? selectedChild
          : kids[0];
      setSelectedChild(child);
      const arcs = await getLocalStoryArcs();
      setActiveArcs(arcs.filter((a) => a.childId === child.id && a.status === "active"));
      await fetchGamificationProgress(child.id);
    } else {
      setSelectedChild(null);
      setActiveArcs([]);
    }
    const sub = await getSubscriptionState();
    setSubState(sub);
    const bedtime = await getBedtimeState();
    setBedtimeState(bedtime);
    setLoading(false);
  }, [selectedChild, gamificationStore]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const selectChild = async (child: LocalChild) => {
    setSelectedChild(child);
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
            <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContent}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.emptyLogo}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>Welcome to StoryWeaver</Text>
              <Text style={styles.emptySubtitle}>
                Create your first child profile to start generating personalized bedtime stories
              </Text>
              <Pressable
                onPress={() => router.push("/create-child")}
                style={({ pressed }) => [
                  styles.emptyBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.emptyBtnText}>Create Child Profile</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  // ─── Main Home Screen ───────────────────────────────────────
  return (
    <BedtimeModeWrapper isActive={bedtimeState?.isActive ?? false}>
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
          }
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
          <Animated.View entering={FadeIn.duration(600)} style={styles.greetingSection}>
            <View style={styles.greetingTopRow}>
              <View style={styles.greetingLeft}>
                {timeGreeting && <WavingMascot />}
                <View style={styles.greetingTextWrap}>
                  <Text style={[styles.greeting, { color: colors.text }]}>
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
                <Pressable
                  onPress={toggleBedtimeMode}
                  style={({ pressed }) => [
                    styles.headerBtn,
                    bedtimeState?.isActive && { backgroundColor: "rgba(255,215,0,0.15)" },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <IconSymbol
                    name="moon.fill"
                    size={22}
                    color={bedtimeState?.isActive ? "#FFD700" : colors.muted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => router.push("/settings" as any)}
                  style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
                >
                  <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
                </Pressable>
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
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📚 Continue Reading
              </Text>
              {activeArcs.map((arc) => {
                const themeData = STORY_THEMES.find((t) => t.id === arc.theme);
                const progress =
                  arc.totalEpisodes > 0
                    ? (arc.currentEpisode / arc.totalEpisodes) * 100
                    : 0;
                return (
                  <Pressable
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
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ═══ 4. Recommended Stories — Illustrated Cards ═══ */}
          {selectedChild && (
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
          )}

          {/* ═══ 5. Browse All Themes ═══ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🎨 Browse All Themes
            </Text>
            <View style={styles.themeGrid}>
              {STORY_THEMES.map((theme) => (
                <Pressable
                  key={theme.id}
                  style={({ pressed }) => [
                    styles.themeCard,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                  ]}
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
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
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
  },
  pointsEmoji: { fontSize: 20 },
  pointsLevel: { fontSize: 11, fontWeight: "600" },
  pointsValue: { fontSize: 14, fontWeight: "700" },

  // Child selector
  childScroll: { marginBottom: 14 },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
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
  },
  themeGradient: { flex: 1, justifyContent: "flex-end", padding: 12 },
  themeEmoji: { fontSize: 28, marginBottom: 4 },
  themeLabel: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
});
