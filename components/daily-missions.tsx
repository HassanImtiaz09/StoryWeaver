/**
 * DailyMissions — "Today's Quests" card showing themed daily challenges.
 * Features:
 *   - Rotates missions daily based on date seed
 *   - Each mission has a theme, emoji, reward points
 *   - Animated progress checkmarks
 *   - Themed rewards (stickers tied to theme)
 *   - Refresh countdown to next day
 */
import React, { useMemo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { STORY_THEMES } from "@/constants/assets";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announce } from "@/lib/a11y-helpers";
import { playMissionComplete } from "@/lib/sound-effects";
import { StreakFire } from "./micro-animations";

/* ─── Mission templates ────────────────────────────────────── */
interface MissionTemplate {
  id: string;
  title: string;
  themeId: string;
  emoji: string;
  points: number;
  stickerReward: string; // emoji sticker
}

const MISSION_POOL: MissionTemplate[] = [
  { id: "ocean_quest", title: "Read a story about the ocean!", emoji: "🌊", themeId: "ocean", points: 30, stickerReward: "🐙" },
  { id: "space_quest", title: "Blast off into a space adventure!", emoji: "🚀", themeId: "space", points: 30, stickerReward: "🪐" },
  { id: "forest_quest", title: "Explore an enchanted forest story!", emoji: "🌲", themeId: "forest", points: 30, stickerReward: "🍄" },
  { id: "dino_quest", title: "Read a dinosaur adventure!", emoji: "🦕", themeId: "dinosaur", points: 30, stickerReward: "🥚" },
  { id: "pirate_quest", title: "Set sail on a pirate voyage!", emoji: "🏴‍☠️", themeId: "pirate", points: 30, stickerReward: "💰" },
  { id: "robot_quest", title: "Meet some robot friends!", emoji: "🤖", themeId: "robot", points: 30, stickerReward: "⚙️" },
  { id: "fairy_quest", title: "Visit the fairy kingdom!", emoji: "🧚", themeId: "fairy", points: 30, stickerReward: "🦋" },
  { id: "safari_quest", title: "Go on a safari journey!", emoji: "🦁", themeId: "safari", points: 30, stickerReward: "🐘" },
  { id: "arctic_quest", title: "Brave the arctic expedition!", emoji: "❄️", themeId: "arctic", points: 30, stickerReward: "🐧" },
  { id: "castle_quest", title: "Embark on a medieval quest!", emoji: "🏰", themeId: "medieval", points: 30, stickerReward: "🗡️" },
  { id: "bedtime_bonus", title: "Complete a bedtime story before 8pm!", emoji: "🌙", themeId: "any", points: 25, stickerReward: "⭐" },
  { id: "explore_new", title: "Try a theme you've never read!", emoji: "🗺️", themeId: "any", points: 40, stickerReward: "🧭" },
  { id: "double_read", title: "Read two stories today!", emoji: "📚", themeId: "any", points: 35, stickerReward: "🎯" },
  { id: "kind_story", title: "Read a story about kindness!", emoji: "💛", themeId: "any", points: 25, stickerReward: "🌈" },
];

/* ─── Deterministic daily seed ─────────────────────────────── */
function getDayMissions(count: number): MissionTemplate[] {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  // Simple seeded shuffle
  const shuffled = [...MISSION_POOL].sort((a, b) => {
    const hashA = ((seed * 31 + a.id.charCodeAt(0)) % 1000) / 1000;
    const hashB = ((seed * 31 + b.id.charCodeAt(0)) % 1000) / 1000;
    return hashA - hashB;
  });
  return shuffled.slice(0, count);
}

function getHoursUntilReset(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
}

