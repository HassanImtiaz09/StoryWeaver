import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  useSharedValue,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { trpc } from '@/lib/trpc';
import { useColors } from '@/hooks/use-colors';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { announce } from '@/lib/a11y-helpers';
import { StoryNarrative, CaptionText } from '@/components/styled-text';
import { WordHighlighter } from '@/components/word-highlighter';
import { StoryFeedbackModal } from '@/components/story-feedback-modal';
import { ReadingGuide } from '@/components/reading-guide';
import { ReaderSettingsTray } from '@/components/reader-settings-tray';
import { IllustratedEmptyState } from '@/components/illustrated-empty-state';
import { useAccessibilityStore } from '@/lib/accessibility-store';

// Extracted components and hooks
import {
  ReaderIllustration,
  ReaderEndScreen,
  ReaderControls,
  ReaderBookmarkBanner,
} from '@/components/reader';
import { useReaderAudio } from '@/hooks/use-reader-audio';
import { useBookmark } from '@/hooks/use-bookmark';
import { usePageCurl } from '@/hooks/use-page-curl';
import { useSmartHomeSync } from '@/hooks/use-smart-home-sync';

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

interface InteractZone {
  x: number;
  y: number;
  radius: number;
  label: string;
  type: 'character' | 'object';
}

function buildInteractZones(page: any): InteractZone[] {
  const zones: InteractZone[] = [];
  if (page?.characters && Array.isArray(page.characters)) {
    page.characters.forEach((char: any, i: number) => {
      const name = typeof char === 'string' ? char : char?.name ?? '';
      if (!name) return;
      zones.push({
        x: 0.2 + (i * 0.3) % 0.7,
        y: 0.5 + (i * 0.15) % 0.3,
        radius: 30,
        label: name,
        type: 'character',
      });
    });
  }
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

// ─── Page Progress Bar ──────────────────────────────────────────
function PageProgressBar({ currentPage, totalPages, colors }: {
  currentPage: number; totalPages: number; colors: any;
}) {
  const progress = totalPages > 0 ? (currentPage + 1) / totalPages : 0;
  return (
    <View style={styles.pageProgressContainer} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: totalPages, now: currentPage + 1 }}>
      <View style={[styles.pageProgressTrack, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
        <View style={[styles.pageProgressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.pageProgressLabel, { color: colors.muted }]}>{currentPage + 1} of {totalPages}</Text>
    </View>
  );
}

const { width } = Dimensions.get('window');

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
  const accessibility = useAccessibilityStore();

  // Page state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showingEndscreen, setShowingEndscreen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSettingsTray, setShowSettingsTray] = useState(false);

  // Image generation state
  const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());

  // Interact tooltip
  const [activeTooltip, setActiveTooltip] = useState<InteractZone | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reading guide state
  const [textAreaLayout, setTextAreaLayout] = useState({ height: 0, y: 0 });

  // Refs
  const flatListRef = useRef<FlatList>(null);

  // Animation values
  const progressAnim = useSharedValue(0);

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

  const currentWords = useMemo(() => {
    if (!currentPage?.storyText) return [];
    return currentPage.storyText.split(/\s+/).filter(Boolean);
  }, [currentPage?.storyText]);

  const interactZones = useMemo(() => buildInteractZones(currentPage), [currentPage?.id]);

  // ─── Custom hooks ─────────────────────────────────────────────
  const audio = useReaderAudio({
    episodeId,
    episode,
    pages,
    currentPageIndex,
    currentPage,
    currentWords,
    isLastPage,
    childName: params?.childName || 'Friend',
    progressAnim,
    onShowFeedback: () => setShowFeedback(true),
  });

  const bookmark = useBookmark({
    episodeId,
    currentPageIndex,
    totalPages: pages.length,
    onScrollToPage: (index) => flatListRef.current?.scrollToIndex({ index, animated: true }),
    onSetPage: setCurrentPageIndex,
  });

  const pageCurl = usePageCurl({
    currentPageIndex,
    totalPages: pages.length,
    reducedMotion,
    isNarrating: audio.isNarrating,
    flatListRef,
    onPageChange: (index) => {
      setCurrentPageIndex(index);
      audio.resetWordIndex();
      setActiveTooltip(null);
    },
    screenWidth: width,
  });

  // ─── Smart home mood sync (lighting + ambient sound) ──────────
  useSmartHomeSync({
    mood: currentPage?.mood,
    isNarrating: audio.isNarrating,
    isActive: !showingEndscreen && !pagesQuery.isLoading,
    episodeId,
  });

  // ─── Auto-generate images ──────────────────────────────────────
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

  // Cleanup tooltip on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

  // ─── Interact zone tap ──────────────────────────────────────
  const handleInteractTap = useCallback((zone: InteractZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTooltip(zone);
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 2500);
  }, []);

  // ─── Feedback handlers ──────────────────────────────────────
  const handleFeedbackSubmit = useCallback((rating: number) => {
    console.log(`Story feedback: ${rating}/5 for episode ${episodeId}`);
  }, [episodeId]);

  const handleFeedbackDismiss = useCallback(async () => {
    setShowFeedback(false);
    setShowingEndscreen(true);
    await bookmark.clearCurrentBookmark();
  }, [bookmark.clearCurrentBookmark]);

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

  // ─── Error state ────────────────────────────────────────────
  if (pagesQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <IllustratedEmptyState
            type="error"
            title="Oops! Something went wrong"
            subtitle="Don't worry, let's try that again"
            actionLabel="Retry"
            onAction={() => pagesQuery.refetch()}
          />
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

      {/* Settings Tray */}
      <ReaderSettingsTray
        isOpen={showSettingsTray}
        onClose={() => setShowSettingsTray(false)}
      />

      {/* Resume Bookmark Banner */}
      <ReaderBookmarkBanner
        visible={bookmark.showBookmarkBanner}
        savedPageIndex={bookmark.savedPageIndex}
        totalPages={pages.length}
        colors={colors}
        onResume={bookmark.handleResumeBookmark}
        onStartOver={bookmark.handleStartOver}
      />

      {showingEndscreen ? (
        <ReaderEndScreen
          childName={params?.childName || 'Reader'}
          moodColors={moodColors}
          onPrint={handlePrintBook}
          onReadAgain={() => {
            setShowingEndscreen(false);
            setCurrentPageIndex(0);
            flatListRef.current?.scrollToIndex({ index: 0, animated: true });
          }}
          onBackToLibrary={() => router.back()}
        />
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

          {/* Illustration area */}
          <ReaderIllustration
            currentPage={currentPage}
            moodColors={moodColors}
            interactZones={interactZones}
            generatingImages={generatingImages}
            activeTooltip={activeTooltip}
            onInteractTap={handleInteractTap}
            currentPageStyle={pageCurl.currentPageStyle}
            curlShadowStyle={pageCurl.curlShadowStyle}
            goldenOverlayStyle={pageCurl.goldenOverlayStyle}
            goldenShimmerStyle={pageCurl.goldenShimmerStyle}
          />

          {/* Story text area with word highlighting and swipe gesture */}
          <GestureDetector gesture={pageCurl.panGesture}>
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
                    {index === currentPageIndex && audio.isNarrating ? (
                      <WordHighlighter
                        words={currentWords}
                        currentWordIndex={audio.currentWordIndex}
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
                  pageCurl.handlePageChange(index);
                }}
                scrollEnabled={!audio.isNarrating}
              />
            </View>
          </GestureDetector>

          {/* Speaker indicator */}
          {audio.isNarrating && audio.currentSpeaker && (
            <Animated.View entering={FadeIn} style={styles.speakerIndicator}>
              <View style={styles.speakerBadge}>
                <Ionicons name="mic" size={14} color="#fff" />
                <Text style={styles.speakerName}>{audio.currentSpeaker}</Text>
              </View>
            </Animated.View>
          )}

          {/* Audio progress bar */}
          {audio.isNarrating && (
            <View style={styles.audioProgressContainer}>
              <View style={[styles.audioProgressBar, { width: `${(audio.audioProgress / (audio.totalDuration || 1)) * 100}%` }]} />
            </View>
          )}

          {/* Page progress bar */}
          <PageProgressBar currentPage={currentPageIndex} totalPages={pages.length} colors={colors} />

          {/* Controls */}
          <ReaderControls
            colors={colors}
            isNarrating={audio.isNarrating}
            isMusicEnabled={audio.isMusicEnabled}
            generatingAudio={audio.generatingAudio}
            generatingMusic={audio.generatingMusic}
            currentPageIndex={currentPageIndex}
            totalPages={pages.length}
            isLastPage={isLastPage}
            hasMusicUrl={!!episode?.musicUrl}
            onPlayNarration={audio.handlePlayNarration}
            onToggleMusic={audio.handleToggleMusic}
            onGenerateMusic={audio.handleGenerateMusic}
            onOpenSettings={() => setShowSettingsTray(true)}
            onPrevPage={() => { if (currentPageIndex > 0) pageCurl.handlePageChange(currentPageIndex - 1); }}
            onNextPage={() => pageCurl.handlePageChange(currentPageIndex + 1)}
            onFinishStory={() => setShowFeedback(true)}
          />
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: '500' },
  errorText: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
  button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 12, marginRight: 12 },
  textContainer: { flex: 1 },
  pageContent: { width, paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center' },
  storyTextBase: { fontSize: 18, lineHeight: 28, fontWeight: '500', color: '#1F2937' },
  speakerIndicator: { position: 'absolute', bottom: 160, left: 16, zIndex: 10 },
  speakerBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  speakerName: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  audioProgressContainer: { height: 2, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  audioProgressBar: { height: '100%', backgroundColor: '#FFD700' },
  pageProgressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 10 },
  pageProgressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  pageProgressFill: { height: '100%', borderRadius: 2 },
  pageProgressLabel: { fontSize: 12, fontWeight: '600', minWidth: 48, textAlign: 'right' },
});
