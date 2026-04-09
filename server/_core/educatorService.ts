/**
 * Educator Service - Classroom management and student progress tracking
 * Core logic for teacher-facing features
 */


import { db } from "../db";
import {
  classrooms,
  classroomStudents,
  storyAssignments,
  studentAssignmentProgress,
  assessments,
  children,
  storyArcs,
  episodes,
  readingActivity,
  readingStreaks,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, inArray, count } from "drizzle-orm";
import { getDefaultProvider } from "./aiProvider";

/**
 * Generates a unique 10-character join code for classrooms
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a new classroom
 */
export async function createClassroom(
  teacherId: number,
  className: string,
  gradeLevel: string,
  description?: string
): Promise<{ id: number; joinCode: string }> {
  const joinCode = generateJoinCode();

  const result = await db.insert(classrooms).values({
    teacherId,
    name: className,
    gradeLevel,
    joinCode,
    description,
  });

  return {
    // @ts-expect-error - type mismatch from schema
    id: result.insertId as unknown as number,
    joinCode,
  };
}

/**
 * Gets all classrooms for a teacher
 */
export async function getTeacherClassrooms(teacherId: number) {
  const classroomList = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.teacherId, teacherId))
    .orderBy(desc(classrooms.createdAt));

  return classroomList;
}

/**
 * Gets detailed classroom info with student count
 */
export async function getClassroomDetail(classroomId: number) {
  const classroomData = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, classroomId))
    .limit(1);

  if (!classroomData.length) {
    throw new Error(`Classroom ${classroomId} not found`);
  }

  const classroom = classroomData[0];
  const studentCount = await db
    .select({ count: count() })
    .from(classroomStudents)
    .where(eq(classroomStudents.classroomId, classroomId));

  return {
    ...classroom,
    studentCount: studentCount[0]?.count || 0,
  };
}

/**
 * Adds students to a classroom
 */
export async function addStudentsToClassroom(
  classroomId: number,
  childIds: number[]
): Promise<number> {
  if (!childIds.length) return 0;

  await db.insert(classroomStudents).values(
    childIds.map((childId) => ({
      classroomId,
      childId,
    }))
  );

  return childIds.length;
}

/**
 * Removes a student from a classroom
 */
export async function removeStudent(
  classroomId: number,
  childId: number
): Promise<boolean> {
  await db
    .delete(classroomStudents)
    .where(
      and(
        eq(classroomStudents.classroomId, classroomId),
        eq(classroomStudents.childId, childId)
      )
    );

  return true;
}

/**
 * Assigns a story to a classroom
 */
export async function assignStory(
  classroomId: number,
  arcId: number,
  dueDate?: Date,
  instructions?: string
): Promise<number> {
  const result = await db.insert(storyAssignments).values({
    classroomId,
    arcId,
    dueDate: dueDate || undefined,
    instructions: instructions || undefined,
  });

  // @ts-expect-error - type mismatch from schema
  const assignmentId = result.insertId as unknown as number;

  // Initialize progress tracking for all students in classroom
  const students = await db
    .select({ childId: classroomStudents.childId })
    .from(classroomStudents)
    .where(eq(classroomStudents.classroomId, classroomId));

  const arc = await db
    .select({ totalEpisodes: storyArcs.totalEpisodes })
    .from(storyArcs)
    .where(eq(storyArcs.id, arcId))
    .limit(1);

  const totalPages = arc[0]?.totalEpisodes || 5;

  await db.insert(studentAssignmentProgress).values(
    students.map((s) => ({
      assignmentId,
      studentId: s.childId,
      status: "not_started" as const,
      completedPages: 0,
      totalPages,
    }))
  );

  return assignmentId;
}

/**
 * Gets all assignments for a classroom
 */
export async function getClassroomAssignments(classroomId: number) {
  return await db
    .select()
    .from(storyAssignments)
    .where(eq(storyAssignments.classroomId, classroomId))
    .orderBy(desc(storyAssignments.createdAt));
}

/**
 * Gets classroom-wide reading progress
 */
export async function getClassProgress(classroomId: number) {
  const students = await db
    .select({
      childId: classroomStudents.childId,
      name: children.name,
    })
    .from(classroomStudents)
    .innerJoin(children, eq(classroomStudents.childId, children.id))
    .where(eq(classroomStudents.classroomId, classroomId));

  const progressData = await Promise.all(
    students.map(async (student) => {
      const progress = await getStudentProgress(classroomId, student.childId);
      return {
        childId: student.childId,
        name: student.name,
        ...progress,
      };
    })
  );

  return progressData;
}

