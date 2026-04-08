import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import Animated, { FadeInDown } from "react-native-reanimated";

interface StoryPreference {
  id: string;
  title: string;
  icon: string;
  options: string[];
}

const STORY_LENGTH_OPTIONS = ["Short (5-10 min)", "Medium (15-20 min)", "Long (25-30 min)"];
const STORY_TONE_OPTIONS = ["Adventurous", "Calm", "Funny", "Magical"];
const STORY_MORAL_OPTIONS = ["Courage", "Kindness", "Creativity", "Friendship"];

export default function NewStoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    childId: string;
    childName: string;
    theme?: string;
    themeName?: string;
  }>();

  const [storyLength, setStoryLength] = useState<string | null>(null);
  const [storyTone, setStoryTone] = useState<string | null>(null);
  const [storyMoral, setStoryMoral] = useState<string | null>(null);
  const [customElements, setCustomElements] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Use tRPC mutation for story generation
  const generateMutation = trpc.stories.generateStory.useMutation();

  const handleGenerateStory = async () => {
    if (!storyLength || !storyTone || !storyMoral) {
      Alert.alert("Missing Options", "Please select story length, tone, and moral lesson");
      return;
    }

    const childId = params?.childId ? parseInt(params.childId, 10) : 0;
    if (!childId) {
      Alert.alert("Error", "No child selected");
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateMutation.mutateAsync({
        childId,
        theme: params?.theme || "fantasy",
        storyLength,
        tone: storyTone,
        moralLesson: storyMoral,
        customElements: customElements || undefined,
      });

      if (result.arcId) {
        // Navigate to story detail
        router.push({
          pathname: "/story-detail" as any,
          params: {
            arcId: result.arcId,
            title: result.title,
            childName: params?.childName,
            theme: params?.theme || "fantasy",
            serverArcId: result.serverArcId?.toString() || "",
          },
        });
      }
    } catch (error) {
      Alert.alert(
        "Generation Error",
        error instanceof Error ? error.message : "Failed to generate story"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="close-outline" size={28} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>New Story</Text>
            {params?.themeName && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Theme: {params.themeName}
              </Text>
            )}
            {params?.childName && (
              <Text style={[styles.childName, { color: colors.textSecondary }]}>
                For {params.childName}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Story Length Selection */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How long should the story be?
          </Text>
          <View style={styles.optionsGrid}>
            {STORY_LENGTH_OPTIONS.map((option, index) => (
              <Pressable
                key={option}
                onPress={() => setStoryLength(option)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      storyLength === option
                        ? colors.primary
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: storyLength === option ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Story Tone Selection */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What tone should it have?
          </Text>
          <View style={styles.optionsGrid}>
            {STORY_TONE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setStoryTone(option)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      storyTone === option
                        ? colors.primary
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: storyTone === option ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Moral Lesson Selection */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What should it teach?
          </Text>
          <View style={styles.optionsGrid}>
            {STORY_MORAL_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setStoryMoral(option)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      storyMoral === option
                        ? colors.primary
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    {
                      color: storyMoral === option ? "#0A0E1A" : colors.text,
                    },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Custom Elements (Optional) */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Add Custom Elements (Optional)
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            E.g., "dinosaurs", "space adventure", "best friend Sarah"
          </Text>
          <View
            style={[
              styles.inputContainer,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.inputText, { color: colors.text }]}>
              {customElements || "Enter custom elements..."}
            </Text>
          </View>
        </Animated.View>

        {/* Generate Button */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={handleGenerateStory}
            disabled={isGenerating}
            style={({ pressed }) => [
              styles.generateButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
              isGenerating && { opacity: 0.6 },
            ]}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#0A0E1A" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#0A0E1A" />
                <Text style={styles.generateButtonText}>Generate Story</Text>
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
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
    gap: 12,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  childName: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 20,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    flexBasis: "48%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  inputContainer: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    justifyContent: "center",
    marginBottom: 8,
  },
  inputText: {
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
});
