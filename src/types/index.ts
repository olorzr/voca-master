export interface Word {
  id: string;
  word: string;
  meaning: string;
  category_id: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  level: '중등' | '고등' | '외부지문 및 프린트';
  grade: string;
  publisher: string;
  chapter: string;
  sub_chapter: string;
  school_name?: string;
  user_id: string;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  pass_percentage: number;
  total_questions: number;
  pass_count: number;
  category_ids: string[];
  word_ids: string[];
  user_id: string;
  created_at: string;
}

export interface ExamWord {
  id: string;
  exam_id: string;
  word_id: string;
  word: string;
  meaning: string;
  order_index: number;
}

export type CategoryLevel = '중등' | '고등' | '외부지문 및 프린트';
