import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useParentToolsStore } from "@/lib/parent-tools-store";
import { CustomElementForm } from "@/components/custom-element-form";
import { CustomElementCard } from "@/components/custom-element-card";
import { ApprovalCard } from "@/components/approval-card";
import { StoryPreferencesPanel } from "@/components/story-preferences-panel";
import type { CustomElement } from "@/lib/parent-tools-store";

type TabType = "elements" | "approvals" | "voice";

export default function ParentToolsScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ childId: string; childName: string }>();

  const [activeTab, setActiveTab] = useState<TabType>("elements");
  const [showElementForm, setShowElementForm] = useState(false);
  const [editingElement, setEditingElement] = useState<CustomElement | null>(
    null
  );

  const childId = parseInt(params?.childId || "0", 10);

  const customElements = useParentToolsStore(
    (state) => state.customElements.get(childId) || []
  );
  const approvalQueue = useParentToolsStore((state) => state.approvalQueue);
  const voiceRecordings = useParentToolsStore(
    (state) => state.voiceRecordings.get(childId) || []
  );

  const fetchCustomElements = useParentToolsStore(
    (state) => state.fetchCustomElements
  );
  const fetchPendingApprovals = useParentToolsStore(
    (state) => state.fetchPendingApprovals
  );
  const fetchVoiceRecordings = useParentToolsStore(
    (state) => state.fetchVoiceRecordings
  );

  const isLoading = useParentToolsStore((state) => state.isLoading);
  const error = useParentToolsStore((state) => state.error);
  const clearError = useParentToolsStore((state) => state.clearError);

  useEffect(() => {
    if (!childId) return;
    fetchCustomElements(childId);
    fetchVoiceRecordings(childId);
  }, [childId]);

  useEffect(() => {
    if (activeTab === "approvals") {
      fetchPendingApprovals();
    }
  }, [activeTab]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
      clearError();
    }
  }, [error]);

  const handleEditElement = (element: CustomElement) => {
    setEditingElement(element);
    setShowElementForm(true);
  };

  const handleFormClose = () => {
    setShowElementForm(false);
    setEditingElement(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
  };

  const pendingApprovalsForChild = approvalQueue.filter(
    (item) => item.childId === childId && item.status === "pending"
  );

  const renderContent = () => {
    switch (activeTab) {
      case "elements":
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Custom Elements Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Custom Story Elements
                </Text>
                <Pressable
                  onPress={() => {
                    setEditingElement(null);
                    setShowElementForm(true);
                  }}
                  style={({ pressed }) => [
                    styles.addElementBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Create characters, locations, morals, pets, and objects that
                will appear in your child's AI-generated stories
              </Text>

              {isLoading && customElements.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : customElements.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.emptyEmoji}>✨</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No custom elements yet
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Create your first character, location, or other element
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={customElements}
                  renderItem={({ item }) => (
                    <CustomElementCard
                      element={item}
                      onEdit={handleEditElement}
                      onDelete={() => {
                        // Refresh list
                        fetchCustomElements(childId);
                      }}
                    />
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>
        );

      case "approvals":
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Episode Approval Queue
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Review AI-generated episodes before your child reads them
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : pendingApprovalsForChild.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.emptyEmoji}>✅</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    All caught up!
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    No episodes pending review. New episodes will appear here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={pendingApprovalsForChild}
                  renderItem={({ item }) => (
                    <ApprovalCard
                      item={item}
                      childName={params?.childName}
                      episodeTitle={`Episode ${item.episodeId}`}
                      onReview={() => {
                        fetchPendingApprovals();
                      }}
                    />
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>
        );

      case "voice":
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Parent Voice Recordings
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Record your own voice to narrate your child's stories
              </Text>

              <View
                style={[
                  styles.comingSoonBox,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={styles.comingSoonEmoji}>🎤</Text>
                <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>
                  Coming Soon
                </Text>
                <Text style={[styles.comingSoonText, { color: colors.muted }]}>
                  Voice recording features will be available soon. You'll be able
                  to record and clone your voice for narration.
                </Text>
              </View>

              {voiceRecordings.length > 0 && (
                <View style={styles.recordingsList}>
                  <Text
                    style={[styles.recordingsTitle, { color: colors.foreground }]}
                  >
                    Your Recordings
                  </Text>
                  {voiceRecordings.map((recording) => (
                    <View
                      key={recording.id}
                      style={[
                        styles.recordingCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.recordingInfo}>
                        <Ionicons
                          name="mic-circle"
                          size={24}
                          color={colors.primary}
                        />
                        <View style={styles.recordingText}>
                          <Text
                            style={[
                              styles.recordingName,
                              { color: colors.foreground },
                            ]}
                          >
                            {recording.voiceName}
                          </Text>
                          <Text
                            style={[
                              styles.recordingStatus,
                              { color: colors.muted },
                            ]}
                          >
                            Status: {recording.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Parent Tools
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {params?.childName}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab("elements")}
          style={({ pressed }) => [
            styles.tab,
            activeTab === "elements" && {
              borderBottomWidth: 2,
              borderBottomColor: colors.primary,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons
            name="sparkles"
            size={18}
            color={activeTab === "elements" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "elements" ? colors.primary : colors.muted,
              },
            ]}
          >
            Elements
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("approvals")}
          style={({ pressed }) => [
            styles.tab,
            activeTab === "approvals" && {
              borderBottomWidth: 2,
              borderBottomColor: colors.primary,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={activeTab === "approvals" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "approvals" ? colors.primary : colors.muted,
              },
            ]}
          >
            Approvals
            {pendingApprovalsForChild.length > 0 && (
              <Text
                style={[
                  styles.badge,
                  { backgroundColor: colors.primary, color: "#FFFFFF" },
                ]}
              >
                {" "}
                {pendingApprovalsForChild.length}
              </Text>
            )}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("voice")}
          style={({ pressed }) => [
            styles.tab,
            activeTab === "voice" && {
              borderBottomWidth: 2,
              borderBottomColor: colors.primary,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons
            name="mic"
            size={18}
            color={activeTab === "voice" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "voice" ? colors.primary : colors.muted,
              },
            ]}
          >
            Voice
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Element Form Modal */}
      <Modal visible={showElementForm} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={handleFormClose}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons
                name="chevron-down"
                size={28}
                color={colors.foreground}
              />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingElement ? "Edit" : "Create"} Element
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <CustomElementForm
            childId={childId}
            element={editingElement || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  addElementBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  comingSoonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  comingSoonText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  recordingsList: {
    marginTop: 20,
  },
  recordingsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  recordingCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recordingText: {
    flex: 1,
  },
  recordingName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  recordingStatus: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSpacer: {
    width: 44,
  },
});