/**
 * Gets individual student progress in a classroom
 */
export async function getStudentProgress(classroomId: number, studentId: number) {
  // Get assignments completed
  const assignmentProgress = await db
    .select({
      assignmentId: studentAssignmentProgress.assignmentId,
      status: studentAssignmentProgress.status,
      completedPages: studentAssignmentProgress.completedPages,
      totalPages: studentAssignmentProgress.totalPages,
      completedAt: studentAssignmentProgress.completedAt,
    })
    .from(studentAssignmentProgress)
    .where(eq(studentAssignmentProgress.studentId, studentId));

  const completedCount = assignmentProgress.filter((p) => p.status === "completed").length;
  const totalAssigned = assignmentProgress.length;

  // Get reading time this week
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyActivity = await db
    .select({ count: count() })
    .from(readingActivity)
    .where(
      and(
        eq(readingActivity.childId, studentId),
        gte(readingActivity.createdAt, weekAgo)
      )
    );

  // Get reading streaks
  const streakData = await db
    .select()
    .from(readingStreaks)
    .where(eq(readingStreaks.childId, studentId))
    .limit(1);

  const streak = streakData[0];

  // Get current reading level
  const childData = await db
    .select({ readingLevel: children.readingLevel })
    .from(children)
    .where(eq(children.id, studentId))
    .limit(1);

  return {
    storiesCompleted: completedCount,
    storiesAssigned: totalAssigned,
    completionPercentage: totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0,
    weeklyActivityCount: weeklyActivity[0]?.count || 0,
    currentStreak: streak?.currentStreak || 0,
    readingLevel: childData[0]?.readingLevel || "Unknown",
    lastActive: streak?.lastReadDate || null,
  };
}

/**
 * Generates reading assessment for a student (AI-powered)
 */
export async function generateReadingAssessment(
  episodeId: number,
  gradeLevel: string,
  studentId: number,
  assignmentId?: number
): Promise<number> {
  // Get episode content
  const episode = await db
    .select()
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1);

  if (!episode.length) {
    throw new Error(`Episode ${episodeId} not found`);
  }

  const storyText = episode[0].summary || "Sample story content";

  // Generate questions using AI
  const aiProvider = getDefaultProvider();
  const prompt = `
Generate 5 reading comprehension questions for a ${gradeLevel} grade level student about this story excerpt:

"${storyText}"

Create a mix of question types:
1. One multiple choice question (4 options)
2. One true/false question
3. One short answer question
4. One vocabulary question (identify a word and its meaning)
5. One sequencing question (order events)

Respond with ONLY valid JSON in this format:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "...",
      "correctAnswer": "true"
    },
    {
      "id": "q3",
      "type": "short_answer",
      "question": "...",
      "correctAnswer": "expected answer"
    },
    {
      "id": "q4",
      "type": "vocabulary",
      "question": "What does the word '...' mean?",
      "vocabulary": "word",
      "definition": "definition of word"
    },
    {
      "id": "q5",
      "type": "sequencing",
      "question": "Put these events in order: ...",
      "correctAnswer": "1,2,3,4"
    }
  ]
}
`;

  const schema = JSON.stringify({
    questions: [
      {
        id: "string",
        type: "string",
        question: "string",
        options: ["string"],
        correctAnswer: "string",
        vocabulary: "string",
        definition: "string",
      },
    ],
  });

  try {
    const result = await aiProvider.generateJSON<{
      questions: Array<{
        id: string;
        type: string;
        question: string;
        options?: string[];
        correctAnswer?: string;
        vocabulary?: string;
        definition?: string;
      }>;
    }>(prompt, schema);

    // Create assessment record
    const insertResult = await db.insert(assessments).values({
      assignmentId: assignmentId || undefined,
      studentId,
      episodeId,
      gradeLevel,
      questions: result.questions as any,
      answers: {},
    });

    // @ts-expect-error - type mismatch from schema
    return insertResult.insertId as unknown as number;
  } catch (error) {
    console.error("Failed to generate assessment:", error);
    throw new Error("Failed to generate assessment questions");
  }
}

/**
 * Scores a short answer using AI
 */
