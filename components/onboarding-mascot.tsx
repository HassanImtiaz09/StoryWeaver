/**
 * OnboardingMascot — A friendly owl guide named "Ollie" who walks
 * the user through the onboarding flow. Has idle bounce, wave,
 * celebration, and speech-bubble animations.
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
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/* ─── Mascot speech lines per step ─────────────────────────── */
export const MASCOT_LINES: Record<string, string> = {
  welcome:
    "Hi there! I'm Ollie the Owl! Let's make your first magical story together!",
  nameAge:
    "What's your little one's name? I can't wait to meet them!",
  interests:
    "Ooh, pick 3 things they love! I'll remember these for every story!",
  celebrate:
    "Hooray! Your first story is being created right now!",
};

type MascotMode = "idle" | "wave" | "celebrate";

interface Props {
  mode?: MascotMode;
  speechKey?: keyof typeof MASCOT_LINES;
  size?: number;
  isSpeaking?: boolean;
}

/* ─── Sound wave bar animation component ────────────────────── */
function SoundWaveBar({ delay }: { delay: number }) {
  const height = useSharedValue(4);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(16, { duration: 300 }),
          withTiming(4, { duration: 300 })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    width: 3,
    backgroundColor: "rgba(255,215,0,0.8)",
    borderRadius: 1.5,
  }));

  return <Animated.View style={style} />;
}

