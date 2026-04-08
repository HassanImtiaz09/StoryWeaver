# StoryWeaver Educator Edition - Implementation Guide

## Overview

The Educator/Classroom Edition for StoryWeaver enables teachers to manage classrooms, assign stories to students, track reading progress, and generate AI-powered reading assessments. This document outlines the complete implementation.

## Architecture

### Database Schema Extensions

**New Tables** (`drizzle/schema.ts`):

- `classrooms` - Classroom records with unique join codes
- `classroomStudents` - Many-to-many relationship between classrooms and students
- `storyAssignments` - Assignments of stories to classes with optional due dates
- `studentAssignmentProgress` - Track individual student completion of assignments
- `assessments` - Reading comprehension assessments with AI-generated questions

### Core Services

#### 1. Educator Service (`server/_core/educatorService.ts`)

Main business logic for classroom management:

**Classroom Management:**
- `createClassroom(teacherId, className, gradeLevel)` - Create new classroom with unique join code
- `getTeacherClassrooms(teacherId)` - Get all classrooms for a teacher
- `getClassroomDetail(classroomId)` - Get classroom info with student count
- `addStudentsToClassroom(classroomId, childIds[])` - Bulk add students
- `removeStudent(classroomId, childId)` - Remove student from classroom

**Story Assignments:**
- `assignStory(classroomId, arcId, dueDate?, instructions?)` - Assign story to entire class
- `getClassroomAssignments(classroomId)` - List all assignments
- Auto-initializes progress tracking for all students

**Progress Tracking:**
- `getClassProgress(classroomId)` - Class-wide reading metrics
- `getStudentProgress(classroomId, studentId)` - Individual metrics including:
  - Stories completed/assigned
  - Completion percentage
  - Weekly activity count
  - Current reading streak
  - Reading level
  - Last active date

**Assessments:**
- `generateReadingAssessment(episodeId, gradeLevel, studentId)` - AI-generates comprehension questions
- `gradeAssessment(assessmentId, answers)` - Auto-scores and provides feedback
- `scoreShortAnswer(question, studentAnswer, correctAnswer)` - AI-powered scoring for open-ended

**Analytics:**
- `getClassAnalytics(classroomId, period)` - Aggregate statistics including:
  - Total and average reading time
  - Student engagement rate
  - Reading level distribution
  - Most popular themes
  - Students needing attention
  - Top performers
- `generateProgressReport(classroomId)` - Printable class report

**Recommendations:**
- `getReadingLevelRecommendation(studentId)` - AI suggests next reading level based on progress

#### 2. Assessment Generator (`server/_core/assessmentGenerator.ts`)

AI-powered assessment creation using Claude:

**Question Types Generated:**
- Multiple Choice (age-appropriate options)
- True/False (literal comprehension)
- Short Answer (open-ended responses)
- Vocabulary (word definitions in context)
- Sequencing (event ordering)

**Functions:**
- `generateComprehensionQuestions(storyText, gradeLevel, count)` - Creates 1-10 questions
- `generateVocabularyQuiz(storyText, gradeLevel, count)` - Extracts vocabulary
- `generateCreativePrompt(storyTheme, storyTitle, gradeLevel)` - Writing prompts
- `scoreShortAnswer(question, answer, expectedAnswer, gradeLevel)` - AI scoring with rubric
- `analyzeStudentPerformance(scores[], gradeLevel)` - Performance analysis with recommendations

**Grade-Level Adaptation:**
- K-2: Simple, literal comprehension
- 3-4: Inferential thinking
- 5-6: Critical analysis

### State Management

#### Educator Store (`lib/educator-store.ts`)

Zustand store for client-side state:

```typescript
// State
- classrooms: ClassroomData[]
- selectedClassroom: ClassroomData | null
- students: StudentData[]
- assignments: AssignmentData[]
- assessments: AssessmentData[]
- classAnalytics: ClassAnalyticsData | null

// Loading states
- loadingClassrooms
- loadingStudents
- loadingAssignments
- loadingAssessments
- loadingAnalytics

// Actions
- loadClassrooms(classrooms)
- selectClassroom(classroom)
- addClassroom(classroom)
- updateClassroom(classroom)
- loadStudents(students)
- updateStudentProgress(studentId, progress)
- loadAssignments(assignments)
- addAssignment(assignment)
- loadAnalytics(analytics)
- clearData()
```

Uses AsyncStorage for persistence.

### UI Components

