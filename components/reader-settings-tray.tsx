import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAccessibilityStore } from '@/lib/accessibility-store';
import { useColors } from '@/hooks/use-colors';
import { announce } from '@/lib/a11y-helpers';

interface ReaderSettingsTrayProps {
  isOpen: boolean;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

const TTS_SPEED_PRESETS = [
  { value: 0.5, label: 'Slow', preset: '0.5x' },
  { value: 0.75, label: '0.75x', preset: '0.75x' },
  { value: 1.0, label: 'Normal', preset: '1.0x' },
  { value: 1.25, label: '1.25x', preset: '1.25x' },
  { value: 1.5, label: 'Fast', preset: '1.5x' },
];

const TEXT_SIZE_PRESETS = [
  { value: 0.85, label: 'S', multiplier: 0.85 },
  { value: 1.0, label: 'M', multiplier: 1.0 },
  { value: 1.2, label: 'L', multiplier: 1.2 },
  { value: 1.4, label: 'XL', multiplier: 1.4 },
];

const PREVIEW_TEXT = 'The quick brown fox';

export function ReaderSettingsTray({ isOpen, onClose }: ReaderSettingsTrayProps) {
  const colors = useColors();
  const { ttsSpeed, setTtsSpeed, textSize, setTextSize } = useAccessibilityStore();

  const translateY = useSharedValue(screenHeight);

  // Animate tray on open/close
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(isOpen ? screenHeight * 0.6 : screenHeight, {
            damping: 20,
            mass: 1,
            overshootClamping: false,
          }),
        },
      ],
    };
  });

  const handleSpeedChange = (speed: number) => {
    setTtsSpeed(speed);
    announce(`Reading speed set to ${speed}x`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTextSizeChange = (size: number) => {
    setTextSize(size);
    announce(`Text size set to ${size.toFixed(2)}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBackdropPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <Pressable
        style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
        onPress={handleBackdropPress}
      />

      {/* Settings Tray */}
      <Animated.View
        style={[
          styles.tray,
          { backgroundColor: colors.surface },
          animatedStyle,
        ]}
        accessibilityRole="dialog"
        accessibilityLabel="Settings tray"
      >
        {/* Grab handle */}
        <View style={styles.grabHandleContainer}>
          <View
            style={[
              styles.grabHandle,
              { backgroundColor: colors.border },
            ]}
            accessible={false}
          />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* TTS Speed Control */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="speedometer"
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Reading Speed
              </Text>
              <Text style={[styles.speedDisplay, { color: colors.secondary }]}>
                {ttsSpeed.toFixed(2)}x
              </Text>
            </View>

            <View style={styles.presetButtonsContainer}>
              {TTS_SPEED_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={`speed-${preset.value}`}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor:
                        Math.abs(ttsSpeed - preset.value) < 0.01
                          ? colors.primary
                          : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                  onPress={() => handleSpeedChange(preset.value)}
                  accessibilityLabel={`${preset.label} speed`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: Math.abs(ttsSpeed - preset.value) < 0.01,
                  }}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      {
                        color:
                          Math.abs(ttsSpeed - preset.value) < 0.01
                            ? '#fff'
                            : colors.foreground,
                      },
                    ]}
                  >
                    {preset.preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
            accessible={false}
          />

          {/* Text Size Control */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="text"
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Text Size
              </Text>
            </View>

            {/* Live preview */}
            <Text
              style={[
                styles.previewText,
                {
                  color: colors.foreground,
                  fontSize: 16 * textSize,
                },
              ]}
            >
              {PREVIEW_TEXT}
            </Text>

            <View style={styles.presetButtonsContainer}>
              {TEXT_SIZE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={`size-${preset.value}`}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor:
                        Math.abs(textSize - preset.value) < 0.01
                          ? colors.primary
                          : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                  onPress={() => handleTextSizeChange(preset.value)}
                  accessibilityLabel={`Text size ${preset.label}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: Math.abs(textSize - preset.value) < 0.01,
                  }}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      {
                        color:
                          Math.abs(textSize - preset.value) < 0.01
                            ? '#fff'
                            : colors.foreground,
                      },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  tray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: screenHeight * 0.4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 100,
    paddingBottom: 20,
  },
  grabHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  speedDisplay: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewText: {
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  presetButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
});
