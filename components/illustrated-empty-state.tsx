/**
 * IllustratedEmptyState — Versatile empty state component with themed
 * illustrated scenes using emoji compositions and subtle animations.
 *
 * Supports these empty state types:
 *   - no-stories: Open book with floating stars
 *   - no-children: Owl Ollie with speech bubble
 *   - no-downloads: Cloud with bobbing animation
 *   - no-achievements: Trophy with empty medal slots
 *   - no-stickers: Album with magnifying glass
 *   - no-bookshelf: Wooden shelf with dust motes
 *   - no-missions: Compass with rotation wobble
 *   - no-network: Confused Ollie with broken Wi-Fi symbol and side-to-side sway
 *   - error: Broken book tilting with falling stars and healing bandaid pop-in
 */
import React, { memo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useColors } from "@/hooks/use-colors";
import { BounceButton } from "./animated-pressable";

const { width: SW } = Dimensions.get("window");

export type EmptyStateType =
  | "no-stories"
  | "no-children"
  | "no-downloads"
  | "no-achievements"
  | "no-stickers"
  | "no-bookshelf"
  | "no-missions"
  | "no-network"
  | "error";

interface IllustratedEmptyStateProps {
  type: EmptyStateType;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean; // smaller illustration for inline use
}

// ═══════════════════════════════════════════════════════════════
// Illustration Components
// ═══════════════════════════════════════════════════════════════

/**
 * No Stories: Open book with stars floating upward
 */
function NoStoriesIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;

  // Create 3 stars with staggered animations
  const stars = [0, 1, 2];

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Open book with floating stars"
    >
      <Text style={{ fontSize: compact ? 48 : 72 }}>📖</Text>

      {stars.map((idx) => (
        <FloatingStar
          key={idx}
          delay={idx * 300}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}

function FloatingStar({
  delay,
  reducedMotion,
}: {
  delay: number;
  reducedMotion: boolean;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-80, { duration: 2000, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        )
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.3, { duration: 2000 }),
            withTiming(1, { duration: 0 })
          ),
          -1,
          false
        )
      );
    }
  }, [reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", top: 10, left: 30 + Math.random() * 20 }, animStyle]}
      accessible={false}
    >
      <Text style={{ fontSize: 16 }}>✨</Text>
    </Animated.View>
  );
}

/**
 * No Children: Owl Ollie with speech bubble
 */
function NoChildrenIllustration({ compact }: { compact?: boolean }) {
  const illustrationHeight = compact ? 80 : 120;

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Owl sitting on a branch"
    >
      {/* Branch */}
      <View
        style={{
          width: 80,
          height: 2,
          backgroundColor: "rgba(139,69,19,0.4)",
          marginTop: 20,
          borderRadius: 1,
        }}
      />
      {/* Owl */}
      <Text style={{ fontSize: compact ? 48 : 64, marginVertical: 4 }}>🦉</Text>
      {/* Speech bubble */}
      <View style={styles.speechBubble} accessible={false}>
        <Text style={styles.speechText}>Let's create a profile!</Text>
      </View>
    </View>
  );
}

/**
 * No Downloads: Cloud with gentle bobbing and down arrow
 */
function NoDownloadsIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;
  const bobY = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      bobY.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [reducedMotion]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Cloud with download arrow"
    >
      <Animated.View style={bobStyle}>
        <Text style={{ fontSize: compact ? 48 : 64 }}>☁️</Text>
      </Animated.View>
      <Text style={{ fontSize: compact ? 28 : 36, marginTop: 4 }}>⬇️</Text>
    </View>
  );
}

/**
 * No Achievements: Trophy with pulse glow and empty medal slots
 */
function NoAchievementsIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;
  const glowOpacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [reducedMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Trophy with empty medal slots"
    >
      <Animated.View style={glowStyle}>
        <Text style={{ fontSize: compact ? 48 : 64 }}>🏆</Text>
      </Animated.View>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 8,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: compact ? 16 : 20 }}>○</Text>
        <Text style={{ fontSize: compact ? 16 : 20 }}>○</Text>
        <Text style={{ fontSize: compact ? 16 : 20 }}>○</Text>
      </View>
    </View>
  );
}

