import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { trpc } from '@/lib/trpc';
import { useColors } from '@/hooks/use-colors';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { announce } from '@/lib/a11y-helpers';
import { StoryNarrative, StoryTitle, CaptionText } from '@/components/styled-text';
import { WordHighlighter } from '@/components/word-highlighter';
import { IllustrationShimmer } from '@/components/illustration-shimmer';
import { StoryFeedbackModal } from '@/components/story-feedback-modal';
import { ReadingGuide } from '@/components/reading-guide';
import { useAccessibilityStore } from '@/lib/accessibility-store';

// ─── Constants ──────────────────────────────────────────────────
const MOOD_COLORS: Record<string, [string, string]> = {
  exciting: ['#FF6B6B', '#FF8E8E'],
  calm: ['#6C63FF', '#8B83FF'],
  mysterious: ['#2D1B69', '#5B2C8E'],
  adventurous: ['#FFD93D', '#FFE66D'],
  warm: ['#FF9A56', '#FFBE76'],
  funny: ['#4ECDC4', '#6EE7DE'],
  reassuring: ['#A8E6CF', '#DCEDC1'],
  triumphant: ['#FFD700', '#FFA500'],
};

const MOOD_LABELS: Record<string, string> = {
  exciting: 'Exciting',
  calm: 'Calm',
  mysterious: 'Mysterious',
  adventurous: 'Adventurous',
  warm: 'Warm',
  funny: 'Funny',
  reassuring: 'Reassuring',
  triumphant: 'Triumphant',
};

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.5;
const PROGRESS_BAR_HEIGHT = 4;

// ─── Tap-to-interact zones for illustration ─────────────────────
interface InteractZone {
  /** Percentage-based position (0-1) */
  x: number;
  y: number;
  radius: number;
  label: string;
  type: 'character' | 'object';
}

function buildInteractZones(page: any): InteractZone[] {
  const zones: InteractZone[] = [];
  // Build zones from character data if available
  if (page?.characters && Array.isArray(page.characters)) {
    page.characters.forEach((char: any, i: number) => {
      const name = typeof char === 'string' ? char : char?.name ?? '';
      if (!name) return;
      // Distribute characters across the illustration
      zones.push({
        x: 0.2 + (i * 0.3) % 0.7,
        y: 0.5 + (i * 0.15) % 0.3,
        radius: 30,
        label: name,
        type: 'character',
      });
    });
  }
  // Add object zone from scene description keywords
  if (page?.sceneDescription) {
    const objects = ['tree', 'castle', 'river', 'mountain', 'house', 'star', 'moon', 'sun', 'flower', 'bird'];
    const desc = (page.sceneDescription as string).toLowerCase();
    let objectCount = 0;
    for (const obj of objects) {
      if (desc.includes(obj) && objectCount < 2) {
        zones.push({
          x: 0.7 - objectCount * 0.4,
          y: 0.3,
          radius: 24,
          label: obj.charAt(0).toUpperCase() + obj.slice(1),
          type: 'object',
        });
        objectCount++;
      }
    }
  }
  return zones;
}

