/**
 * Progressive Image Loading Hook
 *
 * Provides progressive image loading for StoryWeaver.
 * Shows a placeholder while the full image loads,
 * then transitions to the full resolution image.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Image as RNImage } from "react-native";
import { trpc } from "@/lib/trpc";

export interface UseProgressiveImageOptions {
  enablePlaceholder?: boolean;
  deviceType?: "mobile" | "tablet" | "desktop" | "print";
  preferredSize?: "thumbnail" | "mobile" | "tablet" | "print";
  onPlaceholderLoad?: () => void;
  onFullImageLoad?: () => void;
  onError?: (error: Error) => void;
  loadingTimeout?: number;
}

export interface UseProgressiveImageResult {
  src: string;
  placeholder: string;
  srcSet?: string;
  sizes?: string;
  isLoading: boolean;
  isPlaceholderLoaded: boolean;
  isImageLoaded: boolean;
  progress: number;
  error: Error | null;
  retry: () => void;
}

/**
 * Hook for progressive image loading
 */
export function useProgressiveImage(
  imageUrl: string,
  options: UseProgressiveImageOptions = {}
): UseProgressiveImageResult {
  const {
    enablePlaceholder = true,
    deviceType = "mobile",
    onPlaceholderLoad,
    onFullImageLoad,
    onError,
    loadingTimeout = 30000,
  } = options;

  const [placeholder, setPlaceholder] = useState<string>("");
  const [srcSet, setSrcSet] = useState<string>("");
  const [sizes, setSizes] = useState<string>("");
  const [isPlaceholderLoaded, setIsPlaceholderLoaded] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // API call to get placeholder and variants
  const { data: imageData } =
    trpc.media.generateImagePlaceholder.useQuery(
      { imageUrl },
      {
        enabled: enablePlaceholder && !!imageUrl,
        retry: 2,
        retryDelay: 1000,
      }
    );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Load placeholder when data arrives (React Native compatible)
  useEffect(() => {
    if (!imageData?.placeholder || !enablePlaceholder) {
      return;
    }

    // Use React Native's Image.prefetch for cross-platform compatibility
    RNImage.prefetch(imageData.placeholder)
      .then(() => {
        setPlaceholder(imageData.placeholder);
        setIsPlaceholderLoaded(true);
        onPlaceholderLoad?.();
      })
      .catch(() => {
        const err = new Error("Failed to load placeholder image");
        setError(err);
        onError?.(err);
      });
  }, [imageData, enablePlaceholder, onPlaceholderLoad, onError]);

  // Update srcSet and sizes
  useEffect(() => {
    if (imageData?.srcSet) {
      setSrcSet(imageData.srcSet);
    }
    if (imageData?.sizes) {
      setSizes(imageData.sizes);
    }
  }, [imageData]);

  // Prefetch main image
  useEffect(() => {
    if (!imageUrl) return;

    RNImage.prefetch(imageUrl)
      .then(() => {
        setIsImageLoaded(true);
        setProgress(100);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        onFullImageLoad?.();
      })
      .catch(() => {
        const err = new Error("Failed to load main image");
        setError(err);
        onError?.(err);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      });
  }, [imageUrl, onFullImageLoad, onError]);

  // Set loading timeout
  useEffect(() => {
    if (imageUrl && !isImageLoaded) {
      timeoutRef.current = setTimeout(() => {
        if (!isImageLoaded) {
          const err = new Error("Image loading timeout");
          setError(err);
          onError?.(err);
        }
      }, loadingTimeout);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [imageUrl, isImageLoaded, loadingTimeout, onError]);

  // Simulate progress
  useEffect(() => {
    if (isPlaceholderLoaded && !isImageLoaded && progress < 90) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 30;
          return Math.min(next, 90);
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isPlaceholderLoaded, isImageLoaded, progress]);

  // Retry function
  const retry = useCallback(() => {
    setError(null);
    setIsImageLoaded(false);
    setProgress(0);
  }, []);

  return {
    src: imageUrl,
    placeholder: placeholder || imageUrl,
    srcSet,
    sizes,
    isLoading: !isImageLoaded && !error,
    isPlaceholderLoaded,
    isImageLoaded,
    progress: isImageLoaded ? 100 : progress,
    error,
    retry,
  };
}

/**
 * Hook to handle image element and load events
 */
export function useProgressiveImageElement(
  imageUrl: string,
  options: UseProgressiveImageOptions = {}
): {
  imageProps: {
    src: string;
    srcSet?: string;
    sizes?: string;
    onLoad: () => void;
    onError: () => void;
  };
  state: Omit<UseProgressiveImageResult, "retry">;
} {
  const result = useProgressiveImage(imageUrl, options);

  return {
    imageProps: {
      src: result.placeholder,
      srcSet: result.srcSet,
      sizes: result.sizes,
      onLoad: () => {
        // Image loaded callback
      },
      onError: () => {
        // Image error callback
      },
    },
    state: {
      src: result.src,
      placeholder: result.placeholder,
      srcSet: result.srcSet,
      sizes: result.sizes,
      isLoading: result.isLoading,
      isPlaceholderLoaded: result.isPlaceholderLoaded,
      isImageLoaded: result.isImageLoaded,
      progress: result.progress,
      error: result.error,
    },
  };
}
