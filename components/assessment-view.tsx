/**
 * Assessment View Component
 * Displays reading comprehension questions and collects student answers
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { TextInput } from "react-native";

export interface AssessmentQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "vocabulary" | "sequencing";
  question: string;
  options?: string[];
  correctAnswer?: string;
  vocabulary?: string;
  definition?: string;
  explanation?: string;
}

interface AssessmentViewProps {
  questions: AssessmentQuestion[];
  studentName: string;
  episodeTitle: string;
  onSubmit: (answers: Record<string, string>, score: number) => void;
  isLoading?: boolean;
}

interface StudentAnswers {
  [questionId: string]: string;
}

export const AssessmentView: React.FC<AssessmentViewProps> = ({
  questions,
  studentName,
  episodeTitle,
  onSubmit,
  isLoading = false,
}) => {
  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const answered = answers[currentQuestion?.id];

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let totalScore = 0;
    const newScores: Record<string, number> = {};

    questions.forEach((question) => {
      const studentAnswer = answers[question.id] || "";
      let questionScore = 0;

      if (
        question.type === "multiple_choice" ||
        question.type === "true_false"
      ) {
        questionScore =
          studentAnswer === question.correctAnswer ? 100 : 0;
      } else if (question.type === "short_answer") {
        // Short answers will be scored by teacher/AI
        questionScore = 50; // Placeholder
      } else if (question.type === "vocabulary") {
        // Basic vocabulary scoring
        questionScore = studentAnswer.length > 5 ? 75 : 0;
      } else if (question.type === "sequencing") {
        questionScore =
          studentAnswer === question.correctAnswer ? 100 : 0;
      }

      newScores[question.id] = questionScore;
      totalScore += questionScore;
    });

    const averageScore = Math.round(totalScore / questions.length);
    setScores(newScores);
    setSubmitted(true);
    onSubmit(answers, averageScore);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Assessment Complete!</Text>
            <Text style={styles.studentInfo}>{studentName}</Text>
          </View>

          {questions.map((question, index) => (
            <View key={question.id} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultNumber}>Question {index + 1}</Text>
                <Text style={styles.resultQuestion}>{question.question}</Text>
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultLabel}>Your Answer:</Text>
                <Text style={styles.resultAnswer}>{answers[question.id] || "Not answered"}</Text>

                {(question.type === "multiple_choice" ||
                  question.type === "true_false") && (
                  <>
                    <Text style={styles.resultLabel}>Correct Answer:</Text>
                    <Text
                      style={[
                        styles.resultAnswer,
                        answers[question.id] === question.correctAnswer
                          ? styles.correct
                          : styles.incorrect,
                      ]}
                    >
                      {question.correctAnswer}
                    </Text>
                  </>
                )}

                {question.explanation && (
                  <Text style={styles.explanation}>
                    {question.explanation}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No questions available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.studentNameHeader}>{studentName}</Text>
          <Text style={styles.episodeTitle}>{episodeTitle}</Text>
        </View>
        <Text style={styles.progress}>
          {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={styles.questionSection}>
          <Text style={styles.questionNumber}>
            Question {currentQuestionIndex + 1}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Answer Options */}
        <View style={styles.answerSection}>
          {currentQuestion.type === "multiple_choice" && (
            <View style={styles.optionsContainer}>
              {currentQuestion.options?.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionButton,
                    answered === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleAnswer(currentQuestion.id, option)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionRadio,
                      answered === option && styles.optionRadioSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      answered === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {currentQuestion.type === "true_false" && (
            <View style={styles.trueFalseContainer}>
              <TouchableOpacity
                style={[
                  styles.trueFalseButton,
                  answered === "true" && styles.trueFalseButtonSelected,
                ]}
                onPress={() => handleAnswer(currentQuestion.id, "true")}
              >
                <Text
                  style={[
                    styles.trueFalseText,
                    answered === "true" && styles.trueFalseTextSelected,
                  ]}
                >
                  True
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.trueFalseButton,
                  answered === "false" && styles.trueFalseButtonSelected,
                ]}
                onPress={() => handleAnswer(currentQuestion.id, "false")}
              >
                <Text
                  style={[
                    styles.trueFalseText,
                    answered === "false" && styles.trueFalseTextSelected,
                  ]}
                >
                  False
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {currentQuestion.type === "short_answer" && (
            <TextInput
              style={styles.shortAnswerInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#999"
              value={answered || ""}
              onChangeText={(text) =>
                handleAnswer(currentQuestion.id, text)
              }
              multiline={true}
              numberOfLines={4}
            />
          )}

          {currentQuestion.type === "vocabulary" && (
            <View style={styles.vocabularyContainer}>
              <Text style={styles.vocabularyLabel}>Definition:</Text>
              <Text style={styles.vocabularyDefinition}>
                {currentQuestion.definition}
              </Text>
              <TextInput
                style={styles.shortAnswerInput}
                placeholder="Write what this word means..."
                placeholderTextColor="#999"
                value={answered || ""}
                onChangeText={(text) =>
                  handleAnswer(currentQuestion.id, text)
                }
                multiline={true}
              />
            </View>
          )}

          {currentQuestion.type === "sequencing" && (
            <TextInput
              style={styles.shortAnswerInput}
              placeholder="Enter the correct order (e.g., 1,2,3,4)..."
              placeholderTextColor="#999"
              value={answered || ""}
              onChangeText={(text) =>
                handleAnswer(currentQuestion.id, text)
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, !currentQuestionIndex && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentQuestionIndex < questions.length - 1 ? (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNext}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.submitButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.navButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  headerBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentNameHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  episodeTitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  progress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A86FF",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    lineHeight: 24,
  },
  answerSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  optionButtonSelected: {
    backgroundColor: "#f0f7ff",
    borderColor: "#3A86FF",
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 12,
  },
  optionRadioSelected: {
    backgroundColor: "#3A86FF",
    borderColor: "#3A86FF",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  optionTextSelected: {
    color: "#3A86FF",
    fontWeight: "600",
  },
  trueFalseContainer: {
    flexDirection: "row",
    gap: 12,
  },
  trueFalseButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
  },
  trueFalseButtonSelected: {
    backgroundColor: "#f0f7ff",
    borderColor: "#3A86FF",
  },
  trueFalseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  trueFalseTextSelected: {
    color: "#3A86FF",
  },
  shortAnswerInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
  },
  vocabularyContainer: {
    gap: 12,
  },
  vocabularyLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  vocabularyDefinition: {
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    backgroundColor: "#3A86FF",
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  resultItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    borderLeftWidth: 4,
    borderLeftColor: "#3A86FF",
  },
  resultHeader: {
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  resultNumber: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  resultQuestion: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  resultContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  resultAnswer: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  correct: {
    color: "#06D6A0",
    fontWeight: "600",
  },
  incorrect: {
    color: "#FF6B6B",
    fontWeight: "600",
  },
  explanation: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 18,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  studentInfo: {
    fontSize: 14,
    color: "#999",
  },
});
