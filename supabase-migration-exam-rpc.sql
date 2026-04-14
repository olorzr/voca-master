-- 시험지/재시험 생성 원자성 보장
-- 기존에는 클라이언트에서 exams insert 후 exam_words insert를 별도 호출했기 때문에
-- 두 번째 insert가 실패하면 단어 없는 유령 시험지가 DB에 남는 문제가 있었다.
-- 본 RPC는 함수 본문이 단일 트랜잭션으로 실행되므로, 어느 insert가 실패해도 전체가 롤백된다.
--
-- 호출 예 (재시험은 p_parent_exam_id / p_retake_number 를 채워 호출):
--   select create_exam_with_words(
--     'title', 80, 30, 24,
--     array['<cat_uuid>']::uuid[],
--     array['<word_uuid>']::uuid[],
--     '<user_uuid>'::uuid,
--     '[{"word_id":"...","word":"...","meaning":"...","order_index":0}]'::jsonb
--   );

CREATE OR REPLACE FUNCTION create_exam_with_words(
  p_title TEXT,
  p_pass_percentage INT,
  p_total_questions INT,
  p_pass_count INT,
  p_category_ids UUID[],
  p_word_ids UUID[],
  p_user_id UUID,
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

  INSERT INTO exams (
    title, pass_percentage, total_questions, pass_count,
    category_ids, word_ids, parent_exam_id, retake_number, user_id
  )
  VALUES (
    p_title, p_pass_percentage, p_total_questions, p_pass_count,
    p_category_ids, p_word_ids, p_parent_exam_id, p_retake_number, p_user_id
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
  TEXT, INT, INT, INT, UUID[], UUID[], UUID, JSONB, UUID, INT
) TO authenticated;
