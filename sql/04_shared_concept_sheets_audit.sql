-- =============================================
-- 개념지 공유 + 감사 로그 마이그레이션
-- 실행: Supabase SQL Editor에서 실행
-- =============================================

-- 1~2. RLS 정책 정의는 이 파일에서 제거했다.
--
-- [2026-06-16] 이 파일은 과거 concept_sheets 를 `FOR ALL` 공유 정책으로
--   (재)생성했으나 도메인 조건 public.is_allowed_domain() 가 빠져 있었다
--   (sql/08_migration_domain_restriction.sql 가 모든 공유 테이블 정책에 추가함).
--   이 파일이 도메인 마이그레이션 뒤에 재실행되면 @araeducation.co.kr 이 아닌
--   인증 계정에게도 공유 개념지 읽기/쓰기를 다시 열어버리는 퇴행이 발생한다
--   (03_shared_exams_audit_log.sql 의 exam_words 퇴행과 동일한 패턴).
--
--   따라서 concept_sheets 의 RLS 정책은 01_schema.sql(기준 상태) +
--   02_create_concept_sheets.sql(생성 시점) + 08_migration_domain_restriction.sql
--   (도메인 조건) 에서만 관리한다. 이 파일은 감사 컬럼/트리거만 담당한다.

-- 3. 감사 컬럼 추가
ALTER TABLE concept_sheets
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 4. 감사 트리거 함수: INSERT
CREATE OR REPLACE FUNCTION audit_concept_sheet_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, new_data)
  VALUES (
    'concept_sheets',
    NEW.id,
    'INSERT',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. 감사 트리거 함수: UPDATE
CREATE OR REPLACE FUNCTION audit_concept_sheet_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, old_data, new_data)
  VALUES (
    'concept_sheets',
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

-- 6. 감사 트리거 함수: DELETE
CREATE OR REPLACE FUNCTION audit_concept_sheet_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, old_data)
  VALUES (
    'concept_sheets',
    OLD.id,
    'DELETE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. 트리거 연결
DROP TRIGGER IF EXISTS audit_concept_sheet_insert_trigger ON concept_sheets;
CREATE TRIGGER audit_concept_sheet_insert_trigger
  AFTER INSERT ON concept_sheets
  FOR EACH ROW
  EXECUTE FUNCTION audit_concept_sheet_insert();

DROP TRIGGER IF EXISTS audit_concept_sheet_update_trigger ON concept_sheets;
CREATE TRIGGER audit_concept_sheet_update_trigger
  BEFORE UPDATE ON concept_sheets
  FOR EACH ROW
  EXECUTE FUNCTION audit_concept_sheet_update();

DROP TRIGGER IF EXISTS audit_concept_sheet_delete_trigger ON concept_sheets;
CREATE TRIGGER audit_concept_sheet_delete_trigger
  BEFORE DELETE ON concept_sheets
  FOR EACH ROW
  EXECUTE FUNCTION audit_concept_sheet_delete();
