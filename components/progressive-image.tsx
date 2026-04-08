/**
 * Progressive Image Component for StoryWeaver
 *
 * Displays images with blur-up progressive loading effect.
 * Shows a blurred placeholder while the full resolution image loads,
 * then smoothly transitions to the full image when ready.
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Image, Text, Pressable, ActivityIndicator, useWindowDimensions, StyleSheet } from "react-native";

export interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  deviceType?: "mobile" | "tablet" | "desktop" | "print";
  showLoading?: boolean;
  showProgress?: boolean;
  enableBlur?: boolean;
  containerClassName?: string;
  placeholderColor?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  objectFit?: "cover" | "contain" | "fill" | "scale-down";
  priority?: boolean;
  lazyLoadThreshold?: number;
}

export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  showLoading = true,
  showProgress = false,
  enableBlur = true,
  placeholderColor = "#f0f0f0",
  onLoad,
  onError,
  priority = false,
}: ProgressiveImageProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad] = useState(true); // Always load in RN (no IntersectionObserver)

  const actualWidth = width || screenWidth - 32;
  const aspectRatio = height && width ? width / height : 4 / 3;
  const actualHeight = height || actualWidth / aspectRatio;

  const handleLoad = () => {
    setIsImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.(new Error("Failed to load image"));
  };

  const handleRetry = () => {
    setHasError(false);
    setIsImageLoaded(false);
  };

  return (
    <View
      style={[styles.container, { width: actualWidth, height: actualHeight }]}
      accessibilityRole="image"
      accessibilityLabel={alt}
    >
      {/* Placeholder background */}
      {!isImageLoaded && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: placeholderColor }]}
        />
      )}

      {/* Loading Indicator */}
      {showLoading && !isImageLoaded && !hasError && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      )}

      {/* Main Image */}
      {shouldLoad && !hasError && (
        <Image
          source={{ uri: src }}
          style={[
            StyleSheet.absoluteFill,
            { opacity: isImageLoaded ? 1 : 0 },
          ]}
          resizeMode="cover"
          onLoad={handleLoad}
          onError={handleError}
          accessible={isImageLoaded}
          accessibilityLabel={alt}
        />
      )}

      {/* Error State */}
      {hasError && (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          <Text style={styles.errorText}>Failed to load image</Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#6b7280",
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#7c3aed",
    borderRadius: 6,
  },
  retryText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
});

export default ProgressiveImage;
