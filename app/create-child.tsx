import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { createLocalChild } from "@/lib/onboarding-store";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function CreateChildScreen() {
  const router = useRouter();
  const colors = useColors();

  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const INTERESTS = [
    "Dragons", "Dinosaurs", "Space", "Princesses", "Animals",
    "Magic", "Adventure", "Science", "Sports", "Art",
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleCreateChild = async () => {
    if (!childName.trim()) {
      Alert.alert("Name Required", "Please enter your child's name");
      return;
    }

    const age = parseInt(childAge, 10);
    if (isNaN(age) || age < 2 || age > 12) {
      Alert.alert("Invalid Age", "Please enter an age between 2 and 12");
      return;
    }

    try {
      setIsLoading(true);
      await createLocalChild({
        name: childName.trim(),
        age,
        interests: selectedInterests,
      });

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create child profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Child Profile
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Let's personalize StoryWeaver for your child
          </Text>
        </Animated.View>

        {/* Name Input */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.label, { color: colors.text }]}>Child's Name</Text>
          <View
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <TextInput
              placeholder="Enter name"
              placeholderTextColor={colors.muted}
              value={childName}
              onChangeText={setChildName}
              style={[styles.inputText, { color: colors.text }]}
              editable={!isLoading}
            />
          </View>
        </Animated.View>

        {/* Age Input */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={[styles.label, { color: colors.text }]}>Age</Text>
          <View
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <TextInput
              placeholder="2-12 years"
              placeholderTextColor={colors.muted}
              value={childAge}
              onChangeText={setChildAge}
              keyboardType="number-pad"
              style={[styles.inputText, { color: colors.text }]}
              editable={!isLoading}
            />
          </View>
        </Animated.View>

        {/* Interests */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.label, { color: colors.text }]}>
            What are their interests?
          </Text>
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => (
              <Pressable
                key={interest}
                onPress={() => toggleInterest(interest)}
                disabled={isLoading}
                style={[
                  styles.interestChip,
                  {
                    backgroundColor: selectedInterests.includes(interest)
                      ? colors.primary
                      : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.interestChipText,
                    {
                      color: selectedInterests.includes(interest)
                        ? "#0A0E1A"
                        : colors.text,
                    },
                  ]}
                >
                  {interest}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Create Button */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(400)}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={handleCreateChild}
            disabled={isLoading || !childName.trim()}
            style={({ pressed }) => [
              styles.createButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
              isLoading && { opacity: 0.6 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0A0E1A" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#0A0E1A" />
                <Text style={styles.createButtonText}>Create Profile</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  inputText: {
    fontSize: 16,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 32,
  },
  createButton: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
});
