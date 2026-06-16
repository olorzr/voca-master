-- =====================================================================
-- [운영 적용용 통합 스크립트] 2026-05-26 보안 하드닝
-- =====================================================================
-- 이미 운영 중인 Supabase DB 에 이번 보안 수정을 일괄 적용하기 위한 파일.
-- Supabase SQL Editor 에서 **postgres 로** [1] → [4] 순서대로 실행한다.
-- (전체를 한 번에 실행해도 되고, 구획별로 끊어 실행해도 된다. 각 구획은
--  멱등이라 중복 실행해도 안전하다.)
--
-- 신규(빈) 환경은 이 파일 대신 sql/01_schema.sql 하나로 부트스트랩하면 된다.
--
-- 적용 순서:
--   [1] archive/migration_enforce_user_id.sql    user_id 강제 트리거 + search_path 하드닝
--   [2] 08_migration_domain_restriction.sql 도메인 RLS (is_allowed_domain)
--   [3] 09_migration_categories_unique.sql  categories 중복 병합 + 자연키 유니크
--   [4] 10_migration_lock_exam_words.sql    exam_words 쓰기 잠금 + canonical RPC (마지막)
--
-- 주의: [3] 은 기존 중복 카테고리를 병합/삭제하므로 적용 전 백업 권장.
-- 각 구획의 정식(canonical) 원본은 동일 이름의 개별 파일이다 — 내용 수정은
-- 개별 파일에서 하고 이 통합본을 다시 생성할 것.
-- =====================================================================


-- ███████████████████████████████████████████████████████████████████
-- [1/4] archive/migration_enforce_user_id.sql
-- ███████████████████████████████████████████████████████████████████

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
-- DEFINER·서버 검증 없음)는 제거했다. 과거 이 정의가 01_schema.sql /
-- archive/migration_retake_atomic.sql 의 최신 정의를 실행 순서에 따라 덮어써, 재시험
-- 직렬화나 exam_words 쓰기 차단이 사라지는 퇴행을 일으킬 수 있었다.
-- create_exam_with_words 의 정식(canonical) 정의는
--   sql/10_migration_lock_exam_words.sql
-- 한 곳에서만 관리한다. 마이그레이션 적용 시 이 파일을 먼저 실행하고,
-- archive/migration_retake_atomic.sql → 10_migration_lock_exam_words.sql 순서로 마지막에
-- 정식 RPC 를 올릴 것.


-- ███████████████████████████████████████████████████████████████████
-- [2/4] 08_migration_domain_restriction.sql
-- ███████████████████████████████████████████████████████████████████

-- =============================================
-- 도메인 제한을 RLS 계층에서 강제 (defense-in-depth)
-- 실행: Supabase SQL Editor 에서 실행
-- =============================================
-- 배경(High):
--   도메인 제한(@araeducation.co.kr)은 네이버웍스 콜백 한 곳에서만 검사되고,
--   세션이 수립된 뒤에는 어디서도 재검증되지 않았다. RLS 는 'authenticated'
--   여부만 보므로, Supabase 프로젝트에 다른 provider(email/password 등)가 켜져
--   비도메인 계정이 세션만 얻으면 모든 공유 데이터에 접근할 수 있었다.
--   또 클라이언트 세션이 localStorage 에 저장되어(@supabase/ssr 미사용) 서버
--   미들웨어로는 세션을 읽을 수 없으므로, 세션 저장 방식과 무관하게 동작하는
--   RLS 계층에서 도메인을 강제하는 것이 가장 견고하다.
--
-- 주의: 모든 정책의 USING/WITH CHECK 에 도메인 조건을 더한다. 정상 사용자는
--   전원 @araeducation.co.kr 이메일이라 영향이 없고, 비도메인 세션은 데이터
--   계층에서 차단된다. service_role/postgres 컨텍스트는 RLS 자체를 우회하므로
--   시드/백필에는 영향이 없다.
--
-- 한계(권장 후속): 이 검사는 "허용 도메인 suffix" 만 본다. provider(naver-works)
--   강제는 아니다. 즉 같은 @araeducation.co.kr 이메일이면 다른 auth provider 로도
--   통과한다. 진짜 단일 provider 보장은 Supabase Auth 설정에서 email/password 및
--   불필요한 provider 를 비활성화하는 것이 1차 방어다. (createUser 의 provider 는
--   user_metadata 라 클라이언트가 위조 가능하므로 RLS 신뢰 근거로 쓰지 말 것 —
--   필요 시 app_metadata 의 신뢰된 클레임으로 강제해야 한다.)
--
-- 또한 create_exam_with_words 는 SECURITY DEFINER 라 이 정책들을 우회하므로,
--   함수 본문에서 public.is_allowed_domain() 을 직접 검사한다
--   (sql/10_migration_lock_exam_words.sql).

