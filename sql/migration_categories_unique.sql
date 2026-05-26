-- =============================================
-- categories 자연키 유니크 제약 + 기존 중복 병합
-- 실행: Supabase SQL Editor 에서 실행
-- =============================================
-- 배경(Medium):
--   ensureCategoryId 가 SELECT 후 INSERT 하는 구조라, 두 사용자가 같은 새 단원을
--   동시에 저장하면 둘 다 INSERT 에 성공해 중복 row 가 생긴다. 자연키
--   (level, grade, publisher, semester, chapter, sub_chapter, school_name) 에
--   유니크 제약이 없어 막을 수 없었고, 이후 매칭은 임의의 row 하나를 반환했다.
--
-- 방어:
--   1) 기존 중복을 canonical(가장 먼저 생성된 row)로 병합한다.
--      - words.category_id, exams.category_ids(배열) 참조를 canonical 로 repoint
--      - 중복 row 삭제
--   2) 자연키 유니크 인덱스(NULLS NOT DISTINCT)를 만든다.
--   3) 애플리케이션은 단일 원자적 upsert(ON CONFLICT)로 전환한다(words-save.ts).
--
-- 주의: 이 마이그레이션을 적용한 뒤에 새 클라이언트 코드를 배포할 것.
--   upsert 의 onConflict 는 아래 유니크 인덱스가 있어야 동작한다.
--
-- 전체를 하나의 DO 블록(단일 statement)으로 감싼다. Supabase SQL Editor 는 문
-- (statement)별로 풀러를 통해 서로 다른 백엔드에서 실행할 수 있어, 여러 문에 걸친
-- TEMP 테이블이 사라진다(ERROR: relation "category_dups" does not exist). DO 블록은
-- 하나의 백엔드에서 원자적으로 실행되므로 블록 내 TEMP 테이블이 유지되고, 중간
-- 실패 시 전체가 롤백되어 부분 적용을 막는다.
DO $$
BEGIN
  -- 이전 실패 실행이 같은 세션에 남긴 잔여 테이블 정리
  DROP TABLE IF EXISTS category_dups;

  -- 0) NULL school_name 을 '' 로 정규화 (앱은 항상 '' 를 쓴다)
  UPDATE categories SET school_name = '' WHERE school_name IS NULL;

  -- 1) 중복 식별: 자연키별 canonical(최초 생성) 선정
  CREATE TEMP TABLE category_dups AS
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY level, grade, publisher, semester, chapter, sub_chapter, school_name
        ORDER BY created_at, id
      ) AS rn,
      FIRST_VALUE(id) OVER (
        PARTITION BY level, grade, publisher, semester, chapter, sub_chapter, school_name
        ORDER BY created_at, id
      ) AS canonical_id
    FROM categories
  )
  SELECT id AS dup_id, canonical_id
  FROM ranked
  WHERE rn > 1;

  -- 2a) words 의 UNIQUE(category_id, word) (words_category_word_unique,
  --     sql/words_concurrency.sql) 충돌 방지: canonical 에 이미 같은 word 가 있으면
  --     repoint 시 유니크 충돌이 나므로, dup 쪽 word 를 먼저 삭제(병합)한다.
  DELETE FROM words w
  USING category_dups d
  WHERE w.category_id = d.dup_id
    AND EXISTS (
      SELECT 1 FROM words c
      WHERE c.category_id = d.canonical_id
        AND c.word = w.word
    );

  -- 2b) words.category_id (FK) repoint
  UPDATE words w
  SET category_id = d.canonical_id
  FROM category_dups d
  WHERE w.category_id = d.dup_id;

  -- 2c) exams.category_ids (UUID[]) — dup id 를 canonical 로 치환하고 중복 제거.
  --     WITH ORDINALITY 로 원래 순서를 보존한 뒤, 치환으로 생긴 중복은 첫 등장만 남긴다.
  UPDATE exams e
  SET category_ids = sub.new_ids
  FROM (
    SELECT
      e2.id,
      ARRAY(
        SELECT mapped_id
        FROM (
          SELECT
            COALESCE(d.canonical_id, u.elem) AS mapped_id,
            MIN(u.ord) AS first_ord
          FROM unnest(e2.category_ids) WITH ORDINALITY AS u(elem, ord)
          LEFT JOIN category_dups d ON d.dup_id = u.elem
          GROUP BY COALESCE(d.canonical_id, u.elem)
        ) m
        ORDER BY first_ord
      ) AS new_ids
    FROM exams e2
    WHERE EXISTS (
      SELECT 1
      FROM unnest(e2.category_ids) AS elem
      JOIN category_dups d ON d.dup_id = elem
    )
  ) AS sub
  WHERE e.id = sub.id;

  -- 3) 중복 row 삭제
  DELETE FROM categories c
  USING category_dups d
  WHERE c.id = d.dup_id;

  DROP TABLE category_dups;

  -- 4) 자연키 유니크 인덱스 (NULLS NOT DISTINCT: PG15+).
  --    아직 중복이 남아 있으면 여기서 실패하며 블록 전체가 롤백된다.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_natural_key
    ON categories (level, grade, publisher, semester, chapter, sub_chapter, school_name)
    NULLS NOT DISTINCT;
END $$;