/**
 * No Stickers: Album with magnifying glass
 */
function NoStickersIllustration({ compact }: { compact?: boolean }) {
  const illustrationHeight = compact ? 80 : 120;

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Album with magnifying glass"
    >
      <View style={{ position: "relative", alignItems: "center" }}>
        <Text style={{ fontSize: compact ? 48 : 64 }}>📔</Text>
        <Text
          style={{
            fontSize: compact ? 24 : 32,
            position: "absolute",
            bottom: -8,
            right: -12,
            transform: [{ rotate: "-25deg" }],
          }}
        >
          🔍
        </Text>
      </View>
    </View>
  );
}

/**
 * No Bookshelf: Shelf planks with drifting dust particles
 */
function NoBookshelfIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;

  const dustParticles = [0, 1, 2, 3];

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Empty bookshelf with dust particles"
    >
      {/* Shelf planks */}
      <View
        style={{
          width: 90,
          height: 3,
          backgroundColor: "rgba(139,69,19,0.4)",
          marginVertical: 12,
          borderRadius: 1.5,
        }}
      />
      <View
        style={{
          width: 90,
          height: 3,
          backgroundColor: "rgba(139,69,19,0.4)",
          marginVertical: 12,
          borderRadius: 1.5,
        }}
      />

      {/* Drifting dust particles */}
      {dustParticles.map((idx) => (
        <DustParticle key={idx} delay={idx * 400} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}

function DustParticle({
  delay,
  reducedMotion,
}: {
  delay: number;
  reducedMotion: boolean;
}) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    }
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", top: 20 + Math.random() * 40, left: 40 },
        style,
      ]}
      accessible={false}
    >
      <View
        style={{
          width: 2,
          height: 2,
          borderRadius: 1,
          backgroundColor: "rgba(200,200,200,0.3)",
        }}
      />
    </Animated.View>
  );
}

/**
 * No Missions: Compass with subtle rotation wobble
 */
function NoMissionsIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [reducedMotion]);

  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Compass pointing to adventure"
    >
      <Animated.View style={rotStyle}>
        <Text style={{ fontSize: compact ? 48 : 64 }}>🧭</Text>
      </Animated.View>
    </View>
  );
}

/**
 * No Network: Owl Ollie confused with broken Wi-Fi symbol
 */
function NoNetworkIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      translateX.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [reducedMotion]);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Confused owl with broken Wi-Fi symbol"
    >
      <View style={{ position: "relative", alignItems: "center" }}>
        {/* Owl */}
        <Animated.View style={swayStyle}>
          <Text style={{ fontSize: compact ? 48 : 64 }}>🦉</Text>
        </Animated.View>

        {/* Speech bubble with question mark */}
        <View style={styles.speechBubble} accessible={false}>
          <Text style={styles.speechText}>?</Text>
        </View>

        {/* Wi-Fi symbol with X */}
        <View
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessible={false}
        >
          {/* Wi-Fi arcs */}
          <View
            style={{
              width: 32,
              height: 28,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
              borderWidth: 2,
              borderTopColor: "transparent",
              borderColor: "rgba(150,150,150,0.5)",
              position: "absolute",
            }}
          />
          <View
            style={{
              width: 22,
              height: 18,
              borderBottomLeftRadius: 22,
              borderBottomRightRadius: 22,
              borderWidth: 2,
              borderTopColor: "transparent",
              borderColor: "rgba(150,150,150,0.6)",
              position: "absolute",
              top: 4,
            }}
          />
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(150,150,150,0.7)",
              position: "absolute",
              top: 20,
            }}
          />

          {/* Red X overlay */}
          <View
            style={{
              position: "absolute",
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, color: "#E74C3C" }}>✕</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Error: Broken/open book with falling stars and healing bandaid
 */
