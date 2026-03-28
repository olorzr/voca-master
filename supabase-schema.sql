-- =============================================
-- Voca Master - Supabase 테이블 스키마
-- =============================================

-- 1. 카테고리 테이블 (중등/고등 > 학년 > 출판사 > 학기 > 대단원 > 소단원)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('중등', '고등', '외부지문 및 프린트')),
  grade TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  semester TEXT NOT NULL DEFAULT '',
  chapter TEXT NOT NULL DEFAULT '',
  sub_chapter TEXT NOT NULL DEFAULT '',
  school_name TEXT DEFAULT '',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 단어 테이블
CREATE TABLE words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 시험지 테이블
CREATE TABLE exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  pass_percentage INT NOT NULL DEFAULT 80,
  total_questions INT NOT NULL DEFAULT 0,
  pass_count INT NOT NULL DEFAULT 0,
  category_ids UUID[] DEFAULT '{}',
  word_ids UUID[] DEFAULT '{}',
  parent_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  retake_number INT DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 시험지 단어 테이블 (시험지에 포함된 단어 스냅샷)
CREATE TABLE exam_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  word_id UUID NOT NULL,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  order_index INT DEFAULT 0
);

-- 5. 출판사 마스터 (모든 사용자 공유)
CREATE TABLE publishers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('중등', '고등')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, level)
);

-- 6. 대단원 마스터 (출판사 + 학년 + 학기별)
CREATE TABLE major_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT '1학기',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, publisher_id, grade, semester)
);

-- 7. 소단원 마스터 (대단원별)
CREATE TABLE sub_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  major_chapter_id UUID NOT NULL REFERENCES major_chapters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, major_chapter_id)
);

-- 8. 학교 마스터 (외부지문용)
CREATE TABLE schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 프린트/작품명 마스터 (학교별)
CREATE TABLE school_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

-- 인덱스
CREATE INDEX idx_words_category ON words(category_id);
CREATE INDEX idx_exam_words_exam ON exam_words(exam_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_exams_user ON exams(user_id);
CREATE INDEX idx_exams_parent ON exams(parent_exam_id);
CREATE INDEX idx_publishers_level ON publishers(level);
CREATE INDEX idx_major_chapters_publisher ON major_chapters(publisher_id);
CREATE INDEX idx_major_chapters_grade ON major_chapters(grade);
CREATE INDEX idx_sub_chapters_major ON sub_chapters(major_chapter_id);
CREATE INDEX idx_school_materials_school ON school_materials(school_id);

-- RLS (Row Level Security) 정책
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_words ENABLE ROW LEVEL SECURITY;

-- 카테고리: 모든 인증된 사용자 접근 가능 (학원 공유)
CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 단어: 모든 인증된 사용자 접근 가능 (학원 공유)
CREATE POLICY "Authenticated users can manage words"
  ON words FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 시험지: 본인 시험지만 접근
CREATE POLICY "Users can manage own exams"
  ON exams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 시험지 단어: 본인 시험지의 단어만 접근
CREATE POLICY "Users can manage own exam words"
  ON exam_words FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_words.exam_id
      AND exams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_words.exam_id
      AND exams.user_id = auth.uid()
    )
  );

-- 마스터 테이블: 모든 인증된 사용자 접근 가능 (공유 데이터)
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage publishers"
  ON publishers FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage major_chapters"
  ON major_chapters FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage sub_chapters"
  ON sub_chapters FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage schools"
  ON schools FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage school_materials"
  ON school_materials FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER words_updated_at
  BEFORE UPDATE ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
