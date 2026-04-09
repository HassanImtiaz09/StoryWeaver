/**
 * Turn Input Component
 * Where participants write/speak their story contribution
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useCollaborativeStore } from "../lib/collaborative-store";
import { useColors } from "@/hooks/use-colors";

interface TurnInputProps {
  onSubmitTurn: (input: string) => Promise<void>;
  onPreviewGenerated?: (preview: string) => void;
  disabled?: boolean;
}

export const TurnInput: React.FC<TurnInputProps> = ({
  onSubmitTurn,
  onPreviewGenerated,
  disabled = false,
}) => {
  const colors = useColors();
  const input = useCollaborativeStore((state) => state.myTurnInput);
  const setInput = useCollaborativeStore((state) => state.setMyTurnInput);
  const suggestions = useCollaborativeStore((state) => state.suggestedPrompts);
  const setSuggestions = useCollaborativeStore((state) => state.setSuggestedPrompts);
  const session = useCollaborativeStore((state) => state.activeSession);
  const isMyTurn = useCollaborativeStore((state) => state.isMyTurn);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState("");

  // Timer effect
  useEffect(() => {
    if (!session || !isMyTurn || timer === 0) return;

    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isMyTurn, timer]);

  // Start timer when turn begins
  useEffect(() => {
    if (isMyTurn && session && session.turnTimeLimit > 0 && timer === 0) {
      setTimer(session.turnTimeLimit);
    }
  }, [isMyTurn, session, timer]);

  // Character limit based on age (estimated from context)
  const maxLength = 500;
  const minLength = 5;
  const characterCount = input.length;
  const isValidLength = characterCount >= minLength && characterCount <= maxLength;

  const handleSuggestionSelect = (suggestion: string) => {
    setInput(suggestion);
  };

  const generatePreview = async () => {
    if (!isValidLength) return;

    setShowPreview(true);
    // In a real implementation, this would call an API to enhance the input
    // For now, just show the input as preview
    setPreview(input);
    if (onPreviewGenerated) {
      onPreviewGenerated(preview);
    }
  };

  const handleSubmit = async () => {
    if (!isValidLength || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      await onSubmitTurn(input);
    } finally {
      setIsSubmitting(false);
      setShowPreview(false);
      setInput("");
      setTimer(0);
    }
  };

  if (!isMyTurn) {
    return (
      <View style={styles.container}>
        <View style={styles.notYourTurnMessage}>
          <Text style={styles.notYourTurnTitle}>Waiting for your turn...</Text>
          <Text style={styles.notYourTurnSubtitle}>
            {session && session.participants.length > 0
              ? `It's ${session.participants[session.turnOrder[session.currentTurnIndex] as any]?.displayName || "someone"}'s turn`
              : "Another participant is taking their turn"}
          </Text>
        </View>
      </View>
    );
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Timer (if set) */}
      {timer > 0 && (
        <View
          style={[
            styles.timerContainer,
            timer <= 30 ? styles.timerWarning : null,
          ]}
        >
          <Text style={styles.timerLabel}>Time Remaining</Text>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
      )}

      {/* Input Section */}
      <View style={styles.section}>
        <Text style={styles.label}>What happens next?</Text>
        <Text style={styles.hint}>
          Write what you'd like to happen in the story (or speak it aloud)
        </Text>

        <TextInput
          style={[styles.input, !isValidLength && characterCount > 0 ? styles.inputError : null]}
          placeholder="The brave hero..."
          placeholderTextColor="#D1D5DB"
          value={input}
          onChangeText={setInput}
          multiline
          numberOfLines={4}
          maxLength={maxLength}
          editable={!isSubmitting && !disabled}
        />

        <View style={styles.charCountContainer}>
          <Text
            style={[
              styles.charCount,
              characterCount > maxLength * 0.9 ? styles.charCountWarning : null,
            ]}
          >
            {characterCount}/{maxLength}
          </Text>
          {!isValidLength && characterCount > 0 && (
            <Text style={styles.errorText}>
              {characterCount < minLength ? "Too short" : "Too long"}
            </Text>
          )}
        </View>
      </View>

      {/* Suggested Prompts */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Get inspired:</Text>
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionSelect(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Preview Section */}
      {showPreview && preview && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>How it might sound:</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>{preview}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {!showPreview ? (
          <>
            <TouchableOpacity
              style={[
                styles.button,
                styles.previewButton,
                !isValidLength ? styles.buttonDisabled : null,
              ]}
              onPress={generatePreview}
              disabled={!isValidLength || isSubmitting}
            >
              <Text style={styles.previewButtonText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                !isValidLength || isSubmitting ? styles.buttonDisabled : null,
              ]}
              onPress={handleSubmit}
              disabled={!isValidLength || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Turn</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Looks Good, Submit!</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setShowPreview(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.editButtonText}>Back to Editing</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingVertical: 16,
  },
  timerContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  timerWarning: {
    backgroundColor: "#FEE2E2",
  },
  timerLabel: {
    fontSize: 11,
    color: "#0369A1",
    fontWeight: "600",
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0369A1",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1F2937",
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#FCA5A5",
  },
  charCountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  charCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  charCountWarning: {
    color: "#F59E0B",
  },
  errorText: {
    fontSize: 11,
    color: "#EF4444",
  },
  suggestionsContainer: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#F0F9FF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  suggestionText: {
    fontSize: 12,
    color: "#0369A1",
    textAlign: "center",
  },
  previewSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  previewBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
  },
  previewText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: "#4ECDC4",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  previewButton: {
    backgroundColor: "#E5E7EB",
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  editButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  notYourTurnMessage: {
    marginHorizontal: 16,
    marginVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  notYourTurnTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  notYourTurnSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
};
