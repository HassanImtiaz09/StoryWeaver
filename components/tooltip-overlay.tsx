/**
 * TooltipOverlay — First-time user guidance tooltip component
 *
 * Renders a floating card with an emoji, title, message, and optional action button.
 * Appears with a gentle fade-in animation and can be dismissed by tapping
 * the close button or the background overlay.
 */
import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import type { TooltipConfig } from "@/lib/tooltip-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TooltipOverlayProps {
  tooltip: TooltipConfig;
  onDismiss: () => void;
  onAction?: () => void;
}

export function TooltipOverlay({ tooltip, onDismiss, onAction }: TooltipOverlayProps) {
  const colors = useColors();

  // Gentle pulse animation for the emoji
  const emojiScale = useSharedValue(1);

  useEffect(() => {
    emojiScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const handleAction = useCallback(() => {
    onDismiss();
    if (onAction) {
      // Small delay so dismiss animation plays
      setTimeout(onAction, 200);
    }
  }, [onDismiss, onAction]);

  const positionStyle =
    tooltip.position === "top"
      ? styles.positionTop
      : tooltip.position === "bottom"
      ? styles.positionBottom
      : styles.positionCenter;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      {/* Semi-transparent backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Tooltip card */}
      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(140)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.card, positionStyle, { backgroundColor: colors.surface }]}
      >
        {/* Close button */}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityLabel="Dismiss tooltip"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>

        {/* Emoji */}
        <Animated.View style={[styles.emojiContainer, emojiStyle]}>
          <Text style={styles.emoji}>{tooltip.emoji}</Text>
        </Animated.View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          {tooltip.title}
        </Text>

        {/* Message */}
        <Text style={[styles.message, { color: colors.muted }]}>
          {tooltip.message}
        </Text>

        {/* Action button */}
        {tooltip.actionLabel && (
          <Pressable
            onPress={handleAction}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: "#FFD700" },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            accessibilityLabel={tooltip.actionLabel}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>{tooltip.actionLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#0A0E1A" />
          </Pressable>
        )}

        {/* Dismiss hint */}
        <Text style={[styles.dismissHint, { color: colors.muted }]}>
          Tap anywhere to dismiss
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Compact inline tooltip (non-modal) ───────────────────────────
interface InlineTooltipProps {
  message: string;
  emoji: string;
  onDismiss: () => void;
  position?: "above" | "below";
}

export function InlineTooltip({ message, emoji, onDismiss, position = "below" }: InlineTooltipProps) {
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.inlineContainer,
        { backgroundColor: colors.surface, borderColor: "#FFD700" },
        position === "above" ? styles.inlineAbove : styles.inlineBelow,
      ]}
    >
      <View style={styles.inlineContent}>
        <Text style={styles.inlineEmoji}>{emoji}</Text>
        <Text style={[styles.inlineMessage, { color: colors.foreground }]}>
          {message}
        </Text>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {/* Arrow indicator */}
      <View
        style={[
          styles.arrow,
          { borderBottomColor: colors.surface },
          position === "above" ? styles.arrowDown : styles.arrowUp,
        ]}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  card: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  positionTop: {
    position: "absolute",
    top: 120,
  },
  positionBottom: {
    position: "absolute",
    bottom: 140,
  },
  positionCenter: {
    // Default centered by parent flexbox
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiContainer: {
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 26,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0E1A",
  },
  dismissHint: {
    fontSize: 12,
    opacity: 0.6,
  },

  // Inline tooltip
  inlineContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  inlineAbove: {
    marginBottom: 8,
  },
  inlineBelow: {
    marginTop: 8,
  },
  inlineContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineEmoji: {
    fontSize: 20,
  },
  inlineMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
  },
  arrowUp: {
    top: -8,
    borderBottomWidth: 8,
  },
  arrowDown: {
    bottom: -8,
    borderTopWidth: 8,
  },
});