// ─── Interact Zone Overlay ──────────────────────────────────────
function InteractOverlay({
  zones,
  containerWidth,
  containerHeight,
  onTap,
}: {
  zones: InteractZone[];
  containerWidth: number;
  containerHeight: number;
  onTap: (zone: InteractZone) => void;
}) {
  if (zones.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {zones.map((zone, i) => (
        <Pressable
          key={`zone-${i}`}
          onPress={() => onTap(zone)}
          style={[
            styles.interactZone,
            {
              left: zone.x * containerWidth - zone.radius,
              top: zone.y * containerHeight - zone.radius,
              width: zone.radius * 2,
              height: zone.radius * 2,
              borderRadius: zone.radius,
            },
          ]}
          accessibilityLabel={`Interactive element: ${zone.label}`}
          accessibilityHint="Double-tap to interact"
          accessibilityRole="button"
        >
          <View style={styles.interactDot}>
            <Ionicons
              name={zone.type === 'character' ? 'person' : 'sparkles'}
              size={14}
              color="#FFD700"
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Interact Tooltip ───────────────────────────────────────────
function InteractTooltip({ label, type }: { label: string; type: string }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.tooltip}>
      <View style={styles.tooltipInner}>
        <Ionicons
          name={type === 'character' ? 'person' : 'sparkles'}
          size={16}
          color="#FFD700"
        />
        <Text style={styles.tooltipText}>{label}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Page Progress Bar ──────────────────────────────────────────
function PageProgressBar({
  currentPage,
  totalPages,
  colors,
}: {
  currentPage: number;
  totalPages: number;
  colors: any;
}) {
  const progress = totalPages > 0 ? (currentPage + 1) / totalPages : 0;

  return (
    <View
      style={styles.pageProgressContainer}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: totalPages, now: currentPage + 1 }}
    >
      <View style={[styles.pageProgressTrack, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
        <View
          style={[
            styles.pageProgressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
      <Text style={[styles.pageProgressLabel, { color: colors.muted }]}>
        {currentPage + 1} of {totalPages}
      </Text>
    </View>
  );
}

// ─── Main Story Reader ──────────────────────────────────────────
export default function StoryReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    episodeId: string;
    arcId: string;
    title: string;
    childName: string;
  }>();

  const colors = useColors();
  const reducedMotion = useReducedMotion();

  // Page state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showingEndscreen, setShowingEndscreen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Audio state
  const [isNarrating, setIsNarrating] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);

  // Word highlighting state
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Image generation state
  const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());

  // Interact tooltip
  const [activeTooltip, setActiveTooltip] = useState<InteractZone | null>(null);

  // Reading guide state
  const [textAreaLayout, setTextAreaLayout] = useState({ height: 0, y: 0 });
  const accessibility = useAccessibilityStore();

  // Refs
  const narratorSoundRef = useRef<Audio.Sound | null>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const progressAnim = useSharedValue(0);

  // Page-turn book flip animation values
  const flipRotation = useSharedValue(0);
  const flipOpacity = useSharedValue(1);
  const nextPageOpacity = useSharedValue(0);
  const isTransitioning = useRef(false);

  // Book curl animation values
  const curlProgress = useSharedValue(0);
  const shadowOpacity = useSharedValue(0);
  const behindPageOffset = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureTranslationX = useSharedValue(0);

  // Golden shimmer values
  const shimmerPosition = useSharedValue(-1);
  const goldenOverlayOpacity = useSharedValue(0);

  // Animated styles for book flip
  const currentPageStyle = useAnimatedStyle(() => {
    const progress = curlProgress.value;
    const skewAmount = interpolate(progress, [0, 0.5, 1], [0, -3, 0]);
    const scaleZ = interpolate(progress, [0, 1], [1, 1.02]);
    const rotY = flipRotation.value + interpolate(progress, [0, 1], [0, 0]);

    return {
      opacity: flipOpacity.value,
      transform: [
        { perspective: 1200 },
        { scale: scaleZ },
        { rotateY: `${rotY}deg` },
        { skewY: `${skewAmount}deg` },
      ],
    };
  });

  const curlShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shadowOpacity.value, [0, 1], [0, 0.6]),
  }));

  const behindPageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: behindPageOffset.value },
    ],
  }));

  const goldenShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerPosition.value, [-1, 1], [-width, width]);
    return {
      transform: [{ translateX }],
      opacity: goldenOverlayOpacity.value,
    };
  });

  const goldenOverlayStyle = useAnimatedStyle(() => ({
    opacity: goldenOverlayOpacity.value,
  }));

  // Data queries
  const episodeId = parseInt(params?.episodeId ?? "0", 10);

  const pagesQuery = trpc.pages.list.useQuery(
    { episodeId },
    { enabled: !!episodeId }
  );

  const episodeQuery = trpc.episodes.get.useQuery(
    { episodeId },
    { enabled: !!episodeId, staleTime: 5000 }
  );

  const generateFullAudioMutation = trpc.episodes.generateFullAudio.useMutation({
    onSuccess: () => { episodeQuery.refetch(); pagesQuery.refetch(); },
  });
  const generateMusicMutation = trpc.episodes.generateMusic.useMutation({
    onSuccess: () => { episodeQuery.refetch(); },
  });
  const generateImageMutation = trpc.pages.generateImage.useMutation({
    onSuccess: () => { pagesQuery.refetch(); },
  });

  const pages = useMemo(() => pagesQuery.data || [], [pagesQuery.data]);
  const episode = episodeQuery.data;
  const currentPage = pages[currentPageIndex] as (typeof pages)[number] | undefined;
  const isLastPage = currentPageIndex === pages.length - 1;
  const moodColors: [string, string] = currentPage?.mood
    ? (MOOD_COLORS[currentPage.mood] ?? ['#6C63FF', '#8B83FF'])
    : ['#6C63FF', '#8B83FF'];

  // Words for the current page (used by WordHighlighter)
  const currentWords = useMemo(() => {
    if (!currentPage?.storyText) return [];
    return currentPage.storyText.split(/\s+/).filter(Boolean);
  }, [currentPage?.storyText]);

  // Interact zones for current page
  const interactZones = useMemo(() => buildInteractZones(currentPage), [currentPage?.id]);

  // ─── Lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupAudio();
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Failed to set audio mode:', error);
      }
    };
    initAudio();
  }, []);

  // Auto-generate images for pages without them
  useEffect(() => {
    if (!currentPage || currentPage.imageUrl) return;
    const generateImage = async () => {
      if (generatingImages.has(currentPage.id)) return;
      setGeneratingImages((prev) => new Set(prev).add(currentPage.id));
      announce('Illustrating page...');
      try {
        await generateImageMutation.mutateAsync({
          pageId: currentPage.id,
          prompt: currentPage.imagePrompt || currentPage.sceneDescription || 'A magical scene',
        });
        announce('Page illustration ready');
      } catch (error) {
        console.error('Failed to generate page image:', error);
        announce('Failed to generate page illustration');
      } finally {
        setGeneratingImages((prev) => {
          const next = new Set(prev);
          next.delete(currentPage.id);
          return next;
        });
      }
    };
    generateImage();
  }, [currentPage?.id]);

  // ─── Audio cleanup ──────────────────────────────────────────
  const cleanupAudio = async () => {
    try {
      if (narratorSoundRef.current) {
        await narratorSoundRef.current.stopAsync();
        await narratorSoundRef.current.unloadAsync();
        narratorSoundRef.current = null;
      }
      if (musicSoundRef.current) {
        await musicSoundRef.current.stopAsync();
        await musicSoundRef.current.unloadAsync();
        musicSoundRef.current = null;
      }
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  };

  // ─── Word highlighting sync ─────────────────────────────────
  const estimateWordIndex = useCallback(
    (positionMs: number, durationMs: number) => {
      if (durationMs <= 0 || currentWords.length === 0) return -1;
      const progress = positionMs / durationMs;
      // Estimate which word we're on based on even distribution per page
      const pageProgress = progress; // assume audio covers the current page
      const wordIndex = Math.floor(pageProgress * currentWords.length);
      return Math.min(wordIndex, currentWords.length - 1);
    },
    [currentWords]
  );

  // ─── Narration playback ─────────────────────────────────────
  const handlePlayNarration = useCallback(async () => {
    if (isNarrating) {
      try {
        if (narratorSoundRef.current) await narratorSoundRef.current.pauseAsync();
        if (musicSoundRef.current) await musicSoundRef.current.pauseAsync();
        if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
        if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
        setIsNarrating(false);
        setCurrentWordIndex(-1);
        announce('Narration paused');
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
      return;
    }

    try {
      announce('Generating narration...');
      setGeneratingAudio(true);
      if (!episode?.fullAudioUrl) {
        await generateFullAudioMutation.mutateAsync({
          episodeId,
          childName: params?.childName || 'Friend',
        });
      }
      const fullAudioUrl = episode?.fullAudioUrl;
      if (!fullAudioUrl) {
        Alert.alert('Error', 'No audio available for this episode');
        setGeneratingAudio(false);
        announce('Failed to generate narration');
        return;
      }
      await cleanupAudio();

      const { sound: narratorSound } = await Audio.Sound.createAsync(
        { uri: fullAudioUrl },
        { shouldPlay: true, rate: 1.0, volume: 1.0 }
      );
      narratorSoundRef.current = narratorSound;

      if (isMusicEnabled && episode?.musicUrl) {
        try {
          const { sound: musicSound } = await Audio.Sound.createAsync(
            { uri: episode.musicUrl },
            { shouldPlay: true, rate: 1.0, volume: 0.15, isLooping: true }
          );
          musicSoundRef.current = musicSound;
        } catch (error) {
          console.error('Failed to load music:', error);
        }
      }

      const status = await narratorSound.getStatusAsync();
      if (status.isLoaded) {
        setTotalDuration(status.durationMillis || 0);
      }

      setIsNarrating(true);
      announce('Narration playing');

      // Progress + word highlighting update loop
      progressUpdateIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) return;
        try {
          const currentStatus = await narratorSound.getStatusAsync();
          if (!isMountedRef.current) return;
          if (currentStatus.isLoaded) {
            const position = currentStatus.positionMillis || 0;
            const duration = currentStatus.durationMillis || totalDuration || 1;
            if (isMountedRef.current) {
              setAudioProgress(position);
              // Update word highlighting
              const wordIdx = estimateWordIndex(position, duration);
              setCurrentWordIndex(wordIdx);
            }
            progressAnim.value = withTiming(position / duration, {
              duration: 200,
              easing: Easing.linear,
            });
            if (isMountedRef.current && currentPage?.characters && (currentPage.characters as any[]).length > 0) {
              const firstChar = (currentPage.characters as any[])[0];
              setCurrentSpeaker(typeof firstChar === 'string' ? firstChar : firstChar?.name ?? null);
            }
            if (currentStatus.didJustFinish && isMountedRef.current) {
              await handleNarrationFinish();
            }
          }
        } catch (_err) { /* sound may have been unloaded */ }
      }, 150); // 150ms for smoother word highlighting
    } catch (error) {
      console.error('Error starting narration:', error);
      Alert.alert('Error', 'Failed to play narration');
    } finally {
      setGeneratingAudio(false);
    }
  }, [isNarrating, pages, isMusicEnabled, episode, estimateWordIndex]);

  const handleNarrationFinish = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      await cleanupAudio();
      if (isMountedRef.current) {
        setIsNarrating(false);
        setCurrentWordIndex(-1);
        if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
        if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
        if (isLastPage) {
          // Show feedback first, then end screen
          setShowFeedback(true);
        }
      }
    } catch (error) {
      console.error('Error handling narration finish:', error);
    }
  }, [isLastPage]);

  // ─── Page turn with book curl animation ─────────────────────
  const handlePageChange = useCallback((index: number) => {
    if (index === currentPageIndex || isTransitioning.current) return;
    if (index < 0 || index >= pages.length) return;
    Haptics.selectionAsync();

    // Announce page change for screen reader users
    announce(`Page ${index + 1} of ${pages.length}`);

    isTransitioning.current = true;
    const isForward = index > currentPageIndex;

    if (!reducedMotion) {
      // Phase 1: Book curl animation - page lifts and curls
      curlProgress.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });

      // Curl shadow appears as page folds
      shadowOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.4, { duration: 100 })
      );

      // Behind page slides in slightly
      behindPageOffset.value = withTiming(-20, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });

      // Golden shimmer flash during transition
      goldenOverlayOpacity.value = withSequence(
        withDelay(100, withTiming(0.4, { duration: 120 })),
        withTiming(0, { duration: 200 })
      );
      shimmerPosition.value = -1;
      shimmerPosition.value = withDelay(
        80,
        withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) })
      );

      // Page flip rotate during curl
      flipRotation.value = withTiming(isForward ? -90 : 90, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      flipOpacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });

      // Phase 2: Switch content and spring page back in
      setTimeout(() => {
        setCurrentPageIndex(index);
        setCurrentWordIndex(-1);
        setActiveTooltip(null);
        flatListRef.current?.scrollToIndex({ index, animated: false });

        // Reset curl and behind page, spring flip rotation in
        curlProgress.value = withSpring(0, {
          damping: 14,
          stiffness: 100,
          mass: 0.6,
        });
        behindPageOffset.value = withSpring(0, {
          damping: 14,
          stiffness: 100,
          mass: 0.6,
        });
        shadowOpacity.value = withTiming(0, { duration: 150 });

        flipRotation.value = isForward ? 90 : -90;
        flipRotation.value = withSpring(0, {
          damping: 14,
          stiffness: 100,
          mass: 0.6,
        });
        flipOpacity.value = withTiming(1, {
          duration: 220,
          easing: Easing.in(Easing.ease),
        });

        setTimeout(() => {
          isTransitioning.current = false;
        }, 300);
      }, 260);
    } else {
      // Reduced motion: instantly switch page without animation
      setCurrentPageIndex(index);
      setCurrentWordIndex(-1);
      setActiveTooltip(null);
      flatListRef.current?.scrollToIndex({ index, animated: false });
      flipRotation.value = 0;
      flipOpacity.value = 1;
      goldenOverlayOpacity.value = 0;
      curlProgress.value = 0;
      shadowOpacity.value = 0;
      behindPageOffset.value = 0;
      isTransitioning.current = false;
    }
  }, [currentPageIndex, pages.length, reducedMotion]);

  // ─── Music controls ─────────────────────────────────────────
  const handleGenerateMusic = useCallback(async () => {
    try {
      announce('Generating background music...');
      setGeneratingMusic(true);
      await generateMusicMutation.mutateAsync({
        episodeId,
        mood: currentPage?.mood || 'calm',
      });
      setIsMusicEnabled(true);
      announce('Background music ready');
    } catch (error) {
      console.error('Error generating music:', error);
      Alert.alert('Error', 'Failed to generate music');
      announce('Failed to generate background music');
    } finally {
      setGeneratingMusic(false);
    }
  }, [episodeId, currentPage?.mood]);

  const handleToggleMusic = useCallback(() => {
    Haptics.selectionAsync();
    setIsMusicEnabled(!isMusicEnabled);
    if (!isMusicEnabled && musicSoundRef.current) {
      try {
        musicSoundRef.current.playAsync();
        announce('Background music enabled');
      } catch (_e) {}
    } else if (isMusicEnabled && musicSoundRef.current) {
      try {
        musicSoundRef.current.pauseAsync();
        announce('Background music disabled');
      } catch (_e) {}
    }
  }, [isMusicEnabled]);

  // ─── Interact zone tap ──────────────────────────────────────
  const handleInteractTap = useCallback((zone: InteractZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTooltip(zone);

    // Auto-hide tooltip
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 2500);

    // Play a short TTS or sound effect for the tapped element
    // In production this would use expo-speech or a sound bank
    // For now we provide haptic + visual feedback
  }, []);

  // ─── Swipe gesture for page turning ──────────────────────────
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        gestureTranslationX.value = event.translationX;
        gestureActive.value = true;

        // Partial curl preview during drag
        const threshold = 80;
        const progress = Math.min(Math.abs(event.translationX) / threshold, 1);
        curlProgress.value = progress * 0.3; // Only preview up to 30% curl
        shadowOpacity.value = progress * 0.3;

        // Disable FlatList scroll during gesture
        flatListRef.current?.setNativeProps?.({ scrollEnabled: false });
      })
      .onEnd((event) => {
        gestureActive.value = false;
        const threshold = 80;
        const isSwipeRight = event.translationX > threshold;
        const isSwipeLeft = event.translationX < -threshold;

        if (isSwipeRight && currentPageIndex > 0) {
          // Previous page
          runOnJS(handlePageChange)(currentPageIndex - 1);
        } else if (isSwipeLeft && currentPageIndex < pages.length - 1) {
          // Next page
          runOnJS(handlePageChange)(currentPageIndex + 1);
        } else {
          // Spring back to flat
          curlProgress.value = withSpring(0, {
            damping: 14,
            stiffness: 100,
            mass: 0.6,
          });
          shadowOpacity.value = withSpring(0, {
            damping: 14,
            stiffness: 100,
            mass: 0.6,
          });
        }

        // Re-enable FlatList scroll
        flatListRef.current?.setNativeProps?.({ scrollEnabled: !isNarrating });
        gestureTranslationX.value = 0;
      });
  }, [currentPageIndex, pages.length, handlePageChange, isNarrating]);

  // ─── Feedback handlers ──────────────────────────────────────
  const handleFeedbackSubmit = useCallback((rating: number) => {
    // In production, send to backend: trpc.episodes.submitFeedback.mutate(...)
    console.log(`Story feedback: ${rating}/5 for episode ${episodeId}`);
  }, [episodeId]);

  const handleFeedbackDismiss = useCallback(() => {
    setShowFeedback(false);
    setShowingEndscreen(true);
  }, []);

  const handlePrintBook = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Print Book', 'Opening print options...');
  }, []);

  // ─── Loading state ──────────────────────────────────────────
  if (pagesQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.foreground }]}>Loading story...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentPage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.foreground }]}>No pages found for this story</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Feedback modal */}
      <StoryFeedbackModal
        visible={showFeedback}
        childName={params?.childName || 'Reader'}
        storyTitle={params?.title}
        onSubmit={handleFeedbackSubmit}
        onDismiss={handleFeedbackDismiss}
        accentColor={colors.primary}
      />

      {showingEndscreen ? (
        <Animated.View entering={FadeIn} style={styles.flex}>
          <LinearGradient colors={moodColors} style={styles.flex}>
            <View style={styles.endscreenContent}>
              <Animated.Text entering={FadeInDown} style={styles.endscreenTitle}>
                The End!
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.delay(200)}
                style={[styles.endscreenSubtitle, { marginVertical: 20 }]}
              >
                Great job, {params?.childName || 'Reader'}! You finished the story.
              </Animated.Text>
              <View style={styles.endscreenButtons}>
                <TouchableOpacity
                  style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
                  onPress={handlePrintBook}
                >
                  <Ionicons name="print" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Print as Book</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
                  onPress={() => {
                    setShowingEndscreen(false);
                    setCurrentPageIndex(0);
                    flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                  }}
                >
                  <Ionicons name="refresh" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Read Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
                  onPress={() => router.back()}
                >
                  <Ionicons name="home" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Back to Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Close story"
              accessibilityHint="Returns to the previous screen"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={28} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {params?.title}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Illustration area with book flip animation */}
          <Animated.View style={[styles.imageContainer, currentPageStyle]}>
            {currentPage?.imageUrl ? (
              <ImageBackground
                source={{ uri: currentPage.imageUrl }}
                style={styles.imageBackground}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']}
                  style={styles.imageGradientOverlay}
                />
                {/* Tap-to-interact zones */}
                <InteractOverlay
                  zones={interactZones}
                  containerWidth={width}
                  containerHeight={IMAGE_HEIGHT}
                  onTap={handleInteractTap}
                />
              </ImageBackground>
            ) : generatingImages.has(currentPage?.id ?? 0) ? (
              /* Shimmer skeleton while painting */
              <IllustrationShimmer moodColors={moodColors} />
            ) : (
              <LinearGradient
                colors={moodColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.imageBackground}
              />
            )}

            {/* Curl shadow overlay (fold edge shadow) */}
            <Animated.View style={[styles.curlShadowOverlay, curlShadowStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>

            {/* Golden shimmer overlay for page turns */}
            <Animated.View style={[styles.goldenOverlay, goldenOverlayStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255,215,0,0)', 'rgba(255,215,0,0.4)', 'rgba(255,200,0,0.6)', 'rgba(255,215,0,0.4)', 'rgba(255,215,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            <Animated.View style={[styles.shimmerStreak, goldenShimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,215,0,0.3)', 'rgba(255,255,255,0.6)', 'rgba(255,215,0,0.3)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>

            {/* Mood badge */}
            <Animated.View entering={FadeIn} style={styles.moodBadge}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moodBadgeContent}
              >
                <Text style={styles.moodBadgeLabel}>
                  {MOOD_LABELS[currentPage?.mood ?? ''] || 'Calm'}
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Interact tooltip */}
            {activeTooltip && (
              <View style={styles.tooltipPosition}>
                <InteractTooltip label={activeTooltip.label} type={activeTooltip.type} />
              </View>
            )}
          </Animated.View>

          {/* Story text area with word highlighting and swipe gesture */}
          <GestureDetector gesture={panGesture}>
            <View
              style={[styles.textContainer, { backgroundColor: colors.background }]}
              accessibilityRole="text"
              accessibilityLabel={`Story text: ${currentPage?.storyText || ''}`}
              accessibilityHint="Swipe left or right to turn pages"
              onLayout={(event) => {
                const { height, y } = event.nativeEvent.layout;
                setTextAreaLayout({ height, y });
              }}
            >
              {/* Reading Guide Overlay */}
              <ReadingGuide
                enabled={accessibility.readingGuide || !!accessibility.colorOverlay}
                textAreaHeight={textAreaLayout.height}
                textAreaY={textAreaLayout.y}
              />
              <FlatList
                ref={flatListRef}
                data={pages}
                renderItem={({ item, index }) => (
                  <View style={styles.pageContent}>
                    {index === currentPageIndex && isNarrating ? (
                      <WordHighlighter
                        words={currentWords}
                        currentWordIndex={currentWordIndex}
                        baseTextStyle={styles.storyTextBase}
                        showSyllableBreaks={false}
                      />
                    ) : (
                      <StoryNarrative>{item.storyText}</StoryNarrative>
                    )}
                    {item.characters && (item.characters as any[]).length > 0 && (
                      <CaptionText style={{ marginTop: 12 }}>
                        Characters: {(item.characters as any[]).map((c: any) =>
                          typeof c === 'string' ? c : c.name
                        ).join(', ')}
                      </CaptionText>
                    )}
                  </View>
                )}
                keyExtractor={(item) => String(item.id)}
                horizontal
                pagingEnabled
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const contentOffsetX = event.nativeEvent.contentOffset.x;
                  const index = Math.round(contentOffsetX / width);
                  handlePageChange(index);
                }}
                scrollEnabled={!isNarrating}
              />
            </View>
          </GestureDetector>

          {/* Speaker indicator */}
          {isNarrating && currentSpeaker && (
            <Animated.View entering={FadeIn} style={styles.speakerIndicator}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.speakerBadge}
              >
                <Ionicons name="mic" size={14} color="#fff" />
                <Text style={styles.speakerName}>{currentSpeaker}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Audio progress bar (during narration) */}
          {isNarrating && (
            <View style={styles.audioProgressContainer}>
              <View
                style={[
                  styles.audioProgressBar,
                  { width: `${(audioProgress / (totalDuration || 1)) * 100}%` },
                ]}
              />
            </View>
          )}

          {/* Page progress bar (always visible) */}
          <PageProgressBar
            currentPage={currentPageIndex}
            totalPages={pages.length}
            colors={colors}
          />

          {/* Controls */}
          <View style={styles.controlsArea}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.controlsGlass}
            >
              <View style={styles.controls}>
                {/* Play/Pause */}
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    { backgroundColor: colors.primary, opacity: generatingAudio ? 0.6 : 1 },
                  ]}
                  onPress={handlePlayNarration}
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
                  style={[
                    styles.controlButton,
                    { backgroundColor: isMusicEnabled ? colors.primary : 'rgba(0,0,0,0.1)' },
                  ]}
                  onPress={episode?.musicUrl ? handleToggleMusic : handleGenerateMusic}
                  disabled={generatingMusic}
                  accessibilityLabel={isMusicEnabled ? 'Mute music' : 'Play music'}
                >
                  {generatingMusic ? (
                    <ActivityIndicator size="small" color={isMusicEnabled ? '#fff' : colors.foreground} />
                  ) : (
                    <Ionicons
                      name={isMusicEnabled ? 'musical-notes' : 'musical-notes-outline'}
                      size={20}
                      color={isMusicEnabled ? '#fff' : colors.foreground}
                    />
                  )}
                </TouchableOpacity>

                {/* Page counter */}
                <View style={styles.pageCounter}>
                  <Text style={[styles.pageCountText, { color: colors.foreground }]}>
                    {currentPageIndex + 1} / {pages.length}
                  </Text>
                </View>

                {/* Previous page */}
                <TouchableOpacity
                  style={[styles.controlButton, { opacity: currentPageIndex === 0 ? 0.3 : 1 }]}
                  onPress={() => { if (currentPageIndex > 0) handlePageChange(currentPageIndex - 1); }}
                  disabled={currentPageIndex === 0}
                  accessibilityLabel="Previous page"
                  accessibilityHint="Swipe or double-tap to turn page"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: currentPageIndex === 0 }}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.foreground} />
                </TouchableOpacity>

                {/* Next page */}
                <TouchableOpacity
                  style={[styles.controlButton, { opacity: isLastPage ? 0.3 : 1 }]}
                  onPress={() => {
                    if (isLastPage) {
                      setShowFeedback(true);
                    } else {
                      handlePageChange(currentPageIndex + 1);
                    }
                  }}
                  accessibilityLabel={isLastPage ? 'Finish story' : 'Next page'}
                  accessibilityHint="Swipe or double-tap to turn page"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={isLastPage ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={colors.foreground}
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    marginRight: 12,
  },

  // Image / illustration area
  imageContainer: {
    height: IMAGE_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  moodBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  moodBadgeContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  moodBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  // Curl shadow (fold edge)
  curlShadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },

  // Golden shimmer
  goldenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  shimmerStreak: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.4,
    height: '100%',
    zIndex: 11,
  },
  shimmerGradient: { flex: 1 },

  // Text area
  textContainer: {
    flex: 1,
  },
  pageContent: {
    width: width,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  storyTextBase: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
    color: '#1F2937',
  },

  // Speaker indicator
  speakerIndicator: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    zIndex: 10,
  },
  speakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  speakerName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Audio progress
  audioProgressContainer: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  audioProgressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
  },

  // Page progress bar
  pageProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
  },
  pageProgressTrack: {
    flex: 1,
    height: PROGRESS_BAR_HEIGHT,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  pageProgressFill: {
    height: '100%',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  pageProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },

  // Interact zones
  interactZone: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tooltip
  tooltipPosition: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 20,
  },
  tooltip: {},
  tooltipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Controls
  controlsArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  controlsGlass: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  controlButton: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageCounter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageCountText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // End screen
  endscreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  endscreenTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  endscreenSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
  },
  endscreenButtons: {
    gap: 12,
    marginTop: 40,
  },
  endscreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  endscreenButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
