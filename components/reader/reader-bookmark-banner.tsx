import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ReaderBookmarkBannerProps {
  visible: boolean;
  savedPageIndex: number;
  totalPages: number;
  colors: any;
  onResume: () => void;
  onStartOver: () => void;
}

export function ReaderBookmarkBanner({ visible, savedPageIndex, totalPages, colors, onResume, onStartOver }: ReaderBookmarkBannerProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.bookmarkBanner, { backgroundColor: `${colors.surface}dd`, borderTopColor: colors.primary }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.bookmarkContent}>
        <Text
          style={[styles.bookmarkText, { color: colors.foreground }]}
          accessibilityLabel={`Continue reading from page ${savedPageIndex + 1} out of ${totalPages}`}
        >
          Continue from page {savedPageIndex + 1}?
        </Text>
        <View style={styles.bookmarkButtons}>
          <TouchableOpacity
            style={[styles.bookmarkButton, { backgroundColor: colors.primary }]}
            onPress={onResume}
            accessibilityLabel="Resume reading"
            accessibilityHint="Continues story from saved position"
          >
            <Text style={styles.bookmarkButtonText}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookmarkButton, { backgroundColor: `${colors.primary}40` }]}
            onPress={onStartOver}
            accessibilityLabel="Start over"
            accessibilityHint="Begins story from the first page"
          >
            <Text style={[styles.bookmarkButtonText, { color: colors.primary }]}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bookmarkBanner: { borderTopWidth: 2, borderTopColor: '#FFD700', paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0, marginTop: 0 },
  bookmarkContent: { gap: 12 },
  bookmarkText: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  bookmarkButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-start' },
  bookmarkButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  bookmarkButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
