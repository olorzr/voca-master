import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * 서버 사이드 전용 Supabase Admin 클라이언트.
 * Service Role Key를 사용하여 RLS를 우회하고 사용자 관리 작업을 수행한다.
 * 빌드 시 환경변수 부재로 인한 에러를 방지하기 위해 lazy initialization을 사용한다.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
    }
    return Reflect.get(_client, prop);
  },
});
