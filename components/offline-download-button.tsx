/**
 * Offline Download Button
 *
 * Button component for downloading stories for offline access.
 * Shows download progress, status, and allows cancellation.
 */


import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineStore } from "@/lib/offline-store";
import { createOfflineManager, type StoryBundle } from "@/lib/offline-manager";

interface OfflineDownloadButtonProps {
  storyBundle: StoryBundle;
  userId: number;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: Error) => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  variant?: "icon" | "button";
}

export function OfflineDownloadButton({
  storyBundle,
  userId,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
  disabled = false,
  size = "medium",
  showLabel = true,
  variant = "button",
}: OfflineDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const store = useOfflineStore();
  const activeDownload = store.activeDownloads.get(
    `${storyBundle.arcId}_all`
  );

  const isOffline =
    store.offlineStories.has(storyBundle.arcId);

  // Size mappings
  const sizeConfig = {
    small: { iconSize: 18, fontSize: 12, padding: 6 },
    medium: { iconSize: 22, fontSize: 14, padding: 10 },
    large: { iconSize: 28, fontSize: 16, padding: 12 },
  };

  const config = sizeConfig[size];
  const manager = new (class {
    userId = userId;
  }).constructor.prototype
    ? createOfflineManager(userId)
    : null;

  const handleDownload = async () => {
    if (isDownloading) {
      // Cancel download
      store.cancelDownload(storyBundle.arcId, undefined);
      setIsDownloading(false);
      return;
    }

    setIsDownloading(true);
    setError(null);
    onDownloadStart?.();

    try {
      const manager = createOfflineManager(userId);

      await manager.downloadStoryForOffline(storyBundle, undefined, (progress, status) => {
        setProgress(progress);
      });

      onDownloadComplete?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Download failed");
      setError(error.message);
      onDownloadError?.(error);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const handleLongPress = async () => {
    if (!isOffline) return;

    Alert.alert(
      "Remove Offline Copy",
      `Remove "${storyBundle.title}" from offline storage?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            try {
              const manager = createOfflineManager(userId);
              await manager.removeOfflineStory(storyBundle.arcId);
            } catch (err) {
              console.error("Failed to remove offline story:", err);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Determine icon and status
  let icon = "cloud-download";
  let iconColor = "#4F46E5";
  let statusText = "Download";

  if (error) {
    icon = "alert-circle";
    iconColor = "#EF4444";
    statusText = "Error";
  } else if (isOffline) {
    icon = "checkmark-circle";
    iconColor = "#10B981";
    statusText = "Offline Ready";
  } else if (isDownloading) {
    icon = "download";
    iconColor = "#F59E0B";
    statusText = `${Math.round(progress)}%`;
  }

  if (variant === "icon") {
    return (
      <TouchableOpacity
        onPress={handleDownload}
        onLongPress={handleLongPress}
        disabled={disabled}
        style={[
          styles.iconButton,
          { opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {isDownloading ? (
          <ActivityIndicator size={config.iconSize} color={iconColor} />
        ) : (
          <Ionicons name={icon as any} size={config.iconSize} color={iconColor} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleDownload}
      onLongPress={handleLongPress}
      disabled={disabled || isDownloading}
      style={[
        styles.button,
        {
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: config.padding,
          paddingVertical: config.padding * 0.8,
        },
      ]}
    >
      <View style={styles.buttonContent}>
        {isDownloading ? (
          <ActivityIndicator size={config.iconSize} color={iconColor} style={{ marginRight: 8 }} />
        ) : (
          <Ionicons
            name={icon as any}
            size={config.iconSize}
            color={iconColor}
            style={{ marginRight: 8 }}
          />
        )}

        {showLabel && (
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.buttonText,
                { fontSize: config.fontSize, color: iconColor },
              ]}
            >
              {statusText}
            </Text>
            {isDownloading && progress > 0 && (
              <Text style={[styles.subText, { fontSize: config.fontSize - 2 }]}>
                {Math.round(progress)}% complete
              </Text>
            )}
            {error && (
              <Text style={[styles.errorText, { fontSize: config.fontSize - 2 }]}>
                {error}
              </Text>
            )}
          </View>
        )}

        {isDownloading && (
          // @ts-expect-error - overload mismatch
          <View style={[styles.progressBar, { width: (progress / 100) * 100 + "%" }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    fontWeight: "600",
  },
  subText: {
    color: "#6B7280",
    marginTop: 2,
  },
  errorText: {
    color: "#EF4444",
    marginTop: 2,
  },
  iconButton: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: "#4F46E5",
    borderRadius: 1.5,
  },
});
