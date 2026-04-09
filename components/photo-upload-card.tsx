import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface PhotoUploadCardProps {
  onPhotoSelected: (uri: string, base64: string) => Promise<void>;
  isLoading?: boolean;
  photoUri?: string;
}

export function PhotoUploadCard({
  onPhotoSelected,
  isLoading = false,
  photoUri,
}: PhotoUploadCardProps) {
  const colors = useColors();
  const [localPhotoUri, setLocalPhotoUri] = useState(photoUri);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera permission is required to take a photo");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: true,
        aspect: [1, 1],
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64 || "";

        setIsProcessing(true);
        setLocalPhotoUri(asset.uri);

        try {
          await onPhotoSelected(asset.uri, base64);
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to capture photo");
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Photo library permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: true,
        aspect: [1, 1],
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64 || "";

        setIsProcessing(true);
        setLocalPhotoUri(asset.uri);

        try {
          await onPhotoSelected(asset.uri, base64);
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to select photo");
    }
  };

  const clearPhoto = () => {
    setLocalPhotoUri(undefined);
  };

  const isLoaded = isLoading || isProcessing;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {!localPhotoUri ? (
        <>
          <View style={styles.uploadArea}>
            <Ionicons name="camera" size={48} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Upload a Photo
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Take a photo or choose from your gallery
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={pickImageFromCamera}
              disabled={isLoaded}
              style={({ pressed }) => [
                styles.button,
                styles.cameraButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || isLoaded ? 0.7 : 1,
                },
              ]}
            >
              {isLoaded ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Take Photo</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={pickImageFromGallery}
              disabled={isLoaded}
              style={({ pressed }) => [
                styles.button,
                styles.galleryButton,
                {
                  borderColor: colors.primary,
                  opacity: pressed || isLoaded ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={[styles.galleryButtonText, { color: colors.primary }]}>
                Choose Photo
              </Text>
            </Pressable>
          </View>

          <View style={styles.guidelineContainer}>
            <Ionicons name="information-circle" size={16} color={colors.muted} />
            <Text style={[styles.guideline, { color: colors.muted }]}>
              Face-centered photo works best for character creation
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.previewContainer}>
            <Image source={{ uri: localPhotoUri }} style={styles.previewImage} />
            <View style={[styles.cropGuide, { borderColor: colors.primary }]} />
          </View>

          <Text style={[styles.previewLabel, { color: colors.foreground }]}>
            Preview
          </Text>

          <View style={styles.actionButtonContainer}>
            <Pressable
              onPress={clearPhoto}
              disabled={isLoaded}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  borderColor: colors.border,
                  opacity: pressed || isLoaded ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="refresh" size={18} color={colors.foreground} />
              <Text style={[styles.actionButtonText, { color: colors.foreground }]}>
                Retake
              </Text>
            </Pressable>

            <Pressable
              onPress={pickImageFromGallery}
              disabled={isLoaded}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  borderColor: colors.border,
                  opacity: pressed || isLoaded ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.foreground} />
              <Text style={[styles.actionButtonText, { color: colors.foreground }]}>
                Change
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 12,
  },
  uploadArea: {
    alignItems: "center",
    paddingVertical: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cameraButton: {
    // Primary button
  },
  galleryButton: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  guidelineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  guideline: {
    fontSize: 12,
    flex: 1,
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  cropGuide: {
    position: "absolute",
    width: 180,
    height: 180,
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: "dashed",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  actionButtonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
