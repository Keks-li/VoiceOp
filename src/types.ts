export type ThemeMode = 'light' | 'dark';

export type PrimaryColor = 'purple' | 'blue' | 'green' | 'amber';

export type FontFamily = 'sans' | 'serif' | 'mono';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Week {
  id: string;
  weekNumber: number;
  title: string;
  content: string;
  simplifiedContent?: string;
  quiz?: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  instructorName: string;
  description: string;
  weeks: Week[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface AppState {
  themeMode: ThemeMode;
  primaryColor: PrimaryColor;
  fontFamily: FontFamily;
  fontSize: FontSize;
}

export interface VoiceCommand {
  phrase: string;
  action: string;
  category: string;
}

// ─── Assignment System ────────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string; // ISO date string
  createdAt: string;
  maxScore: number; // e.g. 100
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  textContent: string;
  /** Base64-encoded PDF content (data URL) */
  fileDataUrl?: string;
  fileName?: string;
  submittedAt: string;
  /** Instructor-provided grade (0-maxScore) */
  grade?: number;
  /** Instructor feedback text */
  feedback?: string;
}

// ─── Enrollment System ────────────────────────────────────────────────────────

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  studentName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface ParsedVoiceCommand {
  command:
    | 'navigation:list'
    | 'navigation:create'
    | 'navigation:assignments'
    | 'navigation:students'
    | 'navigation:catalog'
    | 'course:select'
    | 'course:simplify'
    | 'course:speak'
    | 'course:create_ai'
    | 'accessibility:font_larger'
    | 'accessibility:font_smaller'
    | 'accessibility:theme_dark'
    | 'accessibility:theme_light'
    | 'quiz:select'
    | 'quiz:submit'
    | 'assignment:submit'
    | 'unknown';
  params?: {
    courseTitle?: string;
    topic?: string;
    questionNumber?: number; // 1-indexed
    optionLetter?: string; // 'A', 'B', 'C', 'D'
  };
}


