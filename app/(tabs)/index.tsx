import { useCallback, useState } from "react";
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
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  getSubscriptionState,
  getRemainingFreeStories,
  type SubscriptionState,
} from "@/lib/subscription-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THEME_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

// Recommendation colors for cards
const REC_COLORS = [
  "#6C63FF", "#FF6B6B", "#48C9B0", "#F39C12", "#9B59B6",
  "#E74C3C", "#3498DB", "#2ECC71", "#E67E22", "#1ABC9C",
];

export default function TonightScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [activeArcs, setActiveArcs] = useState<LocalStoryArc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subState, setSubState] = useState<SubscriptionState | null>(null);

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
    } else {
      setSelectedChild(null);
      setActiveArcs([]);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const selectChild = async (child: LocalChild) => {
    setSelectedChild(child);
    const arcs = await getLocalStoryArcs();
    setActiveArcs(arcs.filter((a) => a.childId === child.id && a.status === "active"));
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  // Empty state - no children created yet
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
          className="flex-1 items-center justify-center"
          edges={["top", "bottom", "left", "right"]}
        >
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
        </ScreenContainer>
      </View>
    );
  }

  // AI-powered story recommendations
  const RECOMMENDATIONS = [
    { id: "r1", title: "The Moonlight Orchestra", theme: "music", emoji: "\u{1F3B5}", reason: "Combines music + imagination" },
    { id: "r2", title: "Captain Starfish's Treasure", theme: "ocean", emoji: "\u{1F30A}", reason: "Ocean adventure with pirate twist" },
    { id: "r3", title: "The Kindness Robot", theme: "robot", emoji: "\u{1F916}", reason: "Tech meets empathy" },
    { id: "r4", title: "Whispers in the Enchanted Garden", theme: "garden", emoji: "\u{1F33B}", reason: "Nature + mystery" },
    { id: "r5", title: "Dino Detective Academy", theme: "dinosaur", emoji: "\u{1F995}", reason: "Dinosaurs + problem solving" },
    { id: "r6", title: "The Fairy's Lost Melody", theme: "fairy", emoji: "\u{1F9DA}", reason: "Magical quest with music" },
    { id: "r7", title: "Arctic Penguin Express", theme: "arctic", emoji: "\u{1F427}", reason: "Cold weather adventure" },
    { id: "r8", title: "The Brave Little Knight", theme: "medieval", emoji: "\u{1F3F0}", reason: "Castle quest with courage" },
    { id: "r9", title: "Jungle Code Breakers", theme: "jungle", emoji: "\u{1F412}", reason: "Jungle + puzzles" },
    { id: "r10", title: "Candy Cloud Kingdom", theme: "candy", emoji: "\u{1F36D}", reason: "Sweet dreams adventure" },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        {/* Upgrade Banner */}
        {subState && subState.plan === "free" && !subState.trialActive && (
          <Animated.View entering={FadeInDown.duration(500)}>
            <Pressable
              onPress={() => router.push({ pathname: "/paywall" as any, params: { source: "home" } })}
              style={({ pressed }) => [
                styles.upgradeBanner,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFD700", "#FFA500"] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeBannerGradient}
              >
                <View style={styles.upgradeBannerContent}>
                  <Text style={styles.upgradeBannerEmoji}>{"\u{2728}"}</Text>
                  <View style={styles.upgradeBannerText}>
                    <Text style={styles.upgradeBannerTitle}>Unlock Unlimited Stories</Text>
                    <Text style={styles.upgradeBannerSub}>
                      {getRemainingFreeStories(subState) > 0
                        ? `${getRemainingFreeStories(subState)} free ${getRemainingFreeStories(subState) === 1 ? "story" : "stories"} left`
                        : "Subscribe for unlimited bedtime adventures"}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color="#0A0E1A" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Greeting */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: colors.text }]}>Tonight's Story</Text>
            <Pressable
              onPress={() => router.push("/settings" as any)}
              style={({ pressed }) => [
                styles.settingsBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <IconSymbol name="gearshape.fill" size={24} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
            {selectedChild
              ? `What adventure awaits ${selectedChild.name}?`
              : "Select a child to begin"}
          </Text>
        </Animated.View>

        {/* Child selector */}
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
                  selectedChild?.id === child.id && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.childChipText,
                    { color: colors.text },
                    selectedChild?.id === child.id && { color: "#0A0E1A" },
                  ]}
                >
                  {child.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Selected child card */}
        {selectedChild && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={[styles.childCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.childAvatar}>
              <Text style={styles.avatarEmoji}>{"\u{1F476}"}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={[styles.childName, { color: colors.text }]}>
                {selectedChild.name}
              </Text>
              <Text style={[styles.childAge, { color: colors.textSecondary }]}>
                Age {selectedChild.age}
                {selectedChild.interests.length > 0
                  ? ` \u00B7 ${selectedChild.interests.slice(0, 3).join(", ")}`
                  : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/create-child")}
              style={({ pressed }) => [
                styles.addChildBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.addChildBtnText}>+</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Recommendations */}
        {selectedChild && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {"\u2728"} Recommended for {selectedChild.name}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recScroll}
            >
              {RECOMMENDATIONS.map((rec, idx) => (
                <Pressable
                  key={rec.id}
                  style={[styles.recCard, { backgroundColor: colors.card }]}
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
                >
                  <View
                    style={[
                      styles.recImagePlaceholder,
                      { backgroundColor: REC_COLORS[idx % REC_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.recEmoji}>{rec.emoji}</Text>
                  </View>
                  <Text
                    style={[styles.recTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {rec.title}
                  </Text>
                  <Text style={[styles.recTheme, { color: colors.textSecondary }]}>
                    {rec.reason}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Continue Reading - Active Story Arcs */}
        {activeArcs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {"\u{1F4DA}"} Continue Reading
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
                      pathname: "/story-reader" as any,
                      params: {
                        episodeTitle: arc.title,
                        childName: arc.childName,
                        arcId: arc.id,
                      },
                    })
                  }
                >
                  {themeData?.image && (
                    <Image
                      source={{ uri: themeData.image }}
                      style={styles.arcImage}
                      contentFit="cover"
                    />
                  )}
                  <View style={styles.arcInfo}>
                    <Text style={[styles.arcTitle, { color: colors.text }]}>
                      {arc.title}
                    </Text>
                    <Text style={[styles.arcMeta, { color: colors.textSecondary }]}>
                      Episode {arc.currentEpisode}/{arc.totalEpisodes}{" "}
                      {"\u00B7"} {arc.themeName}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${progress}%` }]}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Browse All Themes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {"\u{1F3A8}"} Browse All Themes
          </Text>
          <View style={styles.themeGrid}>
            {STORY_THEMES.map((theme, idx) => (
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
                <Image
                  source={{ uri: theme.image }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
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
  );
}

const styles = StyleSheet.create({
  emptyRoot: {
    flex: 1,
  },
  emptyContent: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
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
  emptyBtnText: {
    color: "#0A0E1A",
    fontSize: 17,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
  },
  subGreeting: {
    fontSize: 15,
    marginTop: 4,
  },
  childScroll: {
    marginBottom: 16,
  },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  childChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  childAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,215,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 26,
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 18,
    fontWeight: "700",
  },
  childAge: {
    fontSize: 13,
    marginTop: 2,
  },
  addChildBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,215,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  addChildBtnText: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "600",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  recScroll: {
    marginLeft: -4,
  },
  recCard: {
    width: 150,
    marginRight: 12,
    borderRadius: 14,
    overflow: "hidden",
    marginLeft: 4,
  },
  recImagePlaceholder: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  recEmoji: {
    fontSize: 36,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: "600",
    padding: 10,
    paddingBottom: 4,
  },
  recTheme: {
    fontSize: 11,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  arcCard: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  arcImage: {
    width: 80,
    height: 80,
  },
  arcInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  arcTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  arcMeta: {
    fontSize: 12,
    marginTop: 4,
  },
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
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeCard: {
    width: THEME_CARD_WIDTH,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
  },
  themeGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  themeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Upgrade banner
  upgradeBanner: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  upgradeBannerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  upgradeBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeBannerEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A0E1A",
  },
  upgradeBannerSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0A0E1A",
    opacity: 0.7,
    marginTop: 2,
  },
});
