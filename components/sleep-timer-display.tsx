import { View, Text, Pressable, StyleSheet } from "react-native";
import { useBedtimeTimer } from "@/hooks/use-bedtime-timer";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Props {
  onTimerExpired?: () => void;
  onCancel?: () => void;
  color?: string;
}

/**
 * Displays an active sleep timer with remaining time.
 * Shows time in MM:SS format.
 * Includes a cancel button to stop the timer.
 */
export function SleepTimerDisplay({ onTimerExpired, onCancel, color = "#FFD700" }: Props) {
  const { remainingMinutes, hasExpired } = useBedtimeTimer(onTimerExpired);

  if (remainingMinutes === null) {
    return null;
  }

  const minutes = Math.floor(remainingMinutes / 60);
  const seconds = remainingMinutes % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <View style={[styles.container, { backgroundColor: `${color}20` }]}>
      <View style={styles.timerContent}>
        <IconSymbol name="moon.fill" size={16} color={color} />
        <Text style={[styles.timerText, { color }]}>
          {timeString}
        </Text>
      </View>
      {onCancel && (
        <Pressable onPress={onCancel} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <IconSymbol name="xmark" size={16} color={color} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
