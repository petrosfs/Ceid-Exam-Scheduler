export enum CourseCategory {
  NEO_PPS = 'Νέο ΠΠΣ',
  PPS = 'ΠΠΣ',
  EPI_DIPLOMATI = 'Επί Διπλώματι',
  EPILOGIS = 'Επιλογής',
  UNKNOWN = 'Άγνωστο'
}

export interface Exam {
  id: string;
  name: string;
  code?: string;
  semester: string;
  room: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  category: CourseCategory; // Was 'type'
  format?: string; // e.g., "Written", "Multiple Choice"
  rawDate?: string;
}

export interface ExamWithSelection extends Exam {
  selected: boolean;
  reminders: number[]; // Array of reminder minutes
}

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'confirming' | 'success' | 'error';

export interface ParseResult {
  exams: Exam[];
  totalFound: number;
}

export type Language = 'el' | 'en';

export type Theme = 'light' | 'dark';