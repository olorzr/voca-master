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

/** 출판사 마스터 (모든 사용자 공유) */
export interface Publisher {
  id: string;
  name: string;
  level: '중등' | '고등';
  created_at: string;
}

/** 대단원 마스터 (출판사 + 학년별) */
export interface MajorChapter {
  id: string;
  name: string;
  publisher_id: string;
  grade: string;
  created_at: string;
}

/** 소단원 마스터 (대단원별) */
export interface SubChapter {
  id: string;
  name: string;
  major_chapter_id: string;
  created_at: string;
}

/** 학교 마스터 (외부지문용, 모든 사용자 공유) */
export interface School {
  id: string;
  name: string;
  created_at: string;
}

/** 프린트/작품명 마스터 (학교별) */
export interface SchoolMaterial {
  id: string;
  name: string;
  school_id: string;
  created_at: string;
}
