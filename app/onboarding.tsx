import { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  ViewToken,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ASSETS } from "@/constants/assets";
import { setOnboardingComplete } from "@/lib/onboarding-store";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Every Night,\nA New Chapter",
    subtitle: "Personalized bedtime stories where your child is the hero of their own magical adventure",
    highlight: "Powered by AI storytelling",
    image: ASSETS.bgOnboarding,
  },
  {
    id: "2",
    title: "Your Child's\nStory Universe",
    subtitle: "Choose from enchanted forests, space voyages, ocean depths, and more. Each theme unfolds across episodic chapters",
    highlight: "Episodic stories they'll beg for",
    image: ASSETS.themes.forest,
  },
  {
    id: "3",
    title: "Beautiful\nIllustrations",
    subtitle: "Every page features unique AI-generated artwork that brings the story to life with vivid, hand-painted style visuals",
    highlight: "Soothing narration included",
    image: ASSETS.themes.ocean,
  },
  {
    id: "4",
    title: "Ready to\nBegin?",
    subtitle: "Create your first child profile and start their magical bedtime adventure tonight",
    highlight: "Free to start, premium to unlock more",
    image: ASSETS.themes.space,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await setOnboardingComplete();
    router.replace("/(tabs)");
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={[styles.slide, { width }]}>
      {/* Per-slide background image */}
      <Image
        source={{ uri: item.image }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={400}
      />
      {/* Gradient overlay: transparent at top, dark at bottom for text readability */}
      <LinearGradient
        colors={[
          "rgba(10,14,26,0.1)",
          "rgba(10,14,26,0.4)",
          "rgba(10,14,26,0.85)",
          "rgba(10,14,26,0.98)",
        ]}
        locations={[0, 0.35, 0.6, 0.85]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Text content at bottom */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <View style={styles.highlightBadge}>
          <Text style={styles.highlightText}>{item.highlight}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenContainer
        containerClassName="bg-transparent"
        className="flex-1"
        edges={["top", "bottom", "left", "right"]}
      >
        {/* Logo area */}
        <Animated.View entering={FadeIn.delay(100).duration(800)} style={styles.logoArea}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.appName}>StoryWeaver</Text>
        </Animated.View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />

        {/* Dots + Button */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.bottomArea}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.buttonText}>
              {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
          </Pressable>

          {currentIndex < SLIDES.length - 1 && (
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  logoArea: {
    alignItems: "center",
    paddingTop: 20,
    gap: 8,
    zIndex: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFD700",
    letterSpacing: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  textContainer: {
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 26,
  },
  highlightBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  highlightText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomArea: {
    paddingHorizontal: 32,
    paddingBottom: 20,
    gap: 16,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  dotActive: {
    backgroundColor: "#FFD700",
    width: 24,
  },
  button: {
    width: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#0A0E1A",
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 15,
  },
});
