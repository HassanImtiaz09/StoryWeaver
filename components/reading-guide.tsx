import React, { useState } from "react";
import { View, PanResponder, StyleSheet, GestureResponderEvent } from "react-native";
import { useAccessibilityStore } from "@/lib/accessibility-store";
import Animated, { FadeInDown } from "react-native-reanimated";

/**
 * Reading Guide Component
 * Displays a transparent overlay with a highlighted "reading strip"
 * that users can drag up/down to follow along with the text
 */
export interface ReadingGuideProps {
  containerHeight: number; // Total height of the text container
  stripHeight?: "small" | "medium" | "large"; // Default: medium
}

const STRIP_HEIGHTS = {
  small: 60,
  medium: 80,
  large: 100,
};

export function ReadingGuide({ containerHeight, stripHeight = "medium" }: ReadingGuideProps) {
  const { readingGuide } = useAccessibilityStore();
  const [scrollPosition, setScrollPosition] = useState(0);

  const stripHeightValue = STRIP_HEIGHTS[stripHeight];

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState) => {
        const newPosition = Math.max(
          0,
          Math.min(containerHeight - stripHeightValue, scrollPosition + gestureState.dy)
        );
        setScrollPosition(newPosition);
      },
    })
  ).current;

  if (!readingGuide) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          height: containerHeight,
        },
      ]}
      accessibilityLabel="Reading guide - drag to reposition"
      accessibilityRole="none"
      accessibilityHint="Drag the highlighted reading strip to follow along with the text"
    >
      {/* Top darkened area */}
      <View
        style={[
          styles.darkenedArea,
          {
            height: scrollPosition,
          },
        ]}
      />

      {/* Highlighted reading strip */}
      <View
        style={[
          styles.readingStrip,
          {
            height: stripHeightValue,
          },
        ]}
        accessibilityElementsHidden={true}
      />

      {/* Bottom darkened area */}
      <View
        style={[
          styles.darkenedArea,
          {
            flex: 1,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  darkenedArea: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  readingStrip: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
});

export default ReadingGuide;
