-- 재시험 차수 경쟁 상태 수정 + word_ids 메타데이터 누락 수정
--
-- 배경:
--   기존 재시험 생성 흐름은 클라이언트가 메모리에서 `retake_number = existing.length + 1`
--   을 계산해 RPC 에 그대로 넘겼다. 동시에 두 사용자가 같은 원본 시험의 재시험 버튼을
--   누르면 같은 (parent_exam_id, retake_number) 조합이 두 행 만들어진다.
--   또한 클라이언트가 `p_word_ids: []` 로 호출해 exams.word_ids 컬럼이 항상 비어 있었다.
--
-- 이 마이그레이션은:
--   1) (parent_exam_id, retake_number) 부분 유일 인덱스를 추가해 DB 차원의 안전망을 둔다.
--   2) create_exam_with_words RPC 를 재작성해 p_parent_exam_id 가 주어졌을 때 서버에서
--      pg_advisory_xact_lock 으로 직렬화한 뒤 MAX(retake_number)+1 을 계산하고, 제목 접미사
--      `(재시험 N차)` 도 서버에서 조립한다. 클라이언트는 차수 계산을 더 이상 하지 않는다.
--
-- 시그니처는 sql/migration_enforce_user_id.sql (commit 0a70485) 에서 도입한 9-인자
-- 버전과 동일하게 유지한다 (p_user_id 없음 — auth.uid() 트리거가 채움).
--
-- 사전 점검 (운영자 수동 실행):
--   기존 데이터에 (parent_exam_id, retake_number) 중복이 남아 있으면 부분 유일 인덱스 생성이
--   실패한다. 다음 쿼리로 먼저 확인 후 수동으로 정리할 것.
--
--     SELECT parent_exam_id, retake_number, COUNT(*)
--       FROM exams
--      WHERE parent_exam_id IS NOT NULL
--      GROUP BY parent_exam_id, retake_number
--     HAVING COUNT(*) > 1;

-- 1) 부분 유일 인덱스: 재시험 행에 한해 (parent_exam_id, retake_number) 유일성 보장
CREATE UNIQUE INDEX IF NOT EXISTS idx_exams_parent_retake_unique
  ON exams (parent_exam_id, retake_number)
  WHERE parent_exam_id IS NOT NULL;

-- 2) create_exam_with_words 재작성
--    시그니처/반환 타입(UUID) 은 그대로 유지하므로 DROP FUNCTION 불필요.
--    재시험 호출에서는 p_retake_number 와 p_title 의 차수 접미사를 무시하고 서버가 계산한다.
--    원본 시험(p_parent_exam_id IS NULL) 호출은 기존과 동일하게 동작한다.
--
-- 호출 계약:
--   원본 시험: p_parent_exam_id = NULL, p_retake_number = 0, p_title 은 사용자 입력 그대로
--   재시험   : p_parent_exam_id = <원본 id>, p_retake_number 무시, p_title 은 *원본 제목만*
--             (서버가 ` (재시험 N차)` 를 붙여 저장)

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
  v_retake  INT  := p_retake_number;
  v_title   TEXT := p_title;
BEGIN
  -- 객관식 5지선다(정답 1 + 오답 4) 보장용. 클라이언트 우회 방어선.
  IF jsonb_array_length(p_words) < 5 THEN
    RAISE EXCEPTION 'exam requires at least 5 words (got %)', jsonb_array_length(p_words)
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_parent_exam_id IS NOT NULL THEN
    -- 같은 부모에 대한 동시 재시험 생성을 트랜잭션 범위 advisory lock 으로 직렬화.
    -- hashtext 는 안정적인 32-bit 해시. 충돌 가능성은 무시할 만하며, 충돌해도 부분 유일
    -- 인덱스가 마지막 안전망으로 작동한다.
    PERFORM pg_advisory_xact_lock(hashtext(p_parent_exam_id::text));

    SELECT COALESCE(MAX(retake_number), 0) + 1
      INTO v_retake
      FROM exams
     WHERE parent_exam_id = p_parent_exam_id;

    -- 클라이언트는 원본 제목만 넘기므로 서버에서 차수 접미사를 조립한다.
    v_title := format('%s (재시험 %s차)', p_title, v_retake);
  END IF;

  -- user_id 컬럼은 명시하지 않는다. aa_enforce_user_id_exams_insert 트리거가 auth.uid()
  -- 로 채운다. RPC 가 SECURITY INVOKER 이므로 호출자 컨텍스트의 auth.uid() 가 그대로
  -- 트리거에 전달된다.
  INSERT INTO exams (
    title, pass_percentage, total_questions, pass_count,
    category_ids, word_ids, parent_exam_id, retake_number
  )
  VALUES (
    v_title, p_pass_percentage, p_total_questions, p_pass_count,
    p_category_ids, p_word_ids, p_parent_exam_id, v_retake
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
