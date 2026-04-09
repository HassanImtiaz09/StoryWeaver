/**
 * Micro-Animations — Pure react-native-reanimated animated components
 * Built without external Lottie dependency, using only React Native views
 * and Reanimated for smooth, performant animations.
 *
 * Includes:
 *   1. StreakFire — Flickering flame animation for streak displays
 *   2. LoadingBook — Animated book opening/closing with loading dots
 *   3. FloatingStars — Ambient floating stars/sparkles
 *   4. PulsingGlow — Breathing circular glow
 *   5. WiggleEmoji — Playful emoji wiggle animation
 *   6. TypewriterText — Character-by-character text reveal
 */
// @ts-nocheck


import React, { memo, useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle, Dimensions } from "react-native";
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
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// ═════════════════════════════════════════════════════════════════
// 1. StreakFire — Flickering flame animation
// ═════════════════════════════════════════════════════════════════

/**
 * StreakFire props
 */
interface StreakFireProps {
  /** Size in pixels (default 32) */
  size?: number;
  /** Animation intensity: low, medium, high */
  intensity?: "low" | "medium" | "high";
}

/**
 * StreakFire — A three-layer flame animation perfect for streak counters.
 * Inner yellow flame → middle orange → outer red-orange. Each layer flickers
 * independently for a natural, flickering fire effect.
 */
