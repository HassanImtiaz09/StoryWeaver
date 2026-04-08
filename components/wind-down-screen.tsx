import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { BEDTIME_THEME } from "@/lib/bedtime-mode";
import { IconSymbol } from "@/components/ui/icon-symbol";

type AmbientSoundType = "rain" | "ocean" | "forest" | "white_noise" | "none";

interface Props {
  childName: string;
  onContinueStory: () => void;
  onStartSleep: () => void;
  onSetTimer: (minutes: number) => void;
  onSelectAmbient: (sound: AmbientSoundType) => void;
  selectedAmbient?: AmbientSoundType;
}

const AMBIENT_SOUNDS = [
  { id: "rain" as const, label: "Rain", emoji: "🌧️" },
  { id: "ocean" as const, label: "Ocean", emoji: "🌊" },
  { id: "forest" as const, label: "Forest", emoji: "🌲" },
  { id: "white_noise" as const, label: "White Noise", emoji: "🔇" },
  { id: "none" as const, label: "None", emoji: "🔇" },
];

const TIMER_OPTIONS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 hour" },
];

/**
 * Displayed after story completion in bedtime mode.
 * Shows a calming transition with:
 * - "Goodnight" message with child's name
 * - Ambient sound selector (rain, ocean, forest, white noise)
 * - Sleep timer controls (15, 30, 45, 60 minutes)
 * - Gradual fade to ambient mode
 * - "Continue to another story" or "Time to sleep" options
 */
export function WindDownScreen({
  childName,
  onContinueStory,
  onStartSleep,
  onSetTimer,
  onSelectAmbient,
  selectedAmbient = "rain",
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: BEDTIME_THEME.backgroundColor }]}>
      {/* Goodnight message */}
      <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.greetingContainer}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={[styles.goodnightText, { color: BEDTIME_THEME.textColor }]}>
          Goodnight, {childName}
        </Text>
        <Text style={[styles.subtitle, { color: BEDTIME_THEME.accentColor }]}>
          Sweet dreams await
        </Text>
      </Animated.View>

      {/* Ambient sound selector */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(800)}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: BEDTIME_THEME.textColor }]}>
          Choose your ambience
        </Text>
        <View style={styles.ambientGrid}>
          {AMBIENT_SOUNDS.map((sound) => (
            <Pressable
              key={sound.id}
              onPress={() => onSelectAmbient(sound.id)}
              style={({ pressed }) => [
                styles.ambientButton,
                selectedAmbient === sound.id && {
                  backgroundColor: BEDTIME_THEME.accentColor,
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={styles.ambientEmoji}>{sound.emoji}</Text>
              <Text
                style={[
                  styles.ambientLabel,
                  {
                    color: selectedAmbient === sound.id
                      ? BEDTIME_THEME.backgroundColor
                      : BEDTIME_THEME.textColor,
                  },
                ]}
              >
                {sound.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Sleep timer selector */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(800)}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: BEDTIME_THEME.textColor }]}>
          Set a sleep timer
        </Text>
        <View style={styles.timerGrid}>
          {TIMER_OPTIONS.map((option) => (
            <Pressable
              key={option.minutes}
              onPress={() => onSetTimer(option.minutes)}
              style={({ pressed }) => [
                styles.timerButton,
                { backgroundColor: BEDTIME_THEME.cardBackground },
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={[styles.timerLabel, { color: BEDTIME_THEME.textColor }]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(800)}
        style={styles.actionContainer}
      >
        {/* Continue story button */}
        <Pressable
          onPress={onContinueStory}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: BEDTIME_THEME.cardBackground },
            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: BEDTIME_THEME.textColor }]}>
            One more story
          </Text>
        </Pressable>

        {/* Time to sleep button */}
        <Pressable
          onPress={onStartSleep}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: BEDTIME_THEME.starColor },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: BEDTIME_THEME.backgroundColor }]}>
            Time to sleep
          </Text>
        </Pressable>
      </Animated.View>

      {/* Decorative stars */}
      <View style={styles.starsContainer}>
        <Text style={styles.star}>✨</Text>
        <Text style={[styles.star, { right: "10%", opacity: 0.6 }]}>⭐</Text>
        <Text style={[styles.star, { bottom: "20%", left: "15%" }]}>✨</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  greetingContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  goodnightText: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  sectionContainer: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  ambientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  ambientButton: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    gap: 6,
  },
  ambientEmoji: {
    fontSize: 24,
  },
  ambientLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  timerGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  timerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionContainer: {
    gap: 12,
    marginTop: 20,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  starsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  star: {
    position: "absolute",
    fontSize: 24,
    opacity: 0.3,
  },
});
