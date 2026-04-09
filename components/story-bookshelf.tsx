/**
 * StoryBookshelf — Pseudo-3D bookshelf visualization showing completed
 * stories as book spines on wooden shelves.
 * Features:
 *   - Perspective-transformed shelf rows
 *   - Colorful book spines with theme-based colors and emojis
 *   - Book lean/tilt variations for organic look
 *   - Tap a book to navigate to story detail
 *   - Empty slots shown as faint outlines (room to grow)
 *   - Shelf wood grain texture via gradient
 */
import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announce } from "@/lib/a11y-helpers";
import { IllustratedEmptyState } from "./illustrated-empty-state";

const { width: SW } = Dimensions.get("window");
const BOOKS_PER_SHELF = 6;
const BOOK_WIDTH = (SW - 48) / BOOKS_PER_SHELF;
const BOOK_HEIGHT = 100;
const SHELF_HEIGHT = BOOK_HEIGHT + 18;

/* ─── Theme → Book spine color mapping ─────────────────────── */
const THEME_SPINE_COLORS: Record<string, [string, string]> = {
  space: ["#2D1B69", "#6C5CE7"],
  ocean: ["#0652DD", "#1289A7"],
  forest: ["#1B5E20", "#4CAF50"],
  dinosaur: ["#5D4037", "#8D6E63"],
  pirate: ["#2C3E50", "#34495E"],
  robot: ["#546E7A", "#90A4AE"],
  fairy: ["#AD1457", "#E91E63"],
  safari: ["#E65100", "#FF9800"],
  arctic: ["#0277BD", "#4FC3F7"],
  medieval: ["#4E342E", "#795548"],
  jungle: ["#33691E", "#7CB342"],
  candy: ["#D81B60", "#FF80AB"],
  musical: ["#6A1B9A", "#CE93D8"],
  garden: ["#2E7D32", "#81C784"],
};

const THEME_EMOJIS: Record<string, string> = {
  space: "🚀", ocean: "🌊", forest: "🌲", dinosaur: "🦕",
  pirate: "🏴‍☠️", robot: "🤖", fairy: "🧚", safari: "🦁",
  arctic: "❄️", medieval: "🏰", jungle: "🌴", candy: "🍬",
  musical: "🎵", garden: "🌻",
};

/* ─── Book Spine ───────────────────────────────────────────── */
interface BookData {
  id: string;
  title: string;
  theme: string;
}

function BookSpine({
  book,
  index,
  onPress,
}: {
  book: BookData;
  index: number;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const tilt = ((index % 3) - 1) * 2; // -2, 0, or +2 degrees for organic lean
  const spineColors = THEME_SPINE_COLORS[book.theme] || ["#37474F", "#607D8B"];
  const themeEmoji = THEME_EMOJIS[book.theme] || "📖";

  const pressScale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: reducedMotion ? 1 : pressScale.value },
      { rotate: `${tilt}deg` },
      { perspective: 800 },
      { rotateY: "-5deg" },
    ],
  }));

  return (
    <Pressable
      onPressIn={() => {
        if (!reducedMotion) {
          pressScale.value = withSpring(0.92, { damping: 10 });
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          pressScale.value = withSpring(1, { damping: 8 });
        }
      }}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={book.title}
      accessibilityHint="Double-tap to read this story"
      style={{ minHeight: 44 }}
    >
      <Animated.View style={[styles.bookSpine, pressStyle]}>
        <LinearGradient
          colors={spineColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.spineGradient}
        >
          {/* Top gold bar */}
          <View style={styles.spineBar} />

          {/* Theme emoji */}
          <Text style={styles.spineEmoji}>{themeEmoji}</Text>

          {/* Title (vertical) */}
          <View style={styles.spineTitleWrap}>
            <Text style={styles.spineTitle} numberOfLines={3}>
              {book.title}
            </Text>
          </View>

          {/* Bottom gold bar */}
          <View style={styles.spineBar} />
        </LinearGradient>

        {/* 3D edge highlight */}
        <View style={styles.spineEdge} />
      </Animated.View>
    </Pressable>
  );
}

/* ─── Empty book slot ──────────────────────────────────────── */
function EmptySlot() {
  return (
    <View
      style={[styles.emptySlot, { minHeight: 44 }]}
      accessible={true}
      accessibilityLabel="Empty book slot"
      accessibilityHint="Complete more stories to fill this slot"
    >
      <Text style={styles.emptySlotIcon}>+</Text>
    </View>
  );
}

