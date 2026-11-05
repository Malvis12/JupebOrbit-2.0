export interface UserProfile {
  uid: string;
  email?: string | null;
  username?: string;
  tagline?: string;
  combination?: string[];
  targetCourse?: string;
  targetUniversity?: string;
  dailyStreak?: number;
  lastDailyQuizDate?: string;
  onboardingComplete?: boolean;
  aggregateScore?: number;
  mastery?: Record<string, number>;
  subjectGrades?: Record<string, string>;
  hasAdmissionRisk?: boolean;
  bonusPointAwarded?: boolean;
  lastCalculated?: string;
  role?: 'admin' | 'user'; // Added for role-based access control
}

export interface QuestionExplanation {
  coreConcept?: string;
  steps?: string;
  pitfall?: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: QuestionExplanation;
  syllabusTopic?: string;
  subject?: string;
  year?: string;
}

export interface ExamHistoryItem {
  id?: string;
  subject: string;
  year: string;
  score: number;
  maxScore: number;
  timestamp: string;
  mode: string;
  grade: string;
}

export interface WeaknessItem {
  id: string;
  title: string;
  topic: string;
  qId: string;
  subject?: string;
  options?: string[];
  correctAnswerIndex?: number;
  explanation?: QuestionExplanation;
  addedAt: string;
  source: string;
  srsLevel: number;
  nextReviewDate: string;
  lastCorrect?: string;
}

export interface Formula {
  name: string;
  latex: string;
  description: string;
}

export interface FormulaTopic {
  topic: string;
  formulas: Formula[];
}

export type SubjectFormulaMap = Record<string, FormulaTopic[]>;