export async function scoreShortAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  gradeLevel: string
): Promise<{ score: number; feedback: string }> {
  const aiProvider = getDefaultProvider();

  const prompt = `
You are a teacher grading a ${gradeLevel} grade student's answer to a reading comprehension question.

Question: "${question}"
Correct Answer: "${correctAnswer}"
Student Answer: "${studentAnswer}"

Score the answer on a scale of 0-100, considering:
- Accuracy and completeness
- Age-appropriate vocabulary understanding
- Comprehension of main idea

Respond with ONLY valid JSON:
{
  "score": 85,
  "feedback": "Good effort! You understood the main idea, but missed one important detail..."
}
`;

  try {
    const result = await aiProvider.generateJSON<{
      score: number;
      feedback: string;
    }>(
      prompt,
      JSON.stringify({
        score: "number",
        feedback: "string",
      })
    );

    return {
      score: Math.max(0, Math.min(100, result.score)),
      feedback: result.feedback,
    };
  } catch (error) {
    console.error("Failed to score answer:", error);
    return {
      score: 0,
      feedback: "Unable to score at this time",
    };
  }
}

/**
 * Grades an assessment
 */
export async function gradeAssessment(
  assessmentId: number,
  studentAnswers: Record<string, string>
): Promise<{ score: number; feedback: Record<string, any> }> {
  // Get assessment
  const assessmentData = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessmentData.length) {
    throw new Error(`Assessment ${assessmentId} not found`);
  }

  const assessment = assessmentData[0];
  const questions = assessment.questions as any[];

  let totalScore = 0;
  const feedback: Record<string, any> = {};
  const questionCount = questions.length;

  // Score each question
  for (const question of questions) {
    const studentAnswer = studentAnswers[question.id] || "";

    let questionScore = 0;

    if (question.type === "multiple_choice" || question.type === "true_false") {
      // Auto-score: exact match gets 100, no match gets 0
      questionScore = studentAnswer === question.correctAnswer ? 100 : 0;
      feedback[question.id] = {
        correct: questionScore === 100,
        correctAnswer: question.correctAnswer,
      };
    } else if (question.type === "short_answer") {
      // AI-score
      const scoreResult = await scoreShortAnswer(
        question.question,
        studentAnswer,
        question.correctAnswer,
        assessment.gradeLevel
      );
      questionScore = scoreResult.score;
      feedback[question.id] = {
        score: scoreResult.score,
        feedback: scoreResult.feedback,
        correctAnswer: question.correctAnswer,
      };
    } else if (question.type === "vocabulary") {
      // Check if answer contains key terms from definition
      const lowerAnswer = studentAnswer.toLowerCase();
      const lowerDefinition = question.definition.toLowerCase();
      questionScore = lowerAnswer.includes(lowerDefinition.split(" ")[0]) ? 100 : 50;
      feedback[question.id] = {
        correct: questionScore === 100,
        expectedDefinition: question.definition,
      };
    } else if (question.type === "sequencing") {
      // Check if sequence matches
      questionScore = studentAnswer === question.correctAnswer ? 100 : 0;
      feedback[question.id] = {
        correct: questionScore === 100,
        correctSequence: question.correctAnswer,
      };
    }

    totalScore += questionScore;
  }

  const finalScore = Math.round(totalScore / questionCount);

  // Update assessment record
  await db
    .update(assessments)
    .set({
      answers: studentAnswers,
      score: finalScore,
      gradedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));

  return {
    score: finalScore,
    feedback,
  };
}

/**
 * Gets class-wide analytics
 */
