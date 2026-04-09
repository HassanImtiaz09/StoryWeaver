/**
 * StickerBook — Collectible sticker display earned after story completions.
 * Features:
 *   - Grid of sticker slots (collected vs locked)
 *   - Stickers organized by theme collections
 *   - New sticker "peel" animation when recently earned
 *   - Total count and collection progress
 *   - Haptic feedback on sticker tap
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announce } from "@/lib/a11y-helpers";
import { playStickerPeel } from "@/lib/sound-effects";
import { IllustratedEmptyState } from "./illustrated-empty-state";

const { width: SW } = Dimensions.get("window");

/* ─── Sticker definitions by theme collection ──────────────── */
export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  collection: string;
}

export const STICKER_COLLECTIONS: { name: string; emoji: string; stickers: StickerDef[] }[] = [
  {
    name: "Ocean Friends",
    emoji: "🌊",
    stickers: [
      { id: "s_octopus", emoji: "🐙", name: "Octopus", collection: "Ocean Friends" },
      { id: "s_whale", emoji: "🐋", name: "Whale", collection: "Ocean Friends" },
      { id: "s_dolphin", emoji: "🐬", name: "Dolphin", collection: "Ocean Friends" },
      { id: "s_turtle", emoji: "🐢", name: "Sea Turtle", collection: "Ocean Friends" },
      { id: "s_starfish", emoji: "⭐", name: "Starfish", collection: "Ocean Friends" },
      { id: "s_coral", emoji: "🪸", name: "Coral", collection: "Ocean Friends" },
    ],
  },
  {
    name: "Space Explorers",
    emoji: "🚀",
    stickers: [
      { id: "s_rocket", emoji: "🚀", name: "Rocket", collection: "Space Explorers" },
      { id: "s_planet", emoji: "🪐", name: "Planet", collection: "Space Explorers" },
      { id: "s_star", emoji: "🌟", name: "Star", collection: "Space Explorers" },
      { id: "s_astronaut", emoji: "🧑‍🚀", name: "Astronaut", collection: "Space Explorers" },
      { id: "s_moon", emoji: "🌙", name: "Moon", collection: "Space Explorers" },
      { id: "s_ufo", emoji: "🛸", name: "UFO", collection: "Space Explorers" },
    ],
  },
  {
    name: "Forest Creatures",
    emoji: "🌲",
    stickers: [
      { id: "s_fox", emoji: "🦊", name: "Fox", collection: "Forest Creatures" },
      { id: "s_owl", emoji: "🦉", name: "Owl", collection: "Forest Creatures" },
      { id: "s_deer", emoji: "🦌", name: "Deer", collection: "Forest Creatures" },
      { id: "s_mushroom", emoji: "🍄", name: "Mushroom", collection: "Forest Creatures" },
      { id: "s_butterfly", emoji: "🦋", name: "Butterfly", collection: "Forest Creatures" },
      { id: "s_acorn", emoji: "🌰", name: "Acorn", collection: "Forest Creatures" },
    ],
  },
  {
    name: "Dino World",
    emoji: "🦕",
    stickers: [
      { id: "s_trex", emoji: "🦖", name: "T-Rex", collection: "Dino World" },
      { id: "s_bronto", emoji: "🦕", name: "Brontosaurus", collection: "Dino World" },
      { id: "s_egg", emoji: "🥚", name: "Dino Egg", collection: "Dino World" },
      { id: "s_bone", emoji: "🦴", name: "Fossil", collection: "Dino World" },
      { id: "s_volcano", emoji: "🌋", name: "Volcano", collection: "Dino World" },
      { id: "s_footprint", emoji: "🐾", name: "Footprint", collection: "Dino World" },
    ],
  },
  {
    name: "Magic Kingdom",
    emoji: "🧚",
    stickers: [
      { id: "s_wand", emoji: "🪄", name: "Magic Wand", collection: "Magic Kingdom" },
      { id: "s_crown", emoji: "👑", name: "Crown", collection: "Magic Kingdom" },
      { id: "s_dragon", emoji: "🐉", name: "Dragon", collection: "Magic Kingdom" },
      { id: "s_unicorn", emoji: "🦄", name: "Unicorn", collection: "Magic Kingdom" },
      { id: "s_crystal", emoji: "💎", name: "Crystal", collection: "Magic Kingdom" },
      { id: "s_potion", emoji: "🧪", name: "Potion", collection: "Magic Kingdom" },
    ],
  },
];

const ALL_STICKERS = STICKER_COLLECTIONS.flatMap((c) => c.stickers);

/* ─── New sticker peel animation ───────────────────────────── */
function NewStickerSlot({ sticker, delay }: { sticker: StickerDef; delay: number }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(15);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      // Static state when motion is reduced
      scale.value = 1;
      rotate.value = 0;
      opacity.value = 1;
    } else {
      scale.value = withDelay(delay, withSpring(1, { damping: 6, stiffness: 100 }));
      rotate.value = withDelay(delay, withSpring(0, { damping: 10 }));
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
      // Play sticker peel sound with a slight delay
      setTimeout(() => playStickerPeel(), delay);
    }
  }, [reducedMotion]);

  useEffect(() => {
    announce(`New sticker: ${sticker.name}`);
  }, [sticker.id]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.stickerSlot, styles.stickerCollected, style]}
      accessible={true}
      accessibilityLabel={`${sticker.name} sticker`}
    >
      <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
      <View
        style={styles.newBadge}
        accessible={true}
        accessibilityLabel="New badge"
      >
        <Text style={styles.newBadgeText}>NEW</Text>
      </View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
