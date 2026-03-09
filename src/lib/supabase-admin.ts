import { createClient } from '@supabase/supabase-js';

/**
 * 서버 사이드 전용 Supabase Admin 클라이언트.
 * Service Role Key를 사용하여 RLS를 우회하고 사용자 관리 작업을 수행한다.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
