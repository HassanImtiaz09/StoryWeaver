/**
 * Educator Store - Zustand state management for educator features
 * Manages classroom data, assignments, assessments, and student progress
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ClassroomData {
  id: number;
  name: string;
  gradeLevel: string;
  joinCode: string;
  description?: string;
  studentCount?: number;
  createdAt?: Date;
}

export interface StudentData {
  id: number;
  name: string;
  readingLevel: string;
  storiesCompleted: number;
  storiesAssigned: number;
  completionPercentage: number;
  weeklyActivityCount: number;
  currentStreak: number;
  lastActive?: Date;
}

export interface AssignmentData {
  id: number;
  classroomId: number;
  arcId: number;
  instructions?: string;
  dueDate?: Date;
  createdAt?: Date;
  completionStatus?: Record<number, "not_started" | "in_progress" | "completed">;
}

export interface AssessmentData {
  id: number;
  studentId: number;
  episodeId: number;
  gradeLevel: string;
  score?: number;
  createdAt?: Date;
  gradedAt?: Date;
}

export interface ClassAnalyticsData {
  totalReadingTime: number;
  averageReadingTime: number;
  studentsEngaged: number;
  totalStudents: number;
  readingLevelDistribution: Record<string, number>;
  mostPopularTheme: string | null;
  studentsNeedingAttention: StudentData[];
  topPerformers: StudentData[];
}

interface EducatorStoreState {
  // Classrooms
  classrooms: ClassroomData[];
  selectedClassroom: ClassroomData | null;
  loadingClassrooms: boolean;

  // Students
  students: StudentData[];
  loadingStudents: boolean;

  // Assignments
  assignments: AssignmentData[];
  loadingAssignments: boolean;

  // Assessments
  assessments: AssessmentData[];
  loadingAssessments: boolean;

  // Analytics
  classAnalytics: ClassAnalyticsData | null;
  loadingAnalytics: boolean;

  // Actions
  loadClassrooms: (classrooms: ClassroomData[]) => void;
  selectClassroom: (classroom: ClassroomData | null) => void;
  addClassroom: (classroom: ClassroomData) => void;
  updateClassroom: (classroom: ClassroomData) => void;

  loadStudents: (students: StudentData[]) => void;
  addStudent: (student: StudentData) => void;
  updateStudentProgress: (studentId: number, progress: Partial<StudentData>) => void;

  loadAssignments: (assignments: AssignmentData[]) => void;
  addAssignment: (assignment: AssignmentData) => void;
  updateAssignment: (assignment: AssignmentData) => void;

  loadAssessments: (assessments: AssessmentData[]) => void;
  addAssessment: (assessment: AssessmentData) => void;
  updateAssessment: (assessment: AssessmentData) => void;

  loadAnalytics: (analytics: ClassAnalyticsData) => void;

  setLoadingClassrooms: (loading: boolean) => void;
  setLoadingStudents: (loading: boolean) => void;
  setLoadingAssignments: (loading: boolean) => void;
  setLoadingAssessments: (loading: boolean) => void;
  setLoadingAnalytics: (loading: boolean) => void;

  clearData: () => void;
}

const defaultAnalytics: ClassAnalyticsData = {
  totalReadingTime: 0,
  averageReadingTime: 0,
  studentsEngaged: 0,
  totalStudents: 0,
  readingLevelDistribution: {},
  mostPopularTheme: null,
  studentsNeedingAttention: [],
  topPerformers: [],
};

export const useEducatorStore = create<EducatorStoreState>()(
  persist(
    (set) => ({
      // Initial state
      classrooms: [],
      selectedClassroom: null,
      loadingClassrooms: false,

      students: [],
      loadingStudents: false,

      assignments: [],
      loadingAssignments: false,

      assessments: [],
      loadingAssessments: false,

      classAnalytics: null,
      loadingAnalytics: false,

      // Classroom actions
      loadClassrooms: (classrooms) =>
        set({
          classrooms,
          loadingClassrooms: false,
        }),

      selectClassroom: (classroom) =>
        set({
          selectedClassroom: classroom,
        }),

      addClassroom: (classroom) =>
        set((state) => ({
          classrooms: [...state.classrooms, classroom],
        })),

      updateClassroom: (classroom) =>
        set((state) => ({
          classrooms: state.classrooms.map((c) =>
            c.id === classroom.id ? classroom : c
          ),
          selectedClassroom:
            state.selectedClassroom?.id === classroom.id
              ? classroom
              : state.selectedClassroom,
        })),

      // Student actions
      loadStudents: (students) =>
        set({
          students,
          loadingStudents: false,
        }),

      addStudent: (student) =>
        set((state) => ({
          students: [...state.students, student],
        })),

      updateStudentProgress: (studentId, progress) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId ? { ...s, ...progress } : s
          ),
        })),

      // Assignment actions
      loadAssignments: (assignments) =>
        set({
          assignments,
          loadingAssignments: false,
        }),

      addAssignment: (assignment) =>
        set((state) => ({
          assignments: [...state.assignments, assignment],
        })),

      updateAssignment: (assignment) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === assignment.id ? assignment : a
          ),
        })),

      // Assessment actions
      loadAssessments: (assessments) =>
        set({
          assessments,
          loadingAssessments: false,
        }),

      addAssessment: (assessment) =>
        set((state) => ({
          assessments: [...state.assessments, assessment],
        })),

      updateAssessment: (assessment) =>
        set((state) => ({
          assessments: state.assessments.map((a) =>
            a.id === assessment.id ? assessment : a
          ),
        })),

      // Analytics actions
      loadAnalytics: (analytics) =>
        set({
          classAnalytics: analytics,
          loadingAnalytics: false,
        }),

      // Loading state actions
      setLoadingClassrooms: (loading) =>
        set({ loadingClassrooms: loading }),

      setLoadingStudents: (loading) =>
        set({ loadingStudents: loading }),

      setLoadingAssignments: (loading) =>
        set({ loadingAssignments: loading }),

      setLoadingAssessments: (loading) =>
        set({ loadingAssessments: loading }),

      setLoadingAnalytics: (loading) =>
        set({ loadingAnalytics: loading }),

      // Clear all data
      clearData: () =>
        set({
          classrooms: [],
          selectedClassroom: null,
          students: [],
          assignments: [],
          assessments: [],
          classAnalytics: null,
        }),
    }),
    {
      name: "educator-store",
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);
