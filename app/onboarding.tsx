import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASSETS } from "@/constants/assets";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Onboarding Slides ────────────────────────────────────────
const ONBOARDING_SLIDES = [
  {
    id: "welcome",
    emoji: "🌟",
    title: "Welcome to StoryWeaver",
    subtitle: "Where Every Bedtime Becomes an Adventure",
    description:
      "StoryWeaver uses advanced AI to craft personalized bedtime stories that grow with your child. Each story is unique, magical, and tailored to their world.",
    highlights: [
      "✨ AI-generated stories starring your child",
      "🎨 Beautiful illustrations for every page",
      "🔊 Multi-character voice narration",
    ],
    gradient: ["#1a1a2e", "#16213e", "#0f3460"] as const,
  },
  {
    id: "personalized",
    emoji: "🧒",
    title: "Stories as Unique as Your Child",
    subtitle: "Deeply Personalized Storytelling",
    description:
      "Create detailed profiles for each of your children. StoryWeaver weaves their personality, interests, fears, and even neurodivergent traits into every story.",
    highlights: [
      "👪 Multiple child profiles per family",
      "🧩 Neurodivergent-friendly story modes",
      "📚 Age-calibrated vocabulary & pacing",
    ],
    gradient: ["#1a0a2e", "#2d1b69", "#5b2c8e"] as const,
  },
  {
    id: "impact",
    emoji: "💡",
    title: "More Than Just Stories",
    subtitle: "Real Impact on Development",
    description:
      "Every story teaches kindness, bravery, empathy, and life skills. For neurodivergent children, stories gently explore social cues, sensory experiences, and emotional regulation.",
    highlights: [
      "🧠 Builds emotional intelligence",
      "🌜 Calming bedtime routines",
      "💪 Addresses fears through safe narratives",
    ],
    gradient: ["#0a2e1a", "#1b6940", "#2e8c5a"] as const,
  },
  {
    id: "print",
    emoji: "📖",
    title: "From Screen to Bookshelf",
    subtitle: "Print Your Child's Storybooks",
    description:
      "Turn any story into a professionally printed hardcover or softcover book. AI-generated illustrations included. The perfect keepsake that your child helped create.",
    highlights: [
      "🖨️ Hardcover & softcover options",
      "🎨 Full-color AI illustrations",
      "📦 Delivered to your door via Printful",
    ],
    gradient: ["#2e1a0a", "#694a1b", "#8c6c2e"] as const,
  },
  {
    id: "pricing",
    emoji: "🚀",
    title: "Choose Your Plan",
    subtitle: "Start with a Free Trial",
    description:
      "Try StoryWeaver free with 3 stories. Upgrade anytime for unlimited storytelling, premium voices, and exclusive printing discounts.",
    highlights: [],
    gradient: ["#1a0a2e", "#3d1b69", "#6b3fa0"] as const,
  },
];

