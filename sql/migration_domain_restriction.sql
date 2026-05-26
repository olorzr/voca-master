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
--   (sql/migration_lock_exam_words.sql).

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
