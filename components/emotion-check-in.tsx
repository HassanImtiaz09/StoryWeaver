import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface EmotionCheckInProps {
  onSubmit: (data: {
    emotionFelt: string;
    emotionIntensity: number;
    reflection?: string;
  }) => void;
  isLoading?: boolean;
}

const EMOTIONS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "sad", label: "Sad", emoji: "😢" },
  { id: "worried", label: "Worried", emoji: "😟" },
  { id: "brave", label: "Brave", emoji: "💪" },
  { id: "calm", label: "Calm", emoji: "😌" },
];

export default function EmotionCheckIn({
  onSubmit,
  isLoading = false,
}: EmotionCheckInProps) {
  const colors = useColors();
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [reflection, setReflection] = useState("");

  const handleSubmit = () => {
    if (!selectedEmotion) {
      alert("Please select how you felt");
      return;
    }

    onSubmit({
      emotionFelt: selectedEmotion,
      emotionIntensity: intensity,
      reflection: reflection || undefined,
    });

    // Reset form
    setSelectedEmotion(null);
    setIntensity(3);
    setReflection("");
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            How did the story make you feel?
          </Text>
          <Text className="text-sm text-gray-600">
            Your feelings help us understand your emotional journey
          </Text>
        </View>

        {/* Emotion Selection */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Pick your feeling:
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {EMOTIONS.map((emotion) => (
              <TouchableOpacity
                key={emotion.id}
                onPress={() => setSelectedEmotion(emotion.id)}
                className={cn(
                  "flex-1 min-w-max items-center py-4 px-4 rounded-2xl border-2 transition-all",
                  selectedEmotion === emotion.id
                    ? "bg-blue-100 border-blue-400 shadow-md"
                    : "bg-gray-50 border-gray-200"
                )}
                activeOpacity={0.7}
              >
                <Text className="text-4xl mb-2">{emotion.emoji}</Text>
                <Text className="text-sm font-semibold text-gray-800">
                  {emotion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Intensity Slider */}
        {selectedEmotion && (
          <View className="mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              How strong was this feeling?
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setIntensity(level)}
                  className={cn(
                    "w-12 h-12 rounded-full items-center justify-center border-2 transition-all",
                    intensity === level
                      ? "bg-blue-400 border-blue-600 shadow-md"
                      : "bg-white border-gray-200"
                  )}
                >
                  <Text
                    className={cn(
                      "font-bold text-lg",
                      intensity === level ? "text-white" : "text-gray-700"
                    )}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row justify-between px-2">
              <Text className="text-xs text-gray-600 font-medium">
                A little
              </Text>
              <Text className="text-xs text-gray-600 font-medium">
                Very much
              </Text>
            </View>
          </View>
        )}

        {/* Reflection prompt */}
        {selectedEmotion && (
          <View className="mb-8">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              What would you do differently?
            </Text>
            <Text className="text-sm text-gray-600 mb-3">
              (Optional - what did the character do that you liked?)
            </Text>
            <TextInput
              placeholder="Share your thoughts..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={reflection}
              onChangeText={setReflection}
              editable={!isLoading}
              className="bg-gray-50 border border-gray-300 rounded-xl p-4 text-gray-800 text-base"
              style={{ textAlignVertical: "top" }}
            />
          </View>
        )}

        {/* Submit Button */}
        {selectedEmotion && (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className={cn(
              "py-4 px-6 rounded-xl items-center mb-6",
              isLoading
                ? "bg-gray-300"
                : "bg-blue-500 shadow-lg"
            )}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-lg">
              {isLoading ? "Saving..." : "Save My Feelings"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Empty state */}
        {!selectedEmotion && (
          <View className="py-8 items-center">
            <Text className="text-6xl mb-4">😊</Text>
            <Text className="text-gray-600 text-center">
              Your feelings matter! Please select one above.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
