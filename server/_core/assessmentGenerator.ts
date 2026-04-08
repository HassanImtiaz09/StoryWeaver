/**
 * Assessment Generator - AI-powered reading comprehension assessments
 * Creates age-appropriate questions for reading comprehension, vocabulary, and critical thinking
 */

import { getDefaultProvider } from "./aiProvider";

export interface ComprehensionQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "vocabulary" | "sequencing";
  question: string;
  options?: string[];
  correctAnswer?: string;
  vocabulary?: string;
  definition?: string;
  explanation?: string;
}

export interface VocabularyQuestion {
  word: string;
  definition: string;
  partOfSpeech: string;
  example: string;
}

export interface CreativePrompt {
  prompt: string;
  guidelines: string;
  theme: string;
}

/**
 * Generates comprehension questions for a story
 */
export async function generateComprehensionQuestions(
  storyText: string,
  gradeLevel: string,
  count: number = 5
): Promise<ComprehensionQuestion[]> {
  if (count < 1 || count > 10) {
    throw new Error("Question count must be between 1 and 10");
  }

  const aiProvider = getDefaultProvider();

  // Map grade level to age range and complexity
  const gradeMapping: Record<string, { ageRange: string; complexity: string }> = {
    K: { ageRange: "5-6", complexity: "very simple" },
    "1st": { ageRange: "6-7", complexity: "simple" },
    "2nd": { ageRange: "7-8", complexity: "simple" },
    "3rd": { ageRange: "8-9", complexity: "moderate" },
    "4th": { ageRange: "9-10", complexity: "moderate" },
    "5th": { ageRange: "10-11", complexity: "challenging" },
    "6th": { ageRange: "11-12", complexity: "challenging" },
  };

  const gradeInfo = gradeMapping[gradeLevel] || gradeMapping["3rd"];

  const prompt = `
Generate ${count} reading comprehension questions for a ${gradeLevel} grade level student (ages ${gradeInfo.ageRange}).
Complexity level: ${gradeInfo.complexity}

Story excerpt:
"${storyText}"

Create a varied mix of question types to assess comprehension:
- Multiple choice (2-4 correct options provided, student picks best)
- True/False (simple factual recall)
- Short answer (open-ended, requires explanation)
- Vocabulary (define a word from the story)
- Sequencing (put events in order)

For grade levels K-2, focus on simple literal comprehension.
For grade levels 3-4, include some inferential thinking.
For grade levels 5-6, emphasize critical thinking and analysis.

Ensure all questions:
1. Are appropriate for the age/grade level
2. Reference actual content from the story
3. Have clear, correct answers
4. Help assess reading comprehension

Respond with ONLY valid JSON array (no markdown):
[
  {
    "id": "q1",
    "type": "multiple_choice",
    "question": "What is the main character's name?",
    "options": ["Anna", "Emma", "Charlotte", "Sofia"],
    "correctAnswer": "Emma",
    "explanation": "The story clearly states the character's name is Emma in the first paragraph."
  },
  {
    "id": "q2",
    "type": "true_false",
    "question": "The story takes place in a forest.",
    "correctAnswer": "true",
    "explanation": "The opening describes tall trees and a forest path."
  },
  {
    "id": "q3",
    "type": "short_answer",
    "question": "Why did Emma decide to explore the cave?",
    "correctAnswer": "She wanted to find the hidden treasure mentioned in her grandfather's letter.",
    "explanation": "Emma was motivated by her grandfather's mysterious letter about treasure in the cave."
  },
  {
    "id": "q4",
    "type": "vocabulary",
    "question": "What does the word 'explore' mean?",
    "vocabulary": "explore",
    "definition": "to travel through or investigate something to learn about it",
    "example": "Emma decided to explore the old cave.",
    "explanation": "In context, explore means to go through and discover what is in the cave."
  },
  {
    "id": "q5",
    "type": "sequencing",
    "question": "Put these events in order: (1) Emma finds the cave (2) Emma reads the letter (3) Emma enters the forest (4) Emma discovers treasure",
    "correctAnswer": "2,3,1,4",
    "explanation": "Emma first reads the letter, then enters the forest, then finds the cave, and finally discovers the treasure."
  }
]
`;

  try {
    const result = await aiProvider.generateJSON<ComprehensionQuestion[]>(
      prompt,
      JSON.stringify({
        id: "string",
        type: "string",
        question: "string",
        options: ["string"],
        correctAnswer: "string",
        explanation: "string",
        vocabulary: "string",
        definition: "string",
        example: "string",
      })
    );

    // Validate and clean up
    return result
      .slice(0, count)
      .map((q) => ({
        id: q.id || `q${Math.random()}`,
        type: q.type as any,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        vocabulary: q.vocabulary,
        definition: q.definition,
        explanation: q.explanation,
      }));
  } catch (error) {
    console.error("Failed to generate comprehension questions:", error);
    throw new Error("Failed to generate assessment questions. Please try again.");
  }
}

