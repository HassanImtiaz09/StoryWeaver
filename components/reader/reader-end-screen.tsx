import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ReaderEndScreenProps {
  childName: string;
  moodColors: [string, string];
  onPrint: () => void;
  onReadAgain: () => void;
  onBackToLibrary: () => void;
}

export function ReaderEndScreen({ childName, moodColors, onPrint, onReadAgain, onBackToLibrary }: ReaderEndScreenProps) {
  return (
    <Animated.View entering={FadeIn} style={styles.flex}>
      <LinearGradient colors={moodColors} style={styles.flex}>
        <View style={styles.endscreenContent}>
          <Animated.Text entering={FadeInDown} style={styles.endscreenTitle}>The End!</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200)} style={[styles.endscreenSubtitle, { marginVertical: 20 }]}>
            Great job, {childName}! You finished the story.
          </Animated.Text>
          <View style={styles.endscreenButtons}>
            <TouchableOpacity style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={onPrint}>
              <Ionicons name="print" size={24} color={moodColors[0]} />
              <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Print as Book</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={onReadAgain}>
              <Ionicons name="refresh" size={24} color={moodColors[0]} />
              <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Read Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={onBackToLibrary}>
              <Ionicons name="home" size={24} color={moodColors[0]} />
              <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Back to Library</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  endscreenContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  endscreenTitle: { fontSize: 48, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  endscreenSubtitle: { fontSize: 20, fontWeight: '600', color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
  endscreenButtons: { gap: 12, marginTop: 40 },
  endscreenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 8, minWidth: 240, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  endscreenButtonText: { fontSize: 16, fontWeight: '700' },
});
