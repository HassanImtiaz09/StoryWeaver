import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CHILD_INTERESTS } from "@/constants/assets";
import { saveLocalChild, type LocalChild } from "@/lib/onboarding-store";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeInDown } from "react-native-reanimated";

const HAIR_COLORS = [
  { id: "black", label: "Black", color: "#1a1a1a" },
  { id: "brown", label: "Brown", color: "#6B3A2A" },
  { id: "blonde", label: "Blonde", color: "#D4A853" },
  { id: "red", label: "Red", color: "#B5432A" },
  { id: "auburn", label: "Auburn", color: "#8B4513" },
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
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    );
  };

  const canSave = name.trim().length > 0 && age !== null;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const child: LocalChild = {
        id: Date.now().toString(),
        name: name.trim(),
        age: age!,
        gender: gender ?? undefined,
        hairColor: hairColor ?? undefined,
        skinTone: skinTone ?? undefined,
        interests,
        createdAt: new Date().toISOString(),
      };
      await saveLocalChild(child);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.header, { color: colors.foreground }]}>
            Create Your Child's Profile
          </Text>
          <Text style={[styles.subheader, { color: colors.muted }]}>
            Tell us about your little one so we can personalize their stories
          </Text>
        </Animated.View>

        {/* Name */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter child's name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            maxLength={50}
            returnKeyType="done"
          />
        </Animated.View>

        {/* Age */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Age *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {AGES.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setAge(a)}
                  style={({ pressed }) => [
                    styles.ageChip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    age === a && styles.ageChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.ageText, { color: colors.foreground }, age === a && styles.ageTextActive]}>
                    {a}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Gender */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Gender (optional)</Text>
          <View style={styles.chipRow}>
            {["Boy", "Girl", "Other"].map((g) => (
              <Pressable
                key={g}
                onPress={() => setGender(gender === g ? null : g)}
                style={({ pressed }) => [
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  gender === g && styles.chipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.foreground }, gender === g && styles.chipTextActive]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Hair Color */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Hair Color (optional)</Text>
          <View style={styles.chipRow}>
            {HAIR_COLORS.map((hc) => (
              <Pressable
                key={hc.id}
                onPress={() => setHairColor(hairColor === hc.id ? null : hc.id)}
                style={({ pressed }) => [
                  styles.colorChip,
                  { borderColor: colors.border },
                  hairColor === hc.id && { borderColor: "#FFD700", borderWidth: 2 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: hc.color }]} />
                <Text style={[styles.colorLabel, { color: colors.foreground }]}>{hc.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Skin Tone */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Skin Tone (optional)</Text>
          <View style={styles.chipRow}>
            {SKIN_TONES.map((st) => (
              <Pressable
                key={st.id}
                onPress={() => setSkinTone(skinTone === st.id ? null : st.id)}
                style={({ pressed }) => [
                  styles.colorChip,
                  { borderColor: colors.border },
                  skinTone === st.id && { borderColor: "#FFD700", borderWidth: 2 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: st.color }]} />
                <Text style={[styles.colorLabel, { color: colors.foreground }]}>{st.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Interests */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Interests (pick up to 5)
          </Text>
          <View style={styles.interestGrid}>
            {CHILD_INTERESTS.map((interest) => {
              const selected = interests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  style={({ pressed }) => [
                    styles.interestChip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selected && styles.interestChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.interestText,
                      { color: colors.foreground },
                      selected && styles.interestTextActive,
                    ]}
                  >
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.buttonArea}>
          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
              pressed && canSave && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Creating..." : "Create Profile"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ageChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ageChipActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  ageText: {
    fontSize: 16,
    fontWeight: "600",
  },
  ageTextActive: {
    color: "#0A0E1A",
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#0A0E1A",
  },
  colorChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestChipActive: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderColor: "#FFD700",
  },
  interestText: {
    fontSize: 14,
    fontWeight: "500",
  },
  interestTextActive: {
    color: "#FFD700",
  },
  buttonArea: {
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: "#0A0E1A",
    fontSize: 18,
    fontWeight: "700",
  },
});
