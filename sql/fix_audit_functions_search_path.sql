-- =============================================
-- 감사 트리거 함수 search_path 고정 패치
-- 배경: SECURITY DEFINER 함수가 SET search_path 를 지정하지 않으면
--       호출 세션의 search_path 조작으로 객체 이름 해석 공격이 가능하다.
--       예: 공격자가 임의 스키마에 `audit_log` 이름의 테이블/뷰를 만들고
--       search_path 를 조작하면, postgres 소유로 실행되는 트리거 내부의
--       `INSERT INTO audit_log ...` 가 엉뚱한 객체로 해석되어 감사 로그를 우회/오염할 수 있다.
-- 조치: 모든 감사 트리거 함수에 `SET search_path = public, pg_temp` 를 고정한다.
--       - `public`: 무자격 `audit_log` 참조가 정상 해석되도록 포함
--       - `pg_temp` 는 반드시 마지막 → 임시 객체 섀도잉 방지
--       - `pg_catalog` 는 항상 묵시적으로 첫 번째 검색 경로이므로 생략
-- 참고: CREATE OR REPLACE FUNCTION 은 함수 OID 를 유지하므로 트리거 바인딩은 끊기지 않는다.
-- 실행: Supabase SQL Editor 에서 1회 실행 (idempotent)
-- =============================================

-- 1. exams 감사 함수

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

-- 2. words 감사 함수

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

-- 3. concept_sheets 감사 함수

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

-- 검증: 아래 쿼리는 9행 모두 proconfig 에 {search_path=public, pg_temp} 를 반환해야 한다
-- SELECT proname, proconfig
-- FROM pg_proc
-- WHERE proname IN (
--   'audit_exam_insert','audit_exam_update','audit_exam_delete',
--   'audit_word_insert','audit_word_update','audit_word_delete',
--   'audit_concept_sheet_insert','audit_concept_sheet_update','audit_concept_sheet_delete'
-- );