#### 1. ClassroomCard (`components/classroom-card.tsx`)
- Displays classroom overview
- Grade-level color coding
- Student count badge
- Reading progress bar
- Quick stats (active students, avg reading time)
- Touch to view details

#### 2. StudentProgressRow (`components/student-progress-row.tsx`)
- Student avatar with reading level color
- Name and progress badges
- Stories completed/assigned
- Current streak indicator
- Last active date
- Progress bar
- Touch for details

#### 3. AssignmentCard (`components/assignment-card.tsx`)
- Story title and theme indicator
- Due date with overdue highlighting
- Completion progress bar (X of Y students)
- Custom instructions
- Status badge (Active/Complete/Overdue)
- View Details and Extend Deadline buttons

#### 4. AssessmentView (`components/assessment-view.tsx`)
- Question display with type-specific UI
- Multiple choice (radio buttons)
- True/False (toggle buttons)
- Short answer (text input)
- Vocabulary (definition + answer)
- Sequencing (order input)
- Navigation (Previous/Next/Submit)
- Results view after submission with feedback

#### 5. ClassAnalyticsSummary (`components/class-analytics-summary.tsx`)
- Overview statistics (total time, avg, engagement, active students)
- Reading level distribution pie chart
- Most popular theme card
- Students needing attention list
- Top performers leaderboard

### Screen Routes

#### 1. Educator Dashboard (`app/educator-dashboard.tsx`)
- Lists all teacher's classrooms
- Create classroom button
- Refresh capability
- Empty state with CTA
- Statistics per classroom

#### 2. Classroom Detail (`app/classroom-detail.tsx`)
- Tab navigation (Students/Assignments/Analytics)
- Student list with progress
- Assignment list with management
- Class analytics dashboard
- Quick action buttons (Assign Story, Generate Assessment, Export Report)

### tRPC Router (`server/_core/educatorRouter.ts`)

All endpoints protected with `protectedProcedure`:

**Classroom Routes:**
- `educator.createClassroom(name, gradeLevel, description?)`
- `educator.getMyClassrooms()`
- `educator.getClassroomDetail(classroomId)`
- `educator.addStudentsToClassroom(classroomId, childIds[])`
- `educator.removeStudent(classroomId, studentId)`

**Assignment Routes:**
- `educator.assignStory(classroomId, arcId, dueDate?, instructions?)`
- `educator.getClassroomAssignments(classroomId)`

**Progress Routes:**
- `educator.getClassProgress(classroomId)`
- `educator.getStudentProgress(classroomId, studentId)`
- `educator.getClassAnalytics(classroomId, period?)`
- `educator.generateProgressReport(classroomId)`
- `educator.getReadingLevelRecommendation(studentId)`

**Assessment Routes:**
- `educator.generateAssessment(episodeId, gradeLevel, studentId, assignmentId?)`
- `educator.gradeAssessment(assessmentId, answers)`
- `educator.generateComprehensionQuestions(storyText, gradeLevel, count?)`
- `educator.generateVocabularyQuiz(storyText, gradeLevel, count?)`
- `educator.generateCreativePrompt(storyTheme, storyTitle, gradeLevel)`
- `educator.generateFullAssessment(episodeText, storyTheme, gradeLevel)`
- `educator.analyzeStudentPerformance(assessmentScores[], studentGradeLevel)`
- `educator.getAssessment(assessmentId)`

### Settings Integration

Added to `lib/settings-store.ts`:

```typescript
educatorModeEnabled: boolean // default: false
defaultGradeLevel: string    // default: "K"
```

## Data Flow

### Assignment Workflow

1. Teacher creates classroom (join code generated)
2. Students join via join code
3. Teacher assigns story to classroom
4. System auto-creates progress tracking for all students
5. Students read story
6. Teacher views progress in real-time
7. Teacher generates assessment
8. Students complete assessment
9. System auto-scores and provides feedback
10. Teacher views analytics and generates report

### Assessment Workflow

1. Teacher initiates assessment for episode
2. System calls Claude API to generate comprehension questions
3. Questions stored in assessments table
4. Student answers questions (typed/selected)
5. System scores (auto for MC/T-F, AI for short-answer)
6. Feedback generated
7. Results stored with grade

## Database Queries

### Key Patterns

**Get Class Progress:**
```sql
SELECT cs.childId, c.name, c.readingLevel
FROM classroomStudents cs
JOIN children c ON cs.childId = c.id
WHERE cs.classroomId = ?
```

**Get Assignment Progress:**
```sql
SELECT sap.status, COUNT(*) as count
FROM studentAssignmentProgress sap
WHERE sap.assignmentId = ?
GROUP BY sap.status
```

