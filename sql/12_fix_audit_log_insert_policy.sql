-- =============================================
-- audit_log INSERT 정책 정리 패치
-- 배경: "System can insert audit_log" 정책이 authenticated 사용자에게
--       audit_log 에 대한 임의 INSERT 를 허용하여 감사 로그 오염 가능.
--       SECURITY DEFINER 트리거(postgres 소유, BYPASSRLS)가 RLS 를 우회하므로
--       해당 정책은 불필요하며, 존재 자체가 공격면이 된다.
-- 실행: Supabase SQL Editor 에서 1회 실행 (idempotent)
-- =============================================

DROP POLICY IF EXISTS "System can insert audit_log" ON audit_log;

-- 검증: 아래 쿼리는 Admin SELECT 정책 1건만 반환해야 한다
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'audit_log';
