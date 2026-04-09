import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useGrandparentStore } from "@/lib/grandparent-store";

type MemoryCategory =
  | "childhood"
  | "travel"
  | "family_tradition"
  | "funny_moment"
  | "life_lesson";

interface MemoryPromptInputProps {
  onSubmit: (memory: string, category: MemoryCategory) => Promise<void>;
  onGenerateStory?: (memoryId: number) => Promise<void>;
  isLoading?: boolean;
}

const MEMORY_CATEGORIES = [
  { id: "childhood" as const, label: "Childhood Memory", emoji: "👶" },
  { id: "travel" as const, label: "Travel Adventure", emoji: "✈️" },
  { id: "family_tradition" as const, label: "Family Tradition", emoji: "🎄" },
  { id: "funny_moment" as const, label: "Funny Moment", emoji: "😄" },
  { id: "life_lesson" as const, label: "Life Lesson", emoji: "💡" },
];

const MAX_CHARACTERS = 2000;
const MIN_CHARACTERS = 10;

export default function MemoryPromptInput({
  onSubmit,
  onGenerateStory,
  isLoading = false,
}: MemoryPromptInputProps) {
  const colors = useColors();
  const { fontSize } = useGrandparentStore();
  const { width } = useWindowDimensions();
  const [memory, setMemory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>("childhood");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scaledFontSize = (size: number) => Math.round(size * fontSize);
  const characterCount = memory.length;
  const isValidLength = characterCount >= MIN_CHARACTERS && characterCount <= MAX_CHARACTERS;
  const canSubmit = isValidLength && !isSubmitting && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      await onSubmit(memory.trim(), selectedCategory);
      setMemory("");
      setSelectedCategory("childhood");
    } catch (error) {
      console.error("Error submitting memory:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCharacterCountColor = () => {
    if (characterCount < MIN_CHARACTERS) return colors.error;
    if (characterCount > MAX_CHARACTERS * 0.9) return colors.warning;
    return colors.success;
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: "hidden",
      }}
      scrollEnabled={false}
    >
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text
          style={{
            fontSize: scaledFontSize(20),
            fontWeight: "700",
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Share a Memory
        </Text>
        <Text
          style={{
            fontSize: scaledFontSize(14),
            color: colors.textSecondary,
            marginBottom: 16,
          }}
        >
          Tell us about a special moment that we can weave into a story for the children.
        </Text>

        {/* Memory Input */}
        <View
          style={{
            marginBottom: 16,
            borderRadius: 8,
            backgroundColor: colors.background,
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        >
          <TextInput
            style={{
              padding: 12,
              fontSize: scaledFontSize(16),
              color: colors.text,
              minHeight: 120,
              textAlignVertical: "top",
            }}
            placeholder="Write your memory here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            scrollEnabled
            maxLength={MAX_CHARACTERS}
            value={memory}
            onChangeText={setMemory}
            editable={!isSubmitting && !isLoading}
          />
        </View>

        {/* Character Counter */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: scaledFontSize(12),
              color: colors.textSecondary,
            }}
          >
            Minimum {MIN_CHARACTERS} characters
          </Text>
          <Text
            style={{
              fontSize: scaledFontSize(14),
              fontWeight: "600",
              color: getCharacterCountColor(),
            }}
          >
            {characterCount} / {MAX_CHARACTERS}
          </Text>
        </View>

        {/* Category Selection */}
        <Text
          style={{
            fontSize: scaledFontSize(16),
            fontWeight: "600",
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Memory Type
        </Text>

        <View style={{ marginBottom: 16, gap: 8 }}>
          {MEMORY_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              disabled={isSubmitting || isLoading}
              style={{
                flexDirection: "row",
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor:
                  selectedCategory === category.id ? colors.primary : colors.background,
                borderWidth: 2,
                borderColor:
                  selectedCategory === category.id ? colors.primary : colors.border,
                opacity: isSubmitting || isLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: scaledFontSize(24), marginRight: 12 }}>
                {category.emoji}
              </Text>
              <Text
                style={{
                  fontSize: scaledFontSize(14),
                  fontWeight: "500",
                  color:
                    selectedCategory === category.id ? "white" : colors.text,
                  flex: 1,
                }}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: canSubmit ? colors.primary : colors.disabled,
            marginBottom: 12,
          }}
        >
          {isSubmitting || isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text
              style={{
                fontSize: scaledFontSize(16),
                fontWeight: "700",
                color: "white",
                textAlign: "center",
              }}
            >
              Share This Memory
            </Text>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <Text
          style={{
            fontSize: scaledFontSize(12),
            color: colors.textSecondary,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          Our storyteller will turn this into a magical tale for the children!
        </Text>
      </View>
    </ScrollView>
  );
}