export async function getClassAnalytics(
  classroomId: number,
  period: "week" | "month" | "all" = "week"
): Promise<{
  totalReadingTime: number;
  averageReadingTime: number;
  studentsEngaged: number;
  totalStudents: number;
  readingLevelDistribution: Record<string, number>;
  mostPopularTheme: string | null;
  studentsNeedingAttention: any[];
  topPerformers: any[];
}> {
  // Get students
  const classStudents = await db
    .select({ childId: classroomStudents.childId })
    .from(classroomStudents)
    .where(eq(classroomStudents.classroomId, classroomId));

  const totalStudents = classStudents.length;

  if (totalStudents === 0) {
    return {
      totalReadingTime: 0,
      averageReadingTime: 0,
      studentsEngaged: 0,
      totalStudents: 0,
      readingLevelDistribution: {},
      mostPopularTheme: null,
      studentsNeedingAttention: [],
      topPerformers: [],
    };
  }

  const childIds = classStudents.map((s) => s.childId);

  // Calculate period
  const now = new Date();
  let startDate = new Date();
  switch (period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setDate(now.getDate() - 30);
      break;
  }

  // Get reading activity
  const activities = await db
    .select()
    .from(readingActivity)
    .where(
      and(
        inArray(readingActivity.childId, childIds),
        gte(readingActivity.createdAt, startDate)
      )
    );

  const totalReadingTime = activities.filter((a) => a.activityType === "page_read").length * 2;
  const averageReadingTime =
    totalStudents > 0 ? Math.round(totalReadingTime / totalStudents) : 0;
  const studentsEngaged = new Set(activities.map((a) => a.childId)).size;

  // Reading level distribution
  const childData = await db
    .select({
      readingLevel: children.readingLevel,
    })
    .from(children)
    .where(inArray(children.id, childIds));

  const levelDistribution: Record<string, number> = {};
  for (const child of childData) {
    const level = child.readingLevel || "Unknown";
    levelDistribution[level] = (levelDistribution[level] || 0) + 1;
  }

  // Most popular theme
  const stories = await db
    .select({ theme: storyArcs.theme })
    .from(storyArcs)
    .where(inArray(storyArcs.childId, childIds));

  const themeCount: Record<string, number> = {};
  for (const story of stories) {
    themeCount[story.theme] = (themeCount[story.theme] || 0) + 1;
  }

  const mostPopularTheme =
    Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Get student progress for attention/performance
  const studentProgress = await Promise.all(
    childIds.map(async (childId) => {
      const progress = await getStudentProgress(classroomId, childId);
      const childInfo = childData.find((c) => c.readingLevel);
      return { childId, ...progress };
    })
  );

  const studentsNeedingAttention = studentProgress
    .filter((p) => p.weeklyActivityCount < 2)
    .sort((a, b) => a.weeklyActivityCount - b.weeklyActivityCount)
    .slice(0, 5);

  const topPerformers = studentProgress
    .sort((a, b) => b.completionPercentage - a.completionPercentage)
    .slice(0, 5);

  return {
    totalReadingTime,
    averageReadingTime,
    studentsEngaged,
    totalStudents,
    readingLevelDistribution: levelDistribution,
    mostPopularTheme,
    studentsNeedingAttention,
    topPerformers,
  };
}

/**
 * Generates a printable progress report for the class
 */
export async function generateProgressReport(classroomId: number): Promise<{
  classroomName: string;
  gradeLevel: string;
  generatedAt: Date;
  studentReports: any[];
  classStats: any;
}> {
  const classroom = await getClassroomDetail(classroomId);
  const classProgress = await getClassProgress(classroomId);
  const classStats = await getClassAnalytics(classroomId, "month");

  return {
    classroomName: classroom.name,
    gradeLevel: classroom.gradeLevel,
    generatedAt: new Date(),
    studentReports: classProgress,
    classStats,
  };
}

/**
 * Gets reading level recommendation for a student
 */
export async function getReadingLevelRecommendation(studentId: number): Promise<{
  currentLevel: string | null;
  recommendedLevel: string;
  reasoning: string;
}> {
  const aiProvider = getDefaultProvider();

  // Get student data and reading history
  const childData = await db
    .select({
      id: children.id,
      name: children.name,
      age: children.age,
      readingLevel: children.readingLevel,
    })
    .from(children)
    .where(eq(children.id, studentId))
    .limit(1);

  if (!childData.length) {
    throw new Error(`Student ${studentId} not found`);
  }

  const child = childData[0];

  // Get reading stats
  const stats = await db
    .select({ count: count() })
    .from(storyArcs)
    .where(eq(storyArcs.childId, studentId));

  const prompt = `
Based on a ${child.age}-year-old student's reading metrics:
- Current reading level: ${child.readingLevel || "Not set"}
- Stories completed: ${stats[0]?.count || 0}
- Student name: ${child.name}

Recommend the next appropriate reading level considering age, progress, and engagement.

Respond with ONLY valid JSON:
{
  "recommendedLevel": "2nd",
  "reasoning": "Student shows strong comprehension and is ready to move to slightly longer stories..."
}
`;

  try {
    const result = await aiProvider.generateJSON<{
      recommendedLevel: string;
      reasoning: string;
    }>(
      prompt,
      JSON.stringify({
        recommendedLevel: "string",
        reasoning: "string",
      })
    );

    return {
      currentLevel: child.readingLevel || null,
      recommendedLevel: result.recommendedLevel,
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.error("Failed to get reading level recommendation:", error);
    return {
      currentLevel: child.readingLevel || null,
      recommendedLevel: child.readingLevel || "Unknown",
      reasoning: "Unable to generate recommendation at this time",
    };
  }
}
