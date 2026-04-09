import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAccessibilityStore } from "@/lib/accessibility-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface ReadingGuideProps {
  enabled: boolean;
  textAreaHeight: number;
  textAreaY: number;
}

/**
 * ReadingGuide Component
 *
 * Provides two visual accessibility modes:
 * 1. Ruler Mode: A horizontal semi-transparent strip highlighting one line at a time
 * 2. Color Overlay Mode: A full-screen translucent tint to reduce visual stress
 *
 * In Ruler Mode, the guide follows the user's touch input via pan gestures.
 * In Color Overlay Mode, a colored overlay is applied to the entire reading area.
 */
export const ReadingGuide = React.memo(({
  enabled,
  textAreaHeight,
  textAreaY,
}: ReadingGuideProps) => {
  const { readingGuide, colorOverlay, colorOverlayOpacity } = useAccessibilityStore();
  const reducedMotion = useReducedMotion();

  // Shared animation values for ruler guide position
  const guideY = useSharedValue(0);
  const isGestureActive = useSharedValue(false);

  const GUIDE_HEIGHT = 40;
  const OVERLAY_OPACITY_SCALE = 0.01; // Map 10-40 to 0.1-0.4

  // Color definitions matching accessibility store
  const overlayColorMap: Record<string, string> = {
    amber: "#FFD700",
    blue: "#4FC3F7",
    green: "#81C784",
    pink: "#F48FB1",
    purple: "#CE93D8",
  };

  // Animated styles for ruler guide
  const guideAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: guideY.value }],
    };
  });

  // Pan gesture for ruler mode
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          isGestureActive.value = true;
        })
        .onUpdate((event) => {
          // Map touch position to guide position (Y position relative to text area)
          const newY = Math.max(0, Math.min(event.y - textAreaY - GUIDE_HEIGHT / 2, textAreaHeight - GUIDE_HEIGHT));
          if (reducedMotion) {
            guideY.value = newY;
          } else {
            guideY.value = withSpring(newY, {
              damping: 10,
              mass: 1,
              overshootClamping: false,
            });
          }
        })
        .onFinalize(() => {
          isGestureActive.value = false;
        }),
    [textAreaHeight, textAreaY, reducedMotion]
  );

  if (!enabled) {
    return null;
  }

  // Return ruler guide if enabled
  if (readingGuide) {
    return (
      <GestureDetector gesture={panGesture}>
        <View
          style={[
            styles.gestureContainer,
            {
              height: textAreaHeight,
              top: textAreaY,
            },
          ]}
          accessibilityLabel="Reading guide ruler"
          accessibilityHint="Drag vertically to move the reading line"
        >
          {/* Dark overlay above the guide */}
          <Animated.View
            style={[
              styles.overlayAbove,
              {
                height: guideY.value,
              },
            ]}
            pointerEvents="none"
            accessibilityElementsHidden={true}
          />

          {/* Reading guide ruler strip */}
          <Animated.View
            style={[
              styles.guide,
              {
                height: GUIDE_HEIGHT,
              },
              guideAnimatedStyle,
            ]}
            pointerEvents="none"
            accessibilityElementsHidden={true}
          />

          {/* Dark overlay below the guide */}
          <Animated.View
            style={[
              styles.overlayBelow,
              {
                top: guideY.value + GUIDE_HEIGHT,
                height: Math.max(0, textAreaHeight - (guideY.value + GUIDE_HEIGHT)),
              },
            ]}
            pointerEvents="none"
            accessibilityElementsHidden={true}
          />
        </View>
      </GestureDetector>
    );
  }

  // Return color overlay if enabled
  if (colorOverlay) {
    const overlayColor = overlayColorMap[colorOverlay] || overlayColorMap.amber;
    const opacity = colorOverlayOpacity * OVERLAY_OPACITY_SCALE;

    return (
      <View
        style={[
          styles.colorOverlayContainer,
          {
            backgroundColor: `rgba(${parseInt(overlayColor.slice(1, 3), 16)}, ${parseInt(overlayColor.slice(3, 5), 16)}, ${parseInt(overlayColor.slice(5, 7), 16)}, ${opacity})`,
            height: textAreaHeight,
            top: textAreaY,
          },
        ]}
        pointerEvents="none"
        accessibilityLabel="Color overlay for visual stress relief"
        accessibilityRole="none"
        accessibilityElementsHidden={true}
      />
    );
  }

  return null;
});

ReadingGuide.displayName = "ReadingGuide";

const styles = StyleSheet.create({
  gestureContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 50,
  },
  guide: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 215, 0, 0.3)", // Soft yellow/amber
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.6)",
  },
  overlayAbove: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  overlayBelow: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  colorOverlayContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 50,
    pointerEvents: "none",
  },
});
