import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { trpc } from '@/lib/trpc';
import { useColors } from '@/hooks/use-colors';

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
const IMAGE_HEIGHT = height * 0.55;
const TEXT_AREA_HEIGHT = height * 0.35;

export default function StoryReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    episodeId: string;
    arcId: string;
    title: string;
    childName: string;
  }>();

  const colors = useColors();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());
  const [showingEndscreen, setShowingEndscreen] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);

  const narratorSoundRef = useRef<Audio.Sound | null>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progressAnim = useSharedValue(0);

  // Golden page transition animation values
  const pageOpacity = useSharedValue(1);
  const pageScale = useSharedValue(1);
  const shimmerPosition = useSharedValue(-1);
  const goldenOverlayOpacity = useSharedValue(0);
  const isTransitioning = useRef(false);

  const pageTransitionStyle = useAnimatedStyle(() => ({
    opacity: pageOpacity.value,
    transform: [{ scale: pageScale.value }],
  }));

  const goldenShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerPosition.value,
      [-1, 1],
      [-width, width]
    );
    return {
      transform: [{ translateX }],
      opacity: goldenOverlayOpacity.value,
    };
  });

  const goldenOverlayStyle = useAnimatedStyle(() => ({
    opacity: goldenOverlayOpacity.value,
  }));

  const episodeId = parseInt(params?.episodeId ?? "0", 10);

  const pagesQuery = trpc.pages.list.useQuery(
    { episodeId },
    { enabled: !!episodeId }
  );

  const episodeQuery = trpc.episodes.get.useQuery(
    { episodeId },
    { enabled: !!episodeId }
  );

  const generateFullAudioMutation = trpc.episodes.generateFullAudio.useMutation();
  const generateMusicMutation = trpc.episodes.generateMusic.useMutation();
  const generateImageMutation = trpc.pages.generateImage.useMutation();

  const pages = useMemo(() => pagesQuery.data || [], [pagesQuery.data]);
  const episode = episodeQuery.data;
  const currentPage = pages[currentPageIndex] as (typeof pages)[number] | undefined;
  const isLastPage = currentPageIndex === pages.length - 1;
  const moodColors: [string, string] = currentPage?.mood ? (MOOD_COLORS[currentPage.mood] ?? ['#6C63FF', '#8B83FF']) : ['#6C63FF', '#8B83FF'];

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
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

  useEffect(() => {
    if (!currentPage || currentPage.imageUrl) return;
    const generateImage = async () => {
      if (generatingImages.has(currentPage.id)) return;
      setGeneratingImages((prev) => new Set(prev).add(currentPage.id));
      try {
        await generateImageMutation.mutateAsync({
          pageId: currentPage.id,
          prompt: currentPage.imagePrompt || currentPage.sceneDescription || 'A magical scene',
        });
      } catch (error) {
        console.error('Failed to generate page image:', error);
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

  const handlePlayNarration = useCallback(async () => {
    if (isNarrating) {
      try {
        if (narratorSoundRef.current) await narratorSoundRef.current.pauseAsync();
        if (musicSoundRef.current) await musicSoundRef.current.pauseAsync();
        if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
        if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
        setIsNarrating(false);
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
      return;
    }

    try {
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

      progressUpdateIntervalRef.current = setInterval(async () => {
        try {
          const currentStatus = await narratorSound.getStatusAsync();
          if (currentStatus.isLoaded) {
            const position = currentStatus.positionMillis || 0;
            setAudioProgress(position);
            progressAnim.value = withTiming(position / (totalDuration || 1), {
              duration: 500,
              easing: Easing.linear,
            });
            if (currentPage?.characters && currentPage.characters.length > 0) {
              const firstChar = currentPage.characters[0] as any;
              setCurrentSpeaker(typeof firstChar === 'string' ? firstChar : firstChar?.name ?? null);
            }
            if (currentStatus.didJustFinish) {
              await handleNarrationFinish();
            }
          }
        } catch (_err) { /* sound may have been unloaded */ }
      }, 200);
    } catch (error) {
      console.error('Error starting narration:', error);
      Alert.alert('Error', 'Failed to play narration');
    } finally {
      setGeneratingAudio(false);
    }
  }, [isNarrating, pages, isMusicEnabled, params?.episodeId, params?.childName]);

  const handleNarrationFinish = useCallback(async () => {
    try {
      await cleanupAudio();
      setIsNarrating(false);
      if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      if (isLastPage) setShowingEndscreen(true);
    } catch (error) {
      console.error('Error handling narration finish:', error);
    }
  }, [isLastPage]);

  const handlePageChange = useCallback((index: number) => {
    if (index === currentPageIndex || isTransitioning.current) return;
    Haptics.selectionAsync();

    isTransitioning.current = true;

    // Phase 1: Fade out current page with subtle scale
    pageOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
    pageScale.value = withTiming(0.97, { duration: 180, easing: Easing.out(Easing.ease) });

    // Phase 2: Golden shimmer flash
    goldenOverlayOpacity.value = withSequence(
      withDelay(100, withTiming(0.35, { duration: 150 })),
      withTiming(0, { duration: 250 })
    );
    shimmerPosition.value = -1;
    shimmerPosition.value = withDelay(100, withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }));

    // Phase 3: Switch page content and fade in
    setTimeout(() => {
      setCurrentPageIndex(index);
      flatListRef.current?.scrollToIndex({ index, animated: false });

      pageOpacity.value = withTiming(1, { duration: 250, easing: Easing.in(Easing.ease) });
      pageScale.value = withTiming(1, { duration: 250, easing: Easing.in(Easing.ease) });

      setTimeout(() => {
        isTransitioning.current = false;
      }, 260);
    }, 200);
  }, [currentPageIndex, isNarrating, pages]);

  const handleGenerateMusic = useCallback(async () => {
    try {
      setGeneratingMusic(true);
      await generateMusicMutation.mutateAsync({
        episodeId,
        mood: currentPage?.mood || 'calm',
      });
      setIsMusicEnabled(true);
    } catch (error) {
      console.error('Error generating music:', error);
      Alert.alert('Error', 'Failed to generate music');
    } finally {
      setGeneratingMusic(false);
    }
  }, [params?.episodeId, currentPage?.mood]);

  const handleToggleMusic = useCallback(() => {
    Haptics.selectionAsync();
    setIsMusicEnabled(!isMusicEnabled);
    if (!isMusicEnabled && musicSoundRef.current) {
      try { musicSoundRef.current.playAsync(); } catch (_e) {}
    } else if (isMusicEnabled && musicSoundRef.current) {
      try { musicSoundRef.current.pauseAsync(); } catch (_e) {}
    }
  }, [isMusicEnabled]);

  const handlePrintBook = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Print Book', 'Opening print options...');
  }, []);

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

  const progressPercent = pages.length > 0 ? ((currentPageIndex + 1) / pages.length) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {showingEndscreen ? (
        <Animated.View entering={FadeIn} style={styles.flex}>
          <LinearGradient colors={moodColors} style={styles.flex}>
            <View style={styles.endscreenContent}>
              <Animated.Text entering={FadeInDown} style={styles.endscreenTitle}>The End!</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(200)} style={[styles.endscreenSubtitle, { marginVertical: 20 }]}>
                Great job, {params?.childName || 'Reader'}! You finished the story.
              </Animated.Text>
              <View style={styles.endscreenButtons}>
                <TouchableOpacity style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={handlePrintBook}>
                  <Ionicons name="print" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Print as Book</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={() => { setShowingEndscreen(false); setCurrentPageIndex(0); flatListRef.current?.scrollToIndex({ index: 0, animated: true }); }}>
                  <Ionicons name="refresh" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Read Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={() => router.back()}>
                  <Ionicons name="home" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>Back to Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{params?.title}</Text>
            <Text style={[styles.progressText, { color: colors.muted }]}>{progressPercent.toFixed(0)}%</Text>
          </View>

          <Animated.View style={[styles.imageContainer, pageTransitionStyle]}>
            {currentPage?.imageUrl ? (
              <ImageBackground source={{ uri: currentPage.imageUrl }} style={styles.imageBackground} resizeMode="cover">
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']} style={styles.imageGradientOverlay} />
              </ImageBackground>
            ) : (
              <LinearGradient colors={moodColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.imageBackground}>
                {generatingImages.has(currentPage?.id ?? 0) && (
                  <View style={styles.generatingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.generatingText}>Generating image...</Text>
                  </View>
                )}
              </LinearGradient>
            )}
            {/* Golden shimmer overlay */}
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
            <Animated.View entering={FadeIn} style={styles.moodBadge}>
              <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moodBadgeContent}>
                <Text style={styles.moodBadgeLabel}>{MOOD_LABELS[currentPage?.mood ?? ''] || 'Calm'}</Text>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.textContainer, { backgroundColor: colors.background }, pageTransitionStyle]}>
            <FlatList
              ref={flatListRef}
              data={pages}
              renderItem={({ item }) => (
                <View style={styles.pageContent}>
                  <Text style={[styles.pageText, { color: colors.foreground }]}>{item.storyText}</Text>
                  {item.characters && (item.characters as any[]).length > 0 && (
                    <Text style={[styles.characterLabel, { color: colors.primary }]}>
                      Characters: {(item.characters as any[]).map((c: any) => typeof c === 'string' ? c : c.name).join(', ')}
                    </Text>
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
          </Animated.View>

          {isNarrating && currentSpeaker && (
            <Animated.View entering={FadeIn} style={styles.speakerIndicator}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.speakerBadge}>
                <Ionicons name="mic" size={14} color="#fff" />
                <Text style={styles.speakerName}>{currentSpeaker}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {isNarrating && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${(audioProgress / (totalDuration || 1)) * 100}%` }]} />
            </View>
          )}

          <View style={styles.controlsArea}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.controlsGlass}>
              <View style={styles.controls}>
                <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary, opacity: generatingAudio ? 0.6 : 1 }]} onPress={handlePlayNarration} disabled={generatingAudio}>
                  {generatingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={isNarrating ? 'pause' : 'play'} size={24} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: isMusicEnabled ? colors.primary : 'rgba(0,0,0,0.1)' }]} onPress={episode?.musicUrl ? handleToggleMusic : handleGenerateMusic} disabled={generatingMusic}>
                  {generatingMusic ? <ActivityIndicator size="small" color={isMusicEnabled ? '#fff' : colors.foreground} /> : <Ionicons name={isMusicEnabled ? 'musical-notes' : 'musical-notes-outline'} size={20} color={isMusicEnabled ? '#fff' : colors.foreground} />}
                </TouchableOpacity>
                <View style={styles.pageCounter}>
                  <Text style={[styles.pageCountText, { color: colors.foreground }]}>{currentPageIndex + 1} / {pages.length}</Text>
                </View>
                <TouchableOpacity style={[styles.controlButton, { opacity: currentPageIndex === 0 ? 0.3 : 1 }]} onPress={() => { if (currentPageIndex > 0) handlePageChange(currentPageIndex - 1); }} disabled={currentPageIndex === 0}>
                  <Ionicons name="chevron-back" size={20} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, { opacity: isLastPage ? 0.3 : 1 }]} onPress={() => { if (!isLastPage) handlePageChange(currentPageIndex + 1); }} disabled={isLastPage}>
                  <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  generatingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
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
  textContainer: {
    height: TEXT_AREA_HEIGHT,
    flex: 1,
  },
  pageContent: {
    width: width,
    height: TEXT_AREA_HEIGHT,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  pageText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    marginBottom: 12,
  },
  characterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    opacity: 0.7,
  },
  speakerIndicator: {
    position: 'absolute',
    bottom: 120,
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
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  controlsArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
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
  shimmerGradient: {
    flex: 1,
  },
});
