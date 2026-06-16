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
-- 시그니처는 sql/archive/migration_enforce_user_id.sql (commit 0a70485) 에서 도입한 9-인자
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

-- 2) create_exam_with_words 정의는 이 파일에서 제거했다.
--
-- [2026-05-26] 이전엔 이 파일이 advisory lock 버전을 SECURITY INVOKER 로 재정의했으나,
--   exam_words 직접 쓰기를 RLS 로 차단하면서(sql/10_migration_lock_exam_words.sql) RPC 는
--   SECURITY DEFINER 여야 잠긴 RLS 를 우회해 exam_words 에 INSERT 할 수 있다. 또 신규
--   생성 경로의 word·meaning 재조립/검증도 추가됐다. 이 파일이 lock 마이그레이션 이후
--   재실행되면 함수를 INVOKER+무검증 버전으로 되돌려 쓰기 차단과 위조 방어가 풀리는
--   퇴행이 발생한다.
--
--   따라서 create_exam_with_words 의 정식(canonical) 정의는
--     sql/10_migration_lock_exam_words.sql
--   한 곳에서만 관리한다. 이 파일은 위 부분 유일 인덱스(part 1)만 담당한다.
--   적용 순서: ... → archive/migration_retake_atomic.sql → 10_migration_lock_exam_words.sql(마지막)
