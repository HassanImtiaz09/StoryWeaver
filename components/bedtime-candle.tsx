/**
 * BedtimeCandle — Animated candle that grows brighter with consecutive
 * bedtime reading nights. Cozy nighttime progression visual.
 *
 * Features:
 *   - Candle body height scales with streak (min 40%, max 100%)
 *   - Flame size/intensity increases with streak
 *   - Inner glow radius grows (warm ambient light)
 *   - Wax drip details at higher streaks
 *   - Stars appear in background at milestones (3, 7, 14, 30)
 *   - Gentle idle flicker animation on flame
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announce } from "@/lib/a11y-helpers";
import { StreakFire } from "./micro-animations";

const CANDLE_MAX_HEIGHT = 140;
const CANDLE_MIN_HEIGHT = 50;

interface BedtimeCandleProps {
  bedtimeStreak: number; // consecutive bedtime reading nights
  maxStreak?: number;    // for normalizing (default 30)
}

export function BedtimeCandle({
  bedtimeStreak,
  maxStreak = 30,
}: BedtimeCandleProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();

  // Normalize streak to 0-1 range
  const progress = Math.min(bedtimeStreak / maxStreak, 1);
  const candleHeight = CANDLE_MIN_HEIGHT + (CANDLE_MAX_HEIGHT - CANDLE_MIN_HEIGHT) * progress;
  const flameSize = 18 + progress * 22; // 18-40
  const glowRadius = 30 + progress * 50; // 30-80

  // Stars unlocked at milestones
  const stars = [
    { streak: 3, emoji: "⭐", x: 10, y: 20 },
    { streak: 7, emoji: "🌟", x: 85, y: 15 },
    { streak: 14, emoji: "✨", x: 25, y: 5 },
    { streak: 30, emoji: "💫", x: 75, y: 8 },
  ];

  // Show wax drips at streak >= 5
  const showDrips = bedtimeStreak >= 5;

  /* ── Flame flicker animation ── */
  const flameScaleY = useSharedValue(1);
  const flameScaleX = useSharedValue(1);
  const flameRotate = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (bedtimeStreak === 0) return;

    if (reducedMotion) {
      // Static flame when motion is reduced
      flameScaleY.value = 1;
      flameScaleX.value = 1;
      flameRotate.value = 0;
      glowOpacity.value = 0.3;
      return;
    }

    // Flame flicker
    flameScaleY.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.05, { duration: 200 }),
        withTiming(0.95, { duration: 250 })
      ),
      -1,
      true
    );

    flameScaleX.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 350 }),
        withTiming(1.1, { duration: 300 }),
        withTiming(0.95, { duration: 250 })
      ),
      -1,
      true
    );

    flameRotate.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 300 })
      ),
      -1,
      true
    );

    // Glow pulse (intensity scales with streak)
    const minGlow = 0.15 + progress * 0.15;
    const maxGlow = 0.3 + progress * 0.4;
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(maxGlow, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(minGlow, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [bedtimeStreak, progress, reducedMotion]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: flameScaleY.value },
      { scaleX: flameScaleX.value },
      { rotate: `${flameRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    width: glowRadius * 2,
    height: glowRadius * 2,
    borderRadius: glowRadius,
  }));

  /* ── Star twinkle animations ── */
  const StarView = ({ emoji, delay, milestoneDays }: { emoji: string; delay: number; milestoneDays: number }) => {
    const starScale = useSharedValue(0.7);
    const starOpacity = useSharedValue(0.5);

    useEffect(() => {
      if (reducedMotion) {
        // Static star when motion is reduced
        starScale.value = 1;
        starOpacity.value = 1;
        return;
      }

      starScale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.7, { duration: 1000 })
          ),
          -1,
          true
        )
      );
      starOpacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1000 }),
            withTiming(0.4, { duration: 1000 })
          ),
          -1,
          true
        )
      );
    }, [reducedMotion]);

    const style = useAnimatedStyle(() => ({
      transform: [{ scale: starScale.value }],
      opacity: starOpacity.value,
    }));

    return (
      <Animated.Text
        style={[{ fontSize: 14 }, style]}
        accessible={true}
        accessibilityLabel={`${milestoneDays}-night milestone achieved`}
      >
        {emoji}
      </Animated.Text>
    );
  };

  useEffect(() => {
    if (bedtimeStreak === 0) {
      announce("No active bedtime streak");
    }
  }, [bedtimeStreak]);

  if (bedtimeStreak === 0) {
    return (
      <View
        style={styles.container}
        accessible={true}
        accessibilityLabel="Bedtime candle"
      >
        <View
          style={styles.scene}
          accessible={true}
          accessibilityLabel="Unlit candle scene"
        >
          {/* Unlit candle */}
          <View style={[styles.candleBody, { height: CANDLE_MIN_HEIGHT }]}>
            <LinearGradient
              colors={["#E8D5B7", "#D4C4A8", "#C9B896"]}
              style={styles.candleGradient}
            />
            <View style={styles.wickUnlit} />
          </View>
          <View style={styles.candleBase} />
        </View>
        <Text style={[styles.label, { color: colors.muted }]}>
          Read at bedtime to light the candle!
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Bedtime streak: ${bedtimeStreak} nights`}
    >
      <View
        style={styles.scene}
        accessible={true}
        accessibilityLabel={`Lit candle with ${bedtimeStreak} night streak`}
      >
        {/* Stars in background */}
        <View
          style={styles.starsContainer}
          accessible={true}
          accessibilityLabel="Milestone stars"
        >
          {stars.map(
            (star) =>
              bedtimeStreak >= star.streak && (
                <View
                  key={star.streak}
                  style={[
                    styles.starPos,
                    { left: `${star.x}%`, top: `${star.y}%` },
                  ]}
                  accessible={true}
                  accessibilityLabel={`${star.streak}-night milestone achieved`}
                >
                  <StarView
                    emoji={star.emoji}
                    delay={star.streak * 150}
                    milestoneDays={star.streak}
                  />
                </View>
              )
          )}
        </View>

        {/* Ambient glow */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              bottom: candleHeight + 10,
            },
            glowStyle,
          ]}
        />

        {/* Flame */}
        <Animated.View
          style={[
            styles.flameContainer,
            { bottom: candleHeight + 8 },
            flameStyle,
          ]}
        >
          {/* Outer flame (orange) */}
          <View
            style={[
              styles.flameOuter,
              {
                width: flameSize * 0.7,
                height: flameSize,
                borderRadius: flameSize * 0.35,
              },
            ]}
          />
          {/* Inner flame (yellow-white) */}
          <View
            style={[
              styles.flameInner,
              {
                width: flameSize * 0.35,
                height: flameSize * 0.6,
                borderRadius: flameSize * 0.2,
              },
            ]}
          />
        </Animated.View>

        {/* StreakFire overlay for enhanced effect */}
        {bedtimeStreak >= 5 && (
          <View
            style={[
              styles.flameContainer,
              { bottom: candleHeight + 8 },
            ]}
          >
            <StreakFire size={flameSize * 0.8} intensity={bedtimeStreak >= 14 ? "high" : bedtimeStreak >= 7 ? "medium" : "low"} />
          </View>
        )}

        {/* Candle body */}
        <View style={[styles.candleBody, { height: candleHeight }]}>
          <LinearGradient
            colors={["#FFF8E1", "#FFE0B2", "#FFCC80"]}
            style={styles.candleGradient}
          />
          {/* Wick */}
          <View style={styles.wickLit} />

          {/* Wax drips */}
          {showDrips && (
            <>
              <View style={[styles.waxDrip, { left: 4, height: 12 }]} />
              <View style={[styles.waxDrip, { right: 6, height: 8 }]} />
              {bedtimeStreak >= 10 && (
                <View style={[styles.waxDrip, { left: "40%", height: 15 }]} />
              )}
            </>
          )}
        </View>

        {/* Candle holder/base */}
        <View style={styles.candleBase}>
          <LinearGradient
            colors={["#8D6E63", "#795548", "#6D4C41"]}
            style={styles.baseGradient}
          />
        </View>
      </View>

      {/* Streak label */}
      <View style={styles.labelRow}>
        <Text style={styles.streakNumber}>{bedtimeStreak}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {bedtimeStreak === 1
            ? "bedtime night"
            : "bedtime nights in a row"}
        </Text>
      </View>

      {/* Next milestone */}
      {(() => {
        const nextMilestone = [3, 7, 14, 30].find((m) => m > bedtimeStreak);
        if (!nextMilestone) return null;
        const nightsRemaining = nextMilestone - bedtimeStreak;
        return (
          <Text
            style={[styles.milestone, { color: colors.muted }]}
            accessible={true}
            accessibilityLabel={`${nightsRemaining} more night${nightsRemaining > 1 ? "s" : ""} until ${nextMilestone}-night milestone`}
          >
            {nightsRemaining} more night
            {nightsRemaining > 1 ? "s" : ""} until next star!
          </Text>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  scene: {
    width: 120,
    height: 200,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  starPos: {
    position: "absolute",
  },

  /* Ambient glow */
  ambientGlow: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(255, 183, 77, 0.3)",
  },

  /* Flame */
  flameContainer: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 5,
  },
  flameOuter: {
    backgroundColor: "#FF9800",
    shadowColor: "#FF6D00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  flameInner: {
    position: "absolute",
    bottom: 2,
    backgroundColor: "#FFF9C4",
  },

  /* Candle */
  candleBody: {
    width: 32,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: "visible",
    position: "relative",
    zIndex: 3,
  },
  candleGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  wickLit: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    width: 2,
    height: 8,
    backgroundColor: "#4E342E",
    borderRadius: 1,
  },
  wickUnlit: {
    position: "absolute",
    top: -5,
    alignSelf: "center",
    width: 2,
    height: 6,
    backgroundColor: "#795548",
    borderRadius: 1,
  },
  waxDrip: {
    position: "absolute",
    top: 0,
    width: 5,
    backgroundColor: "rgba(255,224,178,0.7)",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  /* Base */
  candleBase: {
    width: 48,
    height: 14,
    borderRadius: 4,
    overflow: "hidden",
    zIndex: 2,
  },
  baseGradient: {
    flex: 1,
  },

  /* Labels */
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  streakNumber: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "900",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  milestone: {
    fontSize: 11,
    textAlign: "center",
  },
});