/**
 * Generates vocabulary-focused questions
 */
export async function generateVocabularyQuiz(
  storyText: string,
  gradeLevel: string,
  count: number = 5
): Promise<VocabularyQuestion[]> {
  if (count < 1 || count > 15) {
    throw new Error("Question count must be between 1 and 15");
  }

  const aiProvider = getDefaultProvider();

  const prompt = `
Extract and define ${count} vocabulary words from this story that are appropriate for a ${gradeLevel} grade level student:

"${storyText}"

Select words that:
1. Are important to understanding the story
2. Are slightly above grade level (to build vocabulary)
3. Appear in the story text
4. Are interesting and useful

Provide clear, age-appropriate definitions and example sentences using the word in context from the story.

Respond with ONLY valid JSON array:
[
  {
    "word": "example_word",
    "definition": "clear, simple definition appropriate for the age group",
    "partOfSpeech": "noun",
    "example": "The example sentence from the story or modified to show context."
  }
]
`;

  try {
    const result = await aiProvider.generateJSON<VocabularyQuestion[]>(
      prompt,
      JSON.stringify({
        word: "string",
        definition: "string",
        partOfSpeech: "string",
        example: "string",
      })
    );

    return result.slice(0, count);
  } catch (error) {
    console.error("Failed to generate vocabulary quiz:", error);
    throw new Error("Failed to generate vocabulary quiz. Please try again.");
  }
}

/**
 * Generates creative writing prompts related to the story
 */
export async function generateCreativePrompt(
  storyTheme: string,
  storyTitle: string,
  gradeLevel: string
): Promise<CreativePrompt> {
  const aiProvider = getDefaultProvider();

  const promptGuidelines: Record<string, string> = {
    K: "Use 3-4 sentences. Use simple words. Focus on one idea.",
    "1st": "Use 4-5 sentences. Use simple past tense. Describe one event.",
    "2nd": "Use 5-6 sentences. Can use more descriptive words. Write about what happens next.",
    "3rd": "Use 6-8 sentences. Include characters and setting. Explain why things happen.",
    "4th": "Write a short paragraph (8-10 sentences). Include details and dialogue if possible.",
    "5th": "Write a full story (10-15 sentences). Include setting, characters, problem, and solution.",
    "6th": "Write a story or essay (200+ words). Include vivid descriptions. Show, don't tell.",
  };

  const guidelines = promptGuidelines[gradeLevel] || promptGuidelines["3rd"];

  const prompt = `
Create a creative writing prompt for a ${gradeLevel} grade level student inspired by a story with the theme of "${storyTheme}" (title: "${storyTitle}").

The prompt should:
1. Connect to the story's theme or setting
2. Encourage imagination and personal expression
3. Be age-appropriate and engaging
4. Include clear guidelines for the length and scope of response

Guidelines for writing length: ${guidelines}

Respond with ONLY valid JSON:
{
  "prompt": "Your creative writing prompt here...",
  "guidelines": "Specific instructions for how to approach this prompt (${gradeLevel} grade level)",
  "theme": "${storyTheme}"
}
`;

  try {
    const result = await aiProvider.generateJSON<CreativePrompt>(
      prompt,
      JSON.stringify({
        prompt: "string",
        guidelines: "string",
        theme: "string",
      })
    );

    return result;
  } catch (error) {
    console.error("Failed to generate creative prompt:", error);
    throw new Error("Failed to generate creative prompt. Please try again.");
  }
}

/**
 * Scores a short answer using semantic similarity and rubric matching
 */