function ErrorIllustration({ compact }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const illustrationHeight = compact ? 80 : 120;
  const bookRotation = useSharedValue(0);
  const bandaidScale = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      // Slight tilt of the book
      bookRotation.value = withTiming(-5, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });

      // Bandaid pops in after 1s with spring
      bandaidScale.value = withDelay(
        1000,
        withSpring(1, { damping: 8, stiffness: 120 })
      );
    } else {
      bookRotation.value = -5;
      bandaidScale.value = 1;
    }
  }, [reducedMotion]);

  const bookStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bookRotation.value}deg` }],
  }));

  const bandaidStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bandaidScale.value }],
  }));

  // Star particles with faster falling
  const stars = [0, 1, 2, 3];

  return (
    <View
      style={[styles.illustrationContainer, { height: illustrationHeight }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Illustration: Broken book with falling stars and healing bandaid"
    >
      <View style={{ position: "relative", alignItems: "center" }}>
        {/* Book */}
        <Animated.View style={bookStyle}>
          <Text style={{ fontSize: compact ? 48 : 64 }}>📕</Text>
        </Animated.View>

        {/* Falling stars */}
        {stars.map((idx) => (
          <FallingStar
            key={idx}
            delay={idx * 200}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Healing bandaid */}
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: -8,
              right: -8,
            },
            bandaidStyle,
          ]}
          accessible={false}
        >
          <Text style={{ fontSize: compact ? 20 : 28 }}>🩹</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function FallingStar({
  delay,
  reducedMotion,
}: {
  delay: number;
  reducedMotion: boolean;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      // Fall faster than floating stars (1.5s instead of 2s)
      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(100, { duration: 1500, easing: Easing.in(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        )
      );

      // Slight horizontal drift
      const driftAmount = (Math.random() - 0.5) * 20;
      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(driftAmount, {
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        )
      );

      // Fade out while falling
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.2, { duration: 1500 }),
            withTiming(1, { duration: 0 })
          ),
          -1,
          false
        )
      );
    }
  }, [reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", top: -20, left: 20 + Math.random() * 20 },
        animStyle,
      ]}
      accessible={false}
    >
      <Text style={{ fontSize: 16 }}>✨</Text>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Illustration Selector
// ═══════════════════════════════════════════════════════════════

function renderIllustration(type: EmptyStateType, compact?: boolean) {
  const props = { compact };
  switch (type) {
    case "no-stories":
      return <NoStoriesIllustration {...props} />;
    case "no-children":
      return <NoChildrenIllustration {...props} />;
    case "no-downloads":
      return <NoDownloadsIllustration {...props} />;
    case "no-achievements":
      return <NoAchievementsIllustration {...props} />;
    case "no-stickers":
      return <NoStickersIllustration {...props} />;
    case "no-bookshelf":
      return <NoBookshelfIllustration {...props} />;
    case "no-missions":
      return <NoMissionsIllustration {...props} />;
    case "no-network":
      return <NoNetworkIllustration {...props} />;
    case "error":
      return <ErrorIllustration {...props} />;
    default:
      return <NoStoriesIllustration {...props} />;
  }
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export const IllustratedEmptyState = memo(function IllustratedEmptyState({
  type,
  title,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
}: IllustratedEmptyStateProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(100) : FadeIn.duration(400)}
      style={[
        styles.root,
        compact && styles.rootCompact,
        { paddingHorizontal: 16 },
      ]}
      accessible={true}
      accessibilityLabel={title}
      accessibilityRole="none"
    >
      {/* Illustration */}
      {renderIllustration(type, compact)}

      {/* Text Content */}
      <View
        style={[
          styles.textContainer,
          compact && styles.textContainerCompact,
        ]}
      >
        <Text
          style={[styles.title, compact && styles.titleCompact, { color: colors.text }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            compact && styles.subtitleCompact,
            { color: colors.textSecondary },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      {/* Action Button */}
      {actionLabel && onAction && (
        <BounceButton
          onPress={onAction}
          style={[styles.actionButton, { minHeight: 44 }]}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          accessibilityHint={`Double-tap to ${actionLabel.toLowerCase()}`}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </BounceButton>
      )}
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 20,
  },
  rootCompact: {
    paddingVertical: 24,
    gap: 12,
  },

  illustrationContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  textContainer: {
    alignItems: "center",
    gap: 8,
    maxWidth: 280,
  },
  textContainerCompact: {
    gap: 6,
    maxWidth: 240,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 16,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },

  actionButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#0A0E1A",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  speechBubble: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  speechText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFD700",
  },
});
