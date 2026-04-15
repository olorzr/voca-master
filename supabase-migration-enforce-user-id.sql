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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) UPDATE 시 user_id 변경 차단(생성자 크레딧 탈취 방어)
CREATE OR REPLACE FUNCTION lock_user_id_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- 기존 함수 DROP 후 재생성. 새 함수 본문은 user_id 컬럼을 명시하지 않고
-- 트리거가 auth.uid() 로 채우도록 맡긴다.
DROP FUNCTION IF EXISTS create_exam_with_words(
  TEXT, INT, INT, INT, UUID[], UUID[], UUID, JSONB, UUID, INT
);

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
  -- 객관식 5지선다(정답 1 + 오답 4) 보장용. 클라이언트 우회 방어선.
  IF jsonb_array_length(p_words) < 5 THEN
    RAISE EXCEPTION 'exam requires at least 5 words (got %)', jsonb_array_length(p_words)
      USING ERRCODE = 'check_violation';
  END IF;

  -- user_id 컬럼은 명시하지 않는다. aa_enforce_user_id_exams_insert 트리거가
  -- auth.uid() 로 채운다. RPC 가 SECURITY INVOKER 이므로 호출자 컨텍스트의
  -- auth.uid() 가 그대로 트리거에 전달된다.
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
