import React from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface SmartHomeDeviceCardProps {
  deviceName: string;
  platform: "philips_hue" | "alexa" | "google_home" | "other";
  isEnabled: boolean;
  isConnected?: boolean;
  onToggle: (enabled: boolean) => void;
  onConfigure?: () => void;
}

const platformIcons: Record<string, string> = {
  philips_hue: "💡",
  alexa: "🔊",
  google_home: "🏠",
  other: "🔌",
};

const platformLabels: Record<string, string> = {
  philips_hue: "Philips Hue",
  alexa: "Amazon Alexa",
  google_home: "Google Home",
  other: "Smart Device",
};

export default function SmartHomeDeviceCard({
  deviceName,
  platform,
  isEnabled,
  isConnected = true,
  onToggle,
  onConfigure,
}: SmartHomeDeviceCardProps) {
  const { text, background, border, accent } = useColors();

  return (
    <View className={`rounded-lg border ${border} p-4 mb-3`} style={{ backgroundColor: background }}>
      {/* Header with icon and name */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-3">{platformIcons[platform]}</Text>
          <View className="flex-1">
            <Text className={`text-base font-semibold ${text}`}>{deviceName}</Text>
            <Text className={`text-xs ${text} opacity-60 mt-1`}>{platformLabels[platform]}</Text>
          </View>
        </View>

        {/* Connection status indicator */}
        <View
          className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          style={{ marginLeft: 8 }}
        />
      </View>

      {/* Status and Controls */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className={`text-xs ${text} opacity-50`}>{isConnected ? "Connected" : "Disconnected"}</Text>
          <Text className={`text-xs ${text} opacity-50 mt-1`}>{isEnabled ? "Enabled" : "Disabled"}</Text>
        </View>

        {/* Toggle switch */}
        <Switch value={isEnabled} onValueChange={onToggle} disabled={!isConnected} className="mr-3" />

        {/* Configure button */}
        {onConfigure && (
          <TouchableOpacity
            onPress={onConfigure}
            className={`px-3 py-2 rounded-md`}
            style={{ backgroundColor: accent + "20", borderColor: accent, borderWidth: 1 }}
          >
            <Text className={`text-xs font-semibold`} style={{ color: accent }}>
              Configure
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
