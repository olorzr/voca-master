-- =============================================
-- 단어(words) 저장 동시성 보호 마이그레이션
-- 실행: Supabase SQL Editor 에서 아래 순서대로 수동 실행
-- =============================================
--
-- 배경: 기존 클라이언트 로직은 (1) 중복 확인 SELECT → (2) MAX(order_index) SELECT →
-- (3) 클라이언트가 번호 계산 후 INSERT 로 나뉘어 있어 동시 요청 시 동일 단어가 두 번
-- 저장되거나 order_index 가 충돌했다. 이 마이그레이션은 두 가지 보호를 추가한다:
--   A. UNIQUE(category_id, word) 제약 — DB 레벨 최종 방어선
--   B. insert_words_batch RPC — advisory lock 으로 카테고리 단위 직렬화 후
--      단일 트랜잭션에서 MAX(order_index) 계산 + 순번 부여 + INSERT 수행
--
-- =============================================
-- 1단계: 기존 중복 탐지 (반드시 먼저 실행)
-- =============================================
-- 아래 쿼리 결과가 0 건이어야 ALTER 가 성공한다. 결과가 있다면 2단계 자동 정리를
-- 먼저 실행하고, 그 다음 3단계로 넘어갈 것. (한 번에 전체 파일을 실행하지 말 것)
--
-- SELECT category_id, word, COUNT(*) AS cnt
-- FROM words
-- GROUP BY category_id, word
-- HAVING COUNT(*) > 1
-- ORDER BY cnt DESC;

-- =============================================
-- 2단계: 중복 자동 정리 (선택적 — 1단계에서 중복이 발견된 경우에만)
-- =============================================
-- 같은 (category_id, word) 그룹에서 (order_index, created_at, id) 가 가장 작은 한 row 만
-- 남기고 나머지를 삭제한다. audit_word_delete_trigger 가 audit_log 에 기록하므로 이력은 보존.
-- 실행 전 백업 권장. 정리 후 1단계 쿼리를 다시 돌려 0 건인지 확인할 것.
--
-- DELETE FROM words w1
-- USING words w2
-- WHERE w1.category_id = w2.category_id
--   AND w1.word = w2.word
--   AND w1.id <> w2.id
--   AND (w1.order_index, w1.created_at, w1.id) > (w2.order_index, w2.created_at, w2.id);

-- =============================================
-- 3단계: UNIQUE 제약 추가
-- =============================================
ALTER TABLE words
  ADD CONSTRAINT words_category_word_unique UNIQUE (category_id, word);

-- =============================================
-- 4단계: 단어 일괄 저장 RPC
-- =============================================
-- p_category_id: 저장할 카테고리
-- p_words: [{ "word": "...", "meaning": "..." }, ...] 형태의 JSONB 배열
-- 반환: inserted_count(실제 삽입된 건수), skipped_duplicates(race 로 이미 존재해 스킵된 단어 목록)
--
-- 처리 순서:
--   1) pg_advisory_xact_lock 으로 카테고리별 직렬화 (다른 카테고리 저장은 블로킹 X)
--   2) 락 안에서 MAX(order_index) 읽어 시작 번호 결정
--   3) WITH ORDINALITY 로 입력 순서대로 순번 부여해 INSERT
--   4) ON CONFLICT (category_id, word) DO NOTHING 로 프리체크 이후 끼어든 중복 스킵
--   5) inserted_count 와 skipped_duplicates 를 계산해 반환

CREATE OR REPLACE FUNCTION insert_words_batch(
  p_category_id UUID,
  p_words JSONB
)
RETURNS TABLE (
  inserted_count INT,
  skipped_duplicates TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_start_index INT;
  v_inserted_words TEXT[];
  v_input_words TEXT[];
BEGIN
  -- 카테고리 단위 직렬화 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(hashtext(p_category_id::text));

  SELECT COALESCE(MAX(w.order_index), -1) + 1
    INTO v_start_index
    FROM words w
   WHERE w.category_id = p_category_id;

  WITH ins AS (
    INSERT INTO words (category_id, word, meaning, order_index)
    SELECT
      p_category_id,
      btrim(t.item->>'word'),
      btrim(t.item->>'meaning'),
      v_start_index + (t.ord - 1)::INT
    FROM jsonb_array_elements(p_words) WITH ORDINALITY AS t(item, ord)
    ON CONFLICT (category_id, word) DO NOTHING
    RETURNING word
  )
  SELECT ARRAY(SELECT word FROM ins) INTO v_inserted_words;

  SELECT ARRAY(
    SELECT btrim(w->>'word')
    FROM jsonb_array_elements(p_words) AS w
  ) INTO v_input_words;

  inserted_count := COALESCE(array_length(v_inserted_words, 1), 0);
  skipped_duplicates := ARRAY(
    SELECT UNNEST(v_input_words)
    EXCEPT
    SELECT UNNEST(v_inserted_words)
  );

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_words_batch(UUID, JSONB) TO authenticated;
