import { useState, useRef, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { announce } from '@/lib/a11y-helpers';

interface Bookmark {
  pageIndex: number;
  timestamp: number;
}

async function saveBookmark(episodeId: number, pageIndex: number): Promise<void> {
  try {
    const bookmark: Bookmark = { pageIndex, timestamp: Date.now() };
    await AsyncStorage.setItem(`sw_bookmark_${episodeId}`, JSON.stringify(bookmark));
  } catch (error) {
    console.error('Failed to save bookmark:', error);
  }
}

async function getBookmark(episodeId: number): Promise<Bookmark | null> {
  try {
    const stored = await AsyncStorage.getItem(`sw_bookmark_${episodeId}`);
    if (!stored) return null;
    return JSON.parse(stored) as Bookmark;
  } catch (error) {
    console.error('Failed to retrieve bookmark:', error);
    return null;
  }
}

async function clearBookmark(episodeId: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(`sw_bookmark_${episodeId}`);
  } catch (error) {
    console.error('Failed to clear bookmark:', error);
  }
}

interface UseBookmarkParams {
  episodeId: number;
  currentPageIndex: number;
  totalPages: number;
  onScrollToPage: (index: number) => void;
  onSetPage: (index: number) => void;
}

export function useBookmark({
  episodeId,
  currentPageIndex,
  totalPages,
  onScrollToPage,
  onSetPage,
}: UseBookmarkParams) {
  const [showBookmarkBanner, setShowBookmarkBanner] = useState(false);
  const [savedPageIndex, setSavedPageIndex] = useState(0);
  const bookmarkSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookmarkDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Restore bookmark on mount
  useEffect(() => {
    isMountedRef.current = true;
    const restoreBookmark = async () => {
      if (!episodeId || !totalPages) return;
      const bookmark = await getBookmark(episodeId);
      if (bookmark && bookmark.pageIndex > 0 && bookmark.pageIndex < totalPages) {
        setSavedPageIndex(bookmark.pageIndex);
        setShowBookmarkBanner(true);
        bookmarkDismissTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShowBookmarkBanner(false);
          }
        }, 5000);
      }
    };
    restoreBookmark();
    return () => {
      isMountedRef.current = false;
      if (bookmarkDismissTimeoutRef.current) clearTimeout(bookmarkDismissTimeoutRef.current);
    };
  }, [episodeId, totalPages]);

  // Debounced bookmark save on page change
  useEffect(() => {
    if (currentPageIndex === 0) return;
    if (bookmarkSaveTimeoutRef.current) clearTimeout(bookmarkSaveTimeoutRef.current);
    bookmarkSaveTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && episodeId) {
        saveBookmark(episodeId, currentPageIndex);
      }
    }, 500);
    return () => {
      if (bookmarkSaveTimeoutRef.current) clearTimeout(bookmarkSaveTimeoutRef.current);
    };
  }, [currentPageIndex, episodeId]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (currentPageIndex > 0) {
        saveBookmark(episodeId, currentPageIndex);
      }
    };
  }, [episodeId, currentPageIndex]);

  const handleResumeBookmark = useCallback(() => {
    if (bookmarkDismissTimeoutRef.current) clearTimeout(bookmarkDismissTimeoutRef.current);
    setShowBookmarkBanner(false);
    Haptics.selectionAsync();
    announce(`Resuming from page ${savedPageIndex + 1}`);
    onScrollToPage(savedPageIndex);
    setTimeout(() => {
      onSetPage(savedPageIndex);
    }, 100);
  }, [savedPageIndex, onScrollToPage, onSetPage]);

  const handleStartOver = useCallback(() => {
    if (bookmarkDismissTimeoutRef.current) clearTimeout(bookmarkDismissTimeoutRef.current);
    setShowBookmarkBanner(false);
    Haptics.selectionAsync();
    announce('Starting story from the beginning');
  }, []);

  const clearCurrentBookmark = useCallback(async () => {
    if (episodeId) {
      await clearBookmark(episodeId);
    }
  }, [episodeId]);

  return {
    showBookmarkBanner,
    savedPageIndex,
    handleResumeBookmark,
    handleStartOver,
    clearCurrentBookmark,
  };
}