export function OnboardingMascot({
  mode = "idle",
  speechKey,
  size = 100,
  isSpeaking = false,
}: Props) {
  const reducedMotion = useReducedMotion();

  /* ── Shared animation values ── */
  const bounceY = useSharedValue(0);
  const bodyRotate = useSharedValue(0);
  const wingRotate = useSharedValue(0);
  const eyeBlink = useSharedValue(1);
  const speechBubbleScale = useSharedValue(1);

  /* ── Speaking pulse animation ── */
  useEffect(() => {
    if (isSpeaking && !reducedMotion) {
      speechBubbleScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      speechBubbleScale.value = withTiming(1, { duration: 200 });
    }
  }, [isSpeaking, reducedMotion]);

  /* ── Idle bounce ── */
  useEffect(() => {
    if (!reducedMotion) {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      bounceY.value = 0;
    }

    // Blink every 3s (skip if reduced motion)
    const startBlink = () => {
      if (!reducedMotion) {
        eyeBlink.value = withRepeat(
          withDelay(
            3000,
            withSequence(
              withTiming(0.1, { duration: 80 }),
              withTiming(1, { duration: 80 })
            )
          ),
          -1,
          false
        );
      } else {
        eyeBlink.value = 1;
      }
    };
    startBlink();
  }, [reducedMotion]);

  /* ── Mode-specific animations ── */
  useEffect(() => {
    if (mode === "wave") {
      if (!reducedMotion) {
        wingRotate.value = withRepeat(
          withSequence(
            withTiming(-30, { duration: 250 }),
            withTiming(10, { duration: 200 }),
            withTiming(-25, { duration: 200 }),
            withTiming(0, { duration: 250 })
          ),
          3,
          false
        );
      } else {
        wingRotate.value = 0;
      }
    } else if (mode === "celebrate") {
      if (!reducedMotion) {
        bodyRotate.value = withRepeat(
          withSequence(
            withSpring(10, { damping: 6, stiffness: 200 }),
            withSpring(-10, { damping: 6, stiffness: 200 }),
            withSpring(0, { damping: 8, stiffness: 150 })
          ),
          -1,
          false
        );
        wingRotate.value = withRepeat(
          withSequence(
            withTiming(-40, { duration: 150 }),
            withTiming(20, { duration: 150 })
          ),
          -1,
          true
        );
      } else {
        bodyRotate.value = 0;
        wingRotate.value = 0;
      }
    } else {
      bodyRotate.value = withTiming(0, { duration: 300 });
      wingRotate.value = withTiming(0, { duration: 300 });
    }
  }, [mode, reducedMotion]);

  /* ── Animated styles ── */
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceY.value },
      { rotate: `${bodyRotate.value}deg` },
    ],
  }));

  const leftWingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wingRotate.value}deg` }],
  }));

  const rightWingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-wingRotate.value}deg` }],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: eyeBlink.value }],
  }));

  const speechBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speechBubbleScale.value }],
  }));

  const scale = size / 100;
  const speechLine = speechKey ? MASCOT_LINES[speechKey] : null;

  return (
    <View style={styles.wrapper} accessibilityLabel="Ollie the Owl mascot">
      {/* Speech bubble */}
      {speechLine && (
        <View>
          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={[styles.speechBubble, speechBubbleStyle]}
          >
            <Text style={styles.speechText}>{speechLine}</Text>
            <View style={styles.speechTail} />
          </Animated.View>

          {/* Sound wave indicator when speaking */}
          {isSpeaking && (
            <View style={styles.soundWaveContainer}>
              <SoundWaveBar delay={0} />
              <SoundWaveBar delay={100} />
              <SoundWaveBar delay={200} />
            </View>
          )}
        </View>
      )}

      {/* Owl body */}
      <Animated.View
        style={[
          styles.owlContainer,
          { width: size, height: size * 1.1 },
          bodyStyle,
        ]}
      >
        {/* Body circle */}
        <View
          style={[
            styles.owlBody,
            {
              width: size * 0.7,
              height: size * 0.75,
              borderRadius: size * 0.35,
              bottom: 0,
            },
          ]}
        />

        {/* Head circle */}
        <View
          style={[
            styles.owlHead,
            {
              width: size * 0.65,
              height: size * 0.55,
              borderRadius: size * 0.3,
              top: 0,
            },
          ]}
        >
          {/* Ear tufts */}
          <View
            style={[
              styles.earTuft,
              styles.earLeft,
              { width: size * 0.12, height: size * 0.18 },
            ]}
          />
          <View
            style={[
              styles.earTuft,
              styles.earRight,
              { width: size * 0.12, height: size * 0.18 },
            ]}
          />

          {/* Eyes */}
          <View style={styles.eyesRow}>
            <Animated.View
              style={[
                styles.eye,
                { width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08 },
                eyeStyle,
              ]}
            >
              <View
                style={[
                  styles.pupil,
                  { width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04 },
                ]}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.eye,
                { width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08 },
                eyeStyle,
              ]}
            >
              <View
                style={[
                  styles.pupil,
                  { width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04 },
                ]}
              />
            </Animated.View>
          </View>

          {/* Beak */}
          <View
            style={[
              styles.beak,
              {
                borderLeftWidth: size * 0.05,
                borderRightWidth: size * 0.05,
                borderTopWidth: size * 0.07,
              },
            ]}
          />
        </View>

        {/* Wings */}
        <Animated.View
          style={[
            styles.wing,
            styles.wingLeft,
            {
              width: size * 0.22,
              height: size * 0.35,
              borderRadius: size * 0.11,
              left: -size * 0.08,
              top: size * 0.35,
            },
            leftWingStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.wing,
            styles.wingRight,
            {
              width: size * 0.22,
              height: size * 0.35,
              borderRadius: size * 0.11,
              right: -size * 0.08,
              top: size * 0.35,
            },
            rightWingStyle,
          ]}
        />

        {/* Feet */}
        <View
          style={[
            styles.feet,
            { bottom: -size * 0.06, width: size * 0.4 },
          ]}
        >
          <View
            style={[
              styles.foot,
              { width: size * 0.14, height: size * 0.06, borderRadius: size * 0.03 },
            ]}
          />
          <View
            style={[
              styles.foot,
              { width: size * 0.14, height: size * 0.06, borderRadius: size * 0.03 },
            ]}
          />
        </View>
      </Animated.View>

      {/* Name label */}
      <Text style={styles.nameLabel}>Ollie</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  speechBubble: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 260,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  soundWaveContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    height: 20,
    marginBottom: 12,
  },
  speechText: {
    color: "#1a1a2e",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  speechTail: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    left: "45%",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(255,255,255,0.95)",
  },
  owlContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  owlBody: {
    backgroundColor: "#8B6914",
    position: "absolute",
    alignSelf: "center",
  },
  owlHead: {
    backgroundColor: "#A0782C",
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  earTuft: {
    position: "absolute",
    top: -8,
    backgroundColor: "#8B6914",
    borderRadius: 4,
  },
  earLeft: {
    left: 6,
    transform: [{ rotate: "-20deg" }],
  },
  earRight: {
    right: 6,
    transform: [{ rotate: "20deg" }],
  },
  eyesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: -4,
  },
  eye: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pupil: {
    backgroundColor: "#1a1a2e",
  },
  beak: {
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF9800",
    marginTop: 2,
  },
  wing: {
    backgroundColor: "#6B5010",
    position: "absolute",
    zIndex: 1,
  },
  wingLeft: {
    transformOrigin: "top right",
  },
  wingRight: {
    transformOrigin: "top left",
  },
  feet: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: "center",
  },
  foot: {
    backgroundColor: "#FF9800",
  },
  nameLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 1,
  },
});
