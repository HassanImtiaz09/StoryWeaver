import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { announce } from '@/lib/a11y-helpers';
import { AnimatedPressable } from '@/components/animated-pressable';
import {
  ClassicTale,
  CLASSIC_TALES,
  getTalesForAge,
  getAllThemes,
  searchTales,
} from '@/lib/classic-tales-catalog';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ─── Difficulty Badge ─────────────────────────────────────────
const DIFFICULTY_COLORS = {
  easy: '#22C55E',
  medium: '#F59E0B',
  advanced: '#8B5CF6',
};

function DifficultyBadge({ difficulty }: { difficulty: ClassicTale['difficulty'] }) {
  return (
    <View style={[diffStyles.badge, { backgroundColor: `${DIFFICULTY_COLORS[difficulty]}20` }]}>
      <Text style={[diffStyles.text, { color: DIFFICULTY_COLORS[difficulty] }]}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Text>
    </View>
  );
}
const diffStyles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '600' },
});

// ─── Theme Chip ───────────────────────────────────────────────
const ThemeChip = memo(function ThemeChip({
  theme,
  isSelected,
  onPress,
  colors,
}: {
  theme: string;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        chipStyles.chip,
        {
          backgroundColor: isSelected ? colors.primary : `${colors.primary}15`,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Filter by ${theme}`}
    >
      <Text style={[chipStyles.text, { color: isSelected ? '#fff' : colors.foreground }]}>
        {theme}
      </Text>
    </TouchableOpacity>
  );
});
const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  text: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});

// ─── Tale Card ────────────────────────────────────────────────
const TaleCard = memo(function TaleCard({
  tale,
  index,
  colors,
  onPress,
}: {
  tale: ClassicTale;
  index: number;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <AnimatedPressable onPress={onPress} style={[cardStyles.card, { width: CARD_WIDTH }]}>
        <LinearGradient
          colors={tale.coverGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyles.cover}
        >
          <Text style={cardStyles.emoji}>{tale.iconEmoji}</Text>
        </LinearGradient>
        <View style={[cardStyles.info, { backgroundColor: colors.surface }]}>
          <Text style={[cardStyles.title, { color: colors.foreground }]} numberOfLines={2}>
            {tale.title}
          </Text>
          <Text style={[cardStyles.origin, { color: colors.muted }]} numberOfLines={1}>
            {tale.origin}
          </Text>
          <View style={cardStyles.meta}>
            <DifficultyBadge difficulty={tale.difficulty} />
            <View style={cardStyles.time}>
              <Ionicons name="time-outline" size={12} color={colors.muted} />
              <Text style={[cardStyles.timeText, { color: colors.muted }]}>{tale.estimatedMinutes}m</Text>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});
const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  cover: { height: 100, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 40 },
  info: { padding: 12 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  origin: { fontSize: 11, marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 11 },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function ClassicTalesScreen() {
  const router = useRouter();
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const allThemes = useMemo(() => getAllThemes(), []);

  const filteredTales = useMemo(() => {
    let tales = CLASSIC_TALES;
    if (searchQuery.trim()) {
      tales = searchTales(searchQuery);
    }
    if (selectedTheme) {
      tales = tales.filter(t => t.themes.includes(selectedTheme));
    }
    return tales;
  }, [searchQuery, selectedTheme]);

  const handleTalePress = useCallback((tale: ClassicTale) => {
    announce(`Selected ${tale.title}`);
    router.push({
      pathname: '/new-story',
      params: {
        classicTaleId: tale.id,
        title: tale.title,
        themes: tale.themes.join(','),
      },
    });
  }, [router]);

  const handleThemePress = useCallback((theme: string) => {
    setSelectedTheme(prev => prev === theme ? null : theme);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Classic Adventures</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search tales..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search classic tales"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Theme Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themesScroll} contentContainerStyle={styles.themesContent}>
        {allThemes.map(theme => (
          <ThemeChip
            key={theme}
            theme={theme}
            isSelected={selectedTheme === theme}
            onPress={() => handleThemePress(theme)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {/* Tales Grid */}
      <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {selectedTheme ? `"${selectedTheme}" tales` : 'All Classic Tales'}
          {' '}({filteredTales.length})
        </Text>

        <View style={styles.gridRow}>
          {filteredTales.map((tale, index) => (
            <TaleCard
              key={tale.id}
              tale={tale}
              index={index}
              colors={colors}
              onPress={() => handleTalePress(tale)}
            />
          ))}
        </View>

        {filteredTales.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No tales match your search. Try a different keyword!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', padding: 0 },
  themesScroll: { maxHeight: 48, marginBottom: 8 },
  themesContent: { paddingHorizontal: 16 },
  grid: { flex: 1 },
  gridContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
