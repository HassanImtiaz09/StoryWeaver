/**
 * Progressive Image Component for StoryWeaver
 *
 * Displays images with blur-up progressive loading effect.
 * Shows a small blurred placeholder while the full resolution image loads,
 * then smoothly transitions to the full image when ready.
 *
 * Features:
 * - Blur-up placeholder for visual feedback
 * - Responsive image variants (mobile, tablet, desktop)
 * - Smooth transition from placeholder to full image
 * - Loading progress indication (optional)
 * - Error handling and retry
 * - Accessibility support (alt text, ARIA attributes)
 *
 * Usage:
 * ```tsx
 * <ProgressiveImage
 *   src="https://cdn.example.com/story-image.jpg"
 *   alt="Story illustration"
 *   width={300}
 *   height={200}
 * />
 * ```
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import { useWindowDimensions } from "react-native";
import { useProgressiveImage } from "@/hooks/use-progressive-image";

export interface ProgressiveImageProps {
  /**
   * Image source URL
   */
  src: string;

  /**
   * Alternative text for accessibility
   */
  alt: string;

  /**
   * Image width
   */
  width?: number;

  /**
   * Image height
   */
  height?: number;

  /**
   * CSS class for styling
   */
  className?: string;

  /**
   * Device type for variant selection
   */
  deviceType?: "mobile" | "tablet" | "desktop" | "print";

  /**
   * Show loading indicator while image loads
   */
  showLoading?: boolean;

  /**
   * Show progress percentage during loading
   */
  showProgress?: boolean;

  /**
   * Enable blur effect on placeholder
   */
  enableBlur?: boolean;

  /**
   * Container style className
   */
  containerClassName?: string;

  /**
   * Placeholder background color if no image placeholder available
   */
  placeholderColor?: string;

  /**
   * Callback when image fully loads
   */
  onLoad?: () => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;

  /**
   * Image object-fit value
   */
  objectFit?: "cover" | "contain" | "fill" | "scale-down";

  /**
   * Priority loading hint for preload
   */
  priority?: boolean;

  /**
   * Lazy load threshold (how far before entering viewport to load)
   */
  lazyLoadThreshold?: number;
}

/**
 * Progressive Image Component
 *
 * Renders an image with blur-up progressive loading effect.
 * Uses responsive image variants for optimal performance on different devices.
 */
