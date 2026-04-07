import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet, Dimensions, Platform,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ASSETS } from "@/constants/assets";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { Audio, type AVPlaybackStatus } from "expo-av";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { trpc } from "@/lib/trpc";

const { width, height: SCREEN_HEIGHT } = Dimensions.get("window");

type StoryPage = {
  id: number;
  pageNumber: number;
  storyText: string;
  imageUrl: string | null;
  audioUrl: string | null;
  mood: string;
  characters: string | null;
};

const DEMO_PAGES: StoryPage[] = [
  { id: 1, pageNumber: 1, storyText: "NARRATOR: Once upon a time, in a land where the stars sang lullabies and the moon painted silver paths across the sky, there lived a brave little explorer.\n\nNARRATOR: Every night, when the world grew quiet and the fireflies began their dance, a magical doorway would appear at the foot of the bed.", imageUrl: null, audioUrl: null, mood: "mysterious", characters: null },
  { id: 2, pageNumber: 2, storyText: 'NARRATOR: Tonight, the doorway shimmered with golden light, and from within came the softest whisper.\n\nMAGICAL_DOOR: "Are you ready for an adventure?"\n\nNARRATOR: With a deep breath and a heart full of courage, our little hero stepped through the doorway and into a world of wonder.', imageUrl: null, audioUrl: null, mood: "exciting", characters: null },
  { id: 3, pageNumber: 3, storyText: 'NARRATOR: The sky was painted in swirls of purple and blue, dotted with stars that twinkled like tiny diamonds.\n\nWISE_OWL: "Welcome, young traveler! I\'ve been waiting for someone brave like you."', imageUrl: null, audioUrl: null, mood: "adventurous", characters: JSON.stringify([{ name: "WISE_OWL", traits: "wise old owl", voiceRole: "animal_large" }]) },
  { id: 4, pageNumber: 4, storyText: 'NARRATOR: Together, they journeyed through a meadow of flowers that hummed gentle melodies.\n\nWISE_OWL: "These are the Dream Flowers! They help children everywhere have the most wonderful dreams."', imageUrl: null, audioUrl: null, mood: "warm", characters: JSON.stringify([{ name: "WISE_OWL", traits: "wise old owl", voiceRole: "animal_large" }]) },
  { id: 5, pageNumber: 5, storyText: 'NARRATOR: Our hero knew exactly what to do. With kindness in their heart, they knelt beside the quiet flowers and whispered words of encouragement.\n\nWISE_OWL: "Your kindness is the strongest magic of all..."', imageUrl: null, audioUrl: null, mood: "calm", characters: JSON.stringify([{ name: "WISE_OWL", traits: "wise old owl", voiceRole: "animal_large" }]) },
  { id: 6, pageNumber: 6, storyText: "NARRATOR: One by one, the flowers began to glow again, their melodies rising softly into the night sky.\n\nNARRATOR: The wise old owl smiled and gently guided our hero back to the magical doorway. As they stepped through, the stars outside their window seemed to shine a little brighter.\n\nNARRATOR: And as our brave little explorer snuggled under the warm blankets, the Dream Flowers' lullaby drifted through the window... singing them softly... gently... to sleep.", imageUrl: null, audioUrl: null, mood: "calm", characters: null },
];

function getDisplayText(rawText: string): string {
  return rawText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      const match = trimmed.match(/^([A-Z_]+):\s*(.+)$/);
      if (match) {
        const [, speaker, text] = match;
        if (speaker === "NARRATOR") return text;
        const name = speaker.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return name + ": " + text;
      }
      return trimmed;
    })
    .filter(Boolean)
    .join("\n\n");
}

const MOOD_COLORS: Record<string, { bg: string; label: string }> = {
  exciting: { bg: "#FF6B6B", label: "Exciting" },
  calm: { bg: "#48C9B0", label: "Calming" },
  mysterious: { bg: "#9B59B6", label: "Mysterious" },
  adventurous: { bg: "#F39C12", label: "Adventurous" },
  warm: { bg: "#E67E22", label: "Warm" },
  funny: { bg: "#2ECC71", label: "Funny" },
};

