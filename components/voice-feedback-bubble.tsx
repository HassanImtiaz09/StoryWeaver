// @ts-nocheck
import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  withRepeat,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
} from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";

export interface VoiceFeedbackProps {
  command?: string;
  response: string;
  type: "success" | "error" | "info";
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  autoHideDuration?: number;
  onDismiss?: () => void;
}

export function VoiceFeedbackBubble({
  command,
  response,
  type,
  isSpeaking = false,
  onStopSpeaking,
  autoHideDuration = 5000,
  onDismiss,
}: VoiceFeedbackProps) {
  const [visible, setVisible] = useState(true);
  const waveScale = useSharedValue(1);

  // Animate waveform when speaking
  useEffect(() => {
    if (isSpeaking) {
      waveScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      waveScale.value = 1;
    }
  }, [isSpeaking, waveScale]);

  const waveAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        waveScale.value,
        [1, 1.3],
        [0.3, 1],
        Extrapolate.CLAMP
      ),
      transform: [{ scaleY: waveScale.value }],
    };
  });

  useEffect(() => {
    if (visible && autoHideDuration > 0 && !isSpeaking) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [visible, autoHideDuration, onDismiss, isSpeaking]);

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
          {isSpeaking ? (
            <Animated.View style={waveAnimatedStyle}>
              <IconSymbol
                name="speaker.wave.2"
                size={20}
                color={getIconColor()}
                weight="semibold"
              />
            </Animated.View>
          ) : (
            <IconSymbol
              name={getIconName()}
              size={20}
              color={getIconColor()}
              weight="semibold"
            />
          )}
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
          {isSpeaking && (
            <Text className="text-xs font-semibold text-gray-500 mt-2">
              Speaking...
            </Text>
          )}
        </View>

        {/* Close/Mute button */}
        <Pressable
          onPress={() => {
            if (isSpeaking) {
              onStopSpeaking?.();
            } else {
              setVisible(false);
              onDismiss?.();
            }
          }}
          className="ml-2 mt-0.5"
        >
          <IconSymbol
            name={isSpeaking ? "speaker.slash.fill" : "xmark"}
            size={16}
            color={getIconColor()}
            weight="semibold"
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}
