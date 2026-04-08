/**
 * Download Manager Sheet
 *
 * Bottom sheet showing active and queued downloads.
 * Allows progress monitoring, cancellation, and retry.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineStore, type ActiveDownload } from "@/lib/offline-store";

interface DownloadManagerSheetProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export function DownloadManagerSheet({ isVisible, onDismiss }: DownloadManagerSheetProps) {
  const store = useOfflineStore();
  const downloads = Array.from(store.activeDownloads.values());
  const breakdown = store.getStorageBreakdown();

  if (!isVisible) return null;

  const handleCancelAll = () => {
    Alert.alert(
      "Cancel All Downloads",
      "Cancel all active downloads?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            for (const download of downloads) {
              store.cancelDownload(download.arcId, download.episodeId);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleClearCompleted = () => {
    const completed = downloads.filter((d) => d.status === "completed");
    for (const download of completed) {
      store.cancelDownload(download.arcId, download.episodeId);
    }
  };

  const activeDownloads = downloads.filter((d) => d.status !== "completed");
  const completedDownloads = downloads.filter((d) => d.status === "completed");
  const failedDownloads = downloads.filter((d) => d.status === "error");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Download Manager</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Usage */}
        <View style={styles.storageSection}>
          <Text style={styles.sectionLabel}>Storage</Text>
          <View style={styles.storageBox}>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>Total Used</Text>
              <Text style={styles.storageValue}>{formatBytes(breakdown.used)}</Text>
            </View>
            <View style={styles.storageBar}>
              <View
                style={[
                  styles.storageBarFill,
                  {
                    width: `${breakdown.percentUsed}%`,
                    backgroundColor:
                      breakdown.percentUsed > 90 ? "#EF4444" :
                      breakdown.percentUsed > 70 ? "#F59E0B" :
                      "#10B981",
                  },
                ]}
              />
            </View>
            <View style={styles.storageRow}>
              <Text style={styles.storageSmall}>
                {Math.round(breakdown.percentUsed)}% of {formatBytes(breakdown.quota)}
              </Text>
              <Text style={styles.storageSmall}>
                {formatBytes(breakdown.remaining)} available
              </Text>
            </View>
          </View>
        </View>

        {/* Active Downloads */}
        {activeDownloads.length > 0 && (
          <View style={styles.downloadsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                Active Downloads ({activeDownloads.length})
              </Text>
              {activeDownloads.length > 0 && (
                <TouchableOpacity onPress={handleCancelAll}>
                  <Text style={styles.cancelAllButton}>Cancel All</Text>
                </TouchableOpacity>
              )}
            </View>

            {activeDownloads.map((download, index) => (
              <DownloadItem
                key={`${download.arcId}-${download.episodeId}-${index}`}
                download={download}
              />
            ))}
          </View>
        )}

        {/* Failed Downloads */}
        {failedDownloads.length > 0 && (
          <View style={styles.downloadsSection}>
            <Text style={[styles.sectionLabel, styles.errorLabel]}>
              Failed ({failedDownloads.length})
            </Text>

            {failedDownloads.map((download, index) => (
              <DownloadItem
                key={`${download.arcId}-${download.episodeId}-failed-${index}`}
                download={download}
              />
            ))}
          </View>
        )}

        {/* Completed Downloads */}
        {completedDownloads.length > 0 && (
          <View style={styles.downloadsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, styles.successLabel]}>
                Completed ({completedDownloads.length})
              </Text>
              <TouchableOpacity onPress={handleClearCompleted}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>

            {completedDownloads.map((download, index) => (
              <DownloadItem
                key={`${download.arcId}-${download.episodeId}-completed-${index}`}
                download={download}
              />
            ))}
          </View>
        )}

        {downloads.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No downloads in progress</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface DownloadItemProps {
  download: ActiveDownload;
}

function DownloadItem({ download }: DownloadItemProps) {
  const store = useOfflineStore();
  const [isRetrying, setIsRetrying] = useState(false);

  let statusIcon = "download";
  let statusColor = "#4F46E5";
  let statusLabel = "Downloading";

  if (download.status === "completed") {
    statusIcon = "checkmark-circle";
    statusColor = "#10B981";
    statusLabel = "Completed";
  } else if (download.status === "error") {
    statusIcon = "alert-circle";
    statusColor = "#EF4444";
    statusLabel = "Error";
  } else if (download.status === "paused") {
    statusIcon = "pause-circle";
    statusColor = "#F59E0B";
    statusLabel = "Paused";
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // In production, would re-trigger download
      store.startDownload({
        ...download,
        status: "pending",
        progress: 0,
        error: undefined,
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = () => {
    store.cancelDownload(download.arcId, download.episodeId);
  };

  return (
    <View style={styles.downloadItem}>
      <View style={styles.downloadHeader}>
        <Ionicons name={statusIcon as any} size={20} color={statusColor} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.downloadTitle}>
            Episode {download.episodeId || "All"}
          </Text>
          <Text style={styles.downloadSubtitle}>
            {formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}
          </Text>
        </View>
        <Text style={styles.downloadPercent}>{Math.round(download.progress)}%</Text>
      </View>

      <View style={styles.downloadProgressBar}>
        <View
          style={[
            styles.downloadProgressBarFill,
            {
              width: `${download.progress}%`,
              backgroundColor:
                download.status === "error"
                  ? "#EF4444"
                  : download.status === "completed"
                  ? "#10B981"
                  : "#4F46E5",
            },
          ]}
        />
      </View>

      {download.status === "downloading" && (
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.downloadActionButton}
        >
          <Text style={styles.downloadActionText}>Cancel</Text>
        </TouchableOpacity>
      )}

      {download.status === "error" && (
        <View style={styles.downloadErrorContainer}>
          <Text style={styles.downloadErrorText}>{download.error || "Unknown error"}</Text>
          <TouchableOpacity
            onPress={handleRetry}
            disabled={isRetrying}
            style={styles.downloadRetryButton}
          >
            {isRetrying ? (
              <ActivityIndicator size={16} color="#4F46E5" />
            ) : (
              <Text style={styles.downloadRetryText}>Retry</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get("window").height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  storageSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  storageBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  storageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  storageLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  storageValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  storageBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginVertical: 8,
    overflow: "hidden",
  },
  storageBarFill: {
    height: "100%",
  },
  storageSmall: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  downloadsSection: {
    marginBottom: 20,
  },
  errorLabel: {
    color: "#EF4444",
  },
  successLabel: {
    color: "#10B981",
  },
  downloadItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  downloadHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  downloadSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  downloadPercent: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  downloadProgressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  downloadProgressBarFill: {
    height: "100%",
  },
  downloadActionButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  downloadActionText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  downloadErrorContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  downloadErrorText: {
    flex: 1,
    fontSize: 12,
    color: "#EF4444",
  },
  downloadRetryButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  downloadRetryText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "600",
  },
  cancelAllButton: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  clearButton: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
});
