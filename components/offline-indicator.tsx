/**
 * Offline Indicator Banner
 *
 * Displays at the top of the screen to indicate offline mode is active.
 * Shows sync status when reconnecting.
 */

import React, { useEffect, useState } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineStore } from "@/lib/offline-store";

interface OfflineIndicatorProps {
  onDismiss?: () => void;
  autoHideDelay?: number;
}

export function OfflineIndicator({ onDismiss, autoHideDelay = 5000 }: OfflineIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const store = useOfflineStore();
  const animationValue = React.useRef(new Animated.Value(0)).current;

  const { isOnline, syncStatus } = store;

  useEffect(() => {
    if (!isOnline || syncStatus === "idle") {
      setIsVisible(true);

      Animated.timing(animationValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (isOnline && syncStatus === "idle" && autoHideDelay > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    } else if (isOnline) {
      handleDismiss();
    }
  }, [isOnline, syncStatus]);

  const handleDismiss = () => {
    Animated.timing(animationValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  if (!isVisible) return null;

  const height = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  const opacity = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  let backgroundColor = "#1F2937"; // Default dark gray
  let message = "You're offline";
  let icon = "wifi-off";

  if (!isOnline) {
    backgroundColor = "#7C2D12";
    message = "No internet connection — showing cached stories";
    icon = "wifi-off";
  } else if (syncStatus === "syncing") {
    backgroundColor = "#1E3A8A";
    message = "Syncing...";
    icon = "sync";
  } else if (syncStatus === "error") {
    backgroundColor = "#7C2D12";
    message = "Sync failed — retrying...";
    icon = "alert-circle";
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height,
          opacity,
          backgroundColor,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={icon as any}
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 12 }}
        />

        <Text style={styles.message}>{message}</Text>

        {syncStatus === "syncing" && (
          <View style={styles.loader}>
            <Ionicons name="sync" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>

      {isOnline && syncStatus === "idle" && (
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  loader: {
    marginLeft: 8,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 12,
  },
});
