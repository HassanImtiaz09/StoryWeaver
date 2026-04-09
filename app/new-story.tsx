import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { announce } from "@/lib/a11y-helpers";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { trpc } from "@/lib/trpc";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { IllustratedEmptyState } from "@/components/illustrated-empty-state";
import {
  STORY_THEMES,
  EDUCATIONAL_VALUES,
  STORY_PACING,
} from "@/constants/assets";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ─── Step definitions ────────────────────────────────────── */
const STEPS = [
  { label: "Theme", icon: "color-palette-outline" },
  { label: "Customize", icon: "options-outline" },
  { label: "Preview", icon: "eye-outline" },
  { label: "Generate", icon: "sparkles-outline" },
] as const;

const STORY_LENGTH_OPTIONS = [
  { id: "short", label: "Short", time: "5-10 min", emoji: "📄" },
  { id: "medium", label: "Medium", time: "15-20 min", emoji: "📖" },
  { id: "long", label: "Long", time: "25-30 min", emoji: "📚" },
];

const STORY_TONE_OPTIONS = [
  { id: "adventurous", label: "Adventurous", emoji: "⚔️" },
  { id: "calm", label: "Calm", emoji: "🌙" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "magical", label: "Magical", emoji: "✨" },
];

/* ─── Generation status messages ──────────────────────────── */
const GEN_MESSAGES = [
  { text: "Opening the storybook...", emoji: "📖" },
  { text: "Mixing a pot of imagination...", emoji: "🪄" },
  { text: "Painting the first scene...", emoji: "🎨" },
  { text: "Characters are coming to life...", emoji: "🧸" },
  { text: "Adding a sprinkle of magic...", emoji: "✨" },
  { text: "Illustrating the pages...", emoji: "🖌️" },
  { text: "Almost ready to read...", emoji: "📚" },
];

