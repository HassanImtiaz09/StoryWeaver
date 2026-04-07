import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type StoryPage = {
  id: number;
  pageNumber: number;
  storyText: string;
  imageUrl?: string;
  imagePrompt?: string;
  audioUrl?: string;
  mood?: string;
  characters?: { name: string; traits: string[]; voiceRole?: string }[];
};

const MOOD_COLORS: Record<string, string[]> = {
  exciting: ["#FF6B6B", "#FF8E8E"],
  calm: ["#6C63FF", "#8B83FF"],
  mysterious: ["#2D1B69", "#5B2C8E"],
  adventurous: ["#FFD93D", "#FFE66D"],
  warm: ["#FF9A56", "#FFBE76"],
  funny: ["#4ECDC4", "#6EE7DE"],
  reassuring: ["#A8E6CF", "#DCEDC1"],
  triumphant: ["#FFD700", "#FFA500"],
};

const MOOD_LABELS: Record<string, string> = {
  exciting: "\u{26A1} Exciting",
  calm: "\u{1F31C} Calm",
  mysterious: "\u{1F52E} Mysterious",
  adventurous: "\u{1F9ED} Adventurous",
  warm: "\u{2728} Warm",
  funny: "\u{1F604} Funny",
  reassuring: "\u{1F49A} Reassuring",
  triumphant: "\u{1F3C6} Triumphant",
};

export default function StoryReaderScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    episodeId: string;
    arcId: string;
    title?: string;
  }>();

  const flatListRef = useRef<FlatList>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"elevenlabs" | "device">("device");
  const [generatingImageForPage, setGeneratingImageForPage] = useState<number | null>(null);
  const [generatingAudioForPage, setGeneratingAudioForPage] = useState<number | null>(null);

  // tRPC
  const pagesQuery = trpc.pages.list.useQuery(
    { episodeId: parseInt(params.episodeId ?? "0", 10) },
    { enabled: !!params.episodeId }
  );
  const generateImageMutation = trpc.pages.generateImage.useMutation();
  const generateAudioMutation = trpc.pages.generateAudio.useMutation();
  useEffect(() => {
    if (pagesQuery.data) {
      setPages(
        pagesQuery.data.map((p: any) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          storyText: p.storyText ?? "",
          imageUrl: p.imageUrl,
          imagePrompt: p.imagePrompt,
          audioUrl: p.audioUrl,
          mood: p.mood,
          characters: p.characters,
        }))
      );
      setIsLoading(false);
    }
  }, [pagesQuery.data]);

  // ─── Auto-generate image when page comes into view ───────────
  useEffect(() => {
    if (pages.length === 0) return;
    const page = pages[currentPage];
    if (!page) return;

    // Auto-generate image if missing
    if (!page.imageUrl && generatingImageForPage !== page.pageNumber) {
      generateImageForPage(page);
    }
  }, [currentPage, pages]);

  const generateImageForPage = useCallback(
    async (page: StoryPage) => {
      setGeneratingImageForPage(page.pageNumber);
      try {
        const result = await generateImageMutation.mutateAsync({
          pageId: page.id,
        });
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id ? { ...p, imageUrl: result.imageUrl } : p
          )
        );
      } catch (err) {
        console.log("Image generation failed, using fallback");
      } finally {
        setGeneratingImageForPage(null);
      }
    },
    [generateImageMutation]
  );

  // ─── Audio ───────────────────────────────────────────────────
  const getDisplayText = (raw: string): string => {
    return raw
      .replace(/^NARRATOR:\s*/gm, "")
      .replace(/^[A-Z_]+:\s*/gm, "")
      .trim();
  };

  const playAudio = useCallback(
    async (page: StoryPage) => {
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
        return;
      }

      if (voiceMode === "elevenlabs" && !page.audioUrl) {
        // Generate ElevenLabs audio
        setGeneratingAudioForPage(page.pageNumber);
        try {
          const result = await generateAudioMutation.mutateAsync({ pageId: page.id });
          setPages((prev) =>
            prev.map((p) =>
              p.id === page.id ? { ...p, audioUrl: result.audioUrl } : p
            )
          );
          // TODO: Play the audio URL via expo-av
          setGeneratingAudioForPage(null);
          return;
        } catch {
          setGeneratingAudioForPage(null);
        }
      }

      // Fallback to device TTS
      const text = getDisplayText(page.storyText);
      setIsSpeaking(true);
      Speech.speak(text, {
        rate: 0.85,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    },
    [isSpeaking, voiceMode, generateAudioMutation]
  );

  const handlePrevPage = () => {
    if (currentPage > 0) {
      Speech.stop();
      setIsSpeaking(false);
      flatListRef.current?.scrollToIndex({ index: currentPage - 1, animated: true });
    }
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      Speech.stop();
      setIsSpeaking(false);
      flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    }
  };

  const handleFinish = () => {
    Speech.stop();
    router.push({
      pathname: "/print-book",
      params: { arcId: params.arcId, episodeId: params.episodeId },
    });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentPage(viewableItems[0].index ?? 0);
    }
  }).current;

  // ─── Render Page ─────────────────────────────────────────────
  const renderPage = useCallback(
    ({ item, index }: { item: StoryPage; index: number }) => {
      const moodColors = MOOD_COLORS[item.mood ?? "warm"] ?? MOOD_COLORS.warm;
      const moodLabel = MOOD_LABELS[item.mood ?? "warm"] ?? "";
      const displayText = getDisplayText(item.storyText);
      const isLastPage = index === pages.length - 1;
      const isGeneratingImage = generatingImageForPage === item.pageNumber;
      const isGeneratingAudio = generatingAudioForPage === item.pageNumber;

      return (
        <View style={styles.pageContainer}>
          {/* Illustration */}
          <View style={styles.illustrationWrap}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.illustration} resizeMode="cover" />
            ) : isGeneratingImage ? (
              <LinearGradient colors={moodColors} style={styles.illustrationPlaceholder}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.genLabel}>Creating illustration...</Text>
              </LinearGradient>
            ) : (
              <LinearGradient colors={moodColors} style={styles.illustrationPlaceholder}>
                <Text style={styles.placeholderEmoji}>{"\u{1F3A8}"}</Text>
                <Pressable onPress={() => generateImageForPage(item)} style={styles.genBtn}>
                  <Text style={styles.genBtnText}>Generate Illustration</Text>
                </Pressable>
              </LinearGradient>
            )}

            {/* Mood badge */}
            {moodLabel ? (
              <View style={[styles.moodBadge, { backgroundColor: moodColors[0] + "CC" }]}>
                <Text style={styles.moodBadgeText}>{moodLabel}</Text>
              </View>
            ) : null}
          </View>

          {/* Story Text */}
          <ScrollableStoryText text={displayText} color={colors.text} secondaryColor={colors.textSecondary} />

          {/* Page number */}
          <Text style={[styles.pageNumber, { color: colors.textSecondary }]}>
            Page {item.pageNumber} of {pages.length}
          </Text>

          {/* Controls */}
          <View style={styles.controls}>
            <Pressable onPress={handlePrevPage} disabled={index === 0} style={styles.navBtn}>
              <Text style={[styles.navText, { opacity: index === 0 ? 0.3 : 1, color: colors.text }]}>
                {"\u{25C0}"}
              </Text>
            </Pressable>

            <Pressable onPress={() => playAudio(item)} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
              {isGeneratingAudio ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.playIcon}>{isSpeaking ? "\u{23F8}" : "\u{25B6}\u{FE0F}"}</Text>
              )}
            </Pressable>

            {isLastPage ? (
              <Pressable onPress={handleFinish} style={[styles.finishBtn, { backgroundColor: "#4ECDC4" }]}>
                <Text style={styles.finishText}>{"\u{1F4D6}"} Print Book</Text>
              </Pressable>
            ) : (
              <Pressable onPress={handleNextPage} style={styles.navBtn}>
                <Text style={[styles.navText, { color: colors.text }]}>{"\u{25B6}"}</Text>
              </Pressable>
            )}
          </View>

          {/* Voice mode toggle */}
          <View style={styles.voiceToggle}>
            <Pressable
              onPress={() => setVoiceMode("device")}
              style={[styles.voiceOption, voiceMode === "device" && { backgroundColor: colors.primary + "20" }]}
            >
              <Text style={[styles.voiceOptionText, { color: voiceMode === "device" ? colors.primary : colors.textSecondary }]}>
                {"\u{1F4F1}"} Device Voice
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVoiceMode("elevenlabs")}
              style={[styles.voiceOption, voiceMode === "elevenlabs" && { backgroundColor: colors.primary + "20" }]}
            >
              <Text style={[styles.voiceOptionText, { color: voiceMode === "elevenlabs" ? colors.primary : colors.textSecondary }]}>
                {"\u{1F3A4}"} HD Voices
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, pages.length, currentPage, isSpeaking, voiceMode, generatingImageForPage, generatingAudioForPage]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your story...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: colors.primary }]}>{"\u{2715}"}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {params.title ?? "Story"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentPage && styles.dotActive, { backgroundColor: i === currentPage ? colors.primary : colors.muted }]}
          />
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        bounces={false}
      />
    </SafeAreaView>
  );
}

