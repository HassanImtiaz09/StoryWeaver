/**
 * Onboarding — Streamlined 3-step experience:
 *   Step 1: Child name + age  (with mascot "Ollie" introduction)
 *   Step 2: Pick 3 interests  (visual emoji cards)
 *   Step 3: Celebration + auto-generate first story
 *
 * Features:
 *   - Ollie the Owl mascot with speech bubbles per step
 *   - Voice narration on each step (expo-av)
 *   - Visual interest selection (illustrated emoji cards, min 3)
 *   - Confetti & sparkle celebration on completion
 *   - Auto-generates a personalized welcome story using child profile
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { OnboardingMascot, MASCOT_LINES } from "@/components/onboarding-mascot";
import { saveLocalChild, type LocalChild } from "@/lib/onboarding-store";
import { announce } from "@/lib/a11y-helpers";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { trpc } from "@/lib/trpc";
import { CHILD_INTERESTS, FAVORITE_COLORS } from "@/constants/assets";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* ─── Interest card data (top 18 with emojis for visual grid) ── */
const INTEREST_CARDS = [
  { id: "Space", emoji: "🚀", color: "#6C5CE7" },
  { id: "Dinosaurs", emoji: "🦕", color: "#00B894" },
  { id: "Ocean", emoji: "🌊", color: "#0984E3" },
  { id: "Magic", emoji: "✨", color: "#A29BFE" },
  { id: "Animals", emoji: "🐾", color: "#FDCB6E" },
  { id: "Princesses", emoji: "👑", color: "#E84393" },
  { id: "Pirates", emoji: "🏴‍☠️", color: "#2D3436" },
  { id: "Robots", emoji: "🤖", color: "#636E72" },
  { id: "Superheroes", emoji: "🦸", color: "#D63031" },
  { id: "Music", emoji: "🎵", color: "#E17055" },
  { id: "Art & Crafts", emoji: "🎨", color: "#00CEC9" },
  { id: "Nature", emoji: "🌿", color: "#55EFC4" },
  { id: "Dragons", emoji: "🐉", color: "#B33939" },
  { id: "Fairies", emoji: "🧚", color: "#FD79A8" },
  { id: "Trains", emoji: "🚂", color: "#74B9FF" },
  { id: "Cooking", emoji: "🧁", color: "#FAB1A0" },
  { id: "Unicorns", emoji: "🦄", color: "#DFE6E9" },
  { id: "Sports", emoji: "⚽", color: "#00B894" },
];

/* ─── Age options ──────────────────────────────────────────── */
const AGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/* ─── Confetti particle ───────────────────────────────────── */
interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

