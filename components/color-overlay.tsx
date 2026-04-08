import React from "react";
import { View } from "react-native";
import { useAccessibilityStore } from "@/lib/accessibility-store";

/**
 * Color Overlay Component
 * Provides a tinted overlay to help users with visual stress (Irlen syndrome)
 * The overlay is semi-transparent and doesn't interfere with touch events
 */
export function ColorOverlay() {
  const { colorOverlay, colorOverlayOpacity } = useAccessibilityStore();

  if (!colorOverlay) {
    return null;
  }

  // Color definitions
  const overlayColors: Record<string, string> = {
    amber: `rgba(217, 119, 6, ${colorOverlayOpacity / 100})`,
    blue: `rgba(30, 58, 138, ${colorOverlayOpacity / 100})`,
    green: `rgba(20, 83, 45, ${colorOverlayOpacity / 100})`,
    pink: `rgba(190, 24, 93, ${colorOverlayOpacity / 100})`,
    purple: `rgba(88, 28, 135, ${colorOverlayOpacity / 100})`,
  };

  const overlayColor = overlayColors[colorOverlay] || overlayColors.amber;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlayColor,
        pointerEvents: "none",
        zIndex: 999,
      }}
      accessibilityLabel="Color overlay for visual stress relief"
      accessibilityRole="none"
      accessibilityElementsHidden={true}
    />
  );
}

export default ColorOverlay;
