/**
 * Collaborative Story Screen
 * Main orchestrator for the Family Mode storytelling experience
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCollaborativeStore, loadSavedCollaborativeSession } from "../lib/collaborative-store";
import { trpc } from "../lib/trpc";
import { SessionLobby } from "../components/session-lobby";
import { TurnInput } from "../components/turn-input";
import { CollaborativeStoryView } from "../components/collaborative-story-view";
import { TurnIndicator } from "../components/turn-indicator";
import { SessionComplete } from "../components/session-complete";

type ScreenState = "lobby" | "story" | "complete";

interface CollaborativeStoryScreenProps {
  onNavigateHome?: () => void;
  onNavigatePrintBook?: (storyId: number) => void;
}

export const CollaborativeStoryScreen: React.FC<CollaborativeStoryScreenProps> = ({
  onNavigateHome,
  onNavigatePrintBook,
}) => {
  const [screenState, setScreenState] = useState<ScreenState>("lobby");
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const session = useCollaborativeStore((state) => state.activeSession);
  const isHost = useCollaborativeStore((state) => state.getIsHost());
  const updateSessionState = useCollaborativeStore((state) => state.updateSessionState);
  const loadSession = useCollaborativeStore((state) => state.loadSession);
  const leaveSession = useCollaborativeStore((state) => state.leaveSession);
  const submitTurn = useCollaborativeStore((state) => state.submitTurn);
  const getIsHost = useCollaborativeStore((state) => state.getIsHost);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      const saved = await loadSavedCollaborativeSession();
      if (saved) {
        try {
          await loadSession(saved.sessionId);
        } catch (error) {
          console.error("Failed to load saved session:", error);
        }
      }
    };

    initializeSession();
  }, []);

  // Update screen state based on session status
  useEffect(() => {
    if (!session) return;

    if (session.status === "completed") {
      setScreenState("complete");
    } else if (session.status === "active") {
      setScreenState("story");
    } else {
      setScreenState("lobby");
    }
  }, [session?.status]);

  // Setup polling for real-time updates
  useEffect(() => {
    if (!session) return;

    const startPolling = () => {
      const interval = setInterval(async () => {
        try {
          await loadSession(session.id);
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 2000); // Poll every 2 seconds

      setSyncInterval(interval);
    };

    startPolling();

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [session?.id]);

  const startSessionMutation = trpc.collaborative.startSession.useMutation();

  const handleStartSession = async () => {
    if (!isHost || !session) return;

    try {
      setIsLoading(true);
      const updatedSession = await startSessionMutation.mutateAsync({
        sessionId: session.id,
      });
      useCollaborativeStore.setState({ activeSession: updatedSession });
    } catch (error) {
      Alert.alert("Error", "Failed to start session");
    } finally {
      setIsLoading(false);
    }
  };

  const submitTurnMutation = trpc.collaborative.submitTurn.useMutation();
  const advanceTurnMutation = trpc.collaborative.advanceTurn.useMutation();

  const handleSubmitTurn = useCallback(
    async (input: string) => {
      try {
        setIsLoading(true);
        await submitTurnMutation.mutateAsync({ sessionId: session?.id || 0, input });

        // Automatically advance turn after submission
        if (session) {
          const updatedSession = await advanceTurnMutation.mutateAsync({
            sessionId: session.id,
          });
          useCollaborativeStore.setState({ activeSession: updatedSession });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [session?.id, submitTurnMutation, advanceTurnMutation]
  );

  const skipTurnMutation = trpc.collaborative.skipTurn.useMutation();

  const handleSkipTurn = async () => {
    if (!session || !isHost) return;

    try {
      const updatedSession = await skipTurnMutation.mutateAsync({
        sessionId: session.id,
      });
      useCollaborativeStore.setState({ activeSession: updatedSession });
    } catch (error) {
      Alert.alert("Error", "Failed to skip turn");
    }
  };

  const saveStoryMutation = trpc.collaborative.saveStory.useMutation();

  const handleSaveToLibrary = async () => {
    if (!session) return;

    try {
      const result = await saveStoryMutation.mutateAsync({
        sessionId: session.id,
      });
      Alert.alert("Success!", "Story saved to your library");
      return result;
    } catch (error) {
      Alert.alert("Error", "Failed to save story");
      throw error;
    }
  };

  const handlePlayAgain = async () => {
    if (!isHost || !session) return;

    try {
      setIsLoading(true);
      await leaveSession();
      useCollaborativeStore.setState({ activeSession: null });
      setScreenState("lobby");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveSession = () => {
    Alert.alert("Leave Session", "Are you sure? This will end the session for everyone.", [
      { text: "Cancel" },
      {
        text: "Leave",
        onPress: async () => {
          try {
            await leaveSession();
            onNavigateHome?.();
          } catch (error) {
            Alert.alert("Error", "Failed to leave session");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const endSessionMutation = trpc.collaborative.endSession.useMutation();

  const handleEndSession = async () => {
    if (!isHost || !session) return;

    try {
      const updatedSession = await endSessionMutation.mutateAsync({
        sessionId: session.id,
      });
      useCollaborativeStore.setState({ activeSession: updatedSession });
      setScreenState("complete");
    } catch (error) {
      Alert.alert("Error", "Failed to end session");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeaveSession}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Family Story Session</Text>
          <View style={styles.spacer} />
        </View>

        {/* Screen Content */}
        {screenState === "lobby" && (
          <SessionLobby onStartSession={handleStartSession} onCancel={handleLeaveSession} />
        )}

        {screenState === "story" && (
          <View style={styles.storyContainer}>
            <CollaborativeStoryView />
            <TurnIndicator onSkipTurn={isHost ? handleSkipTurn : undefined} />
            <TurnInput onSubmitTurn={handleSubmitTurn} disabled={isLoading} />

            {/* End Session Button (Host) */}
            {isHost && (
              <View style={styles.endSessionButton}>
                <TouchableOpacity
                  style={styles.endButton}
                  onPress={handleEndSession}
                >
                  <Text style={styles.endButtonText}>End Story Session</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {screenState === "complete" && (
          <SessionComplete
            onPlayAgain={isHost ? handlePlayAgain : undefined}
            onSaveToLibrary={handleSaveToLibrary}
            onPrintAsBook={() => {
              if (session && onNavigatePrintBook) {
                onNavigatePrintBook(session.id);
              }
            }}
            onClose={onNavigateHome}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ECDC4",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  spacer: {
    width: 50,
  },
  storyContainer: {
    flex: 1,
    flexDirection: "column" as const,
  },
  endSessionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  endButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  endButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
};

export default CollaborativeStoryScreen;