/* ─── Shelf Row ────────────────────────────────────────────── */
function ShelfRow({
  books,
  rowIndex,
  onBookPress,
}: {
  books: BookData[];
  rowIndex: number;
  onBookPress: (book: BookData) => void;
}) {
  const emptyCount = Math.max(0, BOOKS_PER_SHELF - books.length);

  return (
    <Animated.View
      entering={FadeInDown.delay(rowIndex * 100).duration(400)}
      style={styles.shelfRow}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`Shelf ${rowIndex + 1}`}
    >
      {/* Books */}
      <View style={styles.booksRow}>
        {books.map((book, i) => (
          <BookSpine
            key={book.id}
            book={book}
            index={i}
            onPress={() => onBookPress(book)}
          />
        ))}
        {/* Empty slots */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </View>

      {/* Shelf plank */}
      <LinearGradient
        colors={["#5D4037", "#795548", "#6D4C41"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.shelfPlank}
      >
        {/* Wood grain lines */}
        <View style={styles.woodGrain1} />
        <View style={styles.woodGrain2} />
      </LinearGradient>

      {/* Shelf shadow */}
      <View style={styles.shelfShadow} />
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
interface StoryBookshelfProps {
  completedStories: BookData[];
  onBookPress: (book: BookData) => void;
}

export const StoryBookshelf = memo(function StoryBookshelf({
  completedStories,
  onBookPress,
}: StoryBookshelfProps) {
  const colors = useColors();

  // Show empty state if no completed stories
  if (completedStories.length === 0) {
    return (
      <View
        style={styles.container}
        accessible={true}
        accessibilityLabel="Story Bookshelf"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>📚</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              My Bookshelf
            </Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {completedStories.length} stories collected
            </Text>
          </View>
        </View>

        {/* Empty state */}
        <IllustratedEmptyState
          type="no-bookshelf"
          title="Your Bookshelf is Empty"
          subtitle="Completed stories appear here as beautiful books on your shelf"
          compact
        />
      </View>
    );
  }

  // Split into shelf rows
  const shelves: BookData[][] = [];
  for (let i = 0; i < completedStories.length; i += BOOKS_PER_SHELF) {
    shelves.push(completedStories.slice(i, i + BOOKS_PER_SHELF));
  }
  // Always show at least 2 shelves
  while (shelves.length < 2) {
    shelves.push([]);
  }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Story Bookshelf"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📚</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            My Bookshelf
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {completedStories.length} stor{completedStories.length === 1 ? "y" : "ies"} collected
          </Text>
        </View>
      </View>

      {/* Bookshelf */}
      <View
        style={styles.bookshelf}
        accessible={true}
        accessibilityLabel="Bookshelf display"
      >
        {/* Back wall */}
        <LinearGradient
          colors={["#3E2723", "#4E342E", "#3E2723"]}
          style={styles.backWall}
        />

        {/* Shelves */}
        {shelves.map((shelfBooks, i) => (
          <ShelfRow
            key={i}
            books={shelfBooks}
            rowIndex={i}
            onBookPress={onBookPress}
          />
        ))}
      </View>
    </View>
  );
});

export type { BookData };

const styles = StyleSheet.create({
  container: {
    gap: 12,
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

  /* Bookshelf frame */
  bookshelf: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  backWall: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Shelf row */
  shelfRow: {
    height: SHELF_HEIGHT,
    justifyContent: "flex-end",
    position: "relative",
  },
  booksRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    gap: 3,
    marginBottom: 2,
  },
  shelfPlank: {
    height: 12,
    position: "relative",
    overflow: "hidden",
  },
  woodGrain1: {
    position: "absolute",
    top: 3,
    left: 20,
    right: 40,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
  },
  woodGrain2: {
    position: "absolute",
    top: 7,
    left: 60,
    right: 20,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 1,
  },
  shelfShadow: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.25)",
    marginTop: -1,
  },

  /* Book spine */
  bookSpine: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    position: "relative",
  },
  spineGradient: {
    flex: 1,
    borderRadius: 3,
    padding: 4,
    alignItems: "center",
    justifyContent: "space-between",
  },
  spineBar: {
    width: "70%",
    height: 2,
    backgroundColor: "rgba(255,215,0,0.4)",
    borderRadius: 1,
  },
  spineEmoji: {
    fontSize: 14,
  },
  spineTitleWrap: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  spineTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 7,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 9,
  },
  spineEdge: {
    position: "absolute",
    right: 0,
    top: 2,
    bottom: 2,
    width: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },

  /* Empty slot */
  emptySlot: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlotIcon: {
    color: "rgba(255,255,255,0.1)",
    fontSize: 16,
    fontWeight: "700",
  },
});
