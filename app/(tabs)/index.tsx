import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Dimensions } from "react-native";
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
    } else { setSelectedChild(null); setActiveArcs([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const selectChild = async (child: LocalChild) => {
    setSelectedChild(child);
    const arcs = await getLocalStoryArcs();
    setActiveArcs(arcs.filter((a) => a.childId === child.id && a.status === "active"));
  };

  if (loading) {
    return (<ScreenContainer className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#FFD700" /></ScreenContainer>);
  }

  if (children.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <Image source={{ uri: ASSETS.bgOnboarding }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]} style={StyleSheet.absoluteFillObject} />
        <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>\u{2728}</Text>
          <Text style={styles.emptyTitle}>Welcome to StoryWeaver</Text>
          <Text style={styles.emptySubtitle}>Create your child's profile to start generating magical bedtime stories</Text>
          <Pressable onPress={() => router.push("/create-child")} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Create First Profile</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // AI-powered story recommendations
  const RECOMMENDATIONS = [
    { id: "r1", title: "The Moonlight Orchestra", theme: "music", emoji: "\u{1F3B5}", reason: "Combines music + imagination" },
    { id: "r2", title: "Captain Starfish's Treasure", theme: "ocean", emoji: "\u{1F3F4}", reason: "Ocean adventure with pirate twist" },
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}>

        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={[styles.greeting, { color: colors.text }]}>Tonight's Story</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {selectedChild ? `What adventure awaits ${selectedChild.name}?` : "Select a child to begin"}
          </Text>
        </Animated.View>

        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroll}>
            {children.map((child) => (
              <Pressable key={child.id} onPress={() => selectChild(child)}
                style={[styles.childChip, selectedChild?.id === child.id && { backgroundColor: colors.primary }]}>
                <Text style={[styles.childChipText, selectedChild?.id === child.id && { color: "#fff" }]}>
                  {child.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {selectedChild && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.childCard, { backgroundColor: colors.card }]}>
            <View style={styles.childAvatar}>
              <Text style={styles.avatarEmoji}>\u{1F476}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={[styles.childName, { color: colors.text }]}>{selectedChild.name}</Text>
              <Text style={[styles.childAge, { color: colors.textSecondary }]}>Age {selectedChild.age} \u{00B7} {selectedChild.interests.slice(0, 3).join(", ")}</Text>
            </View>
            <Pressable onPress={() => router.push("/create-child")} style={styles.addChildBtn}>
              <Text style={styles.addChildBtnText}>+</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Recommendations */}
        {selectedChild && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ Recommended for {selectedChild.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recScroll}>
              {RECOMMENDATIONS.map((rec, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.recCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push({ pathname: "/new-story", params: { childId: selectedChild.id, theme: rec.theme, educationalValue: rec.educationalValue } })}
                >
                  <View style={[styles.recImagePlaceholder, { backgroundColor: rec.color }]}>
                    <Text style={styles.recEmoji}>{rec.emoji}</Text>
                  </View>
                  <Text style={[styles.recTitle, { color: colors.text }]} numberOfLines={2}>{rec.title}</Text>
                  <Text style={[styles.recTheme, { color: colors.textSecondary }]}>{rec.theme}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Story Arcs */}
        {storyArcs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📚 Continue Reading</Text>
            {storyArcs.map((arc) => (
              <Pressable
                key={arc.id}
                style={[styles.arcCard, { backgroundColor: colors.card }]}
                onPress={() => router.push({ pathname: "/story-arc", params: { id: arc.id } })}
              >
                {arc.coverImageUrl && (
                  <Image source={{ uri: arc.coverImageUrl }} style={styles.arcImage} />
                )}
                <View style={styles.arcInfo}>
                  <Text style={[styles.arcTitle, { color: colors.text }]}>{arc.title}</Text>
                  <Text style={[styles.arcMeta, { color: colors.textSecondary }]}>
                    Episode {arc.currentEpisode}/{arc.totalEpisodes} · {arc.theme}
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(arc.currentEpisode / arc.totalEpisodes) * 100}%` }]} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Browse Themes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎨 Browse All Themes</Text>
          <View style={styles.themeGrid}>
            {STORY_THEMES.map((theme, idx) => (
              <Pressable
                key={idx}
                style={[styles.themeCard, { backgroundColor: colors.card }]}
                onPress={() => {
                  if (selectedChild) {
                    router.push({ pathname: "/new-story", params: { childId: selectedChild.id, theme: theme.label } });
                  }
                }}
              >
                <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                <Text style={[styles.themeLabel, { color: colors.text }]}>{theme.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyContent: {
    alignItems: "center",
    gap: 16,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.7,
  },
  ctaButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  greetingSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
  },
  subGreeting: {
    fontSize: 15,
    marginTop: 4,
    opacity: 0.7,
  },
  childScroll: {
    marginBottom: 16,
  },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  childChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 18,
    fontWeight: "600",
  },
  childAge: {
    fontSize: 13,
    marginTop: 2,
  },
  addChildBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  addChildBtnText: {
    fontSize: 20,
    color: "#fff",
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
    opacity: 0.6,
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#6C63FF",
    borderRadius: 2,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  themeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