export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  className,
  deviceType = "mobile",
  showLoading = true,
  showProgress = false,
  enableBlur = true,
  containerClassName,
  placeholderColor = "#f0f0f0",
  onLoad,
  onError,
  objectFit = "cover",
  priority = false,
  lazyLoadThreshold = 0,
}: ProgressiveImageProps) {
  // Hooks
  const { width: screenWidth } = useWindowDimensions();
  const imageRef = useRef<Image>(null);
  const containerRef = useRef<View>(null);

  // Progressive loading state
  const {
    placeholder,
    srcSet,
    sizes,
    isLoading,
    isPlaceholderLoaded,
    isImageLoaded,
    progress,
    error,
    retry,
  } = useProgressiveImage(src, {
    enablePlaceholder: enableBlur,
    deviceType,
    onFullImageLoad: onLoad,
    onError,
  });

  // Local state for lazy loading
  const [shouldLoad, setShouldLoad] = useState(priority);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority || shouldLoad) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: `${lazyLoadThreshold}px`,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, shouldLoad, lazyLoadThreshold]);

  // Determine actual width based on responsive design
  const actualWidth = width || screenWidth - 32; // Default to screen width minus padding
  const aspectRatio = height && width ? width / height : 4 / 3; // Default to 4:3
  const actualHeight = height || actualWidth / aspectRatio;

  // Image object fit styles
  const objectFitStyles = {
    cover: "object-cover" as const,
    contain: "object-contain" as const,
    fill: "object-fill" as const,
    "scale-down": "object-scale-down" as const,
  };

  return (
    <View
      ref={containerRef}
      className={containerClassName}
      style={{ width: actualWidth, height: actualHeight, position: "relative" }}
      accessibilityRole="image"
      accessibilityLabel={alt}
    >
      {/* Placeholder/Blur Container */}
      {enableBlur && placeholder && !isImageLoaded && (
        <Image
          source={{ uri: placeholder }}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
          className={enableBlur ? "blur-sm" : ""}
          blurRadius={enableBlur ? 10 : 0}
          accessibilityHidden={true}
        />
      )}

      {/* Loading Indicator */}
      {showLoading && isLoading && (
        <View
          className="absolute inset-0 flex items-center justify-center bg-black/10"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#9333ea" />
          {showProgress && (
            <View className="absolute bottom-2 left-2 right-2">
              <View className="h-1 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </View>
              {showProgress && (
                <Text className="text-xs text-white mt-1 text-center">
                  {Math.round(progress)}%
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Main Image */}
      {shouldLoad && (
        <Image
          ref={imageRef}
          source={{ uri: src }}
          style={{
            width: "100%",
            height: "100%",
            opacity: isImageLoaded ? 1 : 0,
          }}
          className={`${className || ""} transition-opacity duration-500`}
          onLoad={() => {
            onLoad?.();
          }}
          onError={() => {
            onError?.(new Error("Failed to load image"));
          }}
          alt={alt}
          accessibilityHidden={!isImageLoaded}
        />
      )}

      {/* Error State */}
      {error && !isImageLoaded && (
        <View className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <View className="flex flex-col items-center gap-2">
            <Text className="text-gray-600 text-sm">Failed to load image</Text>
            <Pressable
              onPress={retry}
              className="px-3 py-1 bg-purple-600 rounded-md"
            >
              <Text className="text-white text-xs font-medium">Retry</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Fallback Placeholder */}
      {!enableBlur && !isImageLoaded && (
        <View
          className="absolute inset-0"
          style={{ backgroundColor: placeholderColor }}
        />
      )}
    </View>
  );
}

/**
 * Picture Element Component for Web
 *
 * Renders a picture element with multiple source variants for optimal
 * format and resolution selection by the browser.
 */
export function PictureImage({
  src,
  alt,
  width,
  height,
  className,
  deviceType = "mobile",
  showLoading = true,
  enableBlur = true,
  containerClassName,
  placeholderColor = "#f0f0f0",
  onLoad,
  onError,
  priority = false,
}: ProgressiveImageProps) {
  const { placeholder, srcSet, sizes, isImageLoaded, error, retry } =
    useProgressiveImage(src, {
      enablePlaceholder: enableBlur,
      deviceType,
      onFullImageLoad: onLoad,
      onError,
    });

  const [shouldLoad, setShouldLoad] = React.useState(priority);

  // Lazy loading with Intersection Observer
  React.useEffect(() => {
    if (priority || shouldLoad) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );

    const container = document.querySelector(
      `[data-progressive-image="${src}"]`
    );
    if (container) {
      observer.observe(container);
    }

    return () => observer.disconnect();
  }, [priority, shouldLoad, src]);

  if (!shouldLoad) {
    return (
      <div
        data-progressive-image={src}
        className={containerClassName}
        style={{
          width: width || "100%",
          height: height || "auto",
          backgroundColor: placeholderColor,
        }}
      />
    );
  }

  return (
    <div className={containerClassName} style={{ position: "relative" }}>
      {/* Placeholder */}
      {enableBlur && placeholder && !isImageLoaded && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 blur-sm"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          aria-hidden="true"
        />
      )}

      {/* Main Image with picture element for multiple sources */}
      <picture>
        {/* WebP variant */}
        <source
          srcSet={srcSet?.replace(/\.(jpg|jpeg|png)/g, ".webp")}
          type="image/webp"
        />

        {/* AVIF variant */}
        <source
          srcSet={srcSet?.replace(/\.(jpg|jpeg|png)/g, ".avif")}
          type="image/avif"
        />

        {/* Fallback JPEG */}
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          className={`${className || ""} transition-opacity duration-500 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            objectFit: "cover",
            width: "100%",
            height: "auto",
          }}
          onLoad={onLoad}
          onError={() => onError?.(new Error("Failed to load image"))}
          loading={priority ? "eager" : "lazy"}
        />
      </picture>

      {/* Error State */}
      {error && !isImageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-600 text-sm">Failed to load image</p>
            <button
              onClick={retry}
              className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {showLoading && !isImageLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      )}
    </div>
  );
}

// Export both components
export default ProgressiveImage;
