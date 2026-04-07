import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions, Platform, ScrollView, ActivityIndicator } from "react-native";
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

const { width, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DEMO_PAGES = [
  { id: 1, pageNumber: 1, storyText: "NARRATOR: Once upon a time, in a land where the stars sang lullabies and the moon painted silver paths across the sky, there lived a brave little explorer.\n\nNARRATOR: Every night, when the world grew quiet and the fireflies began their dance, a magical doorway would appear at the foot of the bed.", imageUrl: null, audioUrl: null, mood: "mysterious", characters: null },
  { id: 2, pageNumber: 2, storyText: 'NARRATOR: Tonight, the doorway shimmered with golden light, and from within came the softest whisper.\n\nMAGICAL_DOOR: "Are you ready for an adventure?"\n\nNARRATOR: With a deep breath and a heart full of courage, our little hero stepped through the doorway and into a world of wonder.', imageUrl: null, audioUrl: null, mood: "exciting", characters: null },
  { id: 3, pageNumber: 3, storyText: 'NARRATOR: The sky was painted in swirls of purple and blue, dotted with stars that twinkled like tiny diamonds.\n\nWISE_OWL: "Welcome, young traveler, hoo-hoo! I\'ve been waiting for someone brave like you."', imageUrl: null, audioUrl: null, mood: "adventurous", characters: JSON.stringify([{ name: "WISE_OWL", traits: "wise old owl", voiceRole: "animal_large" }]) },
  { id: 4, pageNumber: 4, storyText: 'NARRATOR: Together, they journeyed through a meadow of flowers that hummed gentle melodies.\n\nWISE_OWL: "These are the Dream Flowers, hoo-hoo! They help children everywhere have the most wonderful dreams."', imageUrl: null, audioUrl: null, mood: "warm", characters: JSON.stringify([{ name: "WISE_OWL", traits: "wise old owl", voiceRole: "animal_large" }]) },
  { id: 5, pageNumber: 5, storyText: 'NARRATOR: Our hero knew exactly what to do. With kindness in their heart, they knelt beside the quiet flowers and whispered words of encouragement.\n\nWISE_OWL: "Your kindness is the strongest magic of all, hoo-hoo..."', imageUrl: null, audioUrl: null, mood: "calm", characters: JSON.stringify([{ name: "WISE_OWL", traits: "wise old owl", voiceRole: "animal_large" }]) },
  { id: 6, pageNumber: 6, storyText: "NARRATOR: One by one, the flowers began to glow again, their melodies rising softly into the night sky. The shadow melted away like morning mist.\n\nNARRATOR: The wise old owl smiled and gently guided our hero back to the magical doorway. As they stepped through, the stars outside their window seemed to shine a little brighter.\n\nNARRATOR: And as our brave little explorer snuggled under the warm blankets, the Dream Flowers' lullaby drifted through the window... singing them softly... gently... to sleep.", imageUrl: null, audioUrl: null, mood: "calm", characters: null },
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
  const [voiceMode, setVoiceMode] = useState<"elevenlabs" | "device">("elevenlabs");
  const [loadingAudio, setLoadingAudio] = useState(false);

  const pages = DEMO_PAGES;
  const storyTitle = (params.title as string) || "A Magical Bedtime Adventure";

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

  const playElevenLabsAudio = async (audioUrl: string | null) => {
    if (!audioUrl) { speakWithDeviceTTS(pages[currentPage].storyText); return; }
    try {
      setLoadingAudio(true);
      if (soundRef.current) { await soundRef.current.unloadAsync(); }
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });
      soundRef.current = sound;
      setIsPlaying(true);
      setLoadingAudio(false);
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) { setIsPlaying(false); }
      });
    } catch (e) {
      setLoadingAudio(false);
      speakWithDeviceTTS(pages[currentPage].storyText);
    }
  };

  const speakWithDeviceTTS = (text: string) => {
    const cleanText = getDisplayText(text);
    setIsPlaying(true);
    Speech.speak(cleanText, {
      rate: 0.85, pitch: 1.0,
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const togglePlay = async () => {
    if (isPlaying) { await stopAll(); return; }
    const page = pages[currentPage];
    if (voiceMode === "elevenlabs" && page.audioUrl) {
      await playElevenLabsAudio(page.audioUrl);
    } else {
      speakWithDeviceTTS(page.storyText);
    }
  };

  const goToPage = async (index: number) => {
    await stopAll();
    setCurrentPage(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderPage = ({ item, index }: { item: typeof DEMO_PAGES[0]; index: number }) => {
    const mood = MOOD_COLORS[item.mood] || MOOD_COLORS.calm;
    return (
      <View style={[rs.page, { width }]}>
        <ScrollView contentContainerStyle={rs.pageScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(600)}>
            <View style={rs.illustrationContainer}>
              <Image source={{ uri: item.imageUrl || ASSETS.themes.forest }} style={rs.illustration} contentFit="cover" />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={rs.illustGradient} />
              <View style={[rs.moodBadge, { backgroundColor: mood.bg }]}>
                <Text style={rs.moodText}>{mood.label}</Text>
              </View>
              <Text style={rs.pageNum}>Page {item.pageNumber} of {pages.length}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={rs.textContainer}>
            <Text style={[rs.storyText, { color: colors.text }]}>{getDisplayText(item.storyText)}</Text>
          </Animated.View>
        </ScrollView>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={[rs.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={rs.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <View style={rs.headerCenter}>
          <Text style={[rs.headerTitle, { color: colors.text }]} numberOfLines={1}>{storyTitle}</Text>
        </View>
        <Pressable onPress={() => setVoiceMode(voiceMode === "elevenlabs" ? "device" : "elevenlabs")} style={[rs.voiceToggle, { backgroundColor: voiceMode === "elevenlabs" ? "#6C63FF" : colors.border }]}>
          <Text style={rs.voiceToggleText}>{voiceMode === "elevenlabs" ? "HD" : "TTS"}</Text>
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

      <View style={[rs.controls, { borderTopColor: colors.border }]}>
        <Pressable onPress={() => currentPage > 0 && goToPage(currentPage - 1)} style={rs.controlBtn} disabled={currentPage === 0}>
          <IconSymbol name="backward.fill" size={22} color={currentPage === 0 ? colors.border : colors.text} />
        </Pressable>
        <Pressable onPress={togglePlay} style={[rs.playBtn, { backgroundColor: colors.primary }]}>
          {loadingAudio ? <ActivityIndicator color="#fff" /> :
            <IconSymbol name={isPlaying ? "pause.fill" : "play.fill"} size={28} color="#fff" />}
        </Pressable>
        <Pressable onPress={() => currentPage < pages.length - 1 && goToPage(currentPage + 1)} style={rs.controlBtn} disabled={currentPage === pages.length - 1}>
          <IconSymbol name="forward.fill" size={22} color={currentPage === pages.length - 1 ? colors.border : colors.text} />
        </Pressable>
        <View style={[rs.voiceIndicator, { backgroundColor: voiceMode === "elevenlabs" ? "#6C63FF22" : "#aaa22" }]}>
          <Text style={[rs.voiceLabel, { color: voiceMode === "elevenlabs" ? "#6C63FF" : "#aaa" }]}>
            {voiceMode === "elevenlabs" ? "ElevenLabs HD" : "Device Voice"}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
          }

const rs = StyleSheet.create({
  page: { flex: 1 },
  pageScroll: { paddingBottom: 20 },
  illustrationContainer: { width: "100%", height: SCREEN_HEIGHT * 0.38, position: "relative" },
  illustration: { width: "100%", height: "100%" },
  illustGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  moodBadge: { position: "absolute", top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  moodText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pageNum: { position: "absolute", bottom: 8, left: 16, color: "#fff", fontSize: 13, fontWeight: "500" },
  textContainer: { padding: 20 },
  storyText: { fontSize: 18, lineHeight: 30, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  voiceToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  voiceToggleText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderTopWidth: 1, gap: 20 },
  controlBtn: { padding: 12 },
  playBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  voiceIndicator: { position: "absolute", right: 16, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  voiceLabel: { fontSize: 10, fontWeight: "600" },
});
