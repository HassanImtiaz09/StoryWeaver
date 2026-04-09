import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { withTiming, Easing, SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { trpc } from '@/lib/trpc';
import { announce } from '@/lib/a11y-helpers';

interface UseReaderAudioParams {
  episodeId: number;
  episode: any;
  pages: any[];
  currentPageIndex: number;
  currentPage: any;
  currentWords: string[];
  isLastPage: boolean;
  childName: string;
  progressAnim: SharedValue<number>;
  onShowFeedback: () => void;
}

export function useReaderAudio({
  episodeId,
  episode,
  pages,
  currentPageIndex,
  currentPage,
  currentWords,
  isLastPage,
  childName,
  progressAnim,
  onShowFeedback,
}: UseReaderAudioParams) {
  const [isNarrating, setIsNarrating] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const narratorSoundRef = useRef<Audio.Sound | null>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);
  const progressUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const generateFullAudioMutation = trpc.episodes.generateFullAudio.useMutation();
  const generateMusicMutation = trpc.episodes.generateMusic.useMutation();

  useEffect(() => {
    isMountedRef.current = true;
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
    return () => {
      isMountedRef.current = false;
      cleanupAudio();
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      if (progressUpdateIntervalRef.current) clearInterval(progressUpdateIntervalRef.current);
    };
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

  const estimateWordIndex = useCallback(
    (positionMs: number, durationMs: number) => {
      if (durationMs <= 0 || currentWords.length === 0) return -1;
      const progress = positionMs / durationMs;
      const wordIndex = Math.floor(progress * currentWords.length);
      return Math.min(wordIndex, currentWords.length - 1);
    },
    [currentWords]
  );

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
          onShowFeedback();
        }
      }
    } catch (error) {
      console.error('Error handling narration finish:', error);
    }
  }, [isLastPage, onShowFeedback]);

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
          childName: childName || 'Friend',
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
      }, 150);
    } catch (error) {
      console.error('Error starting narration:', error);
      Alert.alert('Error', 'Failed to play narration');
    } finally {
      setGeneratingAudio(false);
    }
  }, [isNarrating, pages, isMusicEnabled, episode, estimateWordIndex, handleNarrationFinish]);

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

  const resetWordIndex = useCallback(() => {
    setCurrentWordIndex(-1);
  }, []);

  return {
    isNarrating,
    isMusicEnabled,
    generatingAudio,
    generatingMusic,
    audioProgress,
    totalDuration,
    currentSpeaker,
    currentWordIndex,
    resetWordIndex,
    handlePlayNarration,
    handleGenerateMusic,
    handleToggleMusic,
    cleanupAudio,
  };
}
