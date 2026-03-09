-- =============================================
-- 카테고리 마스터 테이블 마이그레이션
-- Supabase SQL Editor에서 실행할 것
-- =============================================

-- 1. 기존 테스트 데이터 삭제
DELETE FROM exam_words;
DELETE FROM exams;
DELETE FROM words;
DELETE FROM categories;

-- 2. 출판사 마스터 (모든 사용자 공유)
CREATE TABLE IF NOT EXISTS publishers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('중등', '고등')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, level)
);

-- 3. 대단원 마스터 (출판사 + 학년별)
CREATE TABLE IF NOT EXISTS major_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, publisher_id, grade)
);

-- 4. 소단원 마스터 (대단원별)
CREATE TABLE IF NOT EXISTS sub_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  major_chapter_id UUID NOT NULL REFERENCES major_chapters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, major_chapter_id)
);

-- 5. 학교 마스터 (외부지문용)
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 프린트/작품명 마스터 (학교별)
CREATE TABLE IF NOT EXISTS school_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_publishers_level ON publishers(level);
CREATE INDEX IF NOT EXISTS idx_major_chapters_publisher ON major_chapters(publisher_id);
CREATE INDEX IF NOT EXISTS idx_major_chapters_grade ON major_chapters(grade);
CREATE INDEX IF NOT EXISTS idx_sub_chapters_major ON sub_chapters(major_chapter_id);
CREATE INDEX IF NOT EXISTS idx_school_materials_school ON school_materials(school_id);

-- RLS 활성화
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_materials ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기/쓰기 가능 (공유 데이터)
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