-- ---------------------------------------------
-- 0) 허용 도메인 판정 헬퍼
-- ---------------------------------------------
-- auth.jwt() 는 요청 JWT 클레임(GUC)을 읽으며 SECURITY context 와 무관하다.
-- '%@araeducation.co.kr' LIKE 는 @ 바로 뒤가 araeducation.co.kr 로 끝나는 경우만
-- 매칭하므로 evil@araeducation.co.kr.attacker.com / x@sub.araeducation.co.kr 등은
-- 통과하지 못한다(앱의 endsWith('@araeducation.co.kr') 와 동일 의미).
CREATE OR REPLACE FUNCTION public.is_allowed_domain()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') LIKE '%@araeducation.co.kr';
$$;

GRANT EXECUTE ON FUNCTION public.is_allowed_domain() TO authenticated;

-- 재사용 매크로처럼 쓰기 위한 조건식: auth.role() = 'authenticated' AND is_allowed_domain()

-- ---------------------------------------------
-- 1) 단어/카테고리/시험지 (FOR ALL → 도메인 추가)
-- ---------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

DROP POLICY IF EXISTS "Authenticated users can manage words" ON words;
CREATE POLICY "Authenticated users can manage words"
  ON words FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

DROP POLICY IF EXISTS "Authenticated users can manage exams" ON exams;
CREATE POLICY "Authenticated users can manage exams"
  ON exams FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

-- exam_words 는 읽기 전용(쓰기는 SECURITY DEFINER RPC). SELECT 에 도메인 추가.
DROP POLICY IF EXISTS "Authenticated users can read exam_words" ON exam_words;
CREATE POLICY "Authenticated users can read exam_words"
  ON exam_words FOR SELECT
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain());

-- ---------------------------------------------
-- 2) 개념지
-- ---------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage concept_sheets" ON concept_sheets;
CREATE POLICY "Authenticated users can manage concept_sheets"
  ON concept_sheets FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

-- ---------------------------------------------
-- 3) 카테고리 마스터 테이블
-- ---------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage publishers" ON publishers;
CREATE POLICY "Authenticated users can manage publishers"
  ON publishers FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

DROP POLICY IF EXISTS "Authenticated users can manage major_chapters" ON major_chapters;
CREATE POLICY "Authenticated users can manage major_chapters"
  ON major_chapters FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

DROP POLICY IF EXISTS "Authenticated users can manage sub_chapters" ON sub_chapters;
CREATE POLICY "Authenticated users can manage sub_chapters"
  ON sub_chapters FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

DROP POLICY IF EXISTS "Authenticated users can manage schools" ON schools;
CREATE POLICY "Authenticated users can manage schools"
  ON schools FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());

DROP POLICY IF EXISTS "Authenticated users can manage school_materials" ON school_materials;
CREATE POLICY "Authenticated users can manage school_materials"
  ON school_materials FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_allowed_domain());


-- ███████████████████████████████████████████████████████████████████
-- [3/4] 09_migration_categories_unique.sql
-- ███████████████████████████████████████████████████████████████████

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
  --     sql/06_words_concurrency.sql) 충돌 방지: canonical 에 이미 같은 word 가 있으면
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


-- ███████████████████████████████████████████████████████████████████
-- [4/4] 10_migration_lock_exam_words.sql
-- ███████████████████████████████████████████████████████████████████

