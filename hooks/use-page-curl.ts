import { useRef, useMemo, useCallback } from 'react';
import { FlatList } from 'react-native';
import Animated, {
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
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { announce } from '@/lib/a11y-helpers';

interface UsePageCurlParams {
  currentPageIndex: number;
  totalPages: number;
  reducedMotion: boolean;
  isNarrating: boolean;
  flatListRef: React.RefObject<FlatList>;
  onPageChange: (index: number) => void;
  screenWidth: number;
}

export function usePageCurl({
  currentPageIndex,
  totalPages,
  reducedMotion,
  isNarrating,
  flatListRef,
  onPageChange,
  screenWidth,
}: UsePageCurlParams) {
  const flipRotation = useSharedValue(0);
  const flipOpacity = useSharedValue(1);
  const nextPageOpacity = useSharedValue(0);
  const isTransitioning = useRef(false);

  const curlProgress = useSharedValue(0);
  const shadowOpacity = useSharedValue(0);
  const behindPageOffset = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureTranslationX = useSharedValue(0);

  const shimmerPosition = useSharedValue(-1);
  const goldenOverlayOpacity = useSharedValue(0);

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
    transform: [{ translateX: behindPageOffset.value }],
  }));

  const goldenShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerPosition.value, [-1, 1], [-screenWidth, screenWidth]);
    return {
      transform: [{ translateX }],
      opacity: goldenOverlayOpacity.value,
    };
  });

  const goldenOverlayStyle = useAnimatedStyle(() => ({
    opacity: goldenOverlayOpacity.value,
  }));

  const handlePageChange = useCallback((index: number) => {
    if (index === currentPageIndex || isTransitioning.current) return;
    if (index < 0 || index >= totalPages) return;
    Haptics.selectionAsync();
    announce(`Page ${index + 1} of ${totalPages}`);
    isTransitioning.current = true;
    const isForward = index > currentPageIndex;

    if (!reducedMotion) {
      curlProgress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      shadowOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.4, { duration: 100 })
      );
      behindPageOffset.value = withTiming(-20, { duration: 250, easing: Easing.out(Easing.cubic) });
      goldenOverlayOpacity.value = withSequence(
        withDelay(100, withTiming(0.4, { duration: 120 })),
        withTiming(0, { duration: 200 })
      );
      shimmerPosition.value = -1;
      shimmerPosition.value = withDelay(80, withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }));
      flipRotation.value = withTiming(isForward ? -90 : 90, { duration: 250, easing: Easing.out(Easing.cubic) });
      flipOpacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });

      setTimeout(() => {
        onPageChange(index);
        flatListRef.current?.scrollToIndex({ index, animated: false });

        curlProgress.value = withSpring(0, { damping: 14, stiffness: 100, mass: 0.6 });
        behindPageOffset.value = withSpring(0, { damping: 14, stiffness: 100, mass: 0.6 });
        shadowOpacity.value = withTiming(0, { duration: 150 });
        flipRotation.value = isForward ? 90 : -90;
        flipRotation.value = withSpring(0, { damping: 14, stiffness: 100, mass: 0.6 });
        flipOpacity.value = withTiming(1, { duration: 220, easing: Easing.in(Easing.ease) });

        setTimeout(() => { isTransitioning.current = false; }, 300);
      }, 260);
    } else {
      onPageChange(index);
      flatListRef.current?.scrollToIndex({ index, animated: false });
      flipRotation.value = 0;
      flipOpacity.value = 1;
      goldenOverlayOpacity.value = 0;
      curlProgress.value = 0;
      shadowOpacity.value = 0;
      behindPageOffset.value = 0;
      isTransitioning.current = false;
    }
  }, [currentPageIndex, totalPages, reducedMotion, onPageChange]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        gestureTranslationX.value = event.translationX;
        gestureActive.value = true;
        const threshold = 80;
        const progress = Math.min(Math.abs(event.translationX) / threshold, 1);
        curlProgress.value = progress * 0.3;
        shadowOpacity.value = progress * 0.3;
        flatListRef.current?.setNativeProps?.({ scrollEnabled: false });
      })
      .onEnd((event) => {
        gestureActive.value = false;
        const threshold = 80;
        const isSwipeRight = event.translationX > threshold;
        const isSwipeLeft = event.translationX < -threshold;

        if (isSwipeRight && currentPageIndex > 0) {
          runOnJS(handlePageChange)(currentPageIndex - 1);
        } else if (isSwipeLeft && currentPageIndex < totalPages - 1) {
          runOnJS(handlePageChange)(currentPageIndex + 1);
        } else {
          curlProgress.value = withSpring(0, { damping: 14, stiffness: 100, mass: 0.6 });
          shadowOpacity.value = withSpring(0, { damping: 14, stiffness: 100, mass: 0.6 });
        }
        flatListRef.current?.setNativeProps?.({ scrollEnabled: !isNarrating });
        gestureTranslationX.value = 0;
      });
  }, [currentPageIndex, totalPages, handlePageChange, isNarrating]);

  return {
    currentPageStyle,
    curlShadowStyle,
    behindPageStyle,
    goldenShimmerStyle,
    goldenOverlayStyle,
    handlePageChange,
    panGesture,
  };
}
