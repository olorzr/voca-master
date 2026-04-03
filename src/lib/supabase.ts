import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Supabase 클라이언트 인스턴스.
 * 빌드 시 프리렌더링 환경에서 환경변수 부재 에러를 방지하기 위해 lazy initialization을 사용한다.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    return Reflect.get(_client, prop);
  },
});
