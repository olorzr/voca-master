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
  parent_exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
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

-- 시험지: 모든 인증된 사용자 공유 (감사 로그로 변경 이력 추적)
CREATE POLICY "Authenticated users can manage exams"
  ON exams FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 시험지 단어: 모든 인증된 사용자 공유
CREATE POLICY "Authenticated users can manage exam_words"
  ON exam_words FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

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

-- =============================================
-- 마스터 테이블 이름 변경 시 categories 자동 동기화 트리거
-- =============================================

-- 출판사명 변경 → categories.publisher 동기화
CREATE OR REPLACE FUNCTION sync_publisher_name()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE categories
    SET publisher = NEW.name
    WHERE publisher = OLD.name AND level = OLD.level;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_publisher_name_trigger
  AFTER UPDATE ON publishers
  FOR EACH ROW
  EXECUTE FUNCTION sync_publisher_name();

-- 대단원명 변경 → categories.chapter 동기화
CREATE OR REPLACE FUNCTION sync_major_chapter_name()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE categories
    SET chapter = NEW.name
    FROM publishers p
    WHERE categories.chapter = OLD.name
      AND categories.publisher = p.name
      AND categories.level = p.level
      AND categories.grade = OLD.grade
      AND categories.semester = OLD.semester
      AND p.id = OLD.publisher_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_major_chapter_name_trigger
  AFTER UPDATE ON major_chapters
  FOR EACH ROW
  EXECUTE FUNCTION sync_major_chapter_name();

-- 소단원명 변경 → categories.sub_chapter 동기화
CREATE OR REPLACE FUNCTION sync_sub_chapter_name()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE categories
    SET sub_chapter = NEW.name
    FROM major_chapters mc
    JOIN publishers p ON p.id = mc.publisher_id
    WHERE categories.sub_chapter = OLD.name
      AND categories.chapter = mc.name
      AND categories.publisher = p.name
      AND categories.level = p.level
      AND categories.grade = mc.grade
      AND categories.semester = mc.semester
      AND mc.id = OLD.major_chapter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_sub_chapter_name_trigger
  AFTER UPDATE ON sub_chapters
  FOR EACH ROW
  EXECUTE FUNCTION sync_sub_chapter_name();

-- 학교명 변경 → categories.school_name 동기화
CREATE OR REPLACE FUNCTION sync_school_name()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE categories
    SET school_name = NEW.name
    WHERE school_name = OLD.name
      AND level = '외부지문 및 프린트';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_school_name_trigger
  AFTER UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION sync_school_name();

-- 프린트/작품명 변경 → categories.chapter 동기화 (외부지문)
CREATE OR REPLACE FUNCTION sync_school_material_name()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    UPDATE categories
    SET chapter = NEW.name
    FROM schools s
    WHERE categories.chapter = OLD.name
      AND categories.school_name = s.name
      AND categories.level = '외부지문 및 프린트'
      AND s.id = OLD.school_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_school_material_name_trigger
  AFTER UPDATE ON school_materials
  FOR EACH ROW
  EXECUTE FUNCTION sync_school_material_name();

-- =============================================
-- 시험지/재시험 생성 RPC (원자성 보장)
-- =============================================
-- 클라이언트가 exams insert → exam_words insert 를 별도 호출하면 두 번째 insert 실패 시
-- 단어 없는 유령 시험지가 남는다. 함수 본문은 단일 트랜잭션이므로 어느 insert가 실패해도 전체 롤백된다.

-- user_id 는 supabase-migration-enforce-user-id.sql 의 BEFORE INSERT 트리거가
-- auth.uid() 로 채운다. 본 RPC 는 user_id 컬럼을 명시하지 않는다.
CREATE OR REPLACE FUNCTION create_exam_with_words(
  p_title TEXT,
  p_pass_percentage INT,
  p_total_questions INT,
  p_pass_count INT,
  p_category_ids UUID[],
  p_word_ids UUID[],
  p_words JSONB,
  p_parent_exam_id UUID DEFAULT NULL,
  p_retake_number INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_exam_id UUID;
BEGIN
  INSERT INTO exams (
    title, pass_percentage, total_questions, pass_count,
    category_ids, word_ids, parent_exam_id, retake_number
  )
  VALUES (
    p_title, p_pass_percentage, p_total_questions, p_pass_count,
    p_category_ids, p_word_ids, p_parent_exam_id, p_retake_number
  )
  RETURNING id INTO v_exam_id;

  INSERT INTO exam_words (exam_id, word_id, word, meaning, order_index)
  SELECT
    v_exam_id,
    (w->>'word_id')::UUID,
    w->>'word',
    w->>'meaning',
    (w->>'order_index')::INT
  FROM jsonb_array_elements(p_words) AS w;

  RETURN v_exam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_exam_with_words(
  TEXT, INT, INT, INT, UUID[], UUID[], JSONB, UUID, INT
) TO authenticated;
