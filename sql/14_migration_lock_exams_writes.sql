-- =============================================
-- exams 직접 INSERT/UPDATE 차단 → 생성/수정은 SECURITY DEFINER RPC 로만
-- 실행: Supabase SQL Editor 에서 **postgres 로** 실행
-- =============================================
-- 배경(High):
--   exams 는 그동안 'authenticated' 전원에게 FOR ALL(SELECT/INSERT/UPDATE/DELETE)
--   이 열려 있었다(학원 공유 모델). 그래서 임의의 인증 사용자가 정상 생성 경로인
--   create_exam_with_words RPC 를 완전히 우회해
--     supabase.from('exams').insert({ pass_count: 0, category_ids: [...],
--                                      retake_number: 999, total_questions: 0, ... })
--   처럼 exam_words 와 매칭되지 않는 가짜 시험지나, 메타데이터(합격 기준·출처·
--   재시험 차수)를 위조한 시험지를 만들 수 있었다. 또 FOR ALL 의 UPDATE 로 남이
--   만든 시험지의 제목·합격선·차수를 임의로 변조할 수도 있었다(감사 트리거는
--   남지만 변조 자체를 막지는 못했다). 이는 exam_words 를 SELECT 전용으로 잠근
--   것(sql/10)과 같은 결의 구멍이었다.
--
-- 방어:
--   - exams 직접 INSERT/UPDATE 정책을 제거하고 SELECT/DELETE 만 직접 허용한다.
--   - 생성은 오직 SECURITY DEFINER 함수 create_exam_with_words 를 통해서만 가능하다.
--     이 함수는 owner(postgres)가 테이블 owner 라 RLS 를 우회해 INSERT 하므로,
--     INSERT 정책이 없어도 정상 동작한다. 함수 내부에서 메타데이터를 서버 재계산하고
--     도메인(public.is_allowed_domain())을 직접 검사한다(sql/10).
--   - 수정(UPDATE)은 애플리케이션에 경로가 없으므로 정책을 두지 않는다(기본 deny).
--     향후 시험지 편집 기능이 필요하면 전용 SECURITY DEFINER RPC 로 추가할 것.
--   - 삭제(DELETE)는 클라이언트(useExamHistory)가 직접 수행하고 audit_exam_delete
--     트리거로 감사되므로 직접 허용을 유지한다.
--
-- 멱등: DROP POLICY IF EXISTS + CREATE 라 재적용해도 안전하다. 단, 같은 이름의
--   정책이 이미 있으면 CREATE 가 충돌하므로 먼저 DROP 한다.
--
-- 정식 정의 위치: 이 파일 + sql/01_schema.sql(미러) + sql/08_migration_domain_restriction.sql.
--   셋 다 exams 정책을 SELECT/DELETE 로 정의한다 — 한 곳만 바꾸면 적용 순서에 따라
--   FOR ALL 이 되살아날 수 있으니 함께 갱신할 것.

DROP POLICY IF EXISTS "Authenticated users can manage exams" ON exams;
DROP POLICY IF EXISTS "Authenticated users can read exams" ON exams;
DROP POLICY IF EXISTS "Authenticated users can delete exams" ON exams;

CREATE POLICY "Authenticated users can read exams"
  ON exams FOR SELECT
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain());

CREATE POLICY "Authenticated users can delete exams"
  ON exams FOR DELETE
  USING (auth.role() = 'authenticated' AND public.is_allowed_domain());

-- INSERT/UPDATE 정책을 의도적으로 만들지 않는다(기본 deny).
-- 쓰기는 오직 SECURITY DEFINER 함수 create_exam_with_words 를 통해서만 가능하다.
