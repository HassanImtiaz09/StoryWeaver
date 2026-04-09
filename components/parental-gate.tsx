/**
 * Parental Gate Component
 *
 * COPPA compliance: Modal that presents a math challenge to prevent
 * young children from accessing sensitive settings or data features.
 *
 * Features:
 * - Random math problem (addition, subtraction, multiplication)
 * - 3 attempt limit with cooldown
 * - Accessibility-friendly with proper labels
 * - Theme-aware styling
 */


import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  AccessibilityInfo,
  AccessibilityRole,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { a11yButton, a11yInput, announce } from "@/lib/a11y-helpers";
import { FocusTrap } from "@/components/focus-trap";

interface ParentalGateProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
}

interface MathProblem {
  num1: number;
  num2: number;
  operation: "+" | "-" | "×";
  answer: number;
}

/**
 * Generate a random math problem suitable for the challenge
 */
function generateMathProblem(): MathProblem {
  const operations = ["+", "-", "×"] as const;
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let num1: number, num2: number, answer: number;

  if (operation === "+") {
    num1 = Math.floor(Math.random() * 10) + 1; // 1-10
    num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    answer = num1 + num2;
  } else if (operation === "-") {
    num1 = Math.floor(Math.random() * 15) + 5; // 5-19
    num2 = Math.floor(Math.random() * num1) + 1; // 1 to num1
    answer = num1 - num2;
  } else {
    // Multiplication
    num1 = Math.floor(Math.random() * 9) + 2; // 2-10
    num2 = Math.floor(Math.random() * 9) + 2; // 2-10
    answer = num1 * num2;
  }

  return { num1, num2, operation, answer };
}

