import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CHILD_INTERESTS, PERSONALITY_TRAITS, CHILDHOOD_FEARS, FAVORITE_COLORS, READING_LEVELS, STORY_LANGUAGES } from "@/constants/assets";
import { saveLocalChild, type LocalChild } from "@/lib/onboarding-store";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeInDown } from "react-native-reanimated";

const HAIR_COLORS = [
  { id: "black", label: "Black", color: "#1a1a1a" },
  { id: "brown", label: "Brown", color: "#6B3A2A" },
  { id: "blonde", label: "Blonde", color: "#D4A853" },
  { id: "red", label: "Red", color: "#B5432A" },
  { id: "auburn", label: "Auburn", color: "#8B4513" },
  { id: "silver", label: "Silver", color: "#C0C0C0" },
  { id: "strawberry", label: "Strawberry", color: "#D4836A" },
];

const SKIN_TONES = [
  { id: "light", label: "Light", color: "#FDDBB4" },
  { id: "medium-light", label: "Medium Light", color: "#E8B88A" },
  { id: "medium", label: "Medium", color: "#C68E5B" },
  { id: "medium-dark", label: "Medium Dark", color: "#8D5524" },
  { id: "dark", label: "Dark", color: "#5C3317" },
];

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function CreateChildScreen() {
  const router = useRouter();
  const colors = useColors();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [hairColor, setHairColor] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [fears, setFears] = useState<string[]>([]);
  const [favoriteColor, setFavoriteColor] = useState<string | null>(null);
  const [readingLevel, setReadingLevel] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("en");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string, max: number) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : list.length < max ? [...list, item] : list);
  };

  const canSave = name.trim().length > 0 && age !== null;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const child: LocalChild = {
        id: Date.now().toString(), name: name.trim(), age: age!,
        gender: gender ?? undefined, hairColor: hairColor ?? undefined,
        skinTone: skinTone ?? undefined, interests,
        favoriteColor: favoriteColor ?? undefined,
        personalityTraits: personalityTraits.length > 0 ? personalityTraits : undefined,
        fears: fears.length > 0 ? fears : undefined,
        readingLevel: readingLevel ?? undefined, language,
        createdAt: new Date().toISOString(),
      };
      await saveLocalChild(child);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={s.stepRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[s.stepDot, i === step && s.stepDotActive, i < step && s.stepDotDone]} />
      ))}
    </View>
  );

  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Text style={[s.stepTitle, { color: colors.text }]}>The Basics</Text>
      <Text style={[s.label, { color: colors.text }]}>Child's Name *</Text>
      <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} placeholder="Enter name" placeholderTextColor={colors.placeholder} />

      <Text style={[s.label, { color: colors.text }]}>Age *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
        {AGES.map((a) => (
          <Pressable key={a} onPress={() => setAge(a)} style={[s.chip, age === a && { backgroundColor: colors.primary }]}>
            <Text style={[s.chipText, age === a && { color: "#fff" }]}>{a}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[s.label, { color: colors.text }]}>Gender</Text>
      <View style={s.row}>
        {["Boy", "Girl", "Non-binary", "Prefer not to say"].map((g) => (
          <Pressable key={g} onPress={() => setGender(g)} style={[s.chip, gender === g && { backgroundColor: colors.primary }]}>
            <Text style={[s.chipText, gender === g && { color: "#fff" }]}>{g}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: colors.text }]}>Reading Level</Text>
      <View style={s.wrap}>
        {READING_LEVELS.map((rl) => (
          <Pressable key={rl.id} onPress={() => setReadingLevel(rl.id)} style={[s.chip, readingLevel === rl.id && { backgroundColor: colors.primary }]}>
            <Text style={[s.chipText, readingLevel === rl.id && { color: "#fff" }]}>{rl.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: colors.text }]}>Story Language</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
        {STORY_LANGUAGES.map((lang) => (
          <Pressable key={lang.id} onPress={() => setLanguage(lang.id)} style={[s.chip, language === lang.id && { backgroundColor: colors.primary }]}>
            <Text style={[s.chipText, language === lang.id && { color: "#fff" }]}>{lang.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Appearance</Text>
      <Text style={[s.label, { color: colors.text }]}>Hair Color</Text>
      <View style={s.colorRow}>
        {HAIR_COLORS.map((hc) => (
          <Pressable key={hc.id} onPress={() => setHairColor(hc.id)} style={[s.colorChip, { backgroundColor: hc.color, borderWidth: hairColor === hc.id ? 3 : 0, borderColor: colors.primary }]}>
            {hairColor === hc.id && <Text style={s.checkMark}>\u2713</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: colors.text }]}>Skin Tone</Text>
      <View style={s.colorRow}>
        {SKIN_TONES.map((st) => (
          <Pressable key={st.id} onPress={() => setSkinTone(st.id)} style={[s.colorChip, { backgroundColor: st.color, borderWidth: skinTone === st.id ? 3 : 0, borderColor: colors.primary }]}>
            {skinTone === st.id && <Text style={s.checkMark}>\u2713</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: colors.text }]}>Favorite Color</Text>
      <View style={s.colorRow}>
        {FAVORITE_COLORS.map((fc) => (
          <Pressable key={fc.id} onPress={() => setFavoriteColor(fc.id)} style={[s.colorChip, { backgroundColor: fc.color, borderWidth: favoriteColor === fc.id ? 3 : 0, borderColor: colors.primary }]}>
            {favoriteColor === fc.id && <Text style={s.checkMark}>\u2713</Text>}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Personality</Text>
      <Text style={[s.label, { color: colors.text }]}>Personality Traits (up to 5)</Text>
      <View style={s.wrap}>
        {PERSONALITY_TRAITS.map((trait) => (
          <Pressable key={trait} onPress={() => toggleItem(personalityTraits, setPersonalityTraits, trait, 5)} style={[s.chip, personalityTraits.includes(trait) && { backgroundColor: colors.primary }]}>
            <Text style={[s.chipText, personalityTraits.includes(trait) && { color: "#fff" }]}>{trait}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: colors.text }]}>Things That Scare Them (up to 3)</Text>
      <Text style={[s.hint, { color: colors.textSecondary }]}>Stories will gently help overcome these fears</Text>
      <View style={s.wrap}>
        {CHILDHOOD_FEARS.map((fear) => (
          <Pressable key={fear} onPress={() => toggleItem(fears, setFears, fear, 3)} style={[s.chip, fears.includes(fear) && { backgroundColor: "#E74C3C" }]}>
            <Text style={[s.chipText, fears.includes(fear) && { color: "#fff" }]}>{fear}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Interests</Text>
      <Text style={[s.label, { color: colors.text }]}>What do they love? (up to 8)</Text>
      <View style={s.wrap}>
        {CHILD_INTERESTS.map((interest) => (
          <Pressable key={interest} onPress={() => toggleItem(interests, setInterests, interest, 8)} style={[s.chip, interests.includes(interest) && { backgroundColor: colors.primary }]}>
            <Text style={[s.chipText, interests.includes(interest) && { color: "#fff" }]}>{interest}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text }]}>Create Your Child's Profile</Text>
        {renderStepIndicator()}

        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <View style={s.navRow}>
          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} style={[s.navBtn, { borderColor: colors.border }]}>
              <Text style={[s.navBtnText, { color: colors.text }]}>Back</Text>
            </Pressable>
          )}
          {step < 3 ? (
            <View style={s.navRight}>
              {step === 0 && canSave && (
                <Pressable onPress={handleSave} style={[s.skipBtn]}>
                  <Text style={[s.skipText, { color: colors.textSecondary }]}>Skip optional steps</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { if (step === 0 && !canSave) { Alert.alert("Required", "Please enter name and age."); return; } setStep(step + 1); }}
                style={[s.navBtn, { backgroundColor: colors.primary }]}>
                <Text style={[s.navBtnText, { color: "#fff" }]}>Next</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleSave} disabled={!canSave || saving} style={[s.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border }]}>
              <Text style={[s.saveBtnText]}>
                {saving ? "Saving..." : "Create Profile"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  stepRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ddd" },
  stepDotActive: { backgroundColor: "#6C63FF", width: 24 },
  stepDotDone: { backgroundColor: "#27AE60" },
  stepTitle: { fontSize: 22, fontWeight: "600", marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 8, fontStyle: "italic" },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  hScroll: { marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#f0f0f0", marginBottom: 4 },
  chipText: { fontSize: 14, fontWeight: "500" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  colorChip: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  checkMark: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 32, gap: 12 },
  navRight: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" },
  navBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  navBtnText: { fontSize: 16, fontWeight: "600" },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { fontSize: 13 },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