function generateConfetti(count: number): ConfettiPiece[] {
  const colors = [
    "#FFD700", "#FF6B6B", "#48C9B0", "#A29BFE",
    "#FF8E53", "#6C5CE7", "#00CEC9", "#FD79A8",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * (SCREEN_WIDTH - 20),
    color: colors[i % colors.length],
    delay: Math.random() * 600,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
}

/* ─── Confetti piece component ─────────────────────────────── */
function ConfettiPieceView({ piece }: { piece: ConfettiPiece }) {
  const translateY = useSharedValue(-20);
  const rotate = useSharedValue(piece.rotation);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      piece.delay,
      withTiming(SCREEN_HEIGHT + 40, {
        duration: 2500 + Math.random() * 1500,
        easing: Easing.out(Easing.quad),
      })
    );
    rotate.value = withDelay(
      piece.delay,
      withRepeat(
        withTiming(piece.rotation + 720, { duration: 2500 }),
        1,
        false
      )
    );
    opacity.value = withDelay(
      piece.delay + 2000,
      withTiming(0, { duration: 800 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: piece.x,
    top: 0,
    width: piece.size,
    height: piece.size * 1.4,
    backgroundColor: piece.color,
    borderRadius: 2,
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

/* ─── Generation status messages ──────────────────────────── */
const WELCOME_GEN_MESSAGES = [
  "Ollie is writing your first story...",
  "Adding a sprinkle of magic...",
  "Painting beautiful illustrations...",
  "Almost ready for bedtime...",
];

/* ═════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════ */
export default function OnboardingScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  /* ── Step state ── */
  const [step, setStep] = useState(0); // 0=welcome/name, 1=interests, 2=celebrate
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<number | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces] = useState(() => generateConfetti(40));

  const generateMutation = trpc.stories.generateStory.useMutation();

  /* ── Animation values ── */
  const progressWidth = useSharedValue(0.33);

  useEffect(() => {
    progressWidth.value = withSpring((step + 1) / 3, {
      damping: 15,
      stiffness: 120,
    });
    announce(`Step ${step + 1} of 3`);
  }, [step]);

  /* ── Gen message cycling ── */
  useEffect(() => {
    if (!isGenerating) return;
    const t = setInterval(() => {
      setGenMsgIdx((p) => (p + 1) % WELCOME_GEN_MESSAGES.length);
    }, 2800);
    return () => clearInterval(t);
  }, [isGenerating]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  /* ── Actions ── */
  const canAdvanceStep0 = childName.trim().length >= 2 && childAge !== null;
  const canAdvanceStep1 = selectedInterests.length >= 3;

  const toggleInterest = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 6) return prev; // max 6
      return [...prev, id];
    });
  };

  const goToStep = (s: number) => {
    setStep(s);
  };

  const handleFinishStep1 = async () => {
    // Save child profile
    const child: LocalChild = {
      id: `child_${Date.now()}`,
      name: childName.trim(),
      age: childAge!,
      interests: selectedInterests,
      createdAt: new Date().toISOString(),
    };
    await saveLocalChild(child);

    // Move to celebration step
    setStep(2);
    if (!reducedMotion) {
      setShowConfetti(true);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-generate welcome story
    try {
      setIsGenerating(true);
      announce("Creating your first story");
      const result = await generateMutation.mutateAsync({
        childId: parseInt(child.id.replace("child_", ""), 10) || 1,
        theme: mapInterestToTheme(selectedInterests[0]),
        storyLength: "Short (5-10 min)",
        tone: "Magical",
        moralLessons: ["Kindness"],
        customElements: `This is a welcome story for ${child.name}. Include their name in the story.`,
      });

      // Store welcome story reference
      if (result.arcId) {
        await AsyncStorage.setItem("welcome_story_arc", result.arcId.toString());
        await AsyncStorage.setItem("welcome_story_title", result.title || "");
      }
    } catch {
      // Non-fatal — user can still proceed
      console.warn("Welcome story generation failed, continuing onboarding");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("subscription_plan", "free");

    // Check if welcome story was created
    const welcomeArcId = await AsyncStorage.getItem("welcome_story_arc");
    if (welcomeArcId) {
      const title = await AsyncStorage.getItem("welcome_story_title");
      router.replace({
        pathname: "/story-detail" as any,
        params: {
          arcId: welcomeArcId,
          title: title || "Your First Story",
          childName,
          theme: mapInterestToTheme(selectedInterests[0]),
        },
      });
    } else {
      router.replace("/(tabs)");
    }
  };

  /* ── Render ── */
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Confetti overlay */}
      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confettiPieces.map((p) => (
            <ConfettiPieceView key={p.id} piece={p} />
          ))}
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top bar: progress + step count ── */}
        <View style={styles.topBar}>
          {step > 0 && step < 2 && (
            <Pressable
              onPress={() => goToStep(step - 1)}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          )}
          <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 3, now: step + 1 }}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.stepCount}>
            {Math.min(step + 1, 3)}/3
          </Text>
        </View>

        {/* ── Step content ── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </ScrollView>

        {/* ── Bottom action ── */}
        {step < 2 && (
          <View style={styles.bottomBar}>
            {step === 0 && (
              <Pressable
                onPress={() => goToStep(1)}
                disabled={!canAdvanceStep0}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    opacity: canAdvanceStep0 ? 1 : 0.4,
                  },
                  pressed && canAdvanceStep0 && { transform: [{ scale: 0.97 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Next step"
                accessibilityState={{ disabled: !canAdvanceStep0 }}
              >
                <Text style={styles.primaryBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#0A0E1A" />
              </Pressable>
            )}
            {step === 1 && (
              <Pressable
                onPress={handleFinishStep1}
                disabled={!canAdvanceStep1}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    opacity: canAdvanceStep1 ? 1 : 0.4,
                  },
                  pressed && canAdvanceStep1 && { transform: [{ scale: 0.97 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create my first story"
                accessibilityHint="Saves profile and generates a welcome story"
                accessibilityState={{ disabled: !canAdvanceStep1 }}
              >
                <Ionicons name="sparkles" size={18} color="#0A0E1A" />
                <Text style={styles.primaryBtnText}>
                  Create My First Story!
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );

  /* ═══════════════════════════════════════════════════════
     STEP 0 — Welcome + Child Name & Age
  ═══════════════════════════════════════════════════════ */
  function renderStep0() {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.stepContainer}>
        {/* Mascot */}
        <OnboardingMascot mode="wave" speechKey="welcome" size={90} />

        <View style={{ height: 24 }} />

        {/* Name input */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.inputLabel}>Child's Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
            <TextInput
              value={childName}
              onChangeText={setChildName}
              placeholder="Enter their name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.textInput}
              autoFocus
              returnKeyType="next"
              maxLength={30}
              accessibilityLabel="Child's name"
              accessibilityHint="Enter your child's first name"
            />
          </View>
        </Animated.View>

        {/* Age selector */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <Text style={styles.inputLabel}>Age</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ageRow}
          >
            {AGE_OPTIONS.map((age) => {
              const isSel = childAge === age;
              return (
                <Pressable
                  key={age}
                  onPress={() => {
                    setChildAge(age);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.ageChip,
                    isSel && styles.ageChipSelected,
                  ]}
                  accessibilityLabel={`Age ${age}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: childAge === age }}
                >
                  <Text
                    style={[
                      styles.ageChipText,
                      isSel && styles.ageChipTextSelected,
                    ]}
                  >
                    {age}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Skip hint */}
        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <Pressable
            onPress={async () => {
              await AsyncStorage.setItem("onboarding_complete", "true");
              await AsyncStorage.setItem("subscription_plan", "free");
              router.replace("/(tabs)");
            }}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            accessibilityHint="Skips setup and goes to the main app"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STEP 1 — Pick 3+ Interests (visual cards)
  ═══════════════════════════════════════════════════════ */
  function renderStep1() {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.stepContainer}>
        {/* Mascot */}
        <OnboardingMascot mode="idle" speechKey="interests" size={80} />

        <View style={{ height: 16 }} />

        {/* Counter */}
        <View style={styles.interestCounter} accessibilityLabel={`${selectedInterests.length} of 3 interests selected`}>
          <Text style={styles.interestCountText}>
            {selectedInterests.length}/3
            {selectedInterests.length < 3 ? " — pick at least 3" : " selected!"}
          </Text>
          {selectedInterests.length >= 3 && (
            <Ionicons name="checkmark-circle" size={18} color="#00B894" />
          )}
        </View>

        {/* Interest grid */}
        <View style={styles.interestGrid}>
          {INTEREST_CARDS.map((card, idx) => {
            const isSel = selectedInterests.includes(card.id);
            return (
              <Animated.View
                key={card.id}
                entering={FadeInDown.delay(idx * 30).duration(250)}
              >
                <Pressable
                  onPress={() => toggleInterest(card.id)}
                  style={({ pressed }) => [
                    styles.interestCard,
                    {
                      backgroundColor: isSel
                        ? card.color
                        : "rgba(255,255,255,0.08)",
                      borderColor: isSel ? card.color : "transparent",
                      borderWidth: 2,
                    },
                    pressed && { transform: [{ scale: 0.93 }] },
                  ]}
                  accessibilityLabel={card.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityHint="Double-tap to select or deselect"
                >
                  <Text style={styles.interestEmoji}>{card.emoji}</Text>
                  <Text
                    style={[
                      styles.interestLabel,
                      { color: isSel ? "#FFFFFF" : "rgba(255,255,255,0.8)" },
                    ]}
                    numberOfLines={1}
                  >
                    {card.id}
                  </Text>
                  {isSel && (
                    <View style={styles.interestCheck}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STEP 2 — Celebration + Auto-Generate
  ═══════════════════════════════════════════════════════ */
  function renderStep2() {
    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        style={styles.celebrateContainer}
      >
        {/* Mascot celebrating */}
        <OnboardingMascot
          mode="celebrate"
          speechKey="celebrate"
          size={110}
        />

        <View style={{ height: 20 }} />

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.celebrateTitle}>Welcome, {childName}!</Text>
          <Text style={styles.celebrateSubtitle}>
            Your magical adventure begins now
          </Text>
        </Animated.View>

        {/* What we set up */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryRow}>
            <Text style={styles.summaryEmoji}>👤</Text>
            <View>
              <Text style={styles.summaryLabel}>Storyteller</Text>
              <Text style={styles.summaryValue}>
                {childName}, age {childAge}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryEmoji}>💫</Text>
            <View>
              <Text style={styles.summaryLabel}>Loves</Text>
              <Text style={styles.summaryValue}>
                {selectedInterests.slice(0, 3).join(", ")}
                {selectedInterests.length > 3
                  ? ` +${selectedInterests.length - 3} more`
                  : ""}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Generation status */}
        {isGenerating && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.genStatus}
            accessibilityLiveRegion="polite"
            accessible={true}
          >
            <View style={styles.genDots}>
              {[0, 1, 2].map((i) => (
                <GenDot key={i} delay={i * 200} />
              ))}
            </View>
            <Text style={styles.genStatusText}>
              {WELCOME_GEN_MESSAGES[genMsgIdx]}
            </Text>
          </Animated.View>
        )}

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(800).duration(400)}>
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.primaryBtn,
              { marginTop: 20 },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Read my first story"
            accessibilityHint="Opens your personalized welcome story"
          >
            <Ionicons name="book" size={18} color="#0A0E1A" />
            <Text style={styles.primaryBtnText}>
              {isGenerating ? "Continue to App" : "Read My First Story!"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Free plan note */}
        <Animated.View entering={FadeIn.delay(1000).duration(400)}>
          <Text style={styles.freeNote}>
            You're starting with 3 free stories. Upgrade anytime!
          </Text>
        </Animated.View>
      </Animated.View>
    );
  }
}

/* ─── Animated dot for generation status ──────────────────── */
function GenDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.6, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={style} />;
}

/* ─── Helper: map interest to story theme ─────────────────── */
function mapInterestToTheme(interest: string): string {
  const map: Record<string, string> = {
    Space: "space",
    Dinosaurs: "dinosaur",
    Ocean: "ocean",
    Magic: "fairy",
    Animals: "safari",
    Princesses: "fairy",
    Pirates: "pirate",
    Robots: "robot",
    Nature: "forest",
    Superheroes: "medieval",
    Music: "musical",
    "Art & Crafts": "garden",
    Dragons: "medieval",
    Fairies: "fairy",
    Trains: "robot",
    Cooking: "candy",
    Unicorns: "fairy",
    Sports: "safari",
  };
  return map[interest] || "fantasy";
}

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  /* ── Top bar ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },
  stepCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "right",
  },

  /* ── Scroll content ── */
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },

  /* ── Step containers ── */
  stepContainer: {
    alignItems: "center",
  },

  /* ── Inputs (Step 0) ── */
  inputLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    alignSelf: "flex-start",
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
    width: "100%",
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: 14,
  },
  ageRow: {
    gap: 8,
    paddingVertical: 4,
  },
  ageChip: {
    width: 48,
    height: 48,
    minHeight: 44,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ageChipSelected: {
    backgroundColor: "#FFD700",
  },
  ageChipText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "700",
  },
  ageChipTextSelected: {
    color: "#0A0E1A",
  },
  skipBtn: {
    paddingVertical: 16,
    marginTop: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    textDecorationLine: "underline",
  },

  /* ── Interest grid (Step 1) ── */
  interestCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  interestCountText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    width: "100%",
  },
  interestCard: {
    width: (SCREEN_WIDTH - 78) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: 4,
  },
  interestEmoji: {
    fontSize: 28,
  },
  interestLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  interestCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Celebration (Step 2) ── */
  celebrateContainer: {
    alignItems: "center",
    paddingTop: 10,
  },
  celebrateTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 4,
  },
  celebrateSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    gap: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  genStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  genDots: {
    flexDirection: "row",
    gap: 4,
  },
  genStatusText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },
  freeNote: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  primaryBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 16,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
});