// ─── Subscription Plans ───────────────────────────────────────
const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free Explorer",
    price: "$0",
    period: "",
    color: "#4ECDC4",
    features: [
      "3 stories total",
      "1 child profile",
      "Basic device voice",
      "Standard illustrations",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    id: "monthly",
    name: "Story Star",
    price: "$9.99",
    period: "/month",
    color: "#FFD93D",
    features: [
      "Unlimited stories",
      "Up to 5 child profiles",
      "Premium AI voices",
      "HD illustrations",
      "Neurodivergent modes",
      "10% off printed books",
    ],
    cta: "Subscribe Monthly",
    popular: true,
  },
  {
    id: "yearly",
    name: "Story Universe",
    price: "$79.99",
    period: "/year",
    color: "#FF6B6B",
    features: [
      "Everything in Story Star",
      "Unlimited child profiles",
      "Priority story generation",
      "Exclusive story themes",
      "20% off printed books",
      "Early access to features",
    ],
    cta: "Subscribe Yearly",
    popular: false,
    savings: "Save 33%",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleFinishOnboarding = useCallback(
    async (plan: string) => {
      await AsyncStorage.setItem("onboarding_complete", "true");
      await AsyncStorage.setItem("subscription_plan", plan);
      router.replace("/(tabs)");
    },
    [router]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    await handleFinishOnboarding("free");
  }, [handleFinishOnboarding]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof ONBOARDING_SLIDES)[number]; index: number }) => {
      const isPricingSlide = item.id === "pricing";

      return (
        <View style={styles.slide}>
          <LinearGradient
            colors={[...item.gradient]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <SafeAreaView style={styles.slideContent}>
            {!isPricingSlide ? (
              <ScrollView
                contentContainerStyle={styles.slideScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View entering={FadeInUp.delay(200).duration(600)}>
                  <Text style={styles.slideEmoji}>{item.emoji}</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                  <Text style={styles.slideTitle}>{item.title}</Text>
                  <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
                </Animated.View>

                <Animated.View
                  entering={FadeIn.delay(500).duration(600)}
                  style={styles.descriptionBox}
                >
                  <Text style={styles.slideDescription}>{item.description}</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(700).duration(600)} style={styles.highlightsBox}>
                  {item.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </Animated.View>
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={styles.pricingScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View entering={FadeInUp.delay(200).duration(600)}>
                  <Text style={styles.slideEmoji}>{item.emoji}</Text>
                  <Text style={styles.slideTitle}>{item.title}</Text>
                  <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
                </Animated.View>

                {SUBSCRIPTION_PLANS.map((plan) => (
                  <Animated.View
                    key={plan.id}
                    entering={FadeInDown.delay(400).duration(500)}
                  >
                    <Pressable
                      style={[
                        styles.planCard,
                        selectedPlan === plan.id && {
                          borderColor: plan.color,
                          borderWidth: 2,
                        },
                        plan.popular && styles.popularPlan,
                      ]}
                      onPress={() => setSelectedPlan(plan.id)}
                    >
                      {plan.popular && (
                        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                          <Text style={styles.popularBadgeText}>Most Popular</Text>
                        </View>
                      )}
                      {plan.savings && (
                        <View style={[styles.savingsBadge, { backgroundColor: plan.color }]}>
                          <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                        </View>
                      )}

                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <View style={styles.priceRow}>
                          <Text style={[styles.planPrice, { color: plan.color }]}>
                            {plan.price}
                          </Text>
                          {plan.period ? (
                            <Text style={styles.planPeriod}>{plan.period}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.planFeatures}>
                        {plan.features.map((f, i) => (
                          <Text key={i} style={styles.planFeature}>
                            ✓ {f}
                          </Text>
                        ))}
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}
                <Pressable
                  style={[
                    styles.ctaButton,
                    {
                      backgroundColor: selectedPlan
                        ? SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.color ?? "#6C63FF"
                        : "#6C63FF",
                    },
                  ]}
                  onPress={() => handleFinishOnboarding(selectedPlan ?? "free")}
                >
                  <Text style={styles.ctaText}>
                    {selectedPlan
                      ? SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.cta
                      : "Start Free Trial"}
                  </Text>
                </Pressable>

                <Pressable onPress={() => handleFinishOnboarding("free")} style={styles.skipLink}>
                  <Text style={styles.skipLinkText}>
                    Continue with free trial (3 stories)
                  </Text>
                </Pressable>

                <View style={{ height: 40 }} />
              </ScrollView>
            )}

            {/* Bottom Controls (non-pricing) */}
            {!isPricingSlide && (
              <View style={styles.bottomControls}>
                {/* Dots */}
                <View style={styles.dotsRow}>
                  {ONBOARDING_SLIDES.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === currentIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.buttonsRow}>
                  <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                  </Pressable>

                  <Pressable onPress={handleNext} style={styles.nextButton}>
                    <Text style={styles.nextText}>Next</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      );
    },
    [currentIndex, selectedPlan, handleFinishOnboarding, handleNext, handleSkip]
  );

  return (
    <FlatList
      ref={flatListRef}
      data={ONBOARDING_SLIDES}
      renderItem={renderSlide}
      keyExtractor={(item) => item.id}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      bounces={false}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  slideContent: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 140,
    alignItems: "center",
  },
  pricingScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: "center",
  },
  slideEmoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 24,
  },
  descriptionBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: "100%",
  },
  slideDescription: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 24,
    textAlign: "center",
  },
  highlightsBox: {
    width: "100%",
    gap: 12,
  },
  highlightRow: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  highlightText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "500",
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 24,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 25,
  },
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Pricing
  planCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    width: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  popularPlan: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savingsBadgeText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "800",
  },
  planPeriod: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginLeft: 2,
  },
  planFeatures: {
    gap: 6,
  },
  planFeature: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
  },
  ctaButton: {
    width: SCREEN_WIDTH - 48,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  ctaText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "700",
  },
  skipLink: {
    paddingVertical: 8,
  },
  skipLinkText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
