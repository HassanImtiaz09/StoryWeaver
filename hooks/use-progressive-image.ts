/**
 * Progressive Image Loading Hook
 *
 * Provides blur-up progressive image loading for StoryWeaver.
 * Shows a small, blurred placeholder while the full image loads,
 * then smoothly transitions to the full resolution image.
 *
 * Usage:
 * ```tsx
 * const { src, placeholder, srcSet, sizes, isLoading } = useProgressiveImage(
 *   'https://cdn.example.com/image.jpg',
 *   { sizes: ['mobile', 'tablet', 'desktop'] }
 * );
 *
 * <img
 *   src={placeholder}
 *   srcSet={srcSet}
 *   sizes={sizes}
 *   onLoad={onFullImageLoad}
 *   alt="Story illustration"
 * />
 * ```
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export interface UseProgressiveImageOptions {
  /**
   * Enable blur-up placeholder (default: true)
   */
  enablePlaceholder?: boolean;

  /**
   * Device type for variant selection (default: 'mobile')
   */
  deviceType?: "mobile" | "tablet" | "desktop" | "print";

  /**
   * Preferred image variant size
   */
  preferredSize?: "thumbnail" | "mobile" | "tablet" | "print";

  /**
   * Callback when placeholder loads
   */
  onPlaceholderLoad?: () => void;

  /**
   * Callback when full image loads
   */
  onFullImageLoad?: () => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;

  /**
   * Image loading timeout in ms (default: 30000)
   */
  loadingTimeout?: number;
}

export interface UseProgressiveImageResult {
  /**
   * Main image source (full resolution)
   */
  src: string;

  /**
   * Placeholder image source (small, blurred)
   */
  placeholder: string;

  /**
   * srcset attribute for responsive images
   */
  srcSet?: string;

  /**
   * sizes attribute for responsive images
   */
  sizes?: string;

  /**
   * Whether the full image is still loading
   */
  isLoading: boolean;

  /**
   * Whether placeholder has loaded
   */
  isPlaceholderLoaded: boolean;

  /**
   * Whether full image has loaded
   */
  isImageLoaded: boolean;

  /**
   * Load progress (0-100), if available
   */
  progress: number;

  /**
   * Any loading error
   */
  error: Error | null;

  /**
   * Retry loading the image
   */
  retry: () => void;
}

/**
 * Hook for progressive image loading with blur-up effect
 *
 * Fetches placeholder and responsive variants from API,
 * then manages the loading state and transitions.
 */
export function useProgressiveImage(
  imageUrl: string,
  options: UseProgressiveImageOptions = {}
): UseProgressiveImageResult {
  const {
    enablePlaceholder = true,
    deviceType = "mobile",
    preferredSize = deviceType,
    onPlaceholderLoad,
    onFullImageLoad,
    onError,
    loadingTimeout = 30000,
  } = options;

  // State
  const [placeholder, setPlaceholder] = useState<string>("");
  const [srcSet, setSrcSet] = useState<string>("");
  const [sizes, setSizes] = useState<string>("");
  const [isPlaceholderLoaded, setIsPlaceholderLoaded] =
    useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  // Refs for timeout and abort
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // API call to get placeholder and variants
  const { data: imageData, isLoading: isImageDataLoading } =
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load placeholder when data arrives
  useEffect(() => {
    if (!imageData?.placeholder || !enablePlaceholder) {
      return;
    }

    const img = new Image();

    img.onload = () => {
      setPlaceholder(imageData.placeholder);
      setIsPlaceholderLoaded(true);
      onPlaceholderLoad?.();
    };

    img.onerror = () => {
      const err = new Error("Failed to load placeholder image");
      setError(err);
      onError?.(err);
    };

    img.src = imageData.placeholder;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
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

  // Handle main image loading
  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setProgress(100);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    onFullImageLoad?.();
  };

  const handleImageError = () => {
    const err = new Error("Failed to load main image");
    setError(err);
    onError?.(err);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

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
    if (
      isPlaceholderLoaded &&
      !isImageLoaded &&
      progress < 90
    ) {
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
  const retry = () => {
    setError(null);
    setIsImageLoaded(false);
    setProgress(0);
  };

  return {
    src: imageUrl,
    placeholder: placeholder || imageUrl, // Fallback to original if no placeholder
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
 *
 * Simplifies the image element setup with progressive loading.
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
        result.onFullImageLoad?.();
      },
      onError: () => {
        result.onError?.(new Error("Image load failed"));
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
