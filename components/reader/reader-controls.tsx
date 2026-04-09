import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ReaderControlsProps {
  colors: any;
  isNarrating: boolean;
  isMusicEnabled: boolean;
  generatingAudio: boolean;
  generatingMusic: boolean;
  currentPageIndex: number;
  totalPages: number;
  isLastPage: boolean;
  hasMusicUrl: boolean;
  onPlayNarration: () => void;
  onToggleMusic: () => void;
  onGenerateMusic: () => void;
  onOpenSettings: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onFinishStory: () => void;
}

export function ReaderControls({
  colors, isNarrating, isMusicEnabled, generatingAudio, generatingMusic,
  currentPageIndex, totalPages, isLastPage, hasMusicUrl,
  onPlayNarration, onToggleMusic, onGenerateMusic, onOpenSettings,
  onPrevPage, onNextPage, onFinishStory,
}: ReaderControlsProps) {
  return (
    <View style={styles.controlsArea}>
      <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.controlsGlass}>
        <View style={styles.controls}>
          {/* Play/Pause */}
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primary, opacity: generatingAudio ? 0.6 : 1 }]}
            onPress={onPlayNarration}
            disabled={generatingAudio}
            accessibilityLabel={isNarrating ? 'Pause narration' : 'Play narration'}
          >
            {generatingAudio ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={isNarrating ? 'pause' : 'play'} size={24} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Music toggle */}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isMusicEnabled ? colors.primary : 'rgba(0,0,0,0.1)' }]}
            onPress={hasMusicUrl ? onToggleMusic : onGenerateMusic}
            disabled={generatingMusic}
            accessibilityLabel={isMusicEnabled ? 'Mute music' : 'Play music'}
          >
            {generatingMusic ? (
              <ActivityIndicator size="small" color={isMusicEnabled ? '#fff' : colors.foreground} />
            ) : (
              <Ionicons name={isMusicEnabled ? 'musical-notes' : 'musical-notes-outline'} size={20} color={isMusicEnabled ? '#fff' : colors.foreground} />
            )}
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.1)' }]}
            onPress={onOpenSettings}
            accessibilityLabel="Open reader settings"
            accessibilityHint="Adjust reading speed and text size"
          >
            <Text style={[styles.settingsButtonText, { color: colors.foreground }]}>Aa</Text>
          </TouchableOpacity>

          {/* Page counter */}
          <View style={styles.pageCounter}>
            <Text style={[styles.pageCountText, { color: colors.foreground }]}>{currentPageIndex + 1} / {totalPages}</Text>
          </View>

          {/* Previous page */}
          <TouchableOpacity
            style={[styles.controlButton, { opacity: currentPageIndex === 0 ? 0.3 : 1 }]}
            onPress={onPrevPage}
            disabled={currentPageIndex === 0}
            accessibilityLabel="Previous page"
            accessibilityRole="button"
            accessibilityState={{ disabled: currentPageIndex === 0 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </TouchableOpacity>

          {/* Next page */}
          <TouchableOpacity
            style={[styles.controlButton, { opacity: isLastPage ? 0.3 : 1 }]}
            onPress={isLastPage ? onFinishStory : onNextPage}
            accessibilityLabel={isLastPage ? 'Finish story' : 'Next page'}
            accessibilityRole="button"
          >
            <Ionicons name={isLastPage ? 'checkmark-circle' : 'chevron-forward'} size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsArea: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6 },
  controlsGlass: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  playButton: { width: 56, height: 56, minHeight: 44, minWidth: 44, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  controlButton: { width: 44, height: 44, minHeight: 44, minWidth: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  pageCounter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageCountText: { fontSize: 13, fontWeight: '600' },
  settingsButtonText: { fontSize: 16, fontWeight: '700' },
});
