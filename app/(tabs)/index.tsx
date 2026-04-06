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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THEME_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

export default function TonightScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [activeArcs, setActiveArcs] = useState<LocalStoryArc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);
    if (kids.length > 0) {
      const child = selectedChild && kids.find((k) => k.id === selectedChild.id) ? selectedChild : kids[0];
      setSelectedChild(child);
      const arcs = await getLocalStoryArcs();
      setActiveArcs(arcs.filter((a) => a.childId === child.id && a.status === "active"));
    } else {
      setSelectedChild(null);
      setActiveArcs([]);
    }
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

  // Empty state with rich background
  if (children.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <Image
          source={{ uri: ASSETS.bgOnboarding }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(10,14,26,0.3)", "rgba(10,14,26,0.85)", "rgba(10,14,26,0.98)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <ScreenContainer
          containerClassName="bg-transparent"
          edges={["top", "bottom", "left", "right"]}
          className="flex-1"
        >
          <View style={styles.emptyContainer}>
            <Animated.View entering={FadeIn.duration(600)} style={styles.emptyContent}>
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
                  styles.createButton,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.createButtonText}>Create Child Profile</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Good evening</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Tonight's Story
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/create-child")}
            style={({ pressed }) => [
              styles.addChildButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: "#FFD700", fontSize: 22 }}>+</Text>
          </Pressable>
        </Animated.View>

        {/* Child Selector */}
        {children.length > 1 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => selectChild(child)}
                  style={({ pressed }) => [
                    styles.childChip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selectedChild?.id === child.id && styles.childChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.childAvatar, selectedChild?.id === child.id && styles.childAvatarActive]}>
                    <Text style={[styles.childAvatarText, selectedChild?.id === child.id && { color: "#0A0E1A" }]}>{child.name[0]}</Text>
                  </View>
                  <Text
                    style={[
                      styles.childChipName,
                      { color: colors.foreground },
                      selectedChild?.id === child.id && { color: "#0A0E1A" },
                    ]}
                  >
                    {child.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Active Story - Continue Reading (large hero card) */}
        {activeArcs.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Continue Reading
            </Text>
            {activeArcs.map((arc) => {
              const themeData = STORY_THEMES.find((t) => t.id === arc.theme);
              return (
                <Pressable
                  key={arc.id}
                  onPress={() => {
                    router.push({
                      pathname: "/story-reader" as any,
                      params: {
                        episodeTitle: arc.title,
                        childName: arc.childName,
                        arcId: arc.id,
                        theme: arc.theme,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.continueCard,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Image
                    source={{ uri: themeData?.image }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.92)"]}
                    locations={[0, 0.45, 1]}
                    style={styles.continueGradient}
                  >
                    <View style={styles.continueBadge}>
                      <Text style={styles.continueBadgeText}>
                        Episode {arc.currentEpisode + 1} of {arc.totalEpisodes}
                      </Text>
                    </View>
                    <Text style={styles.continueTitle}>{arc.title}</Text>
                    <Text style={styles.continueSubtitle}>
                      Teaching {arc.educationalValueName}
                    </Text>
                    <View style={styles.readButton}>
                      <Text style={styles.readButtonText}>Read Tonight's Episode</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {/* Active Child Card */}
        {selectedChild && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={[styles.activeChildCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.activeChildInfo}>
                <View style={styles.activeChildAvatar}>
                  <Text style={styles.activeChildAvatarText}>{selectedChild.name[0]}</Text>
                </View>
                <View style={styles.activeChildDetails}>
                  <Text style={[styles.activeChildName, { color: colors.foreground }]}>
                    {selectedChild.name}'s Universe
                  </Text>
                  <Text style={[styles.activeChildAge, { color: colors.muted }]}>
                    Age {selectedChild.age} | {selectedChild.interests.slice(0, 3).join(", ") || "No interests set"}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Start a New Story Arc */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Start a New Adventure
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Choose a theme for {selectedChild?.name || "your child"}'s next story series
          </Text>
        </Animated.View>

        {/* Theme Grid - Large immersive cards */}
        <View style={styles.themeGrid}>
          {STORY_THEMES.map((theme, index) => (
            <Animated.View
              key={theme.id}
              entering={FadeInRight.delay(350 + index * 80).duration(400)}
              style={styles.themeCardWrapper}
            >
              <Pressable
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
                style={({ pressed }) => [
                  styles.themeCard,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Image
                  source={{ uri: theme.image }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={300}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.75)"]}
                  locations={[0.35, 1]}
                  style={styles.themeOverlay}
                >
                  <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                  <Text style={styles.themeName}>{theme.name}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  addChildButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  childSelector: {
    marginBottom: 16,
  },
  childChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 10,
    gap: 8,
  },
  childChipActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  childAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarActive: {
    backgroundColor: "rgba(10, 14, 26, 0.15)",
  },
  childAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFD700",
  },
  childChipName: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Continue reading hero card
  continueCard: {
    borderRadius: 24,
    overflow: "hidden",
    height: 240,
    marginTop: 12,
    marginBottom: 8,
  },
  continueGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  continueBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  continueBadgeText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
  },
  continueTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  continueSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 14,
  },
  readButton: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  readButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
  // Active child card
  activeChildCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  activeChildInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  activeChildAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  activeChildAvatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFD700",
  },
  activeChildDetails: {
    flex: 1,
  },
  activeChildName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  activeChildAge: {
    fontSize: 13,
  },
  // Theme grid - tall immersive cards
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  themeCardWrapper: {
    width: THEME_CARD_WIDTH,
  },
  themeCard: {
    borderRadius: 20,
    overflow: "hidden",
    height: 200,
  },
  themeOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  themeEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  themeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Empty state
  emptyRoot: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 32,
    paddingBottom: 80,
  },
  emptyContent: {
    alignItems: "center",
    gap: 16,
  },
  emptyLogo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#FFFFFF",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
    color: "rgba(255,255,255,0.7)",
  },
  createButton: {
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  createButtonText: {
    color: "#0A0E1A",
    fontSize: 18,
    fontWeight: "700",
  },
});
