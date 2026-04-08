import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface AmbientSoundPickerProps {
  selectedSound?: string;
  volume?: number;
  autoPlay?: boolean;
  onSoundSelect?: (sound: string) => void;
  onVolumeChange?: (volume: number) => void;
  onAutoPlayToggle?: (enabled: boolean) => void;
  onPlayPreview?: (sound: string) => void;
}

interface AmbientSound {
  id: string;
  label: string;
  emoji: string;
  description: string;
  url: string;
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "rain", label: "Rain", emoji: "🌧️", description: "Gentle rainfall", url: "rain.mp3" },
  { id: "ocean", label: "Ocean Waves", emoji: "🌊", description: "Soothing ocean sounds", url: "ocean.mp3" },
  { id: "forest", label: "Forest", emoji: "🌲", description: "Forest ambience", url: "forest.mp3" },
  { id: "campfire", label: "Campfire", emoji: "🔥", description: "Crackling campfire", url: "campfire.mp3" },
  { id: "wind", label: "Wind", emoji: "💨", description: "Soft wind sounds", url: "wind.mp3" },
  { id: "stars", label: "Starry Night", emoji: "⭐", description: "Peaceful night ambience", url: "stars.mp3" },
  { id: "birds", label: "Birds", emoji: "🐦", description: "Morning bird songs", url: "birds.mp3" },
  { id: "thunderstorm", label: "Thunderstorm", emoji: "⛈️", description: "Thunder and rain", url: "thunderstorm.mp3" },
];

export default function AmbientSoundPicker({
  selectedSound = "rain",
  volume = 50,
  autoPlay = false,
  onSoundSelect,
  onVolumeChange,
  onAutoPlayToggle,
  onPlayPreview,
}: AmbientSoundPickerProps) {
  const { text, background, border, accent } = useColors();
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [isAutoPlay, setIsAutoPlay] = useState(autoPlay);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  const handleSoundSelect = (soundId: string) => {
    onSoundSelect?.(soundId);
  };

  const handleVolumeChange = (delta: number) => {
    const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
    setCurrentVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  const handleAutoPlayToggle = () => {
    const newAutoPlay = !isAutoPlay;
    setIsAutoPlay(newAutoPlay);
    onAutoPlayToggle?.(newAutoPlay);
  };

  const handlePlayPreview = (soundId: string) => {
    setPlayingSound(soundId === playingSound ? null : soundId);
    onPlayPreview?.(soundId);
  };

  const selectedSoundData = AMBIENT_SOUNDS.find((s) => s.id === selectedSound) || AMBIENT_SOUNDS[0];

  return (
    <View className={`rounded-lg border ${border} p-4`} style={{ backgroundColor: background }}>
      {/* Selected Sound Display */}
      <View className={`rounded-lg p-4 mb-4 items-center`} style={{ backgroundColor: accent + "15" }}>
        <Text className="text-4xl mb-2">{selectedSoundData.emoji}</Text>
        <Text className={`text-lg font-bold ${text} mb-1`}>{selectedSoundData.label}</Text>
        <Text className={`text-xs ${text} opacity-60`}>{selectedSoundData.description}</Text>
      </View>

      {/* Volume Control */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-sm font-semibold ${text}`}>Volume</Text>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => handleVolumeChange(-10)}
              className={`px-3 py-1 rounded border ${border} mr-2`}
            >
              <Text className={`font-bold ${text}`}>−</Text>
            </TouchableOpacity>

            <Text className="font-bold" style={{ color: accent, minWidth: 40, textAlign: "center" }}>
              {currentVolume}%
            </Text>

            <TouchableOpacity
              onPress={() => handleVolumeChange(10)}
              className={`px-3 py-1 rounded border ${border} ml-2`}
            >
              <Text className={`font-bold ${text}`}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Volume slider visual */}
        <View className={`h-2 rounded-full overflow-hidden border ${border}`}>
          <View
            className="h-full rounded-full"
            style={{
              width: `${currentVolume}%`,
              backgroundColor: accent,
            }}
          />
        </View>
      </View>

      {/* Auto-play Toggle */}
      <View className={`flex-row items-center justify-between p-3 rounded-lg mb-4 border ${border}`}>
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${text}`}>Auto-play During Stories</Text>
          <Text className={`text-xs ${text} opacity-60 mt-1`}>Start sound when reading begins</Text>
        </View>
        <Switch value={isAutoPlay} onValueChange={handleAutoPlayToggle} />
      </View>

      {/* Sound Grid */}
      <View className="mb-4">
        <Text className={`text-sm font-semibold ${text} mb-3`}>Choose Ambient Sound</Text>
        <View className="flex-row flex-wrap justify-between">
          {AMBIENT_SOUNDS.map((sound) => (
            <TouchableOpacity
              key={sound.id}
              onPress={() => handleSoundSelect(sound.id)}
              className={`w-[48%] items-center p-3 rounded-lg mb-2 border-2 ${
                selectedSound === sound.id ? border : "border-transparent"
              }`}
              style={{
                backgroundColor: selectedSound === sound.id ? accent + "20" : background,
                borderColor: selectedSound === sound.id ? accent : "transparent",
              }}
            >
              <Text className="text-3xl mb-1">{sound.emoji}</Text>
              <Text className={`text-xs font-semibold ${text} text-center`}>{sound.label}</Text>
              <Text className={`text-xs ${text} opacity-50 mt-1 text-center`}>{sound.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preview Button */}
      <TouchableOpacity
        onPress={() => handlePlayPreview(selectedSound)}
        className="w-full py-3 rounded-lg items-center"
        style={{
          backgroundColor: playingSound === selectedSound ? accent + "50" : accent + "30",
          borderColor: accent,
          borderWidth: 2,
        }}
      >
        <Text className="font-semibold" style={{ color: accent }}>
          {playingSound === selectedSound ? "⏸️ Stop Preview" : "▶️ Play Preview"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
