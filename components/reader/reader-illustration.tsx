import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { ImageBackground } from 'react-native';
import Animated, { FadeIn, AnimatedStyleProp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IllustrationShimmer } from '@/components/illustration-shimmer';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.5;

const MOOD_LABELS: Record<string, string> = {
  exciting: 'Exciting', calm: 'Calm', mysterious: 'Mysterious',
  adventurous: 'Adventurous', warm: 'Warm', funny: 'Funny',
  reassuring: 'Reassuring', triumphant: 'Triumphant',
};

interface InteractZone {
  x: number; y: number; radius: number; label: string; type: 'character' | 'object';
}

interface ReaderIllustrationProps {
  currentPage: any;
  moodColors: [string, string];
  interactZones: InteractZone[];
  generatingImages: Set<number>;
  activeTooltip: InteractZone | null;
  onInteractTap: (zone: InteractZone) => void;
  currentPageStyle: AnimatedStyleProp<any>;
  curlShadowStyle: AnimatedStyleProp<any>;
  goldenOverlayStyle: AnimatedStyleProp<any>;
  goldenShimmerStyle: AnimatedStyleProp<any>;
}

function InteractOverlay({ zones, containerWidth, containerHeight, onTap }: {
  zones: InteractZone[]; containerWidth: number; containerHeight: number; onTap: (zone: InteractZone) => void;
}) {
  if (zones.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {zones.map((zone, i) => (
        <Pressable
          key={`zone-${i}`}
          onPress={() => onTap(zone)}
          style={[styles.interactZone, {
            left: zone.x * containerWidth - zone.radius,
            top: zone.y * containerHeight - zone.radius,
            width: zone.radius * 2, height: zone.radius * 2, borderRadius: zone.radius,
          }]}
          accessibilityLabel={`Interactive element: ${zone.label}`}
          accessibilityHint="Double-tap to interact"
          accessibilityRole="button"
        >
          <View style={styles.interactDot}>
            <Ionicons name={zone.type === 'character' ? 'person' : 'sparkles'} size={14} color="#FFD700" />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function InteractTooltip({ label, type }: { label: string; type: string }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.tooltip}>
      <View style={styles.tooltipInner}>
        <Ionicons name={type === 'character' ? 'person' : 'sparkles'} size={16} color="#FFD700" />
        <Text style={styles.tooltipText}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export function ReaderIllustration({
  currentPage, moodColors, interactZones, generatingImages,
  activeTooltip, onInteractTap,
  currentPageStyle, curlShadowStyle, goldenOverlayStyle, goldenShimmerStyle,
}: ReaderIllustrationProps) {
  return (
    <Animated.View style={[styles.imageContainer, currentPageStyle]}>
      {currentPage?.imageUrl ? (
        <ImageBackground source={{ uri: currentPage.imageUrl }} style={styles.imageBackground} resizeMode="cover">
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']} style={styles.imageGradientOverlay} />
          <InteractOverlay zones={interactZones} containerWidth={width} containerHeight={IMAGE_HEIGHT} onTap={onInteractTap} />
        </ImageBackground>
      ) : generatingImages.has(currentPage?.id ?? 0) ? (
        <IllustrationShimmer moodColors={moodColors} />
      ) : (
        <LinearGradient colors={moodColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.imageBackground} />
      )}

      {/* Curl shadow */}
      <Animated.View style={[styles.curlShadowOverlay, curlShadowStyle]} pointerEvents="none">
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      {/* Golden shimmer overlay */}
      <Animated.View style={[styles.goldenOverlay, goldenOverlayStyle]} pointerEvents="none">
        <LinearGradient colors={['rgba(255,215,0,0)', 'rgba(255,215,0,0.4)', 'rgba(255,200,0,0.6)', 'rgba(255,215,0,0.4)', 'rgba(255,215,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[styles.shimmerStreak, goldenShimmerStyle]} pointerEvents="none">
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,215,0,0.3)', 'rgba(255,255,255,0.6)', 'rgba(255,215,0,0.3)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shimmerGradient} />
      </Animated.View>

      {/* Mood badge */}
      <Animated.View entering={FadeIn} style={styles.moodBadge}>
        <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moodBadgeContent}>
          <Text style={styles.moodBadgeLabel}>{MOOD_LABELS[currentPage?.mood ?? ''] || 'Calm'}</Text>
        </LinearGradient>
      </Animated.View>

      {activeTooltip && (
        <View style={styles.tooltipPosition}>
          <InteractTooltip label={activeTooltip.label} type={activeTooltip.type} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  imageContainer: { height: IMAGE_HEIGHT, position: 'relative', overflow: 'hidden' },
  imageBackground: { flex: 1, justifyContent: 'flex-end' },
  imageGradientOverlay: { ...StyleSheet.absoluteFillObject },
  moodBadge: { position: 'absolute', top: 12, right: 12, borderRadius: 20, overflow: 'hidden' },
  moodBadgeContent: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  moodBadgeLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  curlShadowOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9 },
  goldenOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  shimmerStreak: { position: 'absolute', top: 0, left: 0, width: width * 0.4, height: '100%', zIndex: 11 },
  shimmerGradient: { flex: 1 },
  interactZone: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  interactDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  tooltipPosition: { position: 'absolute', top: 12, left: 16, zIndex: 20 },
  tooltip: {},
  tooltipInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  tooltipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
