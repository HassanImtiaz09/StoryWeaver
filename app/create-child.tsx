import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import {
  saveLocalChild,
  type LocalChild,
  type NeurodivergentProfile,
} from "@/lib/onboarding-store";
import {
  CHILD_INTERESTS,
  PERSONALITY_TRAITS,
  CHILDHOOD_FEARS,
  FAVORITE_COLORS,
  READING_LEVELS,
  STORY_LANGUAGES,
  GENDER_OPTIONS,
  HAIR_COLORS,
  SKIN_TONES,
  NEURODIVERGENT_TYPES,
  SENSORY_PREFERENCES,
  COMMUNICATION_STYLES,
  STORY_PACING,
} from "@/constants/assets";

const TOTAL_STEPS = 5;

export default function CreateChildScreen() {
  const router = useRouter();
  const colors = useColors();
  const [step, setStep] = useState(0);

  // Step 0: Basics
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [readingLevel, setReadingLevel] = useState("");
  const [language, setLanguage] = useState("English");
  const [bedtime, setBedtime] = useState("");

  // Step 1: Story Hero Appearance (character avatar design)
  const [hairColor, setHairColor] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [favoriteColor, setFavoriteColor] = useState("");

  // Step 2: Personality
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [fears, setFears] = useState<string[]>([]);
  const [favoriteCharacter, setFavoriteCharacter] = useState("");

  // Step 3: Interests
  const [interests, setInterests] = useState<string[]>([]);

  // Step 4: Neurodivergent Support
  const [isNeurodivergent, setIsNeurodivergent] = useState(false);
  const [ndProfiles, setNdProfiles] = useState<string[]>([]);
  const [sensoryPrefs, setSensoryPrefs] = useState<string[]>([]);
  const [commStyle, setCommStyle] = useState("");
  const [storyPacing, setStoryPacing] = useState("moderate");
  const [customNotes, setCustomNotes] = useState("");

  const toggleArrayItem = (arr: string[], setArr: (v: string[]) => void, item: string, max: number) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else if (arr.length < max) {
      setArr([...arr, item]);
    }
  };

  const canProceed = useCallback(() => {
    switch (step) {
      case 0:
        return name.trim().length > 0 && age.trim().length > 0;
      case 1:
        return true; // hero design is optional
      case 2:
        return true; // personality is optional
      case 3:
        return interests.length > 0;
      case 4:
        return true; // neurodivergent is optional
      default:
        return false;
    }
  }, [step, name, age, interests]);

  const handleSave = useCallback(async () => {
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 15) {
      Alert.alert("Invalid Age", "Please enter an age between 1 and 15.");
      return;
    }

    const ndProfileObjects: NeurodivergentProfile[] = ndProfiles.map((type) => ({
      type,
      sensoryPreferences: sensoryPrefs,
      communicationStyle: commStyle || undefined,
      storyPacing: storyPacing,
      customNotes: customNotes || undefined,
    }));

    const child: LocalChild = {
      id: Date.now().toString(),
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      age: parsedAge,
      gender: gender || undefined,
      hairColor: hairColor || undefined,
      skinTone: skinTone || undefined,
      interests,
      favoriteColor: favoriteColor || undefined,
      personalityTraits: personalityTraits.length > 0 ? personalityTraits : undefined,
      fears: fears.length > 0 ? fears : undefined,
      readingLevel: readingLevel || undefined,
      language,
      bedtime: bedtime || undefined,
      favoriteCharacter: favoriteCharacter || undefined,
      isNeurodivergent,
      neurodivergentProfiles: isNeurodivergent ? ndProfileObjects : undefined,
      sensoryPreferences: sensoryPrefs.length > 0 ? sensoryPrefs : undefined,
      communicationStyle: commStyle || undefined,
      storyPacing: isNeurodivergent ? storyPacing : undefined,
      createdAt: new Date().toISOString(),
    };

    await saveLocalChild(child);
    router.back();
  }, [
    name, nickname, age, gender, hairColor, skinTone, interests, favoriteColor,
    personalityTraits, fears, readingLevel, language, bedtime, favoriteCharacter,
    isNeurodivergent, ndProfiles, sensoryPrefs, commStyle, storyPacing, customNotes,
    router,
  ]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleSave();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
    emoji?: string
  ) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.primary : colors.card },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? "#fff" : colors.text },
        ]}
      >
        {emoji ? `${emoji} ` : ""}{label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>
              {step > 0 ? "\u2190 Back" : "\u2715 Cancel"}
            </Text>
          </Pressable>
          <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
            Step {step + 1} of {TOTAL_STEPS}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
              },
            ]}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Step 0: Basics ─────────────────────────── */}
          {step === 0 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {"\u{1F476}"} Tell us about your child
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                This helps us create personalized stories
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Child's first name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.text }]}>Nickname</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="What do they like to be called?"
                placeholderTextColor={colors.textSecondary}
                value={nickname}
                onChangeText={setNickname}
              />

              <Text style={[styles.label, { color: colors.text }]}>Age *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="1-15"
                placeholderTextColor={colors.textSecondary}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                maxLength={2}
              />

              <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((g) =>
                  renderChip(g.label, gender === g.label, () => setGender(g.label), g.emoji)
                )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Reading Level</Text>
              <View style={styles.chipRow}>
                {READING_LEVELS.map((r) =>
                  renderChip(r, readingLevel === r, () => setReadingLevel(r))
                )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Story Language</Text>
              <View style={styles.chipRow}>
                {STORY_LANGUAGES.map((l) =>
                  renderChip(l, language === l, () => setLanguage(l))
                )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Bedtime</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 7:30 PM"
                placeholderTextColor={colors.textSecondary}
                value={bedtime}
                onChangeText={setBedtime}
              />
            </Animated.View>
          )}

          {/* ─── Step 1: Design Story Hero ─────────────── */}
          {step === 1 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {"\u{1F3A8}"} Design {name ? `${name}'s` : "Your"} Story Hero
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Create an avatar for {name ? `${name}'s` : "your"} storybook adventures.
                This is how the character will appear in illustrations.
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>Hero's Hair</Text>
              <View style={styles.chipRow}>
                {HAIR_COLORS.map((h) =>
                  renderChip(h, hairColor === h, () => setHairColor(h))
                )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Hero's Skin Tone</Text>
              <View style={styles.chipRow}>
                {SKIN_TONES.map((s) => (
                  <Pressable
                    key={s.label}
                    onPress={() => setSkinTone(s.label)}
                    style={[
                      styles.skinChip,
                      skinTone === s.label && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    <View style={[styles.skinDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.skinLabel, { color: colors.text }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Hero's Favorite Color</Text>
              <View style={styles.chipRow}>
                {FAVORITE_COLORS.map((c) =>
                  renderChip(c, favoriteColor === c, () => setFavoriteColor(c))
                )}
              </View>

              <Text style={[styles.heroHint, { color: colors.textSecondary }]}>
                {"\u{2139}\u{FE0F}"} These choices customize your story character's look — like designing a game avatar.
                Feel free to pick any combination you like!
              </Text>
            </Animated.View>
          )}

          {/* ─── Step 2: Personality ───────────────────── */}
          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {"\u{1F31F}"} {name || "Your child"}'s personality
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Stories adapt to their unique character
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>
                Personality Traits (up to 5)
              </Text>
              <View style={styles.chipRow}>
                {PERSONALITY_TRAITS.map((t) =>
                  renderChip(
                    t,
                    personalityTraits.includes(t),
                    () => toggleArrayItem(personalityTraits, setPersonalityTraits, t, 5)
                  )
                )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>
                Fears to Address (up to 3)
              </Text>
              <Text style={[styles.labelHint, { color: colors.textSecondary }]}>
                Stories will gently help overcome these
              </Text>
              <View style={styles.chipRow}>
                {CHILDHOOD_FEARS.map((f) =>
                  renderChip(
                    f,
                    fears.includes(f),
                    () => toggleArrayItem(fears, setFears, f, 3)
                  )
                )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Favorite Character/Hero</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Spider-Man, Elsa, a brave knight"
                placeholderTextColor={colors.textSecondary}
                value={favoriteCharacter}
                onChangeText={setFavoriteCharacter}
              />
            </Animated.View>
          )}

          {/* ─── Step 3: Interests ─────────────────────── */}
          {step === 3 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {"\u{2728}"} What does {name || "your child"} love?
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Pick up to 10 interests to inspire stories
              </Text>

              <View style={styles.chipRow}>
                {CHILD_INTERESTS.map((i) =>
                  renderChip(
                    i,
                    interests.includes(i),
                    () => toggleArrayItem(interests, setInterests, i, 10)
                  )
                )}
              </View>

              <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                {interests.length}/10 selected
              </Text>
            </Animated.View>
          )}

          {/* ─── Step 4: Neurodivergent Support ────────── */}
          {step === 4 && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {"\u{1F9E9}"} Neurodivergent Support
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Optional: Tailor stories for your child's unique way of experiencing the world
              </Text>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Enable neurodivergent story adaptations
                </Text>
                <Switch
                  value={isNeurodivergent}
                  onValueChange={setIsNeurodivergent}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              {isNeurodivergent && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Profile Type (select all that apply)
                  </Text>
                  {NEURODIVERGENT_TYPES.map((nd) => (
                    <Pressable
                      key={nd.id}
                      onPress={() => toggleArrayItem(ndProfiles, setNdProfiles, nd.id, 4)}
                      style={[
                        styles.ndCard,
                        {
                          backgroundColor: ndProfiles.includes(nd.id)
                            ? colors.primary + "20"
                            : colors.card,
                          borderColor: ndProfiles.includes(nd.id)
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.ndEmoji}>{nd.emoji}</Text>
                      <View style={styles.ndTextWrap}>
                        <Text style={[styles.ndLabel, { color: colors.text }]}>{nd.label}</Text>
                        <Text style={[styles.ndDesc, { color: colors.textSecondary }]}>
                          {nd.description}
                        </Text>
                      </View>
                    </Pressable>
                  ))}

                  <Text style={[styles.label, { color: colors.text }]}>
                    Sensory Preferences
                  </Text>
                  <View style={styles.chipRow}>
                    {SENSORY_PREFERENCES.map((s) =>
                      renderChip(
                        s,
                        sensoryPrefs.includes(s),
                        () => toggleArrayItem(sensoryPrefs, setSensoryPrefs, s, 5)
                      )
                    )}
                  </View>
                  <Text style={[styles.label, { color: colors.text }]}>Communication Style</Text>
                  <View style={styles.chipRow}>
                    {COMMUNICATION_STYLES.map((c) =>
                      renderChip(c, commStyle === c, () => setCommStyle(c))
                    )}
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>Story Pacing</Text>
                  {STORY_PACING.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setStoryPacing(p.id)}
                      style={[
                        styles.pacingCard,
                        {
                          backgroundColor: storyPacing === p.id ? colors.primary + "20" : colors.card,
                          borderColor: storyPacing === p.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.pacingEmoji}>{p.emoji}</Text>
                      <View>
                        <Text style={[styles.pacingLabel, { color: colors.text }]}>{p.label}</Text>
                        <Text style={[styles.pacingDesc, { color: colors.textSecondary }]}>
                          {p.description}
                        </Text>
                      </View>
                    </Pressable>
                  ))}

                  <Text style={[styles.label, { color: colors.text }]}>Additional Notes</Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder="Any other details that help us create better stories..."
                    placeholderTextColor={colors.textSecondary}
                    value={customNotes}
                    onChangeText={setCustomNotes}
                    multiline
                    numberOfLines={3}
                  />
                </Animated.View>
              )}
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleNext}
            disabled={!canProceed()}
            style={[
              styles.nextButton,
              {
                backgroundColor: canProceed() ? colors.primary : colors.muted,
              },
            ]}
          >
            <Text style={styles.nextText}>
              {step === TOTAL_STEPS - 1 ? "\u2713 Create Profile" : "Continue \u2192"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 16, fontWeight: "500" },
  stepLabel: { fontSize: 14 },
  progressTrack: { height: 4, marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  stepTitle: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  stepSubtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 8, marginTop: 20 },
  labelHint: { fontSize: 12, marginBottom: 8, marginTop: -4 },
  heroHint: { fontSize: 12, marginTop: 20, lineHeight: 18, fontStyle: "italic" },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 15,
    borderWidth: 1,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: { fontSize: 13, fontWeight: "500" },
  skinChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  skinDot: { width: 20, height: 20, borderRadius: 10 },
  skinLabel: { fontSize: 13 },
  countLabel: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
  },
  // Neurodivergent
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: "500", flex: 1, marginRight: 12 },
  ndCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  ndEmoji: { fontSize: 28 },
  ndTextWrap: { flex: 1 },
  ndLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  ndDesc: { fontSize: 12, lineHeight: 18 },
  pacingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  pacingEmoji: { fontSize: 24 },
  pacingLabel: { fontSize: 15, fontWeight: "600" },
  pacingDesc: { fontSize: 12 },
  // Bottom
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
  },
  nextText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
