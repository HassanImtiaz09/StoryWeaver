import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface SmartHomeStatusBarProps {
  isEnabled: boolean;
  activeScene?: string;
  connectedDeviceCount?: number;
  onToggle?: (enabled: boolean) => void;
  onPress?: () => void;
}

export default function SmartHomeStatusBar({
  isEnabled,
  activeScene,
  connectedDeviceCount = 0,
  onToggle,
  onPress,
}: SmartHomeStatusBarProps) {
  const { text, background, border, accent } = useColors();

  if (!isEnabled) {
    return null;
  }

  const getSceneEmoji = (scene?: string): string => {
    const sceneMap: Record<string, string> = {
      adventure: "🏔️",
      mystery: "🌙",
      happy: "😊",
      scary: "👻",
      calm: "🧘",
      magical: "✨",
      sad: "😢",
      bedtime: "🛌",
    };
    return sceneMap[scene || ""] || "🏠";
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-lg border ${border} p-3 mb-4`}
      style={{ backgroundColor: accent + "15" }}
      activeOpacity={0.7}
    >
      {/* Left side - Status and device count */}
      <View className="flex-1 flex-row items-center">
        <View
          className="w-3 h-3 rounded-full mr-2"
          style={{ backgroundColor: accent }}
        />
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${text}`}>Smart Home Active</Text>
          {connectedDeviceCount > 0 && (
            <Text className={`text-xs ${text} opacity-60`}>
              {connectedDeviceCount} {connectedDeviceCount === 1 ? "device" : "devices"} connected
            </Text>
          )}
        </View>
      </View>

      {/* Center - Active scene indicator */}
      {activeScene && (
        <View className="flex-row items-center mx-3">
          <Text className="text-lg">{getSceneEmoji(activeScene)}</Text>
          <Text className={`text-xs font-semibold ${text} ml-1 capitalize`} numberOfLines={1}>
            {activeScene}
          </Text>
        </View>
      )}

      {/* Right side - Toggle button */}
      <TouchableOpacity
        onPress={() => onToggle?.(false)}
        className="px-3 py-1 rounded-full"
        style={{ backgroundColor: accent + "30" }}
      >
        <Text className="text-lg">✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