-- =============================================
-- exam_words 직접 쓰기 차단 + create_exam_with_words 서버 검증 강화
-- 실행: Supabase SQL Editor 에서 실행
-- =============================================
-- 배경(Critical):
--   exam_words 는 그동안 'authenticated' 전원에게 FOR ALL(INSERT/UPDATE/DELETE)
--   이 열려 있었다. 학원 공유 모델이라 RLS 가 소유자를 따지지 않으므로, 임의의
--   인증 사용자가 콘솔에서
--     supabase.from('exam_words').update({ word: 'HACKED' }).eq('exam_id', victim)
--   처럼 남의 시험지 단어를 조용히 변조/삭제할 수 있었고, exam_words 에는 감사
--   트리거도 없어 흔적이 남지 않았다.
--
-- 방어:
--   1) exam_words 직접 쓰기를 막고 SELECT 만 허용한다.
--   2) 정상 생성 경로인 create_exam_with_words 를 SECURITY DEFINER 로 바꿔,
--      잠긴 RLS 를 우회해 exam_words 에 INSERT 할 수 있게 한다(유일한 쓰기 경로).
--   3) exam_words 는 exams 의 자식 스냅샷이므로 감사는 exams 단위(이미 존재하는
--      audit_exam_* 트리거)로 충분하다. 삭제는 exams ON DELETE CASCADE 로만
--      일어나고 그 exam 삭제가 audit_exam_delete 에 남는다. 따라서 exam_words 에
--      별도 행 단위 감사 트리거는 두지 않는다(시험당 N행 노이즈만 늘 뿐 새로운
--      포렌식 가치가 없음).
--
-- 배경(High #3):
--   기존 RPC 는 p_total_questions / p_pass_count / p_word_ids / p_words 의 word·
--   meaning 을 전부 클라이언트 신뢰로 저장했다. RPC 를 직접 호출하면 메타데이터와
--   실제 단어 내용이 어긋난(예: total_questions=100, 실제 5단어) 시험지나, 존재
--   하지 않는 word_id 를 가진 시험지를 만들 수 있었다.
-- 방어:
--   - 신규 생성(p_parent_exam_id IS NULL): total_questions / word_ids / pass_count
--     를 서버에서 p_words·pass_percentage 로 재계산하고, word·meaning 은 canonical
--     words 에서 재조립 + 모든 word_id 실재를 강제한다 → 내용 위조 차단.
--   - 재시험(p_parent_exam_id IS NOT NULL): 클라이언트 입력(p_words/p_category_ids
--     /메타)을 전혀 신뢰하지 않고, 부모 exam 과 부모 exam_words 를 서버가 직접 읽어
--     재조립한다(서버 셔플 순서). 직접 RPC 호출로 부모와 다른 내용의 가짜 "재시험
--     N차" 를 만드는 것을 차단한다. 부모 스냅샷을 복사하므로 이미 삭제된 단어도
--     보존된다(CLAUDE.md: exam_words 는 스냅샷이라 원본 수정/삭제가 영향 없음).
--   - SECURITY DEFINER 라 테이블 RLS(is_allowed_domain)를 우회하므로, 함수 본문
--     첫머리에서 public.is_allowed_domain() 을 직접 검사해 도메인 우회를 막는다.
--
-- 주의: 이 파일이 create_exam_with_words 의 정식(canonical) 정의다.
--   archive/migration_enforce_user_id.sql / archive/migration_retake_atomic.sql / archive/migration_exam_rpc.sql
--   의 옛 정의는 모두 무력화(포인터 주석)했다. archive/migration_retake_atomic.sql 이후 이
--   파일을 마지막에 실행할 것.
--
-- 운영 전제(중요): 이 함수가 잠긴 exam_words RLS 를 우회해 INSERT 하려면 함수
--   owner 가 테이블 owner(또는 BYPASSRLS) 여야 한다. Supabase SQL Editor 에서는
--   기본적으로 postgres 로 실행되어 테이블 owner 와 동일하므로 충족된다. 다른
--   역할로 이 파일을 실행하면 시험 생성이 깨질 수 있으니 postgres 로 적용할 것.

-- ---------------------------------------------
-- 1) exam_words 직접 쓰기 차단 → SELECT 전용
-- ---------------------------------------------
DROP POLICY IF EXISTS "Users can manage own exam words" ON exam_words;
DROP POLICY IF EXISTS "Authenticated users can manage exam_words" ON exam_words;
DROP POLICY IF EXISTS "Authenticated users can read exam_words" ON exam_words;