// ─── Scrollable Story Text Component ───────────────────────────
function ScrollableStoryText({ text, color, secondaryColor }: { text: string; color: string; secondaryColor: string }) {
  return (
    <Animated.ScrollView
      entering={FadeInDown.delay(300).duration(500)}
      style={styles.textScroll}
      contentContainerStyle={styles.textContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.storyText, { color }]}>{text}</Text>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  closeText: { fontSize: 20, fontWeight: "600" },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "600" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18, borderRadius: 3 },
  // Page
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 16,
  },
  illustrationWrap: {
    height: SCREEN_HEIGHT * 0.32,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  illustration: { width: "100%", height: "100%" },
  illustrationPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderEmoji: { fontSize: 48, marginBottom: 8 },
  genLabel: { color: "#fff", fontSize: 14, marginTop: 8 },
  genBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  genBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  moodBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  moodBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  // Text
  textScroll: { flex: 1, marginBottom: 8 },
  textContent: { paddingVertical: 8 },
  storyText: { fontSize: 17, lineHeight: 28 },
  pageNumber: { textAlign: "center", fontSize: 12, marginBottom: 8 },
  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 8,
  },
  navBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  navText: { fontSize: 24 },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: { fontSize: 24 },
  finishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  finishText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  // Voice toggle
  voiceToggle: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 8,
  },
  voiceOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  voiceOptionText: { fontSize: 13, fontWeight: "500" },
});
