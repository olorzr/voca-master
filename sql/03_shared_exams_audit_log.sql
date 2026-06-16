-- =============================================
-- 시험지 공유 + 감사 로그 마이그레이션
-- 실행: Supabase SQL Editor에서 실행
-- =============================================

-- 1~2. RLS 정책 정의는 이 파일에서 제거했다.
--
-- [2026-05-26] 이 파일은 과거 `exams` / `exam_words` 를 `FOR ALL` 공유 정책으로
--   (재)생성했다. 그러나 이후 exam_words 는 SELECT 전용으로 잠겼고
--   (sql/10_migration_lock_exam_words.sql), 모든 공유 테이블 정책에 도메인 조건
--   public.is_allowed_domain() 가 추가됐다(sql/08_migration_domain_restriction.sql).
--   이 파일이 그 뒤에 재실행되면 exam_words 직접 쓰기를 다시 열고 도메인 조건을
--   날려버리는 퇴행이 발생한다.
--
--   따라서 exams / exam_words 의 RLS 정책은 01_schema.sql(기준 상태) +
--   10_migration_lock_exam_words.sql(exam_words SELECT 전용) +
--   08_migration_domain_restriction.sql(도메인 조건) 에서만 관리한다.
--   이 파일은 audit_log 테이블/트리거와 exams 감사 컬럼만 담당한다.

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
    auth.jwt() ->> 'email' = 'ara0723@araeducation.co.kr'
  );

-- 감사 로그 쓰기: SECURITY DEFINER 트리거 함수(postgres 소유, BYPASSRLS)가
-- RLS를 우회하여 직접 INSERT 한다. 클라이언트에서의 직접 INSERT 는 허용하지 않으므로
-- INSERT 정책을 의도적으로 만들지 않는다(기본 deny).
-- 과거에 존재했을 수 있는 열린 정책을 확실히 제거한다.
DROP POLICY IF EXISTS "System can insert audit_log" ON audit_log;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
