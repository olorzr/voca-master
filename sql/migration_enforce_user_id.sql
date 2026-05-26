-- =============================================
-- user_id attribution을 DB auth.uid()로 강제
-- =============================================
-- 배경: exams / categories / concept_sheets 는 RLS가 'authenticated'만 체크하므로
-- 인증된 클라이언트가 임의의 user_id 로 INSERT 하거나 기존 행의 user_id 를
-- 다른 사람으로 UPDATE 해 생성자(크레딧)를 위조할 수 있다.
-- 본 마이그레이션은 BEFORE INSERT/UPDATE 트리거로 attribution 을 auth.uid() 로
-- 고정해, 클라이언트가 무엇을 보내든 무시되도록 만든다.
--
-- 트리거 함수는 audit_log 트리거와 동일하게 SECURITY DEFINER 로 둔다.
-- auth.uid() 가 NULL 이면(postgres 역할로 실행되는 시드/백필) 덮어쓰지 않는다.

-- 1) INSERT 시 auth.uid() 로 user_id 강제
CREATE OR REPLACE FUNCTION enforce_user_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2) UPDATE 시 user_id 변경 차단(생성자 크레딧 탈취 방어)
CREATE OR REPLACE FUNCTION lock_user_id_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3) exams 테이블에 트리거 부착
-- 트리거 이름은 알파벳 앞쪽으로 둬서 audit_exam_update 보다 먼저 실행되게 한다
-- (audit 트리거의 new_data 에 잠긴 user_id 가 반영되도록).
DROP TRIGGER IF EXISTS aa_enforce_user_id_exams_insert ON exams;
CREATE TRIGGER aa_enforce_user_id_exams_insert
  BEFORE INSERT ON exams
  FOR EACH ROW EXECUTE FUNCTION enforce_user_id_from_auth();

DROP TRIGGER IF EXISTS aa_lock_user_id_exams_update ON exams;
CREATE TRIGGER aa_lock_user_id_exams_update
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION lock_user_id_on_update();

-- 4) categories 테이블
DROP TRIGGER IF EXISTS aa_enforce_user_id_categories_insert ON categories;
CREATE TRIGGER aa_enforce_user_id_categories_insert
  BEFORE INSERT ON categories
  FOR EACH ROW EXECUTE FUNCTION enforce_user_id_from_auth();

DROP TRIGGER IF EXISTS aa_lock_user_id_categories_update ON categories;
CREATE TRIGGER aa_lock_user_id_categories_update
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION lock_user_id_on_update();

-- 5) concept_sheets 테이블
DROP TRIGGER IF EXISTS aa_enforce_user_id_concept_sheets_insert ON concept_sheets;
CREATE TRIGGER aa_enforce_user_id_concept_sheets_insert
  BEFORE INSERT ON concept_sheets
  FOR EACH ROW EXECUTE FUNCTION enforce_user_id_from_auth();

DROP TRIGGER IF EXISTS aa_lock_user_id_concept_sheets_update ON concept_sheets;
CREATE TRIGGER aa_lock_user_id_concept_sheets_update
  BEFORE UPDATE ON concept_sheets
  FOR EACH ROW EXECUTE FUNCTION lock_user_id_on_update();

-- 6) create_exam_with_words RPC 시그니처에서 p_user_id 제거
-- 기존 옛 시그니처(p_user_id 포함)만 정리한다.
DROP FUNCTION IF EXISTS create_exam_with_words(
  TEXT, INT, INT, INT, UUID[], UUID[], UUID, JSONB, UUID, INT
);

-- [2026-05-26] 주의: 이 파일에 있던 create_exam_with_words 재정의(advisory lock·
-- DEFINER·서버 검증 없음)는 제거했다. 과거 이 정의가 schema.sql /
-- migration_retake_atomic.sql 의 최신 정의를 실행 순서에 따라 덮어써, 재시험
-- 직렬화나 exam_words 쓰기 차단이 사라지는 퇴행을 일으킬 수 있었다.
-- create_exam_with_words 의 정식(canonical) 정의는
--   sql/migration_lock_exam_words.sql
-- 한 곳에서만 관리한다. 마이그레이션 적용 시 이 파일을 먼저 실행하고,
-- migration_retake_atomic.sql → migration_lock_exam_words.sql 순서로 마지막에
-- 정식 RPC 를 올릴 것.
