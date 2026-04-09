import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import { useEducatorStore, type ClassroomData, type StudentData, type AssignmentData } from "../lib/educator-store";

describe("educator-store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    useEducatorStore.setState({
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
    });
  });

  describe("store initial state", () => {
    it("initializes with empty classrooms", () => {
      const state = useEducatorStore.getState();
      expect(state.classrooms).toEqual([]);
      expect(state.selectedClassroom).toBeNull();
    });

    it("initializes with empty students list", () => {
      const state = useEducatorStore.getState();
      expect(state.students).toEqual([]);
    });

    it("initializes with empty assignments", () => {
      const state = useEducatorStore.getState();
      expect(state.assignments).toEqual([]);
    });
  });

  describe("classroom management", () => {
    it("loads classrooms", () => {
      const classrooms: ClassroomData[] = [
        {
          id: 1,
          name: "Grade 3A",
          gradeLevel: "3",
          joinCode: "A1B2C3",
          description: "Third grade class",
          studentCount: 25,
        },
        {
          id: 2,
          name: "Grade 3B",
          gradeLevel: "3",
          joinCode: "D4E5F6",
        },
      ];
      const store = useEducatorStore.getState();
      store.loadClassrooms(classrooms);
      expect(useEducatorStore.getState().classrooms).toEqual(classrooms);
    });

    it("selects a classroom", () => {
      const classroom: ClassroomData = {
        id: 1,
        name: "Grade 3A",
        gradeLevel: "3",
        joinCode: "A1B2C3",
      };
      const store = useEducatorStore.getState();
      store.selectClassroom(classroom);
      expect(useEducatorStore.getState().selectedClassroom).toEqual(classroom);
    });

    it("clears selected classroom", () => {
      const classroom: ClassroomData = {
        id: 1,
        name: "Grade 3A",
        gradeLevel: "3",
        joinCode: "A1B2C3",
      };
      const store = useEducatorStore.getState();
      store.selectClassroom(classroom);
      store.selectClassroom(null);
      expect(useEducatorStore.getState().selectedClassroom).toBeNull();
    });

    it("adds a new classroom", () => {
      const newClassroom: ClassroomData = {
        id: 1,
        name: "Grade 4A",
        gradeLevel: "4",
        joinCode: "NEW123",
      };
      const store = useEducatorStore.getState();
      store.addClassroom(newClassroom);
      expect(useEducatorStore.getState().classrooms).toContain(newClassroom);
    });

    it("updates an existing classroom", () => {
      const classroom: ClassroomData = {
        id: 1,
        name: "Grade 3A",
        gradeLevel: "3",
        joinCode: "A1B2C3",
      };
      const store = useEducatorStore.getState();
      store.addClassroom(classroom);

      const updated: ClassroomData = {
        ...classroom,
        name: "Grade 3A Advanced",
        description: "Advanced students",
      };
      store.updateClassroom(updated);

      const state = useEducatorStore.getState();
      const found = state.classrooms.find((c) => c.id === 1);
      expect(found?.name).toBe("Grade 3A Advanced");
    });
  });

  describe("student management", () => {
    it("loads students", () => {
      const students: StudentData[] = [
        {
          id: 1,
          name: "Alice",
          readingLevel: "3.5",
          storiesCompleted: 15,
          storiesAssigned: 20,
          completionPercentage: 75,
          weeklyActivityCount: 5,
          currentStreak: 7,
        },
        {
          id: 2,
          name: "Bob",
          readingLevel: "3.2",
          storiesCompleted: 12,
          storiesAssigned: 20,
          completionPercentage: 60,
          weeklyActivityCount: 3,
          currentStreak: 2,
        },
      ];
      const store = useEducatorStore.getState();
      store.loadStudents(students);
      expect(useEducatorStore.getState().students).toEqual(students);
    });

    it("adds a new student", () => {
      const student: StudentData = {
        id: 1,
        name: "Charlie",
        readingLevel: "3.8",
        storiesCompleted: 20,
        storiesAssigned: 20,
        completionPercentage: 100,
        weeklyActivityCount: 7,
        currentStreak: 14,
      };
      const store = useEducatorStore.getState();
      store.addStudent(student);
      expect(useEducatorStore.getState().students).toContain(student);
    });

    it("updates student progress", () => {
      const student: StudentData = {
        id: 1,
        name: "Diana",
        readingLevel: "3.0",
        storiesCompleted: 10,
        storiesAssigned: 15,
        completionPercentage: 67,
        weeklyActivityCount: 3,
        currentStreak: 3,
      };
      const store = useEducatorStore.getState();
      store.addStudent(student);

      store.updateStudentProgress(1, {
        storiesCompleted: 11,
        completionPercentage: 73,
        weeklyActivityCount: 4,
      });

      const state = useEducatorStore.getState();
      const updated = state.students.find((s) => s.id === 1);
      expect(updated?.storiesCompleted).toBe(11);
      expect(updated?.weeklyActivityCount).toBe(4);
    });

    it("tracks multiple students", () => {
      const students: StudentData[] = [
        {
          id: 1,
          name: "Student 1",
          readingLevel: "3",
          storiesCompleted: 10,
          storiesAssigned: 10,
          completionPercentage: 100,
          weeklyActivityCount: 5,
          currentStreak: 5,
        },
        {
          id: 2,
          name: "Student 2",
          readingLevel: "2.5",
          storiesCompleted: 5,
          storiesAssigned: 10,
          completionPercentage: 50,
          weeklyActivityCount: 2,
          currentStreak: 1,
        },
      ];
      const store = useEducatorStore.getState();
      store.loadStudents(students);
      expect(useEducatorStore.getState().students).toHaveLength(2);
    });
  });

  describe("assignment management", () => {
    it("loads assignments", () => {
      const assignments: AssignmentData[] = [
        {
          id: 1,
          classroomId: 1,
          arcId: 100,
          instructions: "Read and discuss",
          dueDate: new Date("2026-12-31"),
        },
      ];
      const store = useEducatorStore.getState();
      store.loadAssignments(assignments);
      expect(useEducatorStore.getState().assignments).toEqual(assignments);
    });

    it("adds a new assignment", () => {
      const assignment: AssignmentData = {
        id: 1,
        classroomId: 1,
        arcId: 100,
        instructions: "Complete the story",
      };
      const store = useEducatorStore.getState();
      store.addAssignment(assignment);
      expect(useEducatorStore.getState().assignments).toContain(assignment);
    });

    it("updates an assignment", () => {
      const assignment: AssignmentData = {
        id: 1,
        classroomId: 1,
        arcId: 100,
        instructions: "Read the story",
      };
      const store = useEducatorStore.getState();
      store.addAssignment(assignment);

      const updated: AssignmentData = {
        ...assignment,
        instructions: "Read and analyze the story",
      };
      store.updateAssignment(updated);

      const state = useEducatorStore.getState();
      const found = state.assignments.find((a) => a.id === 1);
      expect(found?.instructions).toBe("Read and analyze the story");
    });

    it("tracks completion status per student", () => {
      const assignment: AssignmentData = {
        id: 1,
        classroomId: 1,
        arcId: 100,
        completionStatus: {
          1: "completed",
          2: "in_progress",
          3: "not_started",
        },
      };
      const store = useEducatorStore.getState();
      store.addAssignment(assignment);

      const state = useEducatorStore.getState();
      const found = state.assignments.find((a) => a.id === 1);
      expect(found?.completionStatus?.[1]).toBe("completed");
      expect(found?.completionStatus?.[2]).toBe("in_progress");
      expect(found?.completionStatus?.[3]).toBe("not_started");
    });
  });

  describe("assessment management", () => {
    it("loads assessments", () => {
      const assessments = [
        {
          id: 1,
          studentId: 1,
          episodeId: 100,
          gradeLevel: "3",
          score: 85,
          createdAt: new Date(),
        },
      ];
      const store = useEducatorStore.getState();
      store.loadAssessments(assessments as any);
      expect(useEducatorStore.getState().assessments).toEqual(assessments);
    });

    it("adds a new assessment", () => {
      const assessment = {
        id: 1,
        studentId: 1,
        episodeId: 100,
        gradeLevel: "3",
        score: 90,
      };
      const store = useEducatorStore.getState();
      store.addAssessment(assessment as any);
      expect(useEducatorStore.getState().assessments).toContain(assessment);
    });
  });

  describe("analytics", () => {
    it("loads class analytics", () => {
      const analytics = {
        totalReadingTime: 1500,
        averageReadingTime: 150,
        studentsEngaged: 20,
        totalStudents: 25,
        readingLevelDistribution: {
          "2.5": 5,
          "3.0": 12,
          "3.5": 8,
        },
        mostPopularTheme: "adventure",
        studentsNeedingAttention: [],
        topPerformers: [],
      };
      const store = useEducatorStore.getState();
      store.loadAnalytics(analytics as any);
      expect(useEducatorStore.getState().classAnalytics).toEqual(analytics);
    });

    it("identifies top performers", () => {
      const topPerformers: StudentData[] = [
        {
          id: 1,
          name: "Star Student",
          readingLevel: "4.5",
          storiesCompleted: 50,
          storiesAssigned: 50,
          completionPercentage: 100,
          weeklyActivityCount: 7,
          currentStreak: 30,
        },
      ];

      const analytics = {
        totalReadingTime: 1500,
        averageReadingTime: 150,
        studentsEngaged: 25,
        totalStudents: 25,
        readingLevelDistribution: {},
        mostPopularTheme: "adventure",
        studentsNeedingAttention: [],
        topPerformers: topPerformers,
      };

      const store = useEducatorStore.getState();
      store.loadAnalytics(analytics as any);
      expect(useEducatorStore.getState().classAnalytics?.topPerformers).toEqual(topPerformers);
    });

    it("identifies students needing attention", () => {
      const needingAttention: StudentData[] = [
        {
          id: 2,
          name: "Struggling Student",
          readingLevel: "2.0",
          storiesCompleted: 2,
          storiesAssigned: 20,
          completionPercentage: 10,
          weeklyActivityCount: 0,
          currentStreak: 0,
        },
      ];

      const analytics = {
        totalReadingTime: 1500,
        averageReadingTime: 150,
        studentsEngaged: 24,
        totalStudents: 25,
        readingLevelDistribution: {},
        mostPopularTheme: null,
        studentsNeedingAttention: needingAttention,
        topPerformers: [],
      };

      const store = useEducatorStore.getState();
      store.loadAnalytics(analytics as any);
      expect(useEducatorStore.getState().classAnalytics?.studentsNeedingAttention).toEqual(needingAttention);
    });
  });

  describe("loading states", () => {
    it("sets loading state for classrooms", () => {
      const store = useEducatorStore.getState();
      store.setLoadingClassrooms(true);
      expect(useEducatorStore.getState().loadingClassrooms).toBe(true);
      store.setLoadingClassrooms(false);
      expect(useEducatorStore.getState().loadingClassrooms).toBe(false);
    });

    it("sets loading state for students", () => {
      const store = useEducatorStore.getState();
      store.setLoadingStudents(true);
      expect(useEducatorStore.getState().loadingStudents).toBe(true);
      store.setLoadingStudents(false);
      expect(useEducatorStore.getState().loadingStudents).toBe(false);
    });

    it("sets loading state for assignments", () => {
      const store = useEducatorStore.getState();
      store.setLoadingAssignments(true);
      expect(useEducatorStore.getState().loadingAssignments).toBe(true);
      store.setLoadingAssignments(false);
      expect(useEducatorStore.getState().loadingAssignments).toBe(false);
    });

    it("sets loading state for analytics", () => {
      const store = useEducatorStore.getState();
      store.setLoadingAnalytics(true);
      expect(useEducatorStore.getState().loadingAnalytics).toBe(true);
      store.setLoadingAnalytics(false);
      expect(useEducatorStore.getState().loadingAnalytics).toBe(false);
    });
  });

  describe("classroom workflow", () => {
    it("supports full classroom workflow", () => {
      const store = useEducatorStore.getState();

      // Create classroom
      const classroom: ClassroomData = {
        id: 1,
        name: "Grade 3A",
        gradeLevel: "3",
        joinCode: "ABC123",
      };
      store.addClassroom(classroom);
      store.selectClassroom(classroom);

      // Add students
      const students: StudentData[] = [
        {
          id: 1,
          name: "Alice",
          readingLevel: "3.5",
          storiesCompleted: 10,
          storiesAssigned: 15,
          completionPercentage: 67,
          weeklyActivityCount: 3,
          currentStreak: 3,
        },
      ];
      store.loadStudents(students);

      // Create assignment
      const assignment: AssignmentData = {
        id: 1,
        classroomId: 1,
        arcId: 100,
      };
      store.addAssignment(assignment);

      const state = useEducatorStore.getState();
      expect(state.classrooms).toHaveLength(1);
      expect(useEducatorStore.getState().students).toHaveLength(1);
      expect(useEducatorStore.getState().assignments).toHaveLength(1);
    });
  });

  describe("multiple classrooms", () => {
    it("manages multiple classrooms independently", () => {
      const store = useEducatorStore.getState();

      const classroom1: ClassroomData = {
        id: 1,
        name: "Grade 3A",
        gradeLevel: "3",
        joinCode: "A",
        studentCount: 20,
      };

      const classroom2: ClassroomData = {
        id: 2,
        name: "Grade 4B",
        gradeLevel: "4",
        joinCode: "B",
        studentCount: 22,
      };

      store.addClassroom(classroom1);
      store.addClassroom(classroom2);

      store.selectClassroom(classroom1);
      expect(useEducatorStore.getState().selectedClassroom?.id).toBe(1);

      store.selectClassroom(classroom2);
      expect(useEducatorStore.getState().selectedClassroom?.id).toBe(2);
    });
  });
});
