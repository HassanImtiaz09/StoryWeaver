import React, { useState } from "react";
import { View, ScrollView, Pressable, Text, Modal } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";

export interface CommandHint {
  text: string;
  category: "story_modification" | "navigation" | "questions" | "fun_interactions";
}

interface VoiceCommandHintsProps {
  hints: CommandHint[];
  onSelectHint?: (hint: string) => void;
  enabled?: boolean;
}

const DEFAULT_HINTS: CommandHint[] = [
  // Story modification
  { text: "Make the dragon friendly", category: "story_modification" },
  { text: "Add a magic wand", category: "story_modification" },
  { text: "Change the setting", category: "story_modification" },

  // Navigation
  { text: "Next page", category: "navigation" },
  { text: "Go back", category: "navigation" },
  { text: "Read again", category: "navigation" },

  // Questions
  { text: "What happens next?", category: "questions" },
  { text: "Who is the hero?", category: "questions" },
  { text: "Tell me more", category: "questions" },

  // Fun interactions
  { text: "Make it funny", category: "fun_interactions" },
  { text: "Add magic", category: "fun_interactions" },
  { text: "Make it silly", category: "fun_interactions" },
];

const CATEGORY_COLORS: Record<CommandHint["category"], string> = {
  story_modification: "#9B59B6", // Purple
  navigation: "#3B82F6", // Blue
  questions: "#F59E0B", // Amber
  fun_interactions: "#EC4899", // Pink
};

const CATEGORY_LABELS: Record<CommandHint["category"], string> = {
  story_modification: "Creative",
  navigation: "Navigate",
  questions: "Ask",
  fun_interactions: "Play",
};

export function VoiceCommandHints({
  hints = DEFAULT_HINTS,
  onSelectHint,
  enabled = true,
}: VoiceCommandHintsProps) {
  const [showHints, setShowHints] = useState(false);

  if (!enabled) {
    return null;
  }

  const hintsToShow = hints.length > 0 ? hints : DEFAULT_HINTS;

  return (
    <>
      {/* Help button */}
      <Pressable
        onPress={() => setShowHints(true)}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-blue-100 items-center justify-center"
      >
        <Text className="text-lg font-bold text-blue-600">?</Text>
      </Pressable>

      {/* Hints modal */}
      <Modal
        visible={showHints}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHints(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-end"
          onPress={() => setShowHints(false)}
        >
          <Animated.View
            entering={SlideInDown}
            exiting={FadeOut}
            onStartShouldSetResponder={() => true}
            className="w-full bg-white rounded-t-3xl p-6 max-h-2/3"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-800">
                What you can say
              </Text>
              <Pressable onPress={() => setShowHints(false)}>
                <IconSymbol
                  name="xmark.circle.fill"
                  size={28}
                  color="#999999"
                />
              </Pressable>
            </View>

            {/* Scrollable hints */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              className="mb-4"
            >
              {hintsToShow.map((hint, index) => (
                <HintChip
                  key={index}
                  hint={hint}
                  onPress={() => {
                    onSelectHint?.(hint.text);
                    setShowHints(false);
                  }}
                />
              ))}
            </ScrollView>

            {/* Close button */}
            <Pressable
              onPress={() => setShowHints(false)}
              className="bg-blue-600 rounded-full py-3 items-center"
            >
              <Text className="text-white font-semibold text-base">
                Got it!
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Individual hint chip component
 */
function HintChip({
  hint,
  onPress,
}: {
  hint: CommandHint;
  onPress: () => void;
}) {
  const color = CATEGORY_COLORS[hint.category];
  const label = CATEGORY_LABELS[hint.category];

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200"
    >
      {/* Category badge */}
      <View
        className="w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <Text className="text-white text-xs font-bold">{label[0]}</Text>
      </View>

      {/* Hint text */}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800">
          {hint.text}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">{label}</Text>
      </View>

      {/* Arrow icon */}
      <IconSymbol name="chevron.right" size={16} color="#999999" />
    </Pressable>
  );
}
