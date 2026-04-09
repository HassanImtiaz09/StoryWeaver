import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Platform,
} from "react-native";
import { Modal } from "react-native";
// BottomSheet replaced with Modal since @react-native-menu/bottom-sheet is not available
const BottomSheet = ({ isVisible, onBackButtonPress, onBackdropPress, children }: { isVisible: boolean; onBackButtonPress?: () => void; onBackdropPress?: () => void; children: React.ReactNode }) => (
  <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onBackButtonPress}>
    <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onBackdropPress}>
      <Pressable>{children}</Pressable>
    </Pressable>
  </Modal>
);

interface ShareOptionsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onShareLink: () => void;
  onShareCard: () => void;
  onPublishGallery: (privacyLevel: "link_only" | "public") => void;
  shareUrl?: string;
  isAlreadyShared?: boolean;
  currentPrivacyLevel?: "private" | "link_only" | "public";
  isPublished?: boolean;
  onUnpublish?: () => void;
}

export const ShareOptionsSheet: React.FC<ShareOptionsSheetProps> = ({
  isVisible,
  onClose,
  onShareLink,
  onShareCard,
  onPublishGallery,
  shareUrl,
  isAlreadyShared = false,
  currentPrivacyLevel = "private",
  isPublished = false,
  onUnpublish,
}) => {
  const [privacyLevel, setPrivacyLevel] = useState<"link_only" | "public">(
    currentPrivacyLevel === "public" ? "public" : "link_only"
  );

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // React Native
        require("react-native").Clipboard.setString(shareUrl);
      }

      Alert.alert("Success", "Share link copied to clipboard!");
      onShareLink();
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;

    try {
      await Share.share({
        message: "Check out this amazing story created with StoryWeaver!",
        url: shareUrl,
        title: "Share Story",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handlePublishGallery = () => {
    onPublishGallery(privacyLevel);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <BottomSheet isVisible={isVisible} onBackButtonPress={onClose} onBackdropPress={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share Your Story</Text>
          <Text style={styles.headerSubtitle}>
            {isPublished
              ? `Published as ${currentPrivacyLevel}`
              : "Choose how to share"}
          </Text>
        </View>

        {/* Sharing Options */}
        <View style={styles.optionsContainer}>
          {/* Copy Link */}
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={handleCopyLink}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.iconText}>🔗</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Copy Link</Text>
              <Text style={styles.optionDescription}>
                Copy shareable URL to clipboard
              </Text>
            </View>
          </Pressable>

          {/* Share Card */}
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => {
              onShareCard();
              onClose();
            }}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.iconText}>🎨</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Share Card</Text>
              <Text style={styles.optionDescription}>
                Share beautiful card image
              </Text>
            </View>
          </Pressable>

          {/* Native Share */}
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={handleNativeShare}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.iconText}>📱</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Share to Social</Text>
              <Text style={styles.optionDescription}>
                Share via social media apps
              </Text>
            </View>
          </Pressable>

          {/* Privacy Divider */}
          <View style={styles.divider} />

          {/* Privacy Settings */}
          <View style={styles.privacySection}>
            <Text style={styles.privacyTitle}>Who can see this?</Text>

            {/* Link Only Option */}
            <Pressable
              style={[
                styles.privacyOption,
                privacyLevel === "link_only" && styles.privacyOptionActive,
              ]}
              onPress={() => setPrivacyLevel("link_only")}
            >
              <View style={styles.privacyRadio}>
                {privacyLevel === "link_only" && (
                  <View style={styles.privacyRadioInner} />
                )}
              </View>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyOptionTitle}>Anyone with link</Text>
                <Text style={styles.privacyOptionDesc}>
                  Only people with the direct link can view
                </Text>
              </View>
            </Pressable>

            {/* Public Option */}
            <Pressable
              style={[
                styles.privacyOption,
                privacyLevel === "public" && styles.privacyOptionActive,
              ]}
              onPress={() => setPrivacyLevel("public")}
            >
              <View style={styles.privacyRadio}>
                {privacyLevel === "public" && (
                  <View style={styles.privacyRadioInner} />
                )}
              </View>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyOptionTitle}>Public Gallery</Text>
                <Text style={styles.privacyOptionDesc}>
                  Featured in our community gallery
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isPublished && onUnpublish ? (
            <>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  onUnpublish();
                  onClose();
                }}
              >
                <Text style={styles.buttonTextSecondary}>Unpublish</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={handlePublishGallery}
              >
                <Text style={styles.buttonText}>Update Privacy</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={onClose}
              >
                <Text style={styles.buttonTextSecondary}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={handlePublishGallery}
              >
                <Text style={styles.buttonText}>Publish to Gallery</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  optionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  optionPressed: {
    backgroundColor: "#F3F4F6",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  privacySection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 6,
  },
  privacyOptionActive: {
    backgroundColor: "#EEF2FF",
  },
  privacyRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  privacyRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6366F1",
  },
  privacyContent: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  privacyOptionDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#6366F1",
  },
  buttonSecondary: {
    backgroundColor: "#E5E7EB",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
});