export async function scoreShortAnswer(
  question: string,
  studentAnswer: string,
  expectedAnswer: string,
  gradeLevel: string
): Promise<{
  score: number;
  feedback: string;
  rubricScore: "excellent" | "good" | "fair" | "needs_improvement";
}> {
  const aiProvider = getDefaultProvider();

  const prompt = `
You are an experienced ${gradeLevel} grade teacher. Score and provide feedback on a student's answer.

Question: "${question}"

Expected Answer: "${expectedAnswer}"

Student's Answer: "${studentAnswer}"

Evaluate the answer based on:
1. Accuracy (Did they answer the question correctly?)
2. Completeness (Did they provide sufficient detail?)
3. Clarity (Is it written clearly for their grade level?)
4. Effort (Is there evidence of understanding?)

Provide:
- A score from 0-100
- Constructive, encouraging feedback
- A rubric assessment (excellent, good, fair, needs_improvement)

Respond with ONLY valid JSON:
{
  "score": 85,
  "feedback": "Great job! You understood the main idea. Next time, try to add more details about why this happened.",
  "rubricScore": "good"
}
`;

  try {
    const result = await aiProvider.generateJSON<{
      score: number;
      feedback: string;
      rubricScore: "excellent" | "good" | "fair" | "needs_improvement";
    }>(
      prompt,
      JSON.stringify({
        score: "number 0-100",
        feedback: "string",
        rubricScore: "excellent|good|fair|needs_improvement",
      })
    );

    return {
      score: Math.max(0, Math.min(100, result.score)),
      feedback: result.feedback,
      rubricScore: result.rubricScore,
    };
  } catch (error) {
    console.error("Failed to score short answer:", error);
    return {
      score: 0,
      feedback: "Unable to provide detailed feedback at this time.",
      rubricScore: "needs_improvement",
    };
  }
}

/**
 * Generates a complete assessment package for an episode
 */
export async function generateFullAssessment(
  episodeText: string,
  storyTheme: string,
  gradeLevel: string
): Promise<{
  comprehensionQuestions: ComprehensionQuestion[];
  vocabularyQuestions: VocabularyQuestion[];
  creativePrompt: CreativePrompt;
}> {
  const [comprehension, vocabulary, creative] = await Promise.all([
    generateComprehensionQuestions(episodeText, gradeLevel, 5),
    generateVocabularyQuiz(episodeText, gradeLevel, 5),
    generateCreativePrompt(storyTheme, "Story", gradeLevel),
  ]);

  return {
    comprehensionQuestions: comprehension,
    vocabularyQuestions: vocabulary,
    creativePrompt: creative,
  };
}

/**
 * Analyzes student's performance across multiple assessments
 */
export async function analyzeStudentPerformance(
  assessmentScores: number[],
  studentGradeLevel: string
): Promise<{
  averageScore: number;
  performanceLevel: string;
  strengths: string[];
  areasForGrowth: string[];
  recommendations: string[];
}> {
  const aiProvider = getDefaultProvider();

  const average = assessmentScores.reduce((a, b) => a + b, 0) / assessmentScores.length;

  const prompt = `
Analyze a ${studentGradeLevel} grade student's reading comprehension performance.

Assessment Scores: ${assessmentScores.join(", ")}
Average Score: ${average.toFixed(1)}%

Based on these scores, identify:
1. The student's performance level (struggling, developing, proficient, advanced)
2. Key strengths
3. Areas that need improvement
4. Specific recommendations for instruction

Respond with ONLY valid JSON:
{
  "performanceLevel": "proficient",
  "strengths": ["Can identify main characters", "Understands cause and effect"],
  "areasForGrowth": ["Vocabulary retention", "Making inferences"],
  "recommendations": ["Use more context clues for vocabulary", "Practice predicting outcomes"]
}
`;

  try {
    const result = await aiProvider.generateJSON<{
      performanceLevel: string;
      strengths: string[];
      areasForGrowth: string[];
      recommendations: string[];
    }>(
      prompt,
      JSON.stringify({
        performanceLevel: "string",
        strengths: ["string"],
        areasForGrowth: ["string"],
        recommendations: ["string"],
      })
    );

    return {
      averageScore: Math.round(average),
      performanceLevel: result.performanceLevel,
      strengths: result.strengths,
      areasForGrowth: result.areasForGrowth,
      recommendations: result.recommendations,
    };
  } catch (error) {
    console.error("Failed to analyze student performance:", error);
    return {
      averageScore: Math.round(average),
      performanceLevel: "unknown",
      strengths: [],
      areasForGrowth: [],
      recommendations: ["Continue practicing reading comprehension skills"],
    };
  }
}