export function ParentalGate({
  visible,
  onSuccess,
  onCancel,
  title = "Parent Verification Required",
}: ParentalGateProps) {
  const colors = useColors();
  const [problem, setProblem] = useState<MathProblem>(generateMathProblem());
  const [userAnswer, setUserAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // ─── Cleanup timer on unmount ──────────────────────────────
  useEffect(() => {
    if (!isLocked) return;

    const interval = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setAttempts(0);
          setUserAnswer("");
          setFeedback(null);
          announce("Cooldown period ended. Please try again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked]);

  // ─── Reset problem when modal opens ────────────────────────
  useEffect(() => {
    if (visible) {
      setProblem(generateMathProblem());
      setUserAnswer("");
      setAttempts(0);
      setIsLocked(false);
      setLockoutTime(0);
      setFeedback(null);
    }
  }, [visible]);

  // ─── Handle answer submission ──────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim()) {
      announce("Please enter an answer.");
      setFeedback({
        type: "error",
        message: "Please enter an answer",
      });
      return;
    }

    const inputNumber = parseInt(userAnswer, 10);

    if (isNaN(inputNumber)) {
      announce("Please enter a valid number.");
      setFeedback({
        type: "error",
        message: "Please enter a valid number",
      });
      return;
    }

    if (inputNumber === problem.answer) {
      // Success!
      announce("Correct! Access granted.");
      setFeedback({
        type: "success",
        message: "Correct! Access granted.",
      });
      setTimeout(() => {
        onSuccess();
        setUserAnswer("");
      }, 500);
    } else {
      // Wrong answer
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        // Lock out
        setIsLocked(true);
        setLockoutTime(60); // 60 second cooldown
        announce(
          `Too many incorrect attempts. Please try again in ${60} seconds.`
        );
        setFeedback({
          type: "error",
          message: `Too many incorrect attempts. Please try again in ${lockoutTime} seconds.`,
        });
      } else {
        const attemptsLeft = maxAttempts - newAttempts;
        announce(
          `Incorrect. You have ${attemptsLeft} attempt${attemptsLeft > 1 ? "s" : ""} remaining.`
        );
        setFeedback({
          type: "error",
          message: `Incorrect. ${attemptsLeft} attempt${attemptsLeft > 1 ? "s" : ""} remaining.`,
        });
      }

      setUserAnswer("");
    }
  }, [userAnswer, problem.answer, attempts, maxAttempts, isLocked, lockoutTime, onSuccess]);

  // ─── Handle key press (Enter to submit) ────────────────────
  const handleKeyPress = useCallback(
    (e: any) => {
      if (e.nativeEvent.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      maxWidth: 400,
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      gap: 12,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: colors.muted,
    },
    problemSection: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    problemText: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 12,
      textAlign: "center",
    },
    problemDisplay: {
      fontSize: 28,
      fontWeight: "600",
      color: colors.foreground,
      textAlign: "center",
      fontFamily: "monospace",
    },
    inputSection: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.foreground,
      fontWeight: "500",
    },
    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    feedbackContainer: {
      marginBottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    feedbackError: {
      backgroundColor: colors.warning + "15",
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    },
    feedbackSuccess: {
      backgroundColor: colors.success + "15",
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
    },
    feedbackText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
    },
    feedbackErrorText: {
      color: colors.warning,
    },
    feedbackSuccessText: {
      color: colors.success,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      minHeight: 44,
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    submitButtonDisabled: {
      backgroundColor: colors.muted,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: colors.foreground,
    },
    submitButtonText: {
      color: "#fff",
    },
    cooldownText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
      marginBottom: 16,
    },
  });

  const problemString = `${problem.num1} ${problem.operation} ${problem.num2}`;
  const isSubmitDisabled = isLocked || !userAnswer.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      // @ts-expect-error - overload mismatch
      accessibilityRole="dialog"
      accessibilityLabel={title}
      accessibilityHint="Mathematical challenge to verify parent access"
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <FocusTrap active={visible}>
          <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text
                style={styles.title}
                {...a11yButton(title)}
              >
                {title}
              </Text>
              <Text style={styles.subtitle}>
                Please solve the math problem below
              </Text>
            </View>
          </View>

          {/* Math Problem Section */}
          <View style={styles.problemSection}>
            <Text style={styles.problemText}>
              What is the answer to this problem?
            </Text>
            <Text
              style={styles.problemDisplay}
              accessibilityLabel={`Solve: ${problem.num1} ${problem.operation} ${problem.num2}`}
              // @ts-expect-error - overload mismatch
              accessibilityRole="staticText"
            >
              {problemString}
            </Text>
          </View>

          {/* Feedback Message */}
          {feedback && (
            <View
              style={[
                styles.feedbackContainer,
                feedback.type === "error"
                  ? styles.feedbackError
                  : styles.feedbackSuccess,
              ]}
              {...(feedback.type === "error"
                ? {
                    accessibilityLiveRegion: "assertive" as const,
                    accessibilityLabel: feedback.message,
                  }
                : {})}
            >
              <Ionicons
                name={
                  feedback.type === "error"
                    ? "close-circle"
                    : "checkmark-circle"
                }
                size={18}
                color={feedback.type === "error" ? colors.warning : colors.success}
              />
              <Text
                style={[
                  styles.feedbackText,
                  feedback.type === "error"
                    ? styles.feedbackErrorText
                    : styles.feedbackSuccessText,
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          )}

          {/* Cooldown Timer */}
          {isLocked && (
            <Text style={styles.cooldownText}>
              Try again in {lockoutTime} second{lockoutTime > 1 ? "s" : ""}
            </Text>
          )}

          {/* Answer Input */}
          {!isLocked && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Your Answer</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter the answer"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={userAnswer}
                onChangeText={setUserAnswer}
                onKeyPress={handleKeyPress}
                editable={!isLocked}
                maxLength={3}
                {...a11yInput("Answer input", "Enter the numerical answer to the math problem")}
              />
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isLocked}
              {...a11yButton("Cancel", "Close this dialog and go back", {
                disabled: isLocked,
              })}
              accessible
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </Pressable>

            {!isLocked && (
              <Pressable
                style={[
                  styles.submitButton,
                  isSubmitDisabled && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
                {...a11yButton("Submit answer", "Submit your answer to verify access", {
                  disabled: isSubmitDisabled,
                })}
                accessible
              >
                <Text style={[styles.buttonText, styles.submitButtonText]}>
                  Submit
                </Text>
              </Pressable>
            )}
          </View>

          {/* Accessibility hint */}
          <Text
            style={{
              fontSize: 12,
              color: colors.muted,
              textAlign: "center",
              marginTop: 12,
            }}
            accessible
          >
            Attempt {attempts} of {maxAttempts}
          </Text>
          </View>
        </FocusTrap>
      </View>
    </Modal>
  );
}
