import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { STORY_THEMES } from "@/constants/assets";
import { getLocalStoryArcs, updateLocalStoryArc, type LocalStoryArc } from "@/lib/story-store";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { StoryTitle, SectionHeader, BodyText, CaptionText, CardTitle } from "@/components/styled-text";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 260;

type GenerationStep = "idle" | "generating_episode" | "done";

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: "",
  generating_episode: "Writing the next chapter...",
  done: "Episode ready!",
};

type EpisodeItem = {
  id: number;
  episodeNumber: number;
  title: string | null;
  summary: string | null;
  coverImageUrl: string | null;
  isRead: boolean | null;
  fullAudioUrl: string | null;
  musicUrl: string | null;
};

export default function StoryDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    arcId: string;
    title?: string;
    childName?: string;
    theme?: string;
    serverArcId?: string;
  }>();

  const [localArc, setLocalArc] = useState<LocalStoryArc | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Inline episode generation state
  const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");
  const isGenerating = generationStep !== "idle" && generationStep !== "done";

  // Determine the server arc ID for tRPC queries
  const serverArcId = params.serverArcId
    ? parseInt(params.serverArcId, 10)
    : localArc?.serverArcId ?? parseInt(params.arcId, 10);
  const hasServerArc = !!serverArcId && !isNaN(serverArcId) && serverArcId > 0;

  // tRPC mutation for inline episode generation
  const generateEpisodeMutation = trpc.episodes.generate.useMutation();

  // Load local arc data
  const loadLocalArc = useCallback(async () => {
    const arcs = await getLocalStoryArcs();
    const found = arcs.find((a) => a.id === params.arcId);
    if (found) setLocalArc(found);
  }, [params.arcId]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoadingLocal(true);
        await loadLocalArc();
        setLoadingLocal(false);
      })();
    }, [loadLocalArc])
  );

  // Fetch episodes from server
  const episodesQuery = trpc.episodes.list.useQuery(
    { arcId: serverArcId },
    { enabled: hasServerArc }
  );

  // Fetch arc details from server
  const arcQuery = trpc.storyArcs.get.useQuery(
    { arcId: serverArcId },
    { enabled: hasServerArc }
  );

  const episodes: EpisodeItem[] = useMemo(() => {
    if (episodesQuery.data) {
      return (episodesQuery.data as EpisodeItem[]).sort(
        (a, b) => a.episodeNumber - b.episodeNumber
      );
    }
    return [];
  }, [episodesQuery.data]);

  const serverArc = arcQuery.data;
  const arcTitle = serverArc?.title || localArc?.title || params.title || "Story";
  const childName = localArc?.childName || params.childName || "";
  const themeId = localArc?.theme || params.theme || "";
  const themeData = STORY_THEMES.find((t) => t.id === themeId);
  const synopsis = serverArc?.synopsis || localArc?.synopsis || null;
  const totalEpisodes = serverArc?.totalEpisodes || localArc?.totalEpisodes || 0;
  const readCount = episodes.filter((e) => e.isRead).length;
  const progress = totalEpisodes > 0 ? (readCount / totalEpisodes) * 100 : 0;
  const nextEpisodeNumber = episodes.length + 1;
  const canGenerateMore = episodes.length < totalEpisodes;

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocalArc();
    if (hasServerArc) {
      await Promise.all([
        episodesQuery.refetch(),
        arcQuery.refetch(),
      ]);
    }
    setRefreshing(false);
  }, [loadLocalArc, hasServerArc, episodesQuery, arcQuery]);

  const handleEpisodePress = async (episode: EpisodeItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Update local arc's current episode
    if (localArc) {
      await updateLocalStoryArc(localArc.id, {
        currentEpisode: episode.episodeNumber,
      });
    }
    router.push({
      pathname: "/story-reader" as any,
      params: {
        episodeId: episode.id.toString(),
        arcId: serverArcId.toString(),
        title: episode.title || `Episode ${episode.episodeNumber}`,
        childName,
      },
    });
  };

  // Inline episode generation
  const handleGenerateEpisode = async () => {
    if (!hasServerArc || isGenerating) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      setGenerationStep("generating_episode");

      const episodeResult = await generateEpisodeMutation.mutateAsync({
        arcId: serverArcId,
        episodeNumber: nextEpisodeNumber,
      });

      setGenerationStep("done");

      // Update local arc's current episode
      if (localArc) {
        await updateLocalStoryArc(localArc.id, {
          currentEpisode: nextEpisodeNumber,
        });
        await loadLocalArc();
      }

      // Refresh the episodes list
      await episodesQuery.refetch();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Reset generation state after a brief delay so user sees "done"
      setTimeout(() => {
        setGenerationStep("idle");
      }, 1500);
    } catch (error) {
      console.error("Episode generation failed:", error);
      setGenerationStep("idle");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        "Generation Failed",
        "Could not generate the next episode. Please check your connection and try again.",
        [{ text: "OK" }]
      );
    }
  };

  const isLoading = loadingLocal || (hasServerArc && episodesQuery.isLoading);

  if (isLoading) {
    return (
      <ScreenContainer
        edges={["top", "bottom", "left", "right"]}
        className="flex-1 items-center justify-center"
      >
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading story...
        </Text>
      </ScreenContainer>
    );
  }

  const renderEpisode = ({ item, index }: { item: EpisodeItem; index: number }) => {
    const isRead = item.isRead ?? false;
    const hasAudio = !!item.fullAudioUrl;
    const hasMusic = !!item.musicUrl;

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <Pressable
          onPress={() => handleEpisodePress(item)}
          style={({ pressed }) => [
            styles.episodeCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          {/* Episode number badge */}
          <View
            style={[
              styles.episodeNumberBadge,
              isRead && styles.episodeNumberBadgeRead,
            ]}
          >
            {isRead ? (
              <IconSymbol name="checkmark.circle.fill" size={20} color="#4ADE80" />
            ) : (
              <Text style={styles.episodeNumberText}>{item.episodeNumber}</Text>
            )}
          </View>

          {/* Episode info */}
          <View style={styles.episodeInfo}>
            <CardTitle numberOfLines={2}>
              {item.title || `Episode ${item.episodeNumber}`}
            </CardTitle>
            {item.summary && (
              <BodyText
                style={{ color: colors.muted, marginTop: 4 }}
                numberOfLines={2}
              >
                {item.summary}
              </BodyText>
            )}
            <View style={styles.episodeBadges}>
              {hasAudio && (
                <View style={styles.badge}>
                  <IconSymbol name="speaker.wave.2.fill" size={10} color="#FFD700" />
                  <Text style={styles.badgeText}>Narrated</Text>
                </View>
              )}
              {hasMusic && (
                <View style={styles.badge}>
                  <Text style={styles.badgeEmoji}>{"\u{1F3B5}"}</Text>
                  <Text style={styles.badgeText}>Music</Text>
                </View>
              )}
              {isRead && (
                <View style={[styles.badge, styles.readBadge]}>
                  <Text style={styles.readBadgeText}>Read</Text>
                </View>
              )}
            </View>
          </View>

          {/* Play arrow */}
          <View style={styles.playArrow}>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Hero section */}
      <View style={styles.heroContainer}>
        {themeData?.image ? (
          <Image
            source={{ uri: themeData.image }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: colors.surface }]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(10,14,26,0.6)", "rgba(10,14,26,0.95)"]}
          locations={[0, 0.5, 1]}
          style={styles.heroGradient}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.heroContent}>
            <Animated.View entering={FadeIn.duration(600)}>
              {themeData?.emoji && (
                <Text style={styles.heroEmoji}>{themeData.emoji}</Text>
              )}
              <StoryTitle style={{ lineHeight: 32 }} numberOfLines={3}>
                {arcTitle}
              </StoryTitle>
              {childName ? (
                <BodyText style={{ color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                  A story for {childName}
                </BodyText>
              ) : null}
            </Animated.View>
          </View>
        </LinearGradient>
      </View>

      {/* Synopsis */}
      {synopsis && (
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.synopsisContainer}
        >
          <BodyText style={{ color: colors.muted }}>
            {synopsis}
          </BodyText>
        </Animated.View>
      )}

      {/* Progress bar */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.progressSection}
      >
        <View style={styles.progressHeader}>
          <SectionHeader>Progress</SectionHeader>
          <CaptionText>
            {readCount}/{totalEpisodes} episodes
          </CaptionText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: "rgba(255,215,0,0.12)" }]}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </Animated.View>

      {/* Episodes header */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={styles.episodesHeader}
      >
        <SectionHeader>
          {"\u{1F4D6}"} Episodes
        </SectionHeader>
        {episodes.length === 0 && !episodesQuery.isLoading && (
          <Text style={[styles.noEpisodesText, { color: colors.muted }]}>
            No episodes generated yet. Tap the button below to generate your first episode!
          </Text>
        )}
      </Animated.View>
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      {/* Inline Generate Episode button */}
      {canGenerateMore && hasServerArc && (
        <Animated.View entering={FadeInDown.delay(episodes.length * 80 + 200).duration(400)}>
          <Pressable
            onPress={handleGenerateEpisode}
            disabled={isGenerating}
            style={({ pressed }) => [
              styles.generateBtn,
              isGenerating && styles.generateBtnDisabled,
              pressed && !isGenerating && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <LinearGradient
              colors={
                isGenerating
                  ? ["rgba(255,215,0,0.08)", "rgba(255,215,0,0.03)"]
                  : ["rgba(255,215,0,0.18)", "rgba(255,215,0,0.06)"]
              }
              style={styles.generateBtnGradient}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <IconSymbol name="sparkles" size={22} color="#FFD700" />
              )}
              <View style={styles.generateBtnTextContainer}>
                {isGenerating ? (
                  <>
                    <Text style={[styles.generateBtnTitle, { color: "#FFD700" }]}>
                      {STEP_MESSAGES[generationStep]}
                    </Text>
                    <Text style={[styles.generateBtnSub, { color: colors.muted }]}>
                      This may take a moment...
                    </Text>
                  </>
                ) : generationStep === "done" ? (
                  <>
                    <Text style={[styles.generateBtnTitle, { color: "#4ADE80" }]}>
                      {"\u2713"} Episode Ready!
                    </Text>
                    <Text style={[styles.generateBtnSub, { color: colors.muted }]}>
                      Tap an episode above to start reading
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.generateBtnTitle, { color: colors.foreground }]}>
                      Generate Episode {nextEpisodeNumber}
                    </Text>
                    <Text style={[styles.generateBtnSub, { color: colors.muted }]}>
                      Episode {nextEpisodeNumber} of {totalEpisodes}
                    </Text>
                  </>
                )}
              </View>
              {!isGenerating && generationStep !== "done" && (
                <IconSymbol name="chevron.right" size={16} color="#FFD700" />
              )}
            </LinearGradient>
          </Pressable>

          {/* Animated progress indicator during generation */}
          {isGenerating && (
            <View style={styles.generationProgress}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={[styles.progressDot, styles.progressDotInactive]} />
            </View>
          )}
        </Animated.View>
      )}

      {/* All episodes generated message */}
      {!canGenerateMore && episodes.length > 0 && (
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <View style={styles.allDoneContainer}>
            <Text style={styles.allDoneEmoji}>{"\u2728"}</Text>
            <Text style={[styles.allDoneText, { color: colors.muted }]}>
              All {totalEpisodes} episodes have been generated!
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Print book button for completed arcs */}
      {localArc?.status === "completed" && (
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/print-book" as any,
                params: { arcId: params.arcId, title: arcTitle },
              })
            }
            style={({ pressed }) => [
              styles.printBookBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <IconSymbol name="printer.fill" size={20} color="#0A0E1A" />
            <Text style={styles.printBookBtnText}>Print as Book</Text>
          </Pressable>
        </Animated.View>
      )}

      <View style={{ height: 100 }} />
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <FlatList
        data={episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
            colors={["#FFD700"]}
            progressBackgroundColor="rgba(10,14,26,0.9)"
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  heroContainer: {
    height: HERO_HEIGHT,
    width: "100%",
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  heroContent: {
    gap: 6,
  },
  heroEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 32,
  },
  heroChild: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  synopsisContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  synopsisText: {
    fontSize: 14,
    lineHeight: 22,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  progressCount: {
    fontSize: 13,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFD700",
  },
  episodesHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  episodesTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  noEpisodesText: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  episodeCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  episodeNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,215,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  episodeNumberBadgeRead: {
    backgroundColor: "rgba(74,222,128,0.15)",
  },
  episodeNumberText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
  },
  episodeInfo: {
    flex: 1,
    gap: 4,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  episodeSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  episodeBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255,215,0,0.1)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFD700",
  },
  badgeEmoji: {
    fontSize: 10,
  },
  readBadge: {
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  readBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4ADE80",
  },
  playArrow: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  generateBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    overflow: "hidden",
  },
  generateBtnDisabled: {
    borderColor: "rgba(255,215,0,0.12)",
  },
  generateBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  generateBtnTextContainer: {
    flex: 1,
  },
  generateBtnTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  generateBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  generationProgress: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: "#FFD700",
  },
  progressDotInactive: {
    backgroundColor: "rgba(255,215,0,0.2)",
  },
  allDoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  allDoneEmoji: {
    fontSize: 18,
  },
  allDoneText: {
    fontSize: 14,
    fontWeight: "500",
  },
  printBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 16,
  },
  printBookBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0E1A",
  },
});
