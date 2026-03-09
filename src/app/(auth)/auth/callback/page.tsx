'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * OAuth 인증 후 Supabase 세션을 수립하는 콜백 페이지.
 * token_hash를 verifyOtp로 검증하여 로그인을 완료한다.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) return;
    verified.current = true;

    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (!tokenHash || type !== 'magiclink') {
      router.push('/login?error=invalid_callback');
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      .then(({ error }) => {
        if (error) {
          router.push('/login?error=verification_failed');
        } else {
          router.push('/dashboard');
        }
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
