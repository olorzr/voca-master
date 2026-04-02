-- =============================================
-- 시험지 공유 + 감사 로그 마이그레이션
-- 실행: Supabase SQL Editor에서 실행
-- =============================================

-- 1. 기존 RLS 정책 삭제 (이전 이름 + 현재 이름 모두 정리)
DROP POLICY IF EXISTS "Users can manage own exams" ON exams;
DROP POLICY IF EXISTS "Users can manage own exam words" ON exam_words;
DROP POLICY IF EXISTS "Authenticated users can manage exams" ON exams;
DROP POLICY IF EXISTS "Authenticated users can manage exam_words" ON exam_words;

-- 2. 새 RLS 정책: 모든 인증된 사용자 공유
CREATE POLICY "Authenticated users can manage exams"
  ON exams FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage exam_words"
  ON exam_words FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. exams 테이블에 감사 컬럼 추가
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 4. 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id UUID,
  actor_email TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 감사 로그 읽기: 관리자만 허용
DROP POLICY IF EXISTS "Admin can read audit_log" ON audit_log;
CREATE POLICY "Admin can read audit_log"
  ON audit_log FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ara0723@araeducation.co.kr'
  );

-- 감사 로그 쓰기: 트리거에서 SECURITY DEFINER로 삽입하므로 일반 INSERT 정책 불필요
-- 하지만 RLS가 활성화되어 있으므로 트리거 함수가 SECURITY DEFINER로 우회함
DROP POLICY IF EXISTS "System can insert audit_log" ON audit_log;
CREATE POLICY "System can insert audit_log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 5. 감사 트리거 함수: INSERT
CREATE OR REPLACE FUNCTION audit_exam_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, new_data)
  VALUES (
    'exams',
    NEW.id,
    'INSERT',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 감사 트리거 함수: UPDATE
CREATE OR REPLACE FUNCTION audit_exam_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = NOW();
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, old_data, new_data)
  VALUES (
    'exams',
    NEW.id,
    'UPDATE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 감사 트리거 함수: DELETE
CREATE OR REPLACE FUNCTION audit_exam_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, old_data)
  VALUES (
    'exams',
    OLD.id,
    'DELETE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 트리거 연결
DROP TRIGGER IF EXISTS audit_exam_insert_trigger ON exams;
CREATE TRIGGER audit_exam_insert_trigger
  AFTER INSERT ON exams
  FOR EACH ROW
  EXECUTE FUNCTION audit_exam_insert();

DROP TRIGGER IF EXISTS audit_exam_update_trigger ON exams;
CREATE TRIGGER audit_exam_update_trigger
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION audit_exam_update();

DROP TRIGGER IF EXISTS audit_exam_delete_trigger ON exams;
CREATE TRIGGER audit_exam_delete_trigger
  BEFORE DELETE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION audit_exam_delete();