-- 이 번들 앞부분(도메인 RLS 섹션)에서 동일 정책을 도메인 조건과 함께 한 번
-- 생성하므로, 여기서 도메인 조건 없이 재생성하면 도메인 제한이 사라진다.
-- 반드시 public.is_allowed_domain() 을 포함한다(번들 내 is_allowed_domain 정의됨).
CREATE POLICY "Authenticated users can read exam_words"
  ON exam_words FOR SELECT
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain());
-- INSERT/UPDATE/DELETE 정책을 의도적으로 만들지 않는다(기본 deny).
-- 쓰기는 오직 SECURITY DEFINER 함수 create_exam_with_words 를 통해서만 가능하다.

-- ---------------------------------------------
-- 2) create_exam_with_words: SECURITY DEFINER + 서버 검증
-- ---------------------------------------------
-- 옛 시그니처(p_user_id 포함)와 현재 시그니처 모두 제거 후 재생성.
DROP FUNCTION IF EXISTS create_exam_with_words(
  TEXT, INT, INT, INT, UUID[], UUID[], UUID, JSONB, UUID, INT
);
DROP FUNCTION IF EXISTS create_exam_with_words(
  TEXT, INT, INT, INT, UUID[], UUID[], JSONB, UUID, INT
);

CREATE FUNCTION create_exam_with_words(
  p_title TEXT,
  p_pass_percentage INT,
  p_total_questions INT,   -- 무시: 서버가 p_words 길이로 재계산
  p_pass_count INT,        -- 무시: 서버가 pass_percentage 로 재계산
  p_category_ids UUID[],
  p_word_ids UUID[],       -- 무시: 서버가 p_words 에서 재구성
  p_words JSONB,
  p_parent_exam_id UUID DEFAULT NULL,
  p_retake_number INT DEFAULT 0  -- 무시: 재시험 차수는 서버가 결정
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exam_id      UUID;
  v_retake       INT  := 0;
  v_title        TEXT := p_title;
  v_total        INT;
  v_pass         INT;
  v_pass_pct     INT;
  v_category_ids UUID[];
  v_word_ids     UUID[];
  v_is_retake    BOOLEAN := p_parent_exam_id IS NOT NULL;
BEGIN
  -- 도메인 제한 ----------------------------------------------
  -- 이 함수는 SECURITY DEFINER 라 테이블 RLS(public.is_allowed_domain())를 우회한다.
  -- 따라서 본문에서 직접 도메인을 강제해야, 비허용 도메인 세션이 RPC 를 직접 호출해
  -- 시험을 생성하는 우회 경로를 막을 수 있다.
  IF NOT public.is_allowed_domain() THEN
    RAISE EXCEPTION 'caller is not in an allowed email domain'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_is_retake THEN
    -- 재시험: 모든 내용을 부모 exam 에서 서버가 읽어 재조립한다(클라이언트 입력 무시).
    -- 직접 RPC 호출로 부모와 다른 내용의 가짜 "재시험 N차" 를 만드는 것을 차단한다.
    SELECT pass_percentage, category_ids
      INTO v_pass_pct, v_category_ids
      FROM exams
     WHERE id = p_parent_exam_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent exam % not found', p_parent_exam_id
        USING ERRCODE = 'no_data_found';
    END IF;

    SELECT COUNT(*) INTO v_total FROM exam_words WHERE exam_id = p_parent_exam_id;
    IF v_total < 5 THEN
      RAISE EXCEPTION 'parent exam requires at least 5 words (got %)', v_total
        USING ERRCODE = 'check_violation';
    END IF;
    v_pass := CEIL(v_pass_pct::numeric / 100 * v_total);
    -- 부모 단어를 한 번 셔플해 순서를 고정한다. 이 순서를 exams.word_ids 와
    -- exam_words.order_index 양쪽에 동일하게 써서 메타와 실제 출제 순서를 일치시킨다.
    v_word_ids := ARRAY(
      SELECT word_id FROM exam_words WHERE exam_id = p_parent_exam_id ORDER BY random()
    );

    -- 같은 부모에 대한 동시 재시험 생성을 직렬화하고 차수를 서버가 계산한다.
    PERFORM pg_advisory_xact_lock(hashtext(p_parent_exam_id::text));
    SELECT COALESCE(MAX(retake_number), 0) + 1
      INTO v_retake
      FROM exams
     WHERE parent_exam_id = p_parent_exam_id;
    v_title := format('%s (재시험 %s차)', p_title, v_retake);

    INSERT INTO exams (
      title, pass_percentage, total_questions, pass_count,
      category_ids, word_ids, parent_exam_id, retake_number
    )
    VALUES (
      v_title, v_pass_pct, v_total, v_pass,
      v_category_ids, v_word_ids, p_parent_exam_id, v_retake
    )
    RETURNING id INTO v_exam_id;

    -- 부모 exam_words 스냅샷(삭제된 단어 포함)을 위에서 고정한 v_word_ids 순서로
    -- 복사한다(order_index = ordinality-1). exams.word_ids 와 순서가 일치한다.
    INSERT INTO exam_words (exam_id, word_id, word, meaning, order_index)
    SELECT
      v_exam_id, ew.word_id, ew.word, ew.meaning, (u.ord - 1)
    FROM unnest(v_word_ids) WITH ORDINALITY AS u(wid, ord)
    JOIN exam_words ew
      ON ew.exam_id = p_parent_exam_id AND ew.word_id = u.wid;
  ELSE
    -- 신규 생성: 클라이언트 메타데이터는 서버가 재계산하고, word·meaning 은
    -- canonical words 에서 재조립해 내용 위조를 차단한다.
    IF p_pass_percentage IS NULL OR p_pass_percentage < 0 OR p_pass_percentage > 100 THEN
      RAISE EXCEPTION 'pass_percentage must be between 0 and 100 (got %)', p_pass_percentage
        USING ERRCODE = 'check_violation';
    END IF;

    -- 객관식 5지선다(정답 1 + 오답 4) 보장용. 클라이언트 우회 방어선.
    IF p_words IS NULL OR jsonb_array_length(p_words) < 5 THEN
      RAISE EXCEPTION 'exam requires at least 5 words (got %)', COALESCE(jsonb_array_length(p_words), 0)
        USING ERRCODE = 'check_violation';
    END IF;

    v_total := jsonb_array_length(p_words);
    v_pass  := CEIL(p_pass_percentage::numeric / 100 * v_total);
    v_word_ids := ARRAY(
      SELECT (elem->>'word_id')::UUID
      FROM jsonb_array_elements(p_words) AS elem
      ORDER BY (elem->>'order_index')::INT
    );

    -- 모든 word_id 가 canonical words 에 실재해야 한다.
    IF EXISTS (
      SELECT 1
      FROM unnest(v_word_ids) AS wid
      WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.id = wid)
    ) THEN
      RAISE EXCEPTION 'p_words contains word_id not present in words table'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- user_id 는 aa_enforce_user_id_exams_insert 트리거가 auth.uid() 로 채움
    INSERT INTO exams (
      title, pass_percentage, total_questions, pass_count,
      category_ids, word_ids, parent_exam_id, retake_number
    )
    VALUES (
      p_title, p_pass_percentage, v_total, v_pass,
      p_category_ids, v_word_ids, NULL, 0
    )
    RETURNING id INTO v_exam_id;

    INSERT INTO exam_words (exam_id, word_id, word, meaning, order_index)
    SELECT
      v_exam_id, w.id, w.word, w.meaning, (elem->>'order_index')::INT
    FROM jsonb_array_elements(p_words) AS elem
    JOIN words w ON w.id = (elem->>'word_id')::UUID;
  END IF;

  RETURN v_exam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_exam_with_words(
  TEXT, INT, INT, INT, UUID[], UUID[], JSONB, UUID, INT
) TO authenticated;