interface StickerBookProps {
  collectedStickerIds: string[];
  newStickerIds?: string[]; // recently earned — get peel animation
  onStickerPress?: (sticker: StickerDef) => void;
}

export function StickerBook({
  collectedStickerIds,
  newStickerIds = [],
  onStickerPress,
}: StickerBookProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const totalStickers = ALL_STICKERS.length;
  const collected = collectedStickerIds.length;

  // Show empty state if no stickers collected
  if (collected === 0) {
    return (
      <View
        style={styles.container}
        accessible={true}
        accessibilityLabel="Sticker Book"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>📒</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Sticker Book
            </Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {collected}/{totalStickers} collected
            </Text>
          </View>
          {/* Progress ring */}
          <View style={styles.progressRing}>
            <Text style={styles.progressPercent}>
              {Math.round((collected / totalStickers) * 100)}%
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={styles.progressTrack}
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: totalStickers,
            now: collected,
          }}
          accessibilityLabel={`Sticker collection progress: ${collected} of ${totalStickers}`}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${(collected / totalStickers) * 100}%` },
            ]}
          />
        </View>

        {/* Empty state */}
        <IllustratedEmptyState
          type="no-stickers"
          title="No Stickers Collected"
          subtitle="Complete daily missions to earn stickers for your collection"
          compact
        />
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Sticker Book"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📒</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Sticker Book
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {collected}/{totalStickers} collected
          </Text>
        </View>
        {/* Progress ring */}
        <View style={styles.progressRing}>
          <Text style={styles.progressPercent}>
            {Math.round((collected / totalStickers) * 100)}%
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={styles.progressTrack}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: totalStickers,
          now: collected,
        }}
        accessibilityLabel={`Sticker collection progress: ${collected} of ${totalStickers}`}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${(collected / totalStickers) * 100}%` },
          ]}
        />
      </View>

      {/* Collections */}
      {STICKER_COLLECTIONS.map((coll, ci) => {
        const collCollected = coll.stickers.filter((s) =>
          collectedStickerIds.includes(s.id)
        ).length;

        return (
          <Animated.View
            key={coll.name}
            entering={FadeInDown.delay(ci * 60).duration(300)}
          >
            {/* Collection header */}
            <View
              style={styles.collHeader}
              accessible={true}
              accessibilityRole="header"
              accessibilityLabel={`${coll.name} collection`}
            >
              <Text style={styles.collEmoji}>{coll.emoji}</Text>
              <Text style={[styles.collName, { color: colors.text }]}>
                {coll.name}
              </Text>
              <Text style={[styles.collCount, { color: colors.muted }]}>
                {collCollected}/{coll.stickers.length}
              </Text>
              {collCollected === coll.stickers.length && (
                <View
                  style={styles.collCompleteBadge}
                  accessible={true}
                  accessibilityLabel="Collection complete"
                >
                  <Text style={styles.collCompleteText}>Complete!</Text>
                </View>
              )}
            </View>

            {/* Sticker grid */}
            <View style={styles.stickerGrid}>
              {coll.stickers.map((sticker, si) => {
                const isCollected = collectedStickerIds.includes(sticker.id);
                const isNew = newStickerIds.includes(sticker.id);

                if (isNew) {
                  return (
                    <Pressable
                      key={sticker.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onStickerPress?.(sticker);
                      }}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`${sticker.name} sticker, new`}
                      accessibilityHint="Double-tap to view this sticker"
                      style={{ minHeight: 44 }}
                    >
                      <NewStickerSlot sticker={sticker} delay={si * 100} />
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={sticker.id}
                    onPress={() => {
                      if (isCollected) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onStickerPress?.(sticker);
                      }
                    }}
                    style={[
                      styles.stickerSlot,
                      isCollected
                        ? styles.stickerCollected
                        : styles.stickerLocked,
                      { minHeight: 44 },
                    ]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isCollected
                        ? `${sticker.name} sticker`
                        : "Locked sticker"
                    }
                    accessibilityHint={isCollected ? "Double-tap to view this sticker" : "Sticker locked. Collect it by reading stories."}
                    disabled={!isCollected}
                  >
                    {isCollected ? (
                      <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
                    ) : (
                      <Text style={styles.stickerLockIcon}>?</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const SLOT_SIZE = (SW - 32 - 40) / 6; // 6 per row with gaps

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
  },
  progressRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercent: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "800",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },

  /* Collection */
  collHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  collEmoji: {
    fontSize: 16,
  },
  collName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  collCount: {
    fontSize: 11,
  },
  collCompleteBadge: {
    backgroundColor: "rgba(16,185,129,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  collCompleteText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "700",
  },

  /* Sticker slots */
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  stickerSlot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerCollected: {
    backgroundColor: "rgba(255,215,0,0.1)",
  },
  stickerLocked: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderStyle: "dashed",
  },
  stickerEmoji: {
    fontSize: SLOT_SIZE * 0.5,
  },
  stickerLockIcon: {
    fontSize: SLOT_SIZE * 0.35,
    color: "rgba(255,255,255,0.15)",
    fontWeight: "700",
  },
  newBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "800",
  },
});