**Get Weekly Activity:**
```sql
SELECT COUNT(*) as count
FROM readingActivity
WHERE childId = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
```

## AI Integration

Uses existing `getDefaultProvider()` (Claude Sonnet) for:

- Question generation (comprehension, vocabulary, creative)
- Short answer scoring with rubric feedback
- Performance analysis and recommendations
- Reading level advancement suggestions

All AI calls include:
- Grade-level context for age-appropriate output
- Story text/context for relevance
- Clear JSON schema expectations

## Scalability Considerations

**Performance:**
- Queries use indexes on classroomId, childId, assignmentId
- AsyncStorage caching reduces API calls
- Batch operations for bulk student operations

**Data:**
- Assessment questions stored as JSON for flexibility
- Analytics cached per classroom per period
- Pagination ready (can add LIMIT/OFFSET to queries)

## Future Enhancements

**Phase 2:**
- Real-time notifications for new activity
- Detailed student detail screens
- Parent notifications and consent
- Bulk import students (CSV)
- Custom reading level scales
- Classroom invitations (email/link)

**Phase 3:**
- Differentiated instruction (reading groups)
- Parent-teacher communication channel
- Integration with Google Classroom
- Standards-aligned assessments
- Personalized learning paths
- Book checkout/library management

**Phase 4:**
- Machine learning for reading level prediction
- Predictive analytics for at-risk students
- Automated intervention recommendations
- Advanced NLP for essay evaluation
- Bilingual assessment support

## Testing Checklist

- [ ] Create classroom (verify join code unique)
- [ ] Add students to classroom
- [ ] Remove student from classroom
- [ ] Assign story to classroom
- [ ] View class progress
- [ ] View student progress
- [ ] Generate comprehension assessment
- [ ] Grade assessment manually
- [ ] Grade assessment with AI
- [ ] View class analytics
- [ ] Generate progress report
- [ ] Get reading level recommendation
- [ ] Verify data persistence
- [ ] Test with 100+ students (scalability)
- [ ] Verify permission checks

## Security Notes

- All educator endpoints require authentication (`protectedProcedure`)
- Teachers can only access their own classrooms (enforced via teacherId)
- Student data automatically filtered to classroom membership
- AI prompts don't expose student names/personal info
- Assessment questions stored as teacher-created content
- No public access to classroom data

## Compliance

- COPPA compliant (parent consent already in place)
- Student data isolated per classroom
- No cross-classroom data leakage
- Assessment data stored securely
- Deletion cascades when classroom deleted

## Files Created/Modified

### New Files
- `/server/_core/educatorService.ts` (503 lines)
- `/server/_core/assessmentGenerator.ts` (413 lines)
- `/server/_core/educatorRouter.ts` (228 lines)
- `/lib/educator-store.ts` (213 lines)
- `/components/classroom-card.tsx` (141 lines)
- `/components/student-progress-row.tsx` (166 lines)
- `/components/assignment-card.tsx` (206 lines)
- `/components/assessment-view.tsx` (535 lines)
- `/components/class-analytics-summary.tsx` (290 lines)
- `/app/educator-dashboard.tsx` (193 lines)
- `/app/classroom-detail.tsx` (294 lines)

### Modified Files
- `/drizzle/schema.ts` (+6 tables, +6 type exports)
- `/server/routers.ts` (+2 lines import, +1 line router inclusion)
- `/lib/settings-store.ts` (+2 settings, +2 defaults)

## API Response Examples

### getClassProgress
```json
{
  "childId": 1,
  "name": "Emma",
  "storiesCompleted": 5,
  "storiesAssigned": 8,
  "completionPercentage": 62,
  "weeklyActivityCount": 4,
  "currentStreak": 3,
  "readingLevel": "2nd",
  "lastActive": "2024-04-07T15:30:00Z"
}
```

### getClassAnalytics
```json
{
  "totalReadingTime": 450,
  "averageReadingTime": 45,
  "studentsEngaged": 10,
  "totalStudents": 10,
  "readingLevelDistribution": {
    "1st": 3,
    "2nd": 5,
    "3rd": 2
  },
  "mostPopularTheme": "adventure",
  "studentsNeedingAttention": [...],
  "topPerformers": [...]
}
```

### generateAssessment Response
```json
{
  "id": 42,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is the main character's name?",
      "options": ["Anna", "Emma", "Charlotte", "Sofia"],
      "correctAnswer": "Emma"
    }
  ]
}
```

## License

Part of StoryWeaver - All rights reserved
