import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import {
  ReviewItem,
  getReviewQueue,
  updateReviewItem,
  ContentFlag,
} from '@/lib/content-filter';
import { announce } from '@/lib/a11y-helpers';

const CATEGORY_LABELS: Record<string, string> = {
  violence: 'Violence',
  scary_content: 'Scary Content',
  inappropriate_language: 'Language',
  mature_themes: 'Mature Themes',
  bullying: 'Bullying',
  dangerous_activity: 'Dangerous Activity',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#F59E0B',
  medium: '#F97316',
  high: '#EF4444',
};

function FlagBadge({ flag }: { flag: ContentFlag }) {
  return (
    <View style={[flagStyles.badge, { backgroundColor: `${SEVERITY_COLORS[flag.severity]}20` }]}>
      <View style={[flagStyles.dot, { backgroundColor: SEVERITY_COLORS[flag.severity] }]} />
      <Text style={[flagStyles.text, { color: SEVERITY_COLORS[flag.severity] }]}>
        {CATEGORY_LABELS[flag.category] || flag.category}: "{flag.match}"
      </Text>
    </View>
  );
}

const flagStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '500' },
});

export const ContentReviewPanel = memo(function ContentReviewPanel() {
  const colors = useColors();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const queue = await getReviewQueue();
    setItems(queue.filter(i => i.status === 'pending'));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleApprove = useCallback(async (id: string) => {
    await updateReviewItem(id, 'approved');
    announce('Story content approved');
    loadQueue();
  }, [loadQueue]);

  const handleReject = useCallback(async (id: string) => {
    await updateReviewItem(id, 'rejected');
    announce('Story content rejected');
    loadQueue();
  }, [loadQueue]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All Clear!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            No stories need review right now.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.foreground }]}>
        Content Review ({items.length} pending)
      </Text>
      <Text style={[styles.subheader, { color: colors.muted }]}>
        Review flagged story content before your child can read it.
      </Text>

      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          // @ts-expect-error - overload mismatch
          accessibilityRole="article"
          accessibilityLabel={`Review item with safety score ${item.safetyScore}`}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.scoreBadge, {
              backgroundColor: item.safetyScore >= 70 ? `${colors.success}20` : item.safetyScore >= 40 ? '#FEF3C7' : '#FEE2E2',
            }]}>
              <Text style={[styles.scoreText, {
                color: item.safetyScore >= 70 ? colors.success : item.safetyScore >= 40 ? '#D97706' : '#DC2626',
              }]}>
                Score: {item.safetyScore}/100
              </Text>
            </View>
            <Text style={[styles.timestamp, { color: colors.muted }]}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>

          <Text style={[styles.storyText, { color: colors.foreground }]} numberOfLines={4}>
            {item.text}
          </Text>

          {item.flags.length > 0 && (
            <View style={styles.flagsContainer}>
              {item.flags.map((flag, i) => (
                <FlagBadge key={i} flag={flag} />
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => handleApprove(item.id)}
              accessibilityLabel="Approve this content"
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              // @ts-expect-error - type mismatch from schema
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => handleReject(item.id)}
              accessibilityLabel="Reject this content"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subheader: { fontSize: 14, marginBottom: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scoreText: { fontSize: 13, fontWeight: '700' },
  timestamp: { fontSize: 12 },
  storyText: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  flagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
