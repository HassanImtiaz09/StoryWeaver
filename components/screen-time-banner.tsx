// @ts-nocheck
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { LimitStatus } from '@/lib/screen-time-store';

interface ScreenTimeBannerProps {
  status: LimitStatus;
  onRequestExtension?: () => void;
  onDismiss?: () => void;
  extensionAvailable?: boolean;
}

export const ScreenTimeBanner = memo(function ScreenTimeBanner({
  status,
  onRequestExtension,
  onDismiss,
  extensionAvailable = false,
}: ScreenTimeBannerProps) {
  const colors = useColors();

  if (!status.message) return null;

  const isLimit = status.isLimitReached;
  const bgColor = isLimit ? colors.error : '#F59E0B';
  const icon = isLimit
    ? status.isBedtimePassed ? 'moon' : 'time'
    : 'warning';

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      exiting={FadeOut.duration(200)}
      style={[styles.banner, { backgroundColor: `${bgColor}15`, borderColor: `${bgColor}40` }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={status.message}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={bgColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          {status.message}
        </Text>
        {!isLimit && (
          <Text style={[styles.timeLeft, { color: colors.muted }]}>
            {status.minutesRemaining} min remaining today
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {isLimit && extensionAvailable && onRequestExtension && (
          <TouchableOpacity
            style={[styles.extButton, { backgroundColor: bgColor }]}
            onPress={onRequestExtension}
            accessibilityLabel="Request 5 more minutes"
            accessibilityRole="button"
          >
            <Text style={styles.extButtonText}>+5 min</Text>
          </TouchableOpacity>
        )}
        {!isLimit && onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            accessibilityLabel="Dismiss warning"
            accessibilityRole="button"
            style={styles.dismissButton}
          >
            <Ionicons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  iconContainer: { width: 32, alignItems: 'center' },
  textContainer: { flex: 1 },
  message: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  timeLeft: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  extButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  extButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dismissButton: { padding: 4 },
});
