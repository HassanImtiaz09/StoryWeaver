import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ASSETS } from "@/constants/assets";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

const { width, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Demo story pages for local mode
const DEMO_PAGES = [
  {
    id: 1,
    pageNumber: 1,
    storyText:
      "Once upon a time, in a land where the stars sang lullabies and the moon painted silver paths across the sky, there lived a brave little explorer.\n\nEvery night, when the world grew quiet and the fireflies began their dance, a magical doorway would appear at the foot of the bed.",
    imageUrl: null,
  },
  {
    id: 2,
    pageNumber: 2,
    storyText:
      "Tonight, the doorway shimmered with golden light, and from within came the softest whisper: \"Are you ready for an adventure?\"\n\nWith a deep breath and a heart full of courage, our little hero stepped through the doorway and into a world of wonder.",
    imageUrl: null,
  },
  {
    id: 3,
    pageNumber: 3,
    storyText:
      "The sky was painted in swirls of purple and blue, dotted with stars that twinkled like tiny diamonds. A friendly owl perched on a branch of a glowing tree waved a wing in greeting.\n\n\"Welcome, young traveler,\" hooted the owl. \"I've been waiting for someone brave like you.\"",
    imageUrl: null,
  },
  {
    id: 4,
    pageNumber: 4,
    storyText:
      "Together, they journeyed through a meadow of flowers that hummed gentle melodies. Each flower was a different color, and each one sang a different note.\n\n\"These are the Dream Flowers,\" explained the owl. \"They help children everywhere have the most wonderful dreams.\"",
    imageUrl: null,
  },
  {
    id: 5,
    pageNumber: 5,
    storyText:
      "But something was wrong. Some of the flowers had stopped singing, their petals drooping sadly. \"A shadow has been stealing their songs,\" the owl said with concern.\n\nOur hero knew exactly what to do. With kindness in their heart, they knelt beside the quiet flowers and whispered words of encouragement.",
    imageUrl: null,
  },
  {
    id: 6,
    pageNumber: 6,
    storyText:
      "One by one, the flowers began to glow again, their melodies returning stronger than before. The shadow melted away, unable to stand against such warmth and kindness.\n\nAs the meadow filled with music once more, our little hero felt their eyelids grow heavy. \"Until tomorrow night,\" whispered the owl, as the magical doorway carried them gently back to their cozy bed.\n\nThe end... for tonight.",
    imageUrl: null,
  },
];

type ThemeKey = keyof typeof ASSETS.themes;

function getThemeImage(theme?: string): string {
  if (theme && theme in ASSETS.themes) {
    return ASSETS.themes[theme as ThemeKey];
  }
  return ASSETS.bgOnboarding;
}

export default function StoryReaderScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    episodeTitle?: string;
    childName?: string;
    arcId?: string;
    theme?: string;
  }>();

  const [currentPage, setCurrentPage] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pages = DEMO_PAGES;
  const themeImage = getThemeImage(params.theme);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speakPage = (text: string) => {
    if (Platform.OS === "web") return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      language: "en-GB",
      pitch: 1.05,
      rate: 0.85,
      onDone: () => {
        setIsSpeaking(false);
        if (autoPlay && currentPage < pages.length - 1) {
          goToPage(currentPage + 1);
        }
      },
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      speakPage(pages[currentPage].storyText);
    }
  };

  const goToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPage(index);
      flatListRef.current?.scrollToIndex({ index, animated: true });
      if (autoPlay) {
        setTimeout(() => speakPage(pages[index].storyText), 500);
      }
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentPage(viewableItems[0].index);
      }
    }
  ).current;

  const renderPage = ({ item, index }: { item: typeof DEMO_PAGES[0]; index: number }) => (
    <View style={[styles.page, { width }]}>
      <ScrollView
        contentContainerStyle={styles.pageScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme illustration at top of each page */}
        <View style={styles.illustrationArea}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <Image
              source={{ uri: themeImage }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={200}
            />
          )}
          <LinearGradient
            colors={["transparent", "rgba(10,14,26,0.6)", colors.background]}
            locations={[0.2, 0.7, 1]}
            style={styles.illustrationGradient}
          />
          {/* Page number badge */}
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>
              Page {index + 1} of {pages.length}
            </Text>
          </View>
        </View>

        {/* Story text */}
        <View style={styles.textArea}>
          <Text style={[styles.storyText, { color: colors.foreground }]}>
            {item.storyText}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenContainer
        containerClassName="bg-transparent"
        edges={["top", "bottom", "left", "right"]}
        className="flex-1"
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable
            onPress={() => {
              Speech.stop();
              router.back();
            }}
            style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {params.episodeTitle || "Tonight's Story"}
            </Text>
            {params.childName && (
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                For {params.childName}
              </Text>
            )}
          </View>
          <View style={{ width: 44 }} />
        </Animated.View>

        {/* Pages */}
        <FlatList
          ref={flatListRef}
          data={pages}
          renderItem={renderPage}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          bounces={false}
        />

        {/* Controls */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.controls}>
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {pages.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentPage && styles.dotActive,
                  i < currentPage && styles.dotRead,
                ]}
              />
            ))}
          </View>

          <View style={styles.controlRow}>
            {/* Previous */}
            <Pressable
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              style={({ pressed }) => [
                styles.navButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                currentPage === 0 && { opacity: 0.3 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
            </Pressable>

            {/* Narration button */}
            <Pressable
              onPress={toggleSpeech}
              style={({ pressed }) => [
                styles.playButton,
                isSpeaking && styles.playButtonActive,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol
                name={isSpeaking ? "star.fill" : "play.fill"}
                size={24}
                color={isSpeaking ? "#FFD700" : "#0A0E1A"}
              />
              <Text style={[styles.playText, isSpeaking && { color: "#FFD700" }]}>
                {isSpeaking ? "Speaking..." : "Read Aloud"}
              </Text>
            </Pressable>

            {/* Next */}
            <Pressable
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === pages.length - 1}
              style={({ pressed }) => [
                styles.navButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                currentPage === pages.length - 1 && { opacity: 0.3 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Auto-play toggle */}
          <Pressable
            onPress={() => setAutoPlay(!autoPlay)}
            style={({ pressed }) => [
              styles.autoPlayToggle,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.autoPlayDot, autoPlay && styles.autoPlayDotActive]} />
            <Text style={[styles.autoPlayText, { color: colors.muted }]}>
              Auto-narrate pages
            </Text>
          </Pressable>
        </Animated.View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  page: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
  },
  // Illustration area with theme image
  illustrationArea: {
    height: 260,
    overflow: "hidden",
    position: "relative",
  },
  illustrationGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  pageBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },
  pageBadgeText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 16,
  },
  storyText: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  progressDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  dotActive: {
    backgroundColor: "#FFD700",
    width: 20,
  },
  dotRead: {
    backgroundColor: "rgba(255, 215, 0, 0.5)",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  playButtonActive: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  playText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0E1A",
  },
  autoPlayToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  autoPlayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  autoPlayDotActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  autoPlayText: {
    fontSize: 13,
  },
});