export default function StoryReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"elevenlabs" | "device">("device");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [pages, setPages] = useState<StoryPage[]>(DEMO_PAGES);
  const [loadingPages, setLoadingPages] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [storyComplete, setStoryComplete] = useState(false);

  const isServerMode = params.serverMode === "true";
  const episodeId = params.episodeId ? parseInt(params.episodeId as string, 10) : null;
  const storyTitle = (params.episodeTitle as string) || (params.title as string) || "A Magical Bedtime Adventure";
  const arcId = params.arcId as string;

  // Fetch server pages if in server mode
  const pagesQuery = trpc.pages.list.useQuery(
    { episodeId: episodeId! },
    { enabled: isServerMode && !!episodeId }
  );

  const generateImageMutation = trpc.pages.generateImage.useMutation();
  const generateAudioMutation = trpc.pages.generateAudio.useMutation();

  useEffect(() => {
    if (pagesQuery.data && pagesQuery.data.length > 0) {
      setPages(pagesQuery.data.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        storyText: p.storyText,
        imageUrl: p.imageUrl,
        audioUrl: p.audioUrl,
        mood: p.mood || "calm",
        characters: p.characters,
      })));
      setLoadingPages(false);
    }
  }, [pagesQuery.data]);

  useEffect(() => {
    if (isServerMode && episodeId) {
      setLoadingPages(true);
    }
  }, [isServerMode, episodeId]);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (soundRef.current) { soundRef.current.unloadAsync(); }
    };
  }, []);

  const stopAll = async () => {
    setIsPlaying(false);
    Speech.stop();
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  // Generate image for current page if missing
  const handleGenerateImage = useCallback(async (pageIndex: number) => {
    const page = pages[pageIndex];
    if (!page || page.imageUrl || !isServerMode || !episodeId) return;
    setGeneratingImage(page.id);
    try {
      const result = await generateImageMutation.mutateAsync({
        pageId: page.id,
        episodeId,
      });
      if (result.imageUrl) {
        setPages((prev) => prev.map((p) =>
          p.id === page.id ? { ...p, imageUrl: result.imageUrl! } : p
        ));
      }
    } catch (e) {
      console.error("Image generation failed:", e);
    } finally {
      setGeneratingImage(null);
    }
  }, [pages, isServerMode, episodeId]);

  // Auto-generate image when page comes into view
  useEffect(() => {
    if (isServerMode && pages[currentPage] && !pages[currentPage].imageUrl) {
      handleGenerateImage(currentPage);
    }
  }, [currentPage, isServerMode]);

  const playElevenLabsAudio = async (page: StoryPage) => {
    if (page.audioUrl) {
      try {
        setLoadingAudio(true);
        if (soundRef.current) { await soundRef.current.unloadAsync(); }
        const { sound } = await Audio.Sound.createAsync({ uri: page.audioUrl }, { shouldPlay: true });
        soundRef.current = sound;
        setIsPlaying(true);
        setLoadingAudio(false);
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) { setIsPlaying(false); }
        });
        return;
      } catch (e) {
        setLoadingAudio(false);
      }
    }

    // Try to generate audio via server
    if (isServerMode && episodeId) {
      try {
        setLoadingAudio(true);
        const result = await generateAudioMutation.mutateAsync({
          pageId: page.id,
          episodeId,
        });
        if (result.audioUrl) {
          setPages((prev) => prev.map((p) =>
            p.id === page.id ? { ...p, audioUrl: result.audioUrl! } : p
          ));
          const { sound } = await Audio.Sound.createAsync({ uri: result.audioUrl }, { shouldPlay: true });
          soundRef.current = sound;
          setIsPlaying(true);
          setLoadingAudio(false);
          sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) { setIsPlaying(false); }
          });
          return;
        }
      } catch (e) {
        console.error("ElevenLabs audio generation failed:", e);
      }
    }

    // Fallback to device TTS
    setLoadingAudio(false);
    speakWithDeviceTTS(page.storyText);
  };

  const speakWithDeviceTTS = (text: string) => {
    const cleanText = getDisplayText(text);
    setIsPlaying(true);
    Speech.speak(cleanText, {
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const togglePlay = async () => {
    if (isPlaying) { await stopAll(); return; }
    const page = pages[currentPage];
    if (voiceMode === "elevenlabs") {
      await playElevenLabsAudio(page);
    } else {
      speakWithDeviceTTS(page.storyText);
    }
  };

  const goToPage = async (index: number) => {
    await stopAll();
    setCurrentPage(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleFinishStory = () => {
    setStoryComplete(true);
    if (arcId) {
      Alert.alert(
        "Story Complete!",
        "What a wonderful adventure! Would you like to turn this story into a printed book?",
        [
          {
            text: "Print This Book",
            onPress: () => router.push({
              pathname: "/print-book" as any,
              params: { arcId, title: storyTitle },
            }),
          },
          { text: "Back to Home", onPress: () => router.replace("/") },
        ]
      );
    }
  };

  const getPageImage = (page: StoryPage): string => {
    if (page.imageUrl) return page.imageUrl;
    // Fallback to theme images based on mood
    const moodToTheme: Record<string, string> = {
      mysterious: ASSETS.themes.space,
      exciting: ASSETS.themes.pirate || ASSETS.themes.space,
      adventurous: ASSETS.themes.forest,
      warm: ASSETS.themes.forest,
      calm: ASSETS.themes.ocean,
      funny: ASSETS.themes.dinosaur,
    };
    return moodToTheme[page.mood] || ASSETS.themes.forest;
  };

  if (loadingPages) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: colors.foreground, marginTop: 16, fontSize: 16 }}>
          Loading your story...
        </Text>
      </ScreenContainer>
    );
  }

  const renderPage = ({ item, index }: { item: StoryPage; index: number }) => {
    const mood = MOOD_COLORS[item.mood] || MOOD_COLORS.calm;
    const isLastPage = index === pages.length - 1;
    const isGeneratingThisImage = generatingImage === item.id;

    return (
      <View style={[styles.page, { width }]}>
        <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(600)}>
            <View style={styles.illustrationContainer}>
              <Image
                source={{ uri: getPageImage(item) }}
                style={styles.illustration}
                contentFit="cover"
                transition={400}
              />
              {isGeneratingThisImage && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFD700" />
                  <Text style={styles.imageLoadingText}>Painting illustration...</Text>
                </View>
              )}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.illustGradient} />
              <View style={[styles.moodBadge, { backgroundColor: mood.bg }]}>
                <Text style={styles.moodText}>{mood.label}</Text>
              </View>
              <Text style={styles.pageNum}>Page {item.pageNumber} of {pages.length}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.textContainer}>
            <Text style={[styles.storyText, { color: colors.foreground }]}>
              {getDisplayText(item.storyText)}
            </Text>
          </Animated.View>

          {/* Finish button on last page */}
          {isLastPage && !storyComplete && (
            <Pressable
              onPress={handleFinishStory}
              style={({ pressed }) => [
                styles.finishBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="checkmark.circle.fill" size={22} color="#0A0E1A" />
              <Text style={styles.finishBtnText}>Finish Story</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {storyTitle}
          </Text>
          {isServerMode && (
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>AI Generated</Text>
          )}
        </View>
        <Pressable
          onPress={() => setVoiceMode(voiceMode === "elevenlabs" ? "device" : "elevenlabs")}
          style={[styles.voiceToggle, { backgroundColor: voiceMode === "elevenlabs" ? "#6C63FF" : colors.border }]}
        >
          <Text style={styles.voiceToggleText}>{voiceMode === "elevenlabs" ? "HD" : "TTS"}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderPage}
        keyExtractor={(item) => item.id.toString()}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          if (idx !== currentPage) { stopAll(); setCurrentPage(idx); }
        }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      <View style={[styles.controls, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => currentPage > 0 && goToPage(currentPage - 1)}
          style={styles.controlBtn}
          disabled={currentPage === 0}
        >
          <IconSymbol name="backward.fill" size={22} color={currentPage === 0 ? colors.border : colors.foreground} />
        </Pressable>
        <Pressable onPress={togglePlay} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
          {loadingAudio ? (
            <ActivityIndicator color="#0A0E1A" />
          ) : (
            <IconSymbol name={isPlaying ? "pause.fill" : "play.fill"} size={28} color="#0A0E1A" />
          )}
        </Pressable>
        <Pressable
          onPress={() => currentPage < pages.length - 1 && goToPage(currentPage + 1)}
          style={styles.controlBtn}
          disabled={currentPage === pages.length - 1}
        >
          <IconSymbol name="forward.fill" size={22} color={currentPage === pages.length - 1 ? colors.border : colors.foreground} />
        </Pressable>
        <View style={[styles.voiceIndicator, { backgroundColor: voiceMode === "elevenlabs" ? "#6C63FF22" : "rgba(170,170,170,0.13)" }]}>
          <Text style={[styles.voiceLabel, { color: voiceMode === "elevenlabs" ? "#6C63FF" : colors.muted }]}>
            {voiceMode === "elevenlabs" ? "ElevenLabs HD" : "Device Voice"}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageScroll: { paddingBottom: 20 },
  illustrationContainer: { width: "100%", height: SCREEN_HEIGHT * 0.38, position: "relative" },
  illustration: { width: "100%", height: "100%" },
  illustGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  imageLoadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", gap: 8 },
  imageLoadingText: { color: "#FFD700", fontSize: 13, fontWeight: "600" },
  moodBadge: { position: "absolute", top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  moodText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pageNum: { position: "absolute", bottom: 8, left: 16, color: "#fff", fontSize: 13, fontWeight: "500" },
  textContainer: { padding: 20 },
  storyText: { fontSize: 18, lineHeight: 30, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  voiceToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  voiceToggleText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderTopWidth: 1, gap: 20 },
  controlBtn: { padding: 12 },
  playBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  voiceIndicator: { position: "absolute", right: 16, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  voiceLabel: { fontSize: 10, fontWeight: "600" },
  finishBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFD700", borderRadius: 16, paddingVertical: 16, marginHorizontal: 20, marginTop: 12 },
  finishBtnText: { color: "#0A0E1A", fontSize: 17, fontWeight: "700" },
});
