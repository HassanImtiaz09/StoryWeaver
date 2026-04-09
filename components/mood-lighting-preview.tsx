import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
// @ts-expect-error - type fix needed
import { Slider } from "@react-native-community/slider";
import { useColors } from "@/hooks/use-colors";

interface MoodLightingPreviewProps {
  currentMood?: string;
  currentColor?: string;
  brightness?: number;
  onMoodSelect?: (mood: string) => void;
  onBrightnessChange?: (brightness: number) => void;
  onTestLights?: () => void;
}

interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { id: "adventure", label: "Adventure", emoji: "🏔️", color: "#FFC857" },
  { id: "mystery", label: "Mystery", emoji: "🌙", color: "#7B5BA6" },
  { id: "happy", label: "Happy", emoji: "😊", color: "#FFD700" },
  { id: "scary", label: "Scary", emoji: "👻", color: "#1A7F7E" },
  { id: "calm", label: "Calm", emoji: "🧘", color: "#6DB5E8" },
  { id: "magical", label: "Magical", emoji: "✨", color: "#E66EE1" },
  { id: "sad", label: "Sad", emoji: "😢", color: "#5B9BD5" },
];

export default function MoodLightingPreview({
  currentMood = "calm",
  currentColor = "#6DB5E8",
  brightness = 50,
  onMoodSelect,
  onBrightnessChange,
  onTestLights,
}: MoodLightingPreviewProps) {
  const { text, background, border, accent } = useColors();
  const [selectedMood, setSelectedMood] = useState(currentMood);
  const [currentBrightness, setCurrentBrightness] = useState(brightness);

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
    onMoodSelect?.(moodId);
  };

  const handleBrightnessChange = (value: number) => {
    setCurrentBrightness(value);
    onBrightnessChange?.(value);
  };

  const selectedMoodData = MOOD_OPTIONS.find((m) => m.id === selectedMood) || MOOD_OPTIONS[4];

  return (
    <View className={`rounded-lg border ${border} p-4 mb-4`} style={{ backgroundColor: background }}>
      {/* Color Preview Circle */}
      <View className="items-center mb-6">
        <View
          className="w-24 h-24 rounded-full shadow-lg"
          style={{
            backgroundColor: selectedMoodData.color,
            opacity: currentBrightness / 100,
          }}
        />
        <Text className={`text-sm font-semibold ${text} mt-3`}>{selectedMoodData.label}</Text>
        <Text className={`text-xs ${text} opacity-60`}>{selectedMoodData.color}</Text>
      </View>

      {/* Brightness Slider */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className={`text-sm font-semibold ${text}`}>Brightness</Text>
          <Text className={`text-sm font-bold`} style={{ color: accent }}>
            {Math.round(currentBrightness)}%
          </Text>
        </View>
        <View className={`rounded-full overflow-hidden border ${border}`} style={{ height: 8 }}>
          <Slider
            style={{ height: 8 }}
            minimumValue={0}
            maximumValue={100}
            value={currentBrightness}
            onValueChange={handleBrightnessChange}
            minimumTrackTintColor={accent}
            maximumTrackTintColor="transparent"
            thumbTintColor={accent}
          />
        </View>
      </View>

      {/* Mood Selector */}
      <View className="mb-6">
        <Text className={`text-sm font-semibold ${text} mb-3`}>Select Mood</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {MOOD_OPTIONS.map((mood) => (
            <TouchableOpacity
              key={mood.id}
              onPress={() => handleMoodSelect(mood.id)}
              className={`items-center mr-4 p-3 rounded-lg ${
                selectedMood === mood.id ? `border-2 ${border}` : border
              }`}
              style={{
                borderColor: selectedMood === mood.id ? accent : "transparent",
                backgroundColor: selectedMood === mood.id ? accent + "15" : "transparent",
              }}
            >
              <Text className="text-2xl mb-1">{mood.emoji}</Text>
              <Text className={`text-xs font-semibold ${text}`}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Test Button */}
      {onTestLights && (
        <TouchableOpacity
          onPress={onTestLights}
          className="w-full py-3 rounded-lg items-center"
          style={{ backgroundColor: accent }}
        >
          <Text className="text-white font-semibold">Test Lights</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
