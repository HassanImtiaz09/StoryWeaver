import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { trpc } from "@/lib/trpc";
import { useSharingStore } from "@/lib/sharing-store";
import { useColors } from "@/hooks/use-colors";
import { ShareCard } from "@/components/share-card";
import { ShareButton } from "@/components/share-button";
import { ShareOptionsSheet } from "@/components/share-options-sheet";

interface RouteParams {
  arcId: number;
}

export default function StoryShareScreen() {
  const route = useRoute();
  const { arcId } = route.params as RouteParams;
  const colors = useColors();

  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<"private" | "link_only" | "public">("link_only");

  const { getSharedStory, setSharedStory } = useSharingStore();

  // API queries
  const getShareCardQuery = trpc.sharing.generateShareCard.useQuery({ arcId });
  const getAnalyticsQuery = trpc.sharing.getShareAnalytics.useQuery({ arcId });
  const getMyStoriesQuery = trpc.sharing.getMySharedStories.useQuery();

  // Mutations
  const createShareLinkMutation = trpc.sharing.createShareLink.useMutation();
  const publishGalleryMutation = trpc.sharing.publishToGallery.useMutation();
  const unpublishGalleryMutation = trpc.sharing.unpublishFromGallery.useMutation();

  const shareCard = getShareCardQuery.data;
  const analytics = getAnalyticsQuery.data;
  const isLoading = getShareCardQuery.isLoading || getAnalyticsQuery.isLoading;

  useEffect(() => {
    if (analytics) {
      setIsPublished(analytics.isPublished);
      setPrivacyLevel((analytics.privacyLevel as any) || "link_only");
    }
  }, [analytics]);

  const handleCreateShareLink = async () => {
    try {
      await createShareLinkMutation.mutateAsync({
        arcId,
        privacyLevel: "link_only",
      });
      Alert.alert("Success", "Share link created!");
    } catch (error) {
      Alert.alert("Error", "Failed to create share link");
    }
  };

  const handlePublishToGallery = async (level: "link_only" | "public") => {
    try {
      await publishGalleryMutation.mutateAsync({
        arcId,
        privacyLevel: level,
      });
      setIsPublished(true);
      setPrivacyLevel(level);
      setShowShareOptions(false);
      Alert.alert("Success", "Story published to gallery!");
      getAnalyticsQuery.refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to publish to gallery");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishGalleryMutation.mutateAsync({ arcId });
      setIsPublished(false);
      Alert.alert("Success", "Story removed from gallery");
      getAnalyticsQuery.refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to unpublish story");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading sharing options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Share Your Story</Text>
          <Text style={styles.subtitle}>
            {isPublished ? "Your story is published!" : "Make your story shareable"}
          </Text>
        </View>

        {/* Share Card Preview */}
        {shareCard && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Story Preview</Text>
            <ShareCard
              title={shareCard.title}
              childName={shareCard.childName}
              childAge={shareCard.childAge}
              theme={shareCard.theme}
              themeIcon={shareCard.themeIcon}
              coverImageUrl={shareCard.coverImageUrl}
              firstLinePreview={shareCard.firstLinePreview}
              pageCount={shareCard.pageCount}
              readingTimeMinutes={shareCard.readingTimeMinutes}
              cardSize="large"
              style={styles.card}
            />
          </View>
        )}

        {/* Analytics */}
        {analytics && (
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionTitle}>Story Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>👁️</Text>
                <Text style={styles.statNumber}>{analytics.viewCount}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>❤️</Text>
                <Text style={styles.statNumber}>{analytics.likeCount}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📤</Text>
                <Text style={styles.statNumber}>{analytics.shareCount}</Text>
                <Text style={styles.statLabel}>Shares</Text>
              </View>
            </View>
          </View>
        )}

        {/* Privacy Settings */}
        <View style={styles.privacySection}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>

          <View style={styles.privacyCard}>
            <View style={styles.privacyRow}>
              <View>
                <Text style={styles.privacyLabel}>Gallery Status</Text>
                <Text style={styles.privacyValue}>
                  {isPublished ? `Published (${privacyLevel})` : "Not published"}
                </Text>
              </View>
              <Switch
                value={isPublished}
                onValueChange={(value) => {
                  if (value) {
                    setShowShareOptions(true);
                  } else {
                    handleUnpublish();
                  }
                }}
                trackColor={{ false: "#D1D5DB", true: "#A5F3FC" }}
                thumbColor={isPublished ? "#6366F1" : "#9CA3AF"}
              />
            </View>

            {isPublished && (
              <View style={styles.privacyDescription}>
                <Text style={styles.privacyText}>
                  {privacyLevel === "public"
                    ? "Your story is visible in our public gallery"
                    : "Only people with the link can view your story"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Share Options */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Share Options</Text>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleCreateShareLink}
          >
            <Text style={styles.actionButtonIcon}>🔗</Text>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>Create Share Link</Text>
              <Text style={styles.actionButtonDesc}>Generate unique link</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => setShowShareOptions(true)}
          >
            <Text style={styles.actionButtonIcon}>📤</Text>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>
                {isPublished ? "Update Gallery Settings" : "Publish to Gallery"}
              </Text>
              <Text style={styles.actionButtonDesc}>
                {isPublished
                  ? "Change privacy settings"
                  : "Share with community"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Share History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Share History</Text>
          <Text style={styles.historyPlaceholder}>
            Shares will appear here as you share your story
          </Text>
        </View>
      </ScrollView>

      {/* Share Options Sheet */}
      <ShareOptionsSheet
        isVisible={showShareOptions}
        onClose={() => setShowShareOptions(false)}
        onShareLink={() => {}}
        onShareCard={() => {}}
        onPublishGallery={handlePublishToGallery}
        shareUrl={analytics?.shareUrl}
        isAlreadyShared={!!analytics}
        currentPrivacyLevel={privacyLevel}
        isPublished={isPublished}
        onUnpublish={handleUnpublish}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  cardSection: {
    marginBottom: 24,
  },
  card: {
    marginTop: 8,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacyCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  privacyValue: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  privacyDescription: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  privacyText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  actionSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonPressed: {
    backgroundColor: "#F3F4F6",
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  actionButtonDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  historySection: {
    marginBottom: 24,
  },
  historyPlaceholder: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
});
