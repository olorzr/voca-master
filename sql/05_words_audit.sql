-- =============================================
-- 단어(words) 감사 로그 트리거 마이그레이션
-- 실행: Supabase SQL Editor에서 실행
-- =============================================

-- 1. 감사 트리거 함수: INSERT
CREATE OR REPLACE FUNCTION audit_word_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, new_data)
  VALUES (
    'words',
    NEW.id,
    'INSERT',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. 감사 트리거 함수: UPDATE
CREATE OR REPLACE FUNCTION audit_word_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, old_data, new_data)
  VALUES (
    'words',
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

-- 3. 감사 트리거 함수: DELETE
CREATE OR REPLACE FUNCTION audit_word_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_email, old_data)
  VALUES (
    'words',
    OLD.id,
    'DELETE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. 트리거 연결
DROP TRIGGER IF EXISTS audit_word_insert_trigger ON words;
CREATE TRIGGER audit_word_insert_trigger
  AFTER INSERT ON words
  FOR EACH ROW
  EXECUTE FUNCTION audit_word_insert();

DROP TRIGGER IF EXISTS audit_word_update_trigger ON words;
CREATE TRIGGER audit_word_update_trigger
  BEFORE UPDATE ON words
  FOR EACH ROW
  EXECUTE FUNCTION audit_word_update();

DROP TRIGGER IF EXISTS audit_word_delete_trigger ON words;
CREATE TRIGGER audit_word_delete_trigger
  BEFORE DELETE ON words
  FOR EACH ROW
  EXECUTE FUNCTION audit_word_delete();
