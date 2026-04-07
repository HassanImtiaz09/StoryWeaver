import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { trpc } from '@/lib/trpc';
import { useColors } from '@/hooks/use-colors';

type PageData = {
  id: string;
  pageNumber: number;
  storyText: string;
  imageUrl: string | null;
  imagePrompt: string | null;
  audioUrl: string | null;
  mood: string;
  characters: string[];
  sceneDescription: string;
  soundEffectHint: string | null;
  soundEffectUrl: string | null;
};

type EpisodeData = {
  id: string;
  title: string;
  fullAudioUrl: string | null;
  musicUrl: string | null;
  mood: string;
  childName: string;
  ageGroup: string;
};

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

  // State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [showingEndscreen, setShowingEndscreen] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);

  // Refs
  const narratorSoundRef = useRef<Audio.Sound | null>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Animations
  const progressAnim = useSharedValue(0);

  // tRPC queries
  const episodeId = parseInt(params?.episodeId ?? "0", 10);

  const pagesQuery = trpc.pages.list.useQuery(
    { episodeId },
    { enabled: !!episodeId }
  );

  const episodeQuery = trpc.episodes.get.useQuery(
    { id: episodeId },
    { enabled: !!episodeId }
  );

  const generateFullAudioMutation = trpc.episodes.generateFullAudio.useMutation();
  const generateMusicMutation = trpc.episodes.generateMusic.useMutation();
  const generateImageMutation = trpc.pages.generateImage.useMutation();

  // Computed values
  const pages = useMemo(() => pagesQuery.data || [], [pagesQuery.data]);
  const episode = episodeQuery.data;
  const currentPage = pages[currentPageIndex];
  const pageTimingsMap = useMemo(() => {
    const map = new Map<number, { startMs: number; endMs: number }>();
    if (episode?.pageTimings) {
      for (const pt of episode.pageTimings) {
        map.set(pt.pageNumber, { startMs: pt.startMs, endMs: pt.endMs });
      }
    }
    return map;
  }, [episode?.pageTimings]);
  const isLastPage = currentPageIndex === pages.length - 1;
  const moodColors = currentPage ? MOOD_COLORS[currentPage.mood] : ['#6C63FF', '#8B83FF'];

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
    };
  }, []);

  // Initialize Audio module
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

  // Generate page image if missing
  useEffect(() => {
    if (!currentPage || currentPage.imageUrl) return;

    const generateImage = async () => {
      if (generatingImages.has(currentPage.id)) return;

      setGeneratingImages((prev) => new Set(prev).add(currentPage.id));
      try {
        await generateImageMutation.mutateAsync({
          pageId: currentPage.id,
          prompt: currentPage.imagePrompt || currentPage.sceneDescription,
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
      // Pause
      try {
        if (narratorSoundRef.current) {
          await narratorSoundRef.current.pauseAsync();
        }
        if (musicSoundRef.current) {
          await musicSoundRef.current.pauseAsync();
        }
        if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
        if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
        setIsNarrating(false);
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
      return;
    }

    // Play
    try {
      setGeneratingAudio(true);

      // If no fullAudioUrl, generate it
      if (!episode?.fullAudioUrl) {
        const result = await generateFullAudioMutation.mutateAsync({
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

      // Load narrator sound
      const { sound: narratorSound } = await Audio.Sound.createAsync(
        { uri: fullAudioUrl },
        { shouldPlay: true, rate: 1.0, volume: 1.0 }
      );
      narratorSoundRef.current = narratorSound;

      // Load music if available and enabled
      if (isMusicEnabled && episode?.musicUrl) {
        try {
          const { sound: musicSound } = await Audio.Sound.createAsync(
            { uri: episode?.musicUrl },
            { shouldPlay: true, rate: 1.0, volume: 0.15, isLooping: true }
          );
          musicSoundRef.current = musicSound;
        } catch (error) {
          console.error('Failed to load music:', error);
        }
      }

      // Get duration
      const status = await narratorSound.getStatusAsync();
      if (status.isLoaded) {
        setTotalDuration(status.durationMillis || 0);
      }

      setIsNarrating(true);

      // Setup progress tracking
      progressUpdateIntervalRef.current = setInterval(async () => {
        const currentStatus = await narratorSound.getStatusAsync();
        if (currentStatus.isLoaded) {
          const position = currentStatus.positionMillis || 0;
          setAudioProgress(position);
          progressAnim.value = withTiming(position / (totalDuration || 1), {
            duration: 500,
            easing: Easing.linear,
          });

          // Update current speaker based on page timings
          if (pageTimingsMap.get(currentPage?.pageNumber ?? 0)?.startMs && pageTimingsMap.get(currentPage?.pageNumber ?? 0)?.endMs) {
            if (
              position >= currentPage.pageTimings.startMs &&
              position <= currentPage.pageTimings.endMs
            ) {
              if (currentPage?.characters?.length > 0) {
                setCurrentSpeaker(currentPage.characters[0]);
              }
            }
          }

          // Check if narration finished
          if (currentStatus.didJustFinish) {
            await handleNarrationFinish();
          }
        }
      }, 200);

      // Setup auto-advance based on page timings
      scheduleNextPageAdvance(0);
    } catch (error) {
      console.error('Error starting narration:', error);
      Alert.alert('Error', 'Failed to play narration');
    } finally {
      setGeneratingAudio(false);
    }
  }, [isNarrating, pages, isMusicEnabled, params?.episodeId, params?.childName]);

  const scheduleNextPageAdvance = useCallback((pageIndex: number) => {
    if (pageIndex >= pages.length - 1) return;

    const nextPage = pages[pageIndex + 1];
    if (!pageTimingsMap.get(nextPage?.pageNumber ?? 0)?.startMs) return;

    const currentStatus = narratorSoundRef.current?.getStatusAsync();
    if (!currentStatus?.isLoaded) return;

    const timeUntilNextPage = nextPage.pageTimings.startMs - audioProgress;
    if (timeUntilNextPage <= 0) {
      // Advance immediately
      setCurrentPageIndex(pageIndex + 1);
      flatListRef.current?.scrollToIndex({
        index: pageIndex + 1,
        animated: true,
      });
      scheduleNextPageAdvance(pageIndex + 1);
    } else {
      // Schedule for later
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        setCurrentPageIndex(pageIndex + 1);
        flatListRef.current?.scrollToIndex({
          index: pageIndex + 1,
          animated: true,
        });
        scheduleNextPageAdvance(pageIndex + 1);
      }, timeUntilNextPage);
    }
  }, [pages, audioProgress]);

  const handleNarrationFinish = useCallback(async () => {
    try {
      await cleanupAudio();
      setIsNarrating(false);
      if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);

      if (isLastPage) {
        setShowingEndscreen(true);
      }
    } catch (error) {
      console.error('Error handling narration finish:', error);
    }
  }, [isLastPage]);

  const handlePageChange = useCallback((index: number) => {
    Haptics.selectionAsync();
    setCurrentPageIndex(index);

    // If narrating, seek to matching position
    if (isNarrating && pageTimingsMap.get(pages[index]?.pageNumber ?? 0)?.startMs) {
      try {
        const seekTo = pageTimingsMap.get(pages[index]?.pageNumber ?? 0)?.startMs;
        if (seekTo) narratorSoundRef.current?.setPositionAsync(seekTo);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  }, [isNarrating, pages]);

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
      try {
        musicSoundRef.current.playAsync();
      } catch (error) {
        console.error('Error resuming music:', error);
      }
    } else if (isMusicEnabled && musicSoundRef.current) {
      try {
        musicSoundRef.current.pauseAsync();
      } catch (error) {
        console.error('Error pausing music:', error);
      }
    }
  }, [isMusicEnabled]);

  const handlePrintBook = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Print Book', 'Opening print options...');
    // TODO: Implement print functionality
  }, []);

  if (pagesQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading story...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentPage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            No pages found for this story
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
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
        // End Screen
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
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>
                    Print as Book
                  </Text>
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
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>
                    Read Again
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.endscreenButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
                  onPress={() => router.back()}
                >
                  <Ionicons name="home" size={24} color={moodColors[0]} />
                  <Text style={[styles.endscreenButtonText, { color: moodColors[0] }]}>
                    Back to Library
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {params?.title}
            </Text>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {progressPercent.toFixed(0)}%
            </Text>
          </View>

          {/* Image Background Area */}
          <View style={styles.imageContainer}>
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
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={moodColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.imageBackground}
              >
                {generatingImages.has(currentPage?.id || '') && (
                  <View style={styles.generatingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.generatingText}>Generating image...</Text>
                  </View>
                )}
              </LinearGradient>
            )}

            {/* Mood Badge */}
            <Animated.View entering={FadeIn} style={styles.moodBadge}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moodBadgeContent}
              >
                <Text style={styles.moodBadgeLabel}>
                  {MOOD_LABELS[currentPage?.mood] || 'Calm'}
                </Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Text Area with Page Content */}
          <View style={[styles.textContainer, { backgroundColor: colors.background }]}>
            <FlatList
              ref={flatListRef}
              data={pages}
              renderItem={({ item }) => (
                <View style={styles.pageContent}>
                  <Text style={[styles.pageText, { color: colors.text }]}>
                    {item.storyText}
                  </Text>
                  {item.characters?.length > 0 && (
                    <Text style={[styles.characterLabel, { color: colors.primary }]}>
                      Characters: {item.characters.join(', ')}
                    </Text>
                  )}
                </View>
              )}
              keyExtractor={(item) => item.id}
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

          {/* Current Speaker Indicator */}
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

          {/* Progress Bar */}
          {isNarrating && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${(audioProgress / (totalDuration || 1)) * 100}%`,
                  },
                ]}
              />
            </View>
          )}

          {/* Controls */}
          <View style={styles.controlsArea}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.controlsGlass}
            >
              <View style={styles.controls}>
                {/* Play Button */}
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: generatingAudio ? 0.6 : 1,
                    },
                  ]}
                  onPress={handlePlayNarration}
                  disabled={generatingAudio}
                >
                  {generatingAudio ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name={isNarrating ? 'pause' : 'play'}
                      size={24}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>

                {/* Music Toggle */}
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    {
                      backgroundColor: isMusicEnabled
                        ? colors.primary
                        : 'rgba(0,0,0,0.1)',
                    },
                  ]}
                  onPress={
                    episode?.musicUrl
                      ? handleToggleMusic
                      : handleGenerateMusic
                  }
                  disabled={generatingMusic}
                >
                  {generatingMusic ? (
                    <ActivityIndicator
                      size="small"
                      color={isMusicEnabled ? '#fff' : colors.text}
                    />
                  ) : (
                    <Ionicons
                      name={isMusicEnabled ? 'musical-notes' : 'musical-notes-outline'}
                      size={20}
                      color={isMusicEnabled ? '#fff' : colors.text}
                    />
                  )}
                </TouchableOpacity>

                {/* Page Counter */}
                <View style={styles.pageCounter}>
                  <Text style={[styles.pageCountText, { color: colors.text }]}>
                    {currentPageIndex + 1} / {pages.length}
                  </Text>
                </View>
                {/* Navigation Buttons */}
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    { opacity: currentPageIndex === 0 ? 0.3 : 1 },
                  ]}
                  onPress={() => {
                    if (currentPageIndex > 0) handlePageChange(currentPageIndex - 1);
                  }}
                  disabled={currentPageIndex === 0}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    { opacity: isLastPage ? 0.3 : 1 },
                  ]}
                  onPress={() => {
                    if (!isLastPage) handlePageChange(currentPageIndex + 1);
                  }}
                  disabled={isLastPage}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
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

  // Header
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

  // Image Container
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

  // Text Container
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

  // Speaker Indicator
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

  // Progress Bar
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
  },

  // Controls
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

  // End Screen
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
