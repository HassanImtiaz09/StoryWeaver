import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

/**
 * Whimsical shimmer skeleton shown while story illustrations are being generated.
 * Replaces the simple ActivityIndicator with a "painting your illustration" animation.
 */
export function IllustrationShimmer({
  moodColors,
}: {
  moodColors: [string, string];
}) {
  const shimmerX = useSharedValue(-1);
  const brushProgress = useSharedValue(0);
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);

  useEffect(() => {
    // Continuous shimmer sweep
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Brush stroke progress (painting effect)
    brushProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );

    // Staggered sparkle animations
    sparkle1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 600 })
      ),
      -1,
      true
    );
    sparkle2.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        true
      )
    );
    sparkle3.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        true
      )
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmerX.value, [-1, 1], [-width * 0.6, width]),
      },
    ],
  }));

  const brushStyle = useAnimatedStyle(() => ({
    width: `${interpolate(brushProgress.value, [0, 1], [5, 100])}%`,
    opacity: interpolate(brushProgress.value, [0, 0.1, 0.9, 1], [0, 0.6, 0.6, 0]),
  }));

  // @ts-expect-error - namespace member
  const makeSparkleStyle = (sv: Animated.SharedValue<number>, x: number, y: number) =>
    useAnimatedStyle(() => ({
      opacity: sv.value,
      transform: [{ scale: interpolate(sv.value, [0, 1], [0.3, 1]) }],
      left: x,
      top: y,
    }));

  const sparkle1Style = makeSparkleStyle(sparkle1, width * 0.25, 40);
  const sparkle2Style = makeSparkleStyle(sparkle2, width * 0.6, 80);
  const sparkle3Style = makeSparkleStyle(sparkle3, width * 0.4, 120);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base gradient background */}
      <LinearGradient
        colors={moodColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Shimmer skeleton lines (mimic illustration layout) */}
      <View style={styles.skeletonContainer}>
        <Animated.View style={[styles.skeletonBlock, styles.skeletonLarge, brushStyle]} />
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonBlock, styles.skeletonSmall, { opacity: 0.3 }]} />
          <View style={[styles.skeletonBlock, styles.skeletonSmall, { opacity: 0.2 }]} />
        </View>
        <View style={[styles.skeletonBlock, styles.skeletonMedium, { opacity: 0.25 }]} />
      </View>

      {/* Moving shimmer highlight */}
      <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.15)",
            "rgba(255,255,255,0.3)",
            "rgba(255,255,255,0.15)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Sparkle dots */}
      <Animated.View style={[styles.sparkle, sparkle1Style]}>
        <Text style={styles.sparkleText}>✨</Text>
      </Animated.View>
      <Animated.View style={[styles.sparkle, sparkle2Style]}>
        <Text style={styles.sparkleText}>🎨</Text>
      </Animated.View>
      <Animated.View style={[styles.sparkle, sparkle3Style]}>
        <Text style={styles.sparkleText}>✨</Text>
      </Animated.View>

      {/* Label */}
      <Animated.View entering={FadeIn.delay(300)} style={styles.labelContainer}>
        <View style={styles.labelBg}>
          <Text style={styles.labelText}>Painting your illustration...</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  skeletonBlock: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  skeletonLarge: {
    height: 120,
    width: "100%",
  },
  skeletonMedium: {
    height: 60,
    width: "75%",
  },
  skeletonSmall: {
    height: 60,
    flex: 1,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: "60%",
  },
  sparkle: {
    position: "absolute",
  },
  sparkleText: {
    fontSize: 24,
  },
  labelContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  labelBg: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  labelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
  },
});