export default function NewStoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{
    childId: string;
    childName: string;
    quickStory?: string;
    theme?: string;
    themeName?: string;
  }>();

  /* ── Wizard state ── */
  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    params?.theme || null
  );
  const [storyLength, setStoryLength] = useState<string | null>(null);
  const [storyTone, setStoryTone] = useState<string | null>(null);
  const [storyMorals, setStoryMorals] = useState<string[]>([]);
  const [customElements, setCustomElements] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessageIdx, setGenMessageIdx] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  /* ── Animation shared values ── */
  const stepProgress = useSharedValue(0);
  const quillRotation = useSharedValue(0);
  const bookScale = useSharedValue(0.8);
  const bookRotateY = useSharedValue(-90);
  const genProgress = useSharedValue(0);

  const generateMutation = trpc.stories.generateStory.useMutation();

  /* ── Quick story auto-advance ── */
  useEffect(() => {
    if (params?.quickStory === "true" && params?.theme) {
      setSelectedTheme(params.theme);
      setStoryLength("medium");
      setStoryTone("magical");
      setStoryMorals(["Kindness"]);
      // Jump straight to generate
      setStep(3);
      stepProgress.value = withTiming(3, { duration: 400 });
    }
  }, []);

  /* ── Auto-generate when step=3 for quick story ── */
  useEffect(() => {
    if (step === 3 && params?.quickStory === "true" && !isGenerating) {
      handleGenerate();
    }
  }, [step]);

  /* ── Progress bar animation ── */
  useEffect(() => {
    stepProgress.value = withSpring(step, { damping: 15, stiffness: 120 });
    announce(`Step ${step + 1} of 4: ${STEPS[step].label}`);
  }, [step]);

  /* ── Generation status cycling ── */
  useEffect(() => {
    if (!isGenerating) return;
    const timer = setInterval(() => {
      setGenMessageIdx((prev) => (prev + 1) % GEN_MESSAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [isGenerating]);

  /* ── Announce generation status ── */
  useEffect(() => {
    if (isGenerating) {
      announce(GEN_MESSAGES[genMessageIdx].text);
    }
  }, [genMessageIdx, isGenerating]);

  /* ── Immersive generation animations ── */
  useEffect(() => {
    if (step === 3) {
      if (!reducedMotion) {
        // Book opening
        bookScale.value = withSpring(1, { damping: 12, stiffness: 80 });
        bookRotateY.value = withSpring(0, { damping: 14, stiffness: 60 });
        // Quill writing
        quillRotation.value = withRepeat(
          withSequence(
            withTiming(15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(-10, { duration: 300 }),
            withTiming(5, { duration: 200 }),
            withTiming(0, { duration: 200 })
          ),
          -1,
          false
        );
      } else {
        // Set to final state instantly
        bookScale.value = 1;
        bookRotateY.value = 0;
        quillRotation.value = 0;
      }
    }
  }, [step, reducedMotion]);

  /* ── Derived ── */
  const themeObj = useMemo(
    () => STORY_THEMES.find((t) => t.id === selectedTheme),
    [selectedTheme]
  );

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return !!selectedTheme;
      case 1:
        return !!storyLength && !!storyTone && storyMorals.length > 0;
      case 2:
        return true; // preview is always ready
      case 3:
        return false; // generate step is terminal
      default:
        return false;
    }
  }, [step, selectedTheme, storyLength, storyTone, storyMorals]);

  /* ── Animated styles ── */
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${((stepProgress.value + 1) / STEPS.length) * 100}%`,
  }));

  const bookStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bookScale.value },
      { perspective: 1000 },
      { rotateY: `${bookRotateY.value}deg` },
    ],
  }));

  const quillStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${quillRotation.value}deg` }],
  }));

  /* ── Actions ── */
  const goNext = () => {
    if (step < 3) {
      setStep((s) => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      router.back();
    }
  };

  const toggleMoral = (moral: string) => {
    setStoryMorals((prev) => {
      if (prev.includes(moral)) return prev.filter((m) => m !== moral);
      if (prev.length >= 3) {
        Alert.alert("Maximum 3", "You can select up to 3 values");
        return prev;
      }
      return [...prev, moral];
    });
  };

  const handleGenerate = async () => {
    const childId = params?.childId ? parseInt(params.childId, 10) : 0;
    if (!childId) {
      Alert.alert("Error", "No child selected");
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);
      genProgress.value = withTiming(1, { duration: 20000 });

      const result = await generateMutation.mutateAsync({
        childId,
        theme: selectedTheme || "fantasy",
        storyLength: storyLength || "Medium (15-20 min)",
        tone: storyTone || "Magical",
        moralLessons: storyMorals.length > 0 ? storyMorals : ["Kindness"],
        customElements: customElements || undefined,
      });

      if (result.arcId) {
        router.push({
          pathname: "/story-detail" as any,
          params: {
            arcId: result.arcId,
            title: result.title,
            childName: params?.childName,
            theme: selectedTheme || "fantasy",
            serverArcId: result.serverArcId?.toString() || "",
          },
        });
      }
    } catch (error) {
      setIsGenerating(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate story";
      setGenerationError(errorMessage);
      announce("Generation failed. " + errorMessage);
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return renderThemeStep();
      case 1:
        return renderCustomizeStep();
      case 2:
        return renderPreviewStep();
      case 3:
        return renderGenerateStep();
    }
  };

  /* ── Step 0: Theme selection (illustrated grid) ── */
  const renderThemeStep = () => (
    <Animated.View entering={FadeInRight.duration(300)}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Choose a World
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Pick a theme for {params?.childName}'s adventure
      </Text>

      <View style={styles.themeGrid}>
        {STORY_THEMES.map((theme, idx) => {
          const isSelected = selectedTheme === theme.id;
          return (
            <Animated.View
              key={theme.id}
              entering={FadeInDown.delay(idx * 40).duration(300)}
            >
              <Pressable
                onPress={() => setSelectedTheme(theme.id)}
                accessibilityLabel={theme.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityHint="Double-tap to select this theme"
                style={({ pressed }) => [
                  styles.themeCard,
                  {
                    borderColor: isSelected ? "#FFD700" : "transparent",
                    borderWidth: 2,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {theme.image ? (
                  <Image
                    source={{ uri: theme.image }}
                    style={styles.themeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.themeImageFallback,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text style={styles.themeEmojiLarge}>{theme.emoji}</Text>
                  </View>
                )}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.75)"]}
                  style={styles.themeOverlay}
                />
                <View style={styles.themeLabel}>
                  <Text style={styles.themeLabelEmoji}>{theme.emoji}</Text>
                  <Text style={styles.themeLabelText}>{theme.label}</Text>
                </View>
                {isSelected && (
                  <View style={styles.themeCheck}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FFD700"
                    />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );

  /* ── Step 1: Customize (length, tone, morals) ── */
  const renderCustomizeStep = () => (
    <Animated.View entering={FadeInRight.duration(300)}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Customize the Story
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Set the pace and values
      </Text>

      {/* Story Length */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Story Length
      </Text>
      <View style={styles.lengthRow}>
        {STORY_LENGTH_OPTIONS.map((opt) => {
          const isSel = storyLength === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setStoryLength(opt.id)}
              accessibilityLabel={opt.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              style={[
                styles.lengthCard,
                {
                  backgroundColor: isSel
                    ? "rgba(255,215,0,0.15)"
                    : colors.card,
                  borderColor: isSel ? "#FFD700" : "transparent",
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text style={styles.lengthEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.lengthLabel,
                  { color: isSel ? "#FFD700" : colors.text },
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[styles.lengthTime, { color: colors.textSecondary }]}
              >
                {opt.time}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Story Tone */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Tone</Text>
      <View style={styles.toneRow}>
        {STORY_TONE_OPTIONS.map((opt) => {
          const isSel = storyTone === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setStoryTone(opt.id)}
              accessibilityLabel={opt.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              style={[
                styles.toneChip,
                {
                  backgroundColor: isSel
                    ? "rgba(255,215,0,0.15)"
                    : colors.card,
                  borderColor: isSel ? "#FFD700" : "transparent",
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text style={styles.toneEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.toneLabel,
                  { color: isSel ? "#FFD700" : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Moral Values */}
      <View style={styles.moralHeader}>
        <Text style={[styles.sectionLabel, { color: colors.text, flex: 1 }]}>
          Values & Lessons
        </Text>
        <View style={styles.moralCounter}>
          <Text style={styles.moralCounterText}>{storyMorals.length}/3</Text>
        </View>
      </View>
      <View style={styles.moralGrid}>
        {EDUCATIONAL_VALUES.slice(0, 12).map((val) => {
          const isSel = storyMorals.includes(val.label);
          return (
            <Pressable
              key={val.id}
              onPress={() => toggleMoral(val.label)}
              accessibilityLabel={val.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              style={[
                styles.moralChip,
                {
                  backgroundColor: isSel
                    ? "rgba(255,215,0,0.15)"
                    : colors.card,
                  borderColor: isSel ? "#FFD700" : "transparent",
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text style={styles.moralEmoji}>{val.emoji}</Text>
              <Text
                style={[
                  styles.moralLabel,
                  { color: isSel ? "#FFD700" : colors.text },
                ]}
              >
                {val.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom elements */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Special Requests (Optional)
      </Text>
      <TextInput
        value={customElements}
        onChangeText={setCustomElements}
        placeholder="E.g., a purple dragon named Sparkle"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Special requests"
        accessibilityHint="Optional: describe custom elements for your story"
        style={[
          styles.customInput,
          { backgroundColor: colors.card, color: colors.text },
        ]}
        multiline
      />
    </Animated.View>
  );

  /* ── Step 2: Live preview card ── */
  const renderPreviewStep = () => {
    const lengthObj = STORY_LENGTH_OPTIONS.find((o) => o.id === storyLength);
    const toneObj = STORY_TONE_OPTIONS.find((o) => o.id === storyTone);

    return (
      <Animated.View entering={FadeInRight.duration(300)}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Story Preview
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          Here's what we'll create for {params?.childName}
        </Text>

        {/* Preview card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.previewCard}
        >
          {/* Theme header */}
          {themeObj?.image ? (
            <Image
              source={{ uri: themeObj.image }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.previewImageFallback,
                { backgroundColor: "#1a1a2e" },
              ]}
            >
              <Text style={styles.previewFallbackEmoji}>
                {themeObj?.emoji || "📖"}
              </Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            style={styles.previewGradient}
          />

          <View style={styles.previewOverlay}>
            <Text style={styles.previewThemeName}>
              {themeObj?.emoji} {themeObj?.name || "Story"}
            </Text>
            <Text style={styles.previewChildName}>
              For {params?.childName}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.previewDetails}>
            <View style={styles.previewRow}>
              <Ionicons name="time-outline" size={16} color="#FFD700" />
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                Length
              </Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>
                {lengthObj?.label || "—"} ({lengthObj?.time || ""})
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons name="color-palette-outline" size={16} color="#FFD700" />
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                Tone
              </Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>
                {toneObj?.emoji} {toneObj?.label || "—"}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons name="heart-outline" size={16} color="#FFD700" />
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                Values
              </Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>
                {storyMorals.length > 0 ? storyMorals.join(", ") : "—"}
              </Text>
            </View>
            {customElements ? (
              <View style={styles.previewRow}>
                <Ionicons name="star-outline" size={16} color="#FFD700" />
                <Text
                  style={[
                    styles.previewLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Special
                </Text>
                <Text
                  style={[styles.previewValue, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {customElements}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Edit hint */}
        <Pressable
          onPress={() => setStep(0)}
          accessibilityLabel="Edit story details"
          accessibilityRole="button"
          accessibilityHint="Go back to customize your story"
          style={styles.editHint}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.muted} />
          <Text style={[styles.editHintText, { color: colors.muted }]}>
            Tap to go back and edit
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  /* ── Step 3: Immersive generation ── */
  const renderGenerateStep = () => {
    const msg = GEN_MESSAGES[genMessageIdx];

    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        style={styles.generateContainer}
      >
        {/* Animated storybook opening */}
        <Animated.View style={[styles.bookContainer, bookStyle]}>
          <View style={styles.bookCover}>
            <LinearGradient
              colors={["#2D1B69", "#6C5CE7", "#A29BFE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bookGradient}
            >
              <Text style={styles.bookEmoji}>
                {themeObj?.emoji || "📖"}
              </Text>
              <Text style={styles.bookTitle}>
                {themeObj?.name || "Your Story"}
              </Text>
              <Text style={styles.bookAuthor}>
                For {params?.childName}
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Quill writing animation */}
        <Animated.View style={[styles.quillContainer, quillStyle]}>
          <Text style={styles.quillEmoji}>🪶</Text>
        </Animated.View>

        {/* Status messages */}
        {isGenerating && (
          <Animated.View
            key={genMessageIdx}
            entering={FadeIn.duration(400)}
            style={styles.genMessageContainer}
          >
            <Text style={styles.genMessageEmoji}>{msg.emoji}</Text>
            <Text style={[styles.genMessageText, { color: colors.text }]}>
              {msg.text}
            </Text>
          </Animated.View>
        )}

        {/* Progress bar */}
        {isGenerating && (
          <View style={styles.genProgressTrack}>
            <Animated.View
              style={[
                styles.genProgressFill,
                useAnimatedStyle(() => ({
                  width: `${genProgress.value * 100}%`,
                })),
              ]}
            />
          </View>
        )}

        {/* Generate button (only if not auto-generating) */}
        {!isGenerating && params?.quickStory !== "true" && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Pressable
              onPress={handleGenerate}
              accessibilityLabel="Generate story"
              accessibilityHint="Starts AI story generation"
              accessibilityState={{ disabled: isGenerating }}
              style={({ pressed }) => [
                styles.generateBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Ionicons name="sparkles" size={22} color="#0A0E1A" />
              <Text style={styles.generateBtnText}>Create Story</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  /* ════════ ERROR STATE ═════════ */
  if (generationError) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <IllustratedEmptyState
            type="error"
            title="Oops! Something went wrong"
            subtitle="Don't worry, let's try that again"
            actionLabel="Try Again"
            onAction={() => {
              setGenerationError(null);
              setStep(3);
              handleGenerate();
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  /* ════════ MAIN LAYOUT ═════════ */
  return (
    <ScreenContainer>
      {/* ── Stepper header ── */}
      <View style={[styles.stepperHeader, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={goBack}
          accessibilityLabel={step === 0 ? "Close wizard" : "Previous step"}
          accessibilityRole="button"
          accessibilityHint={step === 0 ? "Close story creation wizard" : "Go back to the previous step"}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons
            name={step === 0 ? "close" : "chevron-back"}
            size={24}
            color={colors.text}
          />
        </Pressable>

        {/* Step indicators */}
        <View style={styles.stepsRow}>
          {STEPS.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            const statusText = isDone ? "done" : isCurrent ? "current" : "upcoming";
            return (
              <View
                key={s.label}
                style={styles.stepItem}
                accessibilityLabel={`Step ${i + 1}: ${s.label}, ${statusText}`}
              >
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isDone
                        ? "#FFD700"
                        : isCurrent
                        ? "rgba(255,215,0,0.2)"
                        : "rgba(255,255,255,0.08)",
                      borderColor: isCurrent ? "#FFD700" : "transparent",
                      borderWidth: isCurrent ? 1.5 : 0,
                    },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#0A0E1A" />
                  ) : (
                    <Ionicons
                      name={s.icon as any}
                      size={12}
                      color={isCurrent ? "#FFD700" : "#9CA3AF"}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isCurrent
                        ? "#FFD700"
                        : isDone
                        ? colors.text
                        : colors.muted,
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: STEPS.length, now: step + 1 }}
      >
        <Animated.View style={[styles.progressFill, progressBarStyle]} />
      </View>

      {/* ── Step content ── */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom bar (Next / Back) ── */}
      {step < 3 && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          {step === 2 ? (
            <Pressable
              onPress={() => {
                setStep(3);
              }}
              accessibilityLabel="Generate story"
              accessibilityHint="Starts AI story generation"
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: "#FFD700" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="sparkles" size={18} color="#0A0E1A" />
              <Text style={styles.nextBtnText}>Generate Story</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={goNext}
              disabled={!canAdvance}
              accessibilityLabel="Next step"
              accessibilityState={{ disabled: !canAdvance }}
              style={({ pressed }) => [
                styles.nextBtn,
                {
                  backgroundColor: canAdvance ? "#FFD700" : "rgba(255,215,0,0.3)",
                },
                pressed && canAdvance && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.nextBtnText,
                  { opacity: canAdvance ? 1 : 0.5 },
                ]}
              >
                Next
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#0A0E1A"
                style={{ opacity: canAdvance ? 1 : 0.5 }}
              />
            </Pressable>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  /* ── Stepper header ── */
  stepperHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginLeft: 4,
  },
  stepItem: {
    alignItems: "center",
    gap: 3,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
  },

  /* ── Progress bar ── */
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },

  /* ── Content ── */
  content: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },

  /* ── Theme grid (2-column) ── */
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    minHeight: 44,
  },
  themeImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  themeImageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  themeEmojiLarge: {
    fontSize: 48,
  },
  themeOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  themeLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  themeLabelEmoji: {
    fontSize: 14,
  },
  themeLabelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  themeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  /* ── Customize step ── */
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  lengthRow: {
    flexDirection: "row",
    gap: 10,
  },
  lengthCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
    minHeight: 44,
  },
  lengthEmoji: {
    fontSize: 24,
  },
  lengthLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  lengthTime: {
    fontSize: 10,
  },
  toneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toneChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    minHeight: 44,
  },
  toneEmoji: {
    fontSize: 16,
  },
  toneLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  moralHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  moralCounter: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  moralCounterText: {
    color: "#0A0E1A",
    fontSize: 11,
    fontWeight: "700",
  },
  moralGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moralChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
    minHeight: 44,
  },
  moralEmoji: {
    fontSize: 14,
  },
  moralLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  customInput: {
    minHeight: 70,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },

  /* ── Preview step ── */
  previewCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  previewImageFallback: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFallbackEmoji: {
    fontSize: 64,
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
    top: 80,
    height: 100,
  },
  previewOverlay: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
  },
  previewThemeName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  previewChildName: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  previewDetails: {
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewLabel: {
    fontSize: 12,
    width: 52,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  editHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  editHintText: {
    fontSize: 12,
  },

  /* ── Generate step (immersive) ── */
  generateContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  bookContainer: {
    marginBottom: 24,
  },
  bookCover: {
    width: 200,
    height: 260,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  bookGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  bookEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  bookTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  bookAuthor: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  quillContainer: {
    marginBottom: 20,
  },
  quillEmoji: {
    fontSize: 36,
  },
  genMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  genMessageEmoji: {
    fontSize: 20,
  },
  genMessageText: {
    fontSize: 15,
    fontWeight: "600",
  },
  genProgressTrack: {
    width: "70%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 24,
  },
  genProgressFill: {
    height: 4,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },
  generateBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
  },
  generateBtnText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },

  /* ── Bottom bar ── */
  bottomBar: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    minHeight: 44,
  },
  nextBtnText: {
    color: "#0A0E1A",
    fontSize: 15,
    fontWeight: "700",
  },
});
