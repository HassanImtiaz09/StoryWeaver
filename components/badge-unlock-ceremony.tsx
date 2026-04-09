/**
 * BadgeUnlockCeremony — Full-screen animated overlay when a badge is unlocked.
 * Features:
 *   - Dark backdrop with radial glow in tier color
 *   - Badge icon scales in with spring bounce
 *   - Ring burst particles (confetti)
 *   - Tier-colored sparkle rain
 *   - Sound effect trigger via expo-av
 *   - Points counter animate-up
 *   - Auto-dismiss after ~4s or tap to close
 */
import React, { memo, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { TIER_COLORS } from "@/constants/gamification";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announce } from "@/lib/a11y-helpers";
import { playBadgeUnlock } from "@/lib/sound-effects";

const { width: SW, height: SH } = Dimensions.get("window");

/* ─── Burst particle data ──────────────────────────────────── */
interface BurstParticle {
  id: number;
  angle: number; // radians
  distance: number;
  size: number;
  color: string;
  delay: number;
}

function makeBurst(count: number, tierColor: string): BurstParticle[] {
  const palette = [tierColor, "#FFD700", "#FF6B6B", "#48C9B0", "#A29BFE", "#FFFFFF"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3,
    distance: 80 + Math.random() * 70,
    size: 5 + Math.random() * 7,
    color: palette[i % palette.length],
    delay: Math.random() * 200,
  }));
}

/* ─── Burst particle component ─────────────────────────────── */
function BurstDot({ p }: { p: BurstParticle }) {
  const prefersReducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (prefersReducedMotion) {
      progress.value = 1;
      opacity.value = 0;
      return;
    }

    progress.value = withDelay(
      p.delay,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      p.delay + 400,
      withTiming(0, { duration: 300 })
    );
  }, [prefersReducedMotion]);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(p.angle) * p.distance * progress.value;
    const y = Math.sin(p.angle) * p.distance * progress.value;
    return {
      position: "absolute",
      width: p.size,
      height: p.size,
      borderRadius: p.size / 2,
      backgroundColor: p.color,
      transform: [{ translateX: x }, { translateY: y }],
      opacity: opacity.value,
    };
  });

  return <Animated.View style={style} />;
}

/* ─── Sparkle rain piece ───────────────────────────────────── */
function SparkleRain({ idx, color }: { idx: number; color: string }) {
  const prefersReducedMotion = useReducedMotion();
  const y = useSharedValue(-20);
  const x = Math.random() * SW;
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      opacity.value = 0;
      return;
    }

    const delay = 200 + idx * 80;
    y.value = withDelay(delay, withTiming(SH + 20, { duration: 2200, easing: Easing.in(Easing.quad) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1500, withTiming(0, { duration: 500 }))
    ));
    rotation.value = withDelay(delay, withTiming(720, { duration: 2200 }));
  }, [prefersReducedMotion]);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x,
    top: 0,
    transform: [{ translateY: y.value }, { rotate: `${rotation.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 12, color }}>✦</Text>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
interface Props {
  visible: boolean;
  name: string;
  description: string;
  icon: string;
  pointsReward: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
  onDismiss: () => void;
}

export const BadgeUnlockCeremony = memo(function BadgeUnlockCeremony({
  visible,
  name,
  description,
  icon,
  pointsReward,
  tier,
  onDismiss,
}: Props) {
  const tierColor = TIER_COLORS[tier];
  const prefersReducedMotion = useReducedMotion();
  const [burst] = useState(() => makeBurst(24, tierColor));

  // Badge entrance
  const badgeScale = useSharedValue(0);
  const badgeRotate = useSharedValue(-180);
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const pointsOpacity = useSharedValue(0);
  const pointsY = useSharedValue(20);

  useEffect(() => {
    if (!visible) return;

    // Announce badge unlock to screen readers
    announce(`${name} badge unlocked. You earned ${pointsReward} points.`);

    // Haptic burst
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Play unlock sound
    playBadgeUnlock();

    if (prefersReducedMotion) {
      // Skip animations, show static
      badgeScale.value = 1;
      badgeRotate.value = 0;
      glowOpacity.value = 0;
      pointsOpacity.value = 1;
      pointsY.value = 0;
    } else {
      // Badge spring in
      badgeScale.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 100, mass: 0.8 })
      );
      badgeRotate.value = withDelay(
        200,
        withSpring(0, { damping: 12, stiffness: 80 })
      );

      // Glow pulse
      glowScale.value = withDelay(400, withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      ));
      glowOpacity.value = withDelay(400, withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0.2, { duration: 600 })
        ),
        -1,
        true
      ));

      // Points animate in
      pointsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
      pointsY.value = withDelay(800, withSpring(0, { damping: 12 }));
    }

    // Auto-dismiss
    const timer = setTimeout(() => {
      onDismiss();
    }, prefersReducedMotion ? 2000 : 4500);
    return () => clearTimeout(timer);
  }, [visible, prefersReducedMotion]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const pointsStyle = useAnimatedStyle(() => ({
    opacity: pointsOpacity.value,
    transform: [{ translateY: pointsY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessible={true}
      >
        {/* Sparkle rain */}
        {Array.from({ length: 20 }).map((_, i) => (
          <SparkleRain key={i} idx={i} color={tierColor} />
        ))}

        {/* Center content */}
        <View style={styles.center}>
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              { backgroundColor: tierColor },
              glowStyle,
            ]}
          />

          {/* Burst particles */}
          <View style={styles.burstContainer}>
            {burst.map((p) => (
              <BurstDot key={p.id} p={p} />
            ))}
          </View>

          {/* Badge circle */}
          <Animated.View
            accessible={true}
            accessibilityLabel={`${name} achievement badge`}
            accessibilityRole="image"
            style={[
              styles.badgeCircle,
              { backgroundColor: tierColor, shadowColor: tierColor },
              badgeStyle,
            ]}
          >
            <Text style={styles.badgeIcon}>{icon}</Text>
          </Animated.View>

          {/* Text */}
          <Animated.View entering={FadeIn.delay(600).duration(400)}>
            <Text style={styles.unlockLabel}>Badge Unlocked!</Text>
            <Text style={styles.badgeName}>{name}</Text>
            <Text style={styles.badgeDesc}>{description}</Text>
          </Animated.View>

          {/* Points */}
          <Animated.View
            accessible={true}
            accessibilityLabel={`${pointsReward} points earned`}
            accessibilityRole="text"
            style={[styles.pointsBadge, pointsStyle]}
          >
            <Text style={styles.pointsText}>+{pointsReward} points</Text>
          </Animated.View>
        </View>

        {/* Tap hint */}
        <Animated.View entering={FadeIn.delay(2000).duration(400)} style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tap anywhere to continue</Text>
        </Animated.View>

        {/* Close button for accessibility */}
        <Pressable
          accessibilityLabel="Close badge celebration"
          accessibilityRole="button"
          accessibilityHint="Double tap to close the badge celebration screen"
          style={styles.closeButton}
          onPress={onDismiss}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  burstContainer: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 20,
  },
  badgeIcon: {
    fontSize: 56,
  },
  unlockLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  badgeName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260,
    marginBottom: 16,
  },
  pointsBadge: {
    backgroundColor: "rgba(255,215,0,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
  },
  pointsText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "700",
  },
  tapHint: {
    position: "absolute",
    bottom: 60,
  },
  tapHintText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 32,
    fontWeight: "300",
  },
});
