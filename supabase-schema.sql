-- =============================================
-- Voca Master - Supabase 테이블 스키마
-- =============================================

-- 1. 카테고리 테이블 (중등/고등 > 학년 > 출판사 > 대단원 > 소단원)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('중등', '고등', '외부지문 및 프린트')),
  grade TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
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

-- 인덱스
CREATE INDEX idx_words_category ON words(category_id);
CREATE INDEX idx_exam_words_exam ON exam_words(exam_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_exams_user ON exams(user_id);

-- RLS (Row Level Security) 정책
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_words ENABLE ROW LEVEL SECURITY;

-- 카테고리: 본인 데이터만 접근
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 단어: 본인 카테고리의 단어만 접근
CREATE POLICY "Users can manage words in own categories"
  ON words FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = words.category_id
      AND categories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = words.category_id
      AND categories.user_id = auth.uid()
    )
  );

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
