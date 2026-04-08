import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";

export interface VoiceFeedbackProps {
  command?: string;
  response: string;
  type: "success" | "error" | "info";
  autoHideDuration?: number;
  onDismiss?: () => void;
}

export function VoiceFeedbackBubble({
  command,
  response,
  type,
  autoHideDuration = 5000,
  onDismiss,
}: VoiceFeedbackProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (visible && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [visible, autoHideDuration, onDismiss]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#DCFCE7"; // light green
      case "error":
        return "#FEE2E2"; // light red
      case "info":
      default:
        return "#EFF6FF"; // light blue
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "#22C55E"; // green
      case "error":
        return "#EF4444"; // red
      case "info":
      default:
        return "#3B82F6"; // blue
    }
  };

  const getIconName = () => {
    switch (type) {
      case "success":
        return "checkmark.circle.fill";
      case "error":
        return "xmark.circle.fill";
      case "info":
      default:
        return "bubble.right.fill";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "success":
        return "#22C55E";
      case "error":
        return "#EF4444";
      case "info":
      default:
        return "#3B82F6";
    }
  };

  return (
    <Animated.View
      entering={SlideInUp}
      exiting={SlideOutDown}
      className="absolute top-20 left-4 right-4"
    >
      <View
        className="rounded-2xl p-4 flex-row gap-3 items-start shadow-lg"
        style={{
          backgroundColor: getBackgroundColor(),
          borderWidth: 1.5,
          borderColor: getBorderColor(),
        }}
      >
        {/* Icon */}
        <View className="mt-0.5">
          <IconSymbol
            name={getIconName()}
            size={20}
            color={getIconColor()}
            weight="semibold"
          />
        </View>

        {/* Content */}
        <View className="flex-1">
          {command && (
            <Text className="text-xs font-semibold text-gray-600 mb-1">
              You said: "{command}"
            </Text>
          )}
          <Text
            className="text-sm text-gray-800 font-medium"
            numberOfLines={4}
          >
            {response}
          </Text>
        </View>

        {/* Close button */}
        <Pressable
          onPress={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="ml-2 mt-0.5"
        >
          <IconSymbol
            name="xmark"
            size={16}
            color={getIconColor()}
            weight="semibold"
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}