/* ─── Mission row ──────────────────────────────────────────── */
function MissionRow({
  mission,
  isCompleted,
  onPress,
  index,
}: {
  mission: MissionTemplate;
  isCompleted: boolean;
  onPress: () => void;
  index: number;
}) {
  const colors = useColors();
  const prefersReducedMotion = useReducedMotion();
  const checkScale = useSharedValue(isCompleted ? 1 : 0);

  useEffect(() => {
    if (isCompleted) {
      if (prefersReducedMotion) {
        checkScale.value = 1;
      } else {
        checkScale.value = withSpring(1, { damping: 8, stiffness: 120 });
      }
      // Play mission complete sound
      playMissionComplete();
    }
  }, [isCompleted, prefersReducedMotion]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const statusText = isCompleted ? "Completed" : "Not completed";
  const accessibilityLabel = `${mission.title} mission. ${mission.points} points. ${statusText}.`;
  const accessibilityHint = isCompleted
    ? "This quest is completed"
    : `Double tap to complete this quest and earn ${mission.points} points and a ${mission.stickerReward} sticker`;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(300)}>
      <Pressable
        onPress={onPress}
        disabled={isCompleted}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isCompleted, checked: isCompleted }}
        style={({ pressed }) => [
          styles.missionRow,
          {
            backgroundColor: isCompleted
              ? "rgba(16,185,129,0.1)"
              : colors.card,
            opacity: pressed ? 0.85 : 1,
            minHeight: 44,
          },
        ]}
      >
        {/* Emoji */}
        <Text style={styles.missionEmoji}>{mission.emoji}</Text>

        {/* Text */}
        <View style={styles.missionText}>
          <Text
            style={[
              styles.missionTitle,
              {
                color: isCompleted ? "rgba(255,255,255,0.5)" : colors.text,
                textDecorationLine: isCompleted ? "line-through" : "none",
              },
            ]}
            numberOfLines={2}
          >
            {mission.title}
          </Text>
          <View style={styles.missionRewards}>
            <Text style={styles.missionPoints}>+{mission.points} pts</Text>
            <Text style={styles.missionSticker}>
              Sticker: {mission.stickerReward}
            </Text>
          </View>
        </View>

        {/* Completion check */}
        {isCompleted ? (
          <Animated.View style={[styles.checkCircle, styles.checkDone, checkStyle]}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </Animated.View>
        ) : (
          <View style={[styles.checkCircle, { borderColor: colors.muted }]} />
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
interface DailyMissionsProps {
  completedMissionIds: string[];
  onMissionPress: (mission: MissionTemplate) => void;
}

export function DailyMissions({
  completedMissionIds,
  onMissionPress,
}: DailyMissionsProps) {
  const colors = useColors();
  const prefersReducedMotion = useReducedMotion();
  const missions = useMemo(() => getDayMissions(3), []);
  const hoursLeft = useMemo(() => getHoursUntilReset(), []);
  const completed = completedMissionIds.length;

  // Sparkle animation for header
  const sparkleRotate = useSharedValue(0);
  useEffect(() => {
    if (prefersReducedMotion) {
      sparkleRotate.value = 0;
      return;
    }

    sparkleRotate.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(-12, { duration: 600 }),
        withTiming(0, { duration: 400 })
      ),
      -1,
      false
    );
  }, [prefersReducedMotion]);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  // Announce when all missions are complete
  useEffect(() => {
    if (completed === missions.length && completed > 0) {
      announce("All quests completed! You earned 20 bonus points.");
    }
  }, [completed, missions.length]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.Text style={[styles.headerEmoji, sparkleStyle]}>
            ⚔️
          </Animated.Text>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Today's Quests
              </Text>
              <StreakFire size={20} intensity="medium" />
            </View>
            <Text
              style={[styles.headerSub, { color: colors.muted }]}
              accessibilityLabel={`Resets in ${hoursLeft} hours`}
            >
              Resets in {hoursLeft}h
            </Text>
          </View>
        </View>
        <View
          style={styles.completionBadge}
          accessibilityLabel={`${completed} out of ${missions.length} quests completed`}
          accessible={true}
        >
          <Text style={styles.completionText}>
            {completed}/{missions.length}
          </Text>
        </View>
      </View>

      {/* Mission list */}
      <View style={styles.missionList}>
        {missions.map((m, i) => (
          <MissionRow
            key={m.id}
            mission={m}
            index={i}
            isCompleted={completedMissionIds.includes(m.id)}
            onPress={() => onMissionPress(m)}
          />
        ))}
      </View>

      {/* All-complete bonus */}
      {completed === missions.length && completed > 0 && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.allDoneBanner}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="All quests complete! 20 bonus points earned"
        >
          <Text style={styles.allDoneEmoji}>🎉</Text>
          <Text style={styles.allDoneText}>
            All quests complete! +20 bonus points
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

export type { MissionTemplate };

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 11,
  },
  completionBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  completionText: {
    color: "#0A0E1A",
    fontSize: 12,
    fontWeight: "700",
  },
  missionList: {
    gap: 8,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    minHeight: 44,
  },
  missionEmoji: {
    fontSize: 26,
  },
  missionText: {
    flex: 1,
    gap: 4,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  missionRewards: {
    flexDirection: "row",
    gap: 10,
  },
  missionPoints: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFD700",
  },
  missionSticker: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  allDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.15)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  allDoneEmoji: {
    fontSize: 18,
  },
  allDoneText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
  },
});