export const StreakFire = memo(function StreakFire({ size = 32, intensity = "medium" }: StreakFireProps) {
  const reducedMotion = useReducedMotion();

  // Speed map: low=slower, high=faster
  const speedMap = {
    low: { flicker: 800, wobble: 1000 },
    medium: { flicker: 600, wobble: 800 },
    high: { flicker: 400, wobble: 600 },
  };

  const speeds = speedMap[intensity];
  const amplitude = intensity === "low" ? 0.05 : intensity === "medium" ? 0.08 : 0.12;

  // Inner flame animations (yellow)
  const innerScaleY = useSharedValue(1);
  const innerRotate = useSharedValue(0);

  // Middle flame animations (orange)
  const middleScaleY = useSharedValue(1);
  const middleScaleX = useSharedValue(1);

  // Outer flame animations (red-orange)
  const outerScaleY = useSharedValue(1);
  const outerRotate = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      innerScaleY.value = 1;
      innerRotate.value = 0;
      middleScaleY.value = 1;
      middleScaleX.value = 1;
      outerScaleY.value = 1;
      outerRotate.value = 0;
      return;
    }

    // Inner flame: scaleY + rotate wobble
    innerScaleY.value = withRepeat(
      withSequence(
        withTiming(1 + amplitude, { duration: speeds.flicker, easing: Easing.inOut(Easing.ease) }),
        withTiming(1 - amplitude * 0.5, { duration: speeds.flicker * 0.8 }),
        withTiming(1, { duration: speeds.flicker * 0.6 })
      ),
      -1,
      true
    );

    innerRotate.value = withRepeat(
      withSequence(
        withTiming(2, { duration: speeds.wobble }),
        withTiming(-2, { duration: speeds.wobble }),
        withTiming(0, { duration: speeds.wobble * 0.5 })
      ),
      -1,
      true
    );

    // Middle flame: scaleY + scaleX oscillate
    middleScaleY.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: speeds.flicker + 100 }),
        withTiming(0.9, { duration: speeds.flicker })
      ),
      -1,
      true
    );

    middleScaleX.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: speeds.flicker * 0.8 }),
        withTiming(1.05, { duration: speeds.flicker * 0.9 })
      ),
      -1,
      true
    );

    // Outer flame: slower scaleY + gentle rotate
    outerScaleY.value = withRepeat(
      withSequence(
        withTiming(1 + amplitude * 1.2, { duration: speeds.flicker + 200 }),
        withTiming(1 - amplitude * 0.3, { duration: speeds.flicker + 100 })
      ),
      -1,
      true
    );

    outerRotate.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: speeds.wobble + 100 }),
        withTiming(-1.5, { duration: speeds.wobble + 100 }),
        withTiming(0, { duration: speeds.wobble * 0.4 })
      ),
      -1,
      true
    );
  }, [reducedMotion, intensity]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: innerScaleY.value },
      { rotate: `${innerRotate.value}deg` },
    ],
  }));

  const middleStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: middleScaleY.value },
      { scaleX: middleScaleX.value },
    ],
  }));

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: outerScaleY.value },
      { rotate: `${outerRotate.value}deg` },
    ],
  }));

  const flameWidth = size * 0.5;
  const flameHeight = size;

  return (
    <View
      style={[styles.flameContainer, { width: size, height: size }]}
      accessible={true}
      accessibilityLabel={`Streak fire animation, ${intensity} intensity`}
      accessibilityRole="progressbar"
    >
      {/* Outer flame (red-orange) */}
      <Animated.View style={[outerStyle, { position: "absolute" }]}>
        <View
          style={[
            styles.flameLayer,
            {
              width: flameWidth,
              height: flameHeight,
              borderRadius: flameWidth * 0.5,
              backgroundColor: "#FF4500",
            },
          ]}
        />
      </Animated.View>

      {/* Middle flame (orange) */}
      <Animated.View style={[middleStyle, { position: "absolute" }]}>
        <View
          style={[
            styles.flameLayer,
            {
              width: flameWidth * 0.75,
              height: flameHeight * 0.85,
              borderRadius: flameWidth * 0.35,
              backgroundColor: "#FF8C00",
            },
          ]}
        />
      </Animated.View>

      {/* Inner flame (yellow) */}
      <Animated.View style={[innerStyle, { position: "absolute" }]}>
        <View
          style={[
            styles.flameLayer,
            {
              width: flameWidth * 0.5,
              height: flameHeight * 0.6,
              borderRadius: flameWidth * 0.25,
              backgroundColor: "#FFD700",
            },
          ]}
        />
      </Animated.View>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
// 2. LoadingBook — Animated book with pages and loading dots
// ═════════════════════════════════════════════════════════════════

interface LoadingBookProps {
  /** Size in pixels (default 64) */
  size?: number;
  /** Message to announce/display (default "Loading...") */
  message?: string;
}

/**
 * LoadingBook — An animated book that opens and closes with a breathing motion.
 * Pages fan open and close smoothly, with three dots animating below.
 */
export const LoadingBook = memo(function LoadingBook({ size = 64, message = "Loading..." }: LoadingBookProps) {
  const reducedMotion = useReducedMotion();

  // Book cover rotation (opens/closes)
  const pageRotation = useSharedValue(0);

  // Loading dot animations
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  // Sparkle particles
  const sparkles = Array.from({ length: 3 }, (_, i) => ({
    id: i,
    scaleValue: useSharedValue(0),
    opacityValue: useSharedValue(0),
    xOffset: useSharedValue(0),
  }));

  useEffect(() => {
    if (reducedMotion) {
      pageRotation.value = 0;
      dot1Opacity.value = 0.3;
      dot2Opacity.value = 0.3;
      dot3Opacity.value = 0.3;
      sparkles.forEach((s) => {
        s.scaleValue.value = 0;
        s.opacityValue.value = 0;
      });
      return;
    }

    // Book breathe: open 0° to 30°, close back
    pageRotation.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Dot 1 animation
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 }),
        withDelay(600, withTiming(0.3, { duration: 0 }))
      ),
      -1,
      true
    );

    // Dot 2 animation
    dot2Opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 }),
        withDelay(300, withTiming(0.3, { duration: 0 }))
      ),
      -1,
      true
    );

    // Dot 3 animation
    dot3Opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 })
      ),
      -1,
      true
    );

    // Sparkle emissions
    sparkles.forEach((sparkle, idx) => {
      sparkle.scaleValue.value = withRepeat(
        withSequence(
          withDelay(idx * 500 + 400, withTiming(1, { duration: 400, easing: Easing.in(Easing.ease) })),
          withTiming(0.3, { duration: 400 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        true
      );

      sparkle.opacityValue.value = withRepeat(
        withSequence(
          withDelay(idx * 500 + 400, withTiming(1, { duration: 200 })),
          withTiming(0.5, { duration: 400 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        true
      );

      sparkle.xOffset.value = withRepeat(
        withSequence(
          withDelay(idx * 500 + 400, withTiming((idx - 1) * 20, { duration: 800 })),
          withTiming(0, { duration: 0 })
        ),
        -1,
        true
      );
    });
  }, [reducedMotion]);

  const bookStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${pageRotation.value}deg` }],
  }));

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  const SparkleView = ({ sparkle }: { sparkle: (typeof sparkles)[0] }) => {
    const style = useAnimatedStyle(() => ({
      transform: [
        { scale: sparkle.scaleValue.value },
        { translateX: sparkle.xOffset.value },
      ],
      opacity: sparkle.opacityValue.value,
    }));

    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            top: -10,
            left: size * 0.5 - 6,
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 12 }}>✨</Text>
      </Animated.View>
    );
  };

  const coverWidth = size * 0.4;
  const coverHeight = size * 0.6;

  return (
    <View
      style={[styles.loadingBookContainer, { width: size, height: size * 1.3 }]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      {/* Book */}
      <Animated.View style={[bookStyle, { perspective: 1000 }]}>
        <View style={styles.bookSpine} />
        <View
          style={[
            styles.bookCover,
            {
              width: coverWidth,
              height: coverHeight,
            },
          ]}
        >
          <Text style={{ fontSize: 20 }}>📖</Text>
        </View>
      </Animated.View>

      {/* Sparkles */}
      {sparkles.map((sparkle) => (
        <SparkleView key={sparkle.id} sparkle={sparkle} />
      ))}

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        <Animated.Text style={[styles.loadingDot, dot1Style]}>•</Animated.Text>
        <Animated.Text style={[styles.loadingDot, dot2Style]}>•</Animated.Text>
        <Animated.Text style={[styles.loadingDot, dot3Style]}>•</Animated.Text>
      </View>

      {/* Message */}
      <Text style={[styles.loadingMessage, { marginTop: 8 }]}>{message}</Text>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
// 3. FloatingStars — Ambient floating particles
// ═════════════════════════════════════════════════════════════════

interface FloatingStarsProps {
  /** Number of stars to render (default 5) */
  count?: number;
  /** Area bounds: { width, height } */
  area?: { width: number; height: number };
}

/**
 * FloatingStars — Generates ambient floating stars that gently drift and fade.
 * Each star has randomized timing for a natural, staggered effect.
 */
export const FloatingStars = memo(function FloatingStars({ count = 5, area = { width: 200, height: 100 } }: FloatingStarsProps) {
  const reducedMotion = useReducedMotion();
  const [stars] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * area.width,
      y: Math.random() * area.height,
      duration: 3000 + Math.random() * 2000,
      delay: Math.random() * 500,
      driftX: (Math.random() - 0.5) * 40,
      emoji: Math.random() > 0.5 ? "✦" : "★",
      opacity: useSharedValue(0),
      translateY: useSharedValue(0),
      translateX: useSharedValue(0),
    }))
  );

  useEffect(() => {
    stars.forEach((star) => {
      if (reducedMotion) {
        star.opacity.value = 0.5;
        star.translateY.value = 0;
        star.translateX.value = 0;
        return;
      }

      star.opacity.value = withRepeat(
        withSequence(
          withDelay(
            star.delay,
            withTiming(1, { duration: star.duration * 0.3, easing: Easing.in(Easing.ease) })
          ),
          withTiming(1, { duration: star.duration * 0.4 }),
          withTiming(0, { duration: star.duration * 0.3, easing: Easing.out(Easing.ease) })
        ),
        -1,
        true
      );

      star.translateY.value = withRepeat(
        withSequence(
          withDelay(star.delay, withTiming(-area.height * 0.3, { duration: star.duration })),
          withTiming(0, { duration: 0 })
        ),
        -1,
        true
      );

      star.translateX.value = withRepeat(
        withSequence(
          withDelay(
            star.delay,
            withTiming(star.driftX, { duration: star.duration, easing: Easing.inOut(Easing.ease) })
          ),
          withTiming(0, { duration: 0 })
        ),
        -1,
        true
      );
    });
  }, [reducedMotion]);

  const StarParticle = ({ star }: { star: (typeof stars)[0] }) => {
    const style = useAnimatedStyle(() => ({
      opacity: star.opacity.value,
      transform: [
        { translateY: star.translateY.value },
        { translateX: star.translateX.value },
      ],
    }));

    return (
      <Animated.Text
        style={[
          {
            position: "absolute",
            left: star.x,
            top: star.y,
            fontSize: 14,
          },
          style,
        ]}
      >
        {star.emoji}
      </Animated.Text>
    );
  };

  return (
    <View
      style={[
        styles.floatingStarsContainer,
        {
          width: area.width,
          height: area.height,
        },
      ]}
      pointerEvents="none"
      accessible={true}
      accessibilityLabel="Floating stars decoration"
    >
      {stars.map((star) => (
        <StarParticle key={star.id} star={star} />
      ))}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
// 4. PulsingGlow — Breathing circular glow
// ═════════════════════════════════════════════════════════════════

interface PulsingGlowProps {
  /** Color hex string (default "#FFD700") */
  color?: string;
  /** Size in pixels (default 40) */
  size?: number;
  /** Animation speed: slow (3s), normal (2s), fast (1s) */
  speed?: "slow" | "normal" | "fast";
}

/**
 * PulsingGlow — A soft glowing circle that breathes in and out.
 * Scale and opacity oscillate for a gentle, ambient effect.
 */
export const PulsingGlow = memo(function PulsingGlow({
  color = "#FFD700",
  size = 40,
  speed = "normal",
}: PulsingGlowProps) {
  const reducedMotion = useReducedMotion();

  const speedMap = {
    slow: 3000,
    normal: 2000,
    fast: 1000,
  };
  const duration = speedMap[speed];

  const scaleValue = useSharedValue(0.8);
  const opacityValue = useSharedValue(0.15);

  useEffect(() => {
    if (reducedMotion) {
      scaleValue.value = 1;
      opacityValue.value = 0.3;
      return;
    }

    scaleValue.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    opacityValue.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reducedMotion, speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.5,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
      accessible={true}
      accessibilityLabel={`Pulsing glow, ${speed} speed`}
      accessibilityRole="progressbar"
    />
  );
});

// ═════════════════════════════════════════════════════════════════
// 5. WiggleEmoji — Playful emoji animation
// ═════════════════════════════════════════════════════════════════

interface WiggleEmojiProps {
  /** The emoji character to animate */
  emoji: string;
  /** Size in pixels (default 32) */
  size?: number;
  /** Trigger the animation on change; omit to auto-play on mount */
  trigger?: boolean;
}

/**
 * WiggleEmoji — Makes an emoji rotate side-to-side and pop up.
 * Perfect for achievement notifications and interactive feedback.
 */
export const WiggleEmoji = memo(function WiggleEmoji({ emoji, size = 32, trigger }: WiggleEmojiProps) {
  const reducedMotion = useReducedMotion();
  const [triggerCount, setTriggerCount] = useState(0);

  // Track trigger prop changes
  useEffect(() => {
    if (trigger !== undefined) {
      setTriggerCount((c) => c + 1);
    }
  }, [trigger]);

  const rotateValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      rotateValue.value = 0;
      scaleValue.value = 1;
      return;
    }

    // Wiggle sequence: rotate left-right, pop scale
    rotateValue.value = withSequence(
      withTiming(-15, { duration: 100, easing: Easing.inOut(Easing.ease) }),
      withTiming(15, { duration: 100, easing: Easing.inOut(Easing.ease) }),
      withTiming(-10, { duration: 80 }),
      withTiming(10, { duration: 80 }),
      withTiming(-5, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );

    scaleValue.value = withSequence(
      withSpring(1.15, { damping: 5, stiffness: 100 }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) })
    );
  }, [triggerCount, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }, { scale: scaleValue.value }],
  }));

  return (
    <Animated.Text
      style={[
        {
          fontSize: size,
        },
        animatedStyle,
      ]}
      accessible={true}
      accessibilityLabel={`${emoji} animation`}
      accessibilityRole="alert"
    >
      {emoji}
    </Animated.Text>
  );
});

// ═════════════════════════════════════════════════════════════════
// 6. TypewriterText — Character-by-character reveal
// ═════════════════════════════════════════════════════════════════

interface TypewriterTextProps {
  /** Text to type out */
  text: string;
  /** Milliseconds per character (default 40) */
  speed?: number;
  /** Text styling */
  style?: TextStyle;
  /** Callback when typing completes */
  onComplete?: () => void;
}

/**
 * TypewriterText — Reveals text character-by-character with a blinking cursor.
 * Respects reduceMotion and shows full text immediately when enabled.
 */
export const TypewriterText = memo(function TypewriterText({
  text,
  speed = 40,
  style,
  onComplete,
}: TypewriterTextProps) {
  const reducedMotion = useReducedMotion();
  const charCount = useSharedValue(0);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      charCount.value = text.length;
      if (onComplete) {
        onComplete();
      }
      return;
    }

    charCount.value = withTiming(text.length, {
      duration: text.length * speed,
      easing: Easing.linear,
    });

    // Trigger onComplete callback after animation finishes
    const timeout = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, text.length * speed);

    return () => clearTimeout(timeout);
  }, [text, speed, reducedMotion, onComplete]);

  useEffect(() => {
    if (reducedMotion) {
      cursorOpacity.value = 0;
      return;
    }

    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 500 })
      ),
      -1,
      true
    );
  }, [reducedMotion]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View
      accessible={true}
      accessibilityLabel={`Typewriter text: ${text}`}
      accessibilityRole="alert"
    >
      <Animated.Text
        style={[style]}
        children={
          reducedMotion
            ? text
            : text.slice(0, Math.floor(charCount.value))
        }
      />
      {!reducedMotion && (
        <Animated.Text
          style={[
            style,
            {
              position: "absolute",
              left: 0,
            },
            cursorStyle,
          ]}
        >
          |
        </Animated.Text>
      )}
    </View>
  );
});

// ─── Internal Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  flameContainer: {
    justifyContent: "center",
    alignItems: "center",
  },

  flameLayer: {
    shadowColor: "#FF6D00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },

  loadingBookContainer: {
    justifyContent: "flex-start",
    alignItems: "center",
  },

  bookSpine: {
    position: "absolute",
    left: -4,
    width: 4,
    height: 60,
    backgroundColor: "rgba(255, 215, 0, 0.4)",
    borderRadius: 2,
  },

  bookCover: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },

  dotsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },

  loadingDot: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "bold",
  },

  loadingMessage: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },

  floatingStarsContainer: {
    position: "relative",
    overflow: "hidden",
  },
});
