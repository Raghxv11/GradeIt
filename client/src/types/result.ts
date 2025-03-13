// Types for result page
export interface CriterionData {
  criteria: string;
  scored: number;
  total: number;
}

export interface VisualizationData {
  criteria: CriterionData[];
  percentage_grade: number;
  letter_grade: string;
}

// Interface for grade data in the new JSON format
export interface GradeData {
  score: string;
  total: string;
  comment: string;
}

// Interface for a single result in the new JSON format
export interface ResultItem {
  assignmentUrl: string;
  grades: Record<string, GradeData>;
  letter_grade: string;
  overall_feedback: string;
  studentId: string;
  total_percentage_grade: string;
}

export interface AssignmentResult {
  fileName: string;
  content: string;
  rawData?: ResultItem; // For the new JSON format
}

export interface PlagiarismResult {
  comparisonPercentage: number;
  originalityScores?: Record<string, number>; // Map of filename to originality percentage
}

export interface Section {
  title: string;
  grade: string;
  description: string;
}

// Interface for Student data
export interface Student {
  id: string;
  name: string;
  finalProject?: number;
  [key: string]: any; // Allow for other properties
}

// Interface for Firebase result data
export interface FirebaseResult {
  id?: string;
  results?: AssignmentResult[];
  response?: string;
  visualizationData?: VisualizationData;
  plagiarismResult?: PlagiarismResult;
  timestamp?: any;
  rawData?: {
    assignmentUrls: string[];
    createdAt: string;
    meta: {
      savedFrom: string;
      version: string;
    };
    results: ResultItem[];
  };
  createdAt?: string;
  assignmentUrls?: string[];
  meta?: {
    savedFrom: string;
    version: string;
  };
}

export interface ParsedResult {
  sections: Section[];
  totalGrade: string;
  letterGrade: string;
  overallFeedback: string;
}
