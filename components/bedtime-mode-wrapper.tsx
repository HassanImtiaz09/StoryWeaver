import { View } from "react-native";
import { useEffect } from "react";
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { BEDTIME_THEME } from "@/lib/bedtime-mode";

interface Props {
  children: React.ReactNode;
  isActive: boolean;
}

/**
 * Wraps the app with bedtime mode visual effects:
 * - Warm color overlay when active
 * - Reduced screen brightness effect (dark overlay)
 * - Smooth transition when activating/deactivating
 */
export function BedtimeModeWrapper({ children, isActive }: Props) {
  // Animated value for overlay opacity (0 = inactive, 1 = active)
  const overlayOpacity = useSharedValue(isActive ? 1 : 0);
  const dimOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    overlayOpacity.value = withTiming(isActive ? 1 : 0, {
      duration: 800,
    });
    dimOpacity.value = withTiming(isActive ? 1 : 0, {
      duration: 800,
    });
  }, [isActive]);

  // Warm overlay styling
  const warmOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Brightness reduction overlay styling
  const dimOverlayStyle = useAnimatedStyle(() => ({
    opacity: dimOpacity.value * 0.15, // Subtle dimming
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Main content */}
      {children}

      {/* Warm color overlay for bedtime mode */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 140, 60, 0.08)", // Warm orange tint
            pointerEvents: "none",
          },
          warmOverlayStyle,
        ]}
      />

      {/* Dimming overlay to reduce brightness */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000000",
            pointerEvents: "none",
          },
          dimOverlayStyle,
        ]}
      />
    </View>
  );
}
