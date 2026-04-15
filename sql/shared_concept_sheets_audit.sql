-- =============================================
-- 개념지 공유 + 감사 로그 마이그레이션
-- 실행: Supabase SQL Editor에서 실행
-- =============================================

-- 1. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view own concept sheets" ON concept_sheets;
DROP POLICY IF EXISTS "Users can insert own concept sheets" ON concept_sheets;
DROP POLICY IF EXISTS "Users can update own concept sheets" ON concept_sheets;
DROP POLICY IF EXISTS "Users can delete own concept sheets" ON concept_sheets;

-- 2. 새 RLS 정책: 모든 인증된 사용자 공유
CREATE POLICY "Authenticated users can manage concept_sheets"
  ON concept_sheets FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

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
