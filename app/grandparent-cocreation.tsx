import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { useGrandparentStore } from "@/lib/grandparent-store";
import { trpc } from "@/lib/trpc";
import { ScreenContainer } from "@/components/screen-container";
import FamilyInviteCard from "@/components/family-invite-card";
import FamilyMemberCard from "@/components/family-member-card";
import MemoryPromptInput from "@/components/memory-prompt-input";
import GrandparentStoryView from "@/components/grandparent-story-view";
import FamilyArchiveList from "@/components/family-archive-list";

type TabName = "family" | "create" | "memories" | "archive";

export default function GrandparentCoCreationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useColors();
  const { width, height } = useWindowDimensions();
  const {
    familyMembers,
    activeSession,
    memoryPrompts,
    familyArchive,
    inviteCode,
    isGrandparentMode,
    fontSize,
    setGrandparentMode,
    setFontSize,
    setFamilyMembers,
    setActiveSession,
    setMemoryPrompts,
    setFamilyArchive,
    setInviteCode,
    setLoading,
    loading,
  } = useGrandparentStore();

  const [activeTab, setActiveTab] = useState<TabName>("family");
  const [inviteForm, setInviteForm] = useState({
    name: "",
    relationship: "grandparent" as const,
  });

  // tRPC queries
  const familyMembersQuery = trpc.grandparent.getFamilyMembers.useQuery();
  const familyArchiveQuery = trpc.grandparent.getFamilyArchive.useQuery({});

  // tRPC mutations
  const createInviteMutation = trpc.grandparent.createInvite.useMutation({
    onSuccess: (data) => {
      setInviteCode(data.inviteCode);
      Alert.alert("Success", `Invite code created: ${data.inviteCode}`);
      setInviteForm({ name: "", relationship: "grandparent" });
    },
    onError: () => {
      Alert.alert("Error", "Failed to create invite");
    },
  });

  const startSessionMutation = trpc.grandparent.startSession.useMutation({
    onSuccess: (data) => {
      setActiveSession(data);
      setActiveTab("create");
      Alert.alert("Success", "Co-creation session started!");
    },
    onError: () => {
      Alert.alert("Error", "Failed to start session");
    },
  });

  const addMemoryMutation = trpc.grandparent.addMemory.useMutation({
    onSuccess: (data) => {
      setMemoryPrompts([...memoryPrompts, data]);
      Alert.alert("Success", "Memory shared!");
    },
    onError: () => {
      Alert.alert("Error", "Failed to share memory");
    },
  });

  const generateStoryMutation = trpc.grandparent.generateFromMemory.useMutation({
    onSuccess: (data) => {
      Alert.alert("Success", "Story generated from your memory!");
    },
    onError: () => {
      Alert.alert("Error", "Failed to generate story");
    },
  });

  const completeMutation = trpc.grandparent.completeSession.useMutation({
    onSuccess: () => {
      setActiveSession(null);
      setMemoryPrompts([]);
      setActiveTab("archive");
      Alert.alert("Success", "Story archived!");
    },
    onError: () => {
      Alert.alert("Error", "Failed to complete session");
    },
  });

  // Load family members and archive
  useEffect(() => {
    if (familyMembersQuery.data) {
      setFamilyMembers(familyMembersQuery.data);
    }
  }, [familyMembersQuery.data, setFamilyMembers]);

  useEffect(() => {
    if (familyArchiveQuery.data) {
      setFamilyArchive(familyArchiveQuery.data);
    }
  }, [familyArchiveQuery.data, setFamilyArchive]);

  const scaledFontSize = (size: number) => Math.round(size * fontSize);

  const handleCreateInvite = async () => {
    if (!inviteForm.name.trim()) {
      Alert.alert("Error", "Please enter family member name");
      return;
    }

    await createInviteMutation.mutateAsync({
      familyMemberName: inviteForm.name,
      relationship: inviteForm.relationship,
    });
  };

  const handleStartSession = async (familyMemberId: number) => {
    // In a real app, would select child. For demo, using familyMemberId as proxy
    await startSessionMutation.mutateAsync({
      familyMemberId,
      childId: familyMemberId,
    });
  };

  const handleAddMemory = async (memoryText: string, category: any) => {
    if (!activeSession) {
      Alert.alert("Error", "No active session");
      return;
    }

    await addMemoryMutation.mutateAsync({
      sessionId: activeSession.id,
      memoryText,
      category,
    });
  };

  const handleGenerateStory = async (memoryId: number) => {
    if (!activeSession) return;

    await generateStoryMutation.mutateAsync({
      sessionId: activeSession.id,
      memoryPromptId: memoryId,
    });
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;

    Alert.alert(
      "Confirm",
      "Are you ready to finalize this story and add it to the family archive?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Yes, Archive Story",
          onPress: () => completeMutation.mutateAsync({ sessionId: activeSession.id }),
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background,
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.primary,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: scaledFontSize(24),
                fontWeight: "700",
                color: "white",
              }}
            >
              Family Stories
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* Font Size Adjuster */}
              <TouchableOpacity
                onPress={() => setFontSize(fontSize - 0.1)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Text style={{ fontSize: 16, color: "white" }}>A−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFontSize(fontSize + 0.1)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Text style={{ fontSize: 16, color: "white" }}>A+</Text>
              </TouchableOpacity>

              {/* Grandparent Mode Toggle */}
              <TouchableOpacity
                onPress={() => setGrandparentMode(!isGrandparentMode)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: isGrandparentMode
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Text style={{ fontSize: 16, color: "white" }}>👵</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: scaledFontSize(14),
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            Create magical stories together as a family
          </Text>
        </View>

        {/* Tab Navigation */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {[
            { id: "family", label: "My Family", icon: "👨‍👩‍👧" },
            { id: "create", label: "Create", icon: "✨" },
            { id: "memories", label: "Memories", icon: "💭" },
            { id: "archive", label: "Archive", icon: "📚" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as TabName)}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderBottomWidth: activeTab === tab.id ? 3 : 0,
                borderBottomColor: colors.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: scaledFontSize(12),
                  color:
                    activeTab === tab.id ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === tab.id ? "700" : "500",
                }}
              >
                {tab.icon} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={{ flex: 1, overflow: "hidden" }}>
          {/* My Family Tab */}
          {activeTab === "family" && (
            <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator>
              <Text
                style={{
                  fontSize: scaledFontSize(18),
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Invite Family Members
              </Text>

              {/* Invite Form */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                {/* Name Input */}
                <Text
                  style={{
                    fontSize: scaledFontSize(14),
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Family Member Name
                </Text>
                <View
                  style={{
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    paddingHorizontal: 12,
                    marginBottom: 16,
                  }}
                >
                  {/* TextInput would go here - using placeholder text for demo */}
                  <Text
                    style={{
                      fontSize: scaledFontSize(14),
                      color: colors.textSecondary,
                      paddingVertical: 12,
                    }}
                  >
                    [Name input field]
                  </Text>
                </View>

                {/* Relationship Selector */}
                <Text
                  style={{
                    fontSize: scaledFontSize(14),
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Relationship
                </Text>
                <View style={{ gap: 8, marginBottom: 16 }}>
                  {[
                    "grandparent",
                    "aunt_uncle",
                    "cousin",
                    "family_friend",
                    "other",
                  ].map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      onPress={() =>
                        setInviteForm({
                          ...inviteForm,
                          relationship: rel as any,
                        })
                      }
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor:
                          inviteForm.relationship === rel
                            ? colors.primary
                            : colors.background,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: scaledFontSize(13),
                          fontWeight: "500",
                          color:
                            inviteForm.relationship === rel
                              ? "white"
                              : colors.text,
                          textTransform: "capitalize",
                        }}
                      >
                        {rel.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  onPress={handleCreateInvite}
                  disabled={createInviteMutation.isPending}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    opacity: createInviteMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {createInviteMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={{
                        fontSize: scaledFontSize(14),
                        fontWeight: "700",
                        color: "white",
                        textAlign: "center",
                      }}
                    >
                      Create Invite Code
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Invite Code Display */}
              {inviteCode && (
                <FamilyInviteCard
                  inviteCode={inviteCode}
                  familyMemberName={inviteForm.name || "Family Member"}
                  relationship={inviteForm.relationship}
                  status="pending"
                />
              )}

              {/* Family Members List */}
              <Text
                style={{
                  fontSize: scaledFontSize(18),
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 12,
                  marginTop: 24,
                }}
              >
                Connected Family ({familyMembers.length})
              </Text>

              {familyMembers.length === 0 ? (
                <Text
                  style={{
                    fontSize: scaledFontSize(14),
                    color: colors.textSecondary,
                    fontStyle: "italic",
                    textAlign: "center",
                    paddingVertical: 24,
                  }}
                >
                  No family members connected yet. Create an invite to get started!
                </Text>
              ) : (
                familyMembers.map((member) => (
                  <FamilyMemberCard
                    key={member.id}
                    id={member.familyMemberUserId}
                    name={member.familyMemberName}
                    relationship={member.relationship}
                    storiesCoCreated={0}
                    onStartStory={handleStartSession}
                  />
                ))
              )}
            </ScrollView>
          )}

          {/* Create Together Tab */}
          {activeTab === "create" && (
            <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator>
              {activeSession ? (
                <>
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: scaledFontSize(16),
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: 8,
                      }}
                    >
                      Active Session
                    </Text>
                    <Text
                      style={{
                        fontSize: scaledFontSize(13),
                        color: colors.textSecondary,
                      }}
                    >
                      Session ID: {activeSession.id}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: scaledFontSize(18),
                      fontWeight: "700",
                      color: colors.text,
                      marginBottom: 12,
                    }}
                  >
                    Share Your Memory
                  </Text>
                  <View style={{ marginBottom: 24 }}>
                    <MemoryPromptInput
                      onSubmit={handleAddMemory}
                      isLoading={addMemoryMutation.isPending}
                    />
                  </View>

                  {/* Shared Memories */}
                  {memoryPrompts.length > 0 && (
                    <>
                      <Text
                        style={{
                          fontSize: scaledFontSize(18),
                          fontWeight: "700",
                          color: colors.text,
                          marginBottom: 12,
                          marginTop: 12,
                        }}
                      >
                        Your Memories ({memoryPrompts.length})
                      </Text>
                      {memoryPrompts.map((prompt) => (
                        <View
                          key={prompt.id}
                          style={{
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 12,
                            borderLeftWidth: 4,
                            borderLeftColor: colors.primary,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: scaledFontSize(12),
                              color: colors.textSecondary,
                              marginBottom: 4,
                              textTransform: "uppercase",
                              fontWeight: "600",
                            }}
                          >
                            {prompt.category.replace("_", " ")}
                          </Text>
                          <Text
                            style={{
                              fontSize: scaledFontSize(14),
                              color: colors.text,
                              marginBottom: 10,
                              lineHeight: scaledFontSize(21),
                            }}
                          >
                            {prompt.memoryText}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleGenerateStory(prompt.id)}
                            disabled={generateStoryMutation.isPending}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 6,
                              backgroundColor: colors.secondary,
                              opacity: generateStoryMutation.isPending ? 0.6 : 1,
                            }}
                          >
                            {generateStoryMutation.isPending ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Text
                                style={{
                                  fontSize: scaledFontSize(12),
                                  fontWeight: "600",
                                  color: "white",
                                  textAlign: "center",
                                }}
                              >
                                ✨ Generate Story
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Complete Session */}
                  <TouchableOpacity
                    onPress={handleCompleteSession}
                    disabled={completeMutation.isPending || memoryPrompts.length === 0}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: colors.success,
                      marginTop: 16,
                      marginBottom: 32,
                      opacity:
                        completeMutation.isPending || memoryPrompts.length === 0
                          ? 0.6
                          : 1,
                    }}
                  >
                    {completeMutation.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text
                        style={{
                          fontSize: scaledFontSize(16),
                          fontWeight: "700",
                          color: "white",
                          textAlign: "center",
                        }}
                      >
                        Finalize & Archive Story
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 32,
                  }}
                >
                  <Text
                    style={{
                      fontSize: scaledFontSize(18),
                      fontWeight: "600",
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    No Active Session
                  </Text>
                  <Text
                    style={{
                      fontSize: scaledFontSize(14),
                      color: colors.textSecondary,
                      textAlign: "center",
                      marginTop: 8,
                      fontStyle: "italic",
                    }}
                  >
                    Start a session with a family member to begin co-creating!
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Memories Tab */}
          {activeTab === "memories" && (
            <View style={{ flex: 1 }}>
              {memoryPrompts.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 32,
                  }}
                >
                  <Text
                    style={{
                      fontSize: scaledFontSize(18),
                      fontWeight: "600",
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    Memory Garden
                  </Text>
                  <Text
                    style={{
                      fontSize: scaledFontSize(14),
                      color: colors.textSecondary,
                      textAlign: "center",
                      marginTop: 8,
                      fontStyle: "italic",
                    }}
                  >
                    Your shared memories will appear here
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator>
                  {memoryPrompts.map((prompt) => (
                    <View
                      key={prompt.id}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: scaledFontSize(13),
                          color: colors.textSecondary,
                          marginBottom: 8,
                          textTransform: "uppercase",
                          fontWeight: "700",
                        }}
                      >
                        {prompt.category.replace("_", " ")}
                      </Text>
                      <Text
                        style={{
                          fontSize: scaledFontSize(16),
                          color: colors.text,
                          lineHeight: scaledFontSize(24),
                        }}
                      >
                        {prompt.memoryText}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Archive Tab */}
          {activeTab === "archive" && (
            <View style={{ flex: 1 }}>
              <FamilyArchiveList
                stories={familyArchive}
                isLoading={familyArchiveQuery.isLoading}
              />
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
