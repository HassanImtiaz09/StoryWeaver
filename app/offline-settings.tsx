/**
 * Offline Settings Screen
 *
 * Configure offline mode preferences, storage quota, and cache behavior.
 */

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Slider,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings-store";
import { useOfflineStore } from "@/lib/offline-store";
import { createOfflineManager } from "@/lib/offline-manager";
import { BreadcrumbHeader } from "@/components/breadcrumb-header";

export default function OfflineSettingsScreen() {
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    offlineModeEnabled: true,
    autoDownloadOnWifi: true,
    preloadNextEpisode: true,
    wifiOnlyDownload: true,
    downloadQuality: "medium",
    autoPruneDays: 30,
    offlineStorageQuota: 500,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ usedMB: 0, quotaMB: 500 });

  const store = useOfflineStore();
  const breakdown = store.getStorageBreakdown();

  useEffect(() => {
    loadSettings();
    updateStorageUsage();
  }, [breakdown.used, breakdown.quota]);

  const loadSettings = async () => {
    try {
      const current = await getSettings();
      setSettings((prev) => ({
        ...prev,
        offlineModeEnabled: current.bedtimeModeEnabled !== undefined ? true : undefined,
        autoDownloadOnWifi: true,
        preloadNextEpisode: true,
        wifiOnlyDownload: true,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const updateStorageUsage = () => {
    const usedMB = Math.round(breakdown.used / (1024 * 1024));
    const quotaMB = Math.round(breakdown.quota / (1024 * 1024));
    setStorageUsage({ usedMB, quotaMB });
  };

  const handleSettingChange = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    // Save to AsyncStorage
    setIsSaving(true);
    try {
      await saveSettings(updated as any);
    } catch (error) {
      console.error("Failed to save settings:", error);
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllData = async () => {
    Alert.alert(
      "Clear All Offline Data",
      "Delete all downloaded stories? This will free up space but you won't be able to read them offline.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          onPress: async () => {
            try {
              await store.clearAllOfflineData();
              Alert.alert("Success", "All offline data has been cleared");
            } catch (error) {
              Alert.alert("Error", "Failed to clear offline data");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleAutoPrune = async () => {
    try {
      const days = settings.autoPruneDays as number || 30;
      const pruned = await store.pruneOldStories(days);
      Alert.alert(
        "Auto-Prune Complete",
        `Removed ${pruned} stories not accessed in ${days} days`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to prune old stories");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const quotaMB = Math.round((settings.offlineStorageQuota as number) || 500);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Breadcrumb Header */}
      <BreadcrumbHeader
        title="Offline & Storage"
        crumbs={[
          { label: "Home", route: "/(tabs)" },
          { label: "Settings", route: "/settings" },
          { label: "Offline" },
        ]}
      />

      {/* Storage Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>

        <View style={styles.storageBox}>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Used</Text>
            <Text style={styles.storageValue}>{storageUsage.usedMB} MB</Text>
          </View>
          <View style={styles.storageBar}>
            <View
              style={[
                styles.storageBarFill,
                {
                  width: `${(storageUsage.usedMB / storageUsage.quotaMB) * 100}%`,
                  backgroundColor:
                    (storageUsage.usedMB / storageUsage.quotaMB) > 0.9 ? "#EF4444" :
                    (storageUsage.usedMB / storageUsage.quotaMB) > 0.7 ? "#F59E0B" :
                    "#10B981",
                },
              ]}
            />
          </View>
          <View style={styles.storageRow}>
            <Text style={styles.storageSmall}>
              {Math.round((storageUsage.usedMB / storageUsage.quotaMB) * 100)}% of{" "}
              {storageUsage.quotaMB} MB
            </Text>
            <Text style={styles.storageSmall}>
              {storageUsage.quotaMB - storageUsage.usedMB} MB available
            </Text>
          </View>
        </View>
      </View>

      {/* Storage Quota */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Storage Quota</Text>
          <Text style={styles.sectionValue}>{quotaMB} MB</Text>
        </View>

        <Slider
          style={styles.slider}
          minimumValue={100}
          maximumValue={2000}
          step={100}
          value={quotaMB}
          onValueChange={(value) => handleSettingChange("offlineStorageQuota", value)}
          minimumTrackTintColor="#4F46E5"
          maximumTrackTintColor="#E5E7EB"
        />

        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>100 MB</Text>
          <Text style={styles.sliderLabel}>2 GB</Text>
        </View>

        <Text style={styles.helperText}>
          Set the maximum amount of device storage to use for offline content
        </Text>
      </View>

      {/* Download Quality */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Download Quality</Text>

        <View style={styles.qualityOptions}>
          {(["high", "medium", "low"] as const).map((quality) => (
            <TouchableOpacity
              key={quality}
              onPress={() => handleSettingChange("downloadQuality", quality)}
              style={[
                styles.qualityButton,
                settings.downloadQuality === quality && styles.qualityButtonActive,
              ]}
            >
              <Ionicons
                name={
                  settings.downloadQuality === quality
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={
                  settings.downloadQuality === quality ? "#4F46E5" : "#D1D5DB"
                }
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    styles.qualityLabel,
                    settings.downloadQuality === quality &&
                      styles.qualityLabelActive,
                  ]}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Text>
                <Text style={styles.qualityDescription}>
                  {quality === "high"
                    ? "High resolution, larger files"
                    : quality === "medium"
                    ? "Balanced quality and size"
                    : "Low resolution, smaller files"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Auto-Download Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto-Download</Text>

        <SettingSwitch
          label="Auto-download on WiFi"
          value={settings.autoDownloadOnWifi as boolean}
          onValueChange={(value) => handleSettingChange("autoDownloadOnWifi", value)}
          description="Automatically download new episodes when connected to WiFi"
        />

        <SettingSwitch
          label="Pre-load next episode"
          value={settings.preloadNextEpisode as boolean}
          onValueChange={(value) => handleSettingChange("preloadNextEpisode", value)}
          description="Intelligently pre-download the next episode you're likely to read"
        />

        <SettingSwitch
          label="WiFi only"
          value={settings.wifiOnlyDownload as boolean}
          onValueChange={(value) => handleSettingChange("wifiOnlyDownload", value)}
          description="Only download content over WiFi, not cellular"
        />
      </View>

      {/* Cache Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Management</Text>

        <View style={styles.cacheOption}>
          <View>
            <Text style={styles.cacheLabel}>Auto-prune stories</Text>
            <Text style={styles.cacheDescription}>
              Remove stories not read in {settings.autoPruneDays} days
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              handleSettingChange(
                "autoPruneDays",
                Math.min(90, (settings.autoPruneDays as number) + 10)
              )
            }
            style={styles.adjustButton}
          >
            <Ionicons name="add" size={18} color="#4F46E5" />
          </TouchableOpacity>
          <Text style={styles.pruneValue}>{settings.autoPruneDays}d</Text>
          <TouchableOpacity
            onPress={() =>
              handleSettingChange(
                "autoPruneDays",
                Math.max(7, (settings.autoPruneDays as number) - 10)
              )
            }
            style={styles.adjustButton}
          >
            <Ionicons name="remove" size={18} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleAutoPrune}
          style={styles.actionButton}
        >
          <Ionicons name="trash" size={18} color="#4F46E5" />
          <Text style={styles.actionButtonText}>Run Auto-Prune Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleClearAllData}
          style={[styles.actionButton, styles.dangerButton]}
        >
          <Ionicons name="warning" size={18} color="#FFFFFF" />
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
            Clear All Offline Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#4F46E5" />
        <Text style={styles.infoText}>
          Offline content requires internet to download but can be read anytime, anywhere. Perfect
          for flights, road trips, and areas with poor connectivity.
        </Text>
      </View>

      {isSaving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </ScrollView>
  );
}

interface SettingSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
}

function SettingSwitch({
  label,
  value,
  onValueChange,
  description,
}: SettingSwitchProps) {
  return (
    <View style={styles.switchContainer}>
      <View style={{ flex: 1 }}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && (
          <Text style={styles.switchDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E5E7EB", true: "#D1D5F1" }}
        thumbColor={value ? "#4F46E5" : "#F3F4F6"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
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
  slider: {
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  qualityOptions: {
    gap: 12,
  },
  qualityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  qualityButtonActive: {
    backgroundColor: "#EFF6FF",
  },
  qualityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  qualityLabelActive: {
    color: "#4F46E5",
  },
  qualityDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  switchDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  cacheOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cacheLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  cacheDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  adjustButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  pruneValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginTop: 12,
    gap: 8,
  },
  dangerButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  dangerButtonText: {
    color: "#FFFFFF",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  savingText: {
    fontSize: 12,
    color: "#6B7280",
  },
});
