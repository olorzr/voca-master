'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * OAuth 인증 후 Supabase 세션을 수립하는 내부 컴포넌트.
 */
function CallbackHandler() {
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
      })
      // 네트워크/런타임 오류로 Promise 가 reject 되면 unhandled rejection 이
      // 되어 스피너 화면에서 영원히 멈춘다. 실패도 명시적으로 처리한다.
      .catch(() => {
        router.push('/login?error=verification_failed');
      });
  }, [router, searchParams]);

  return null;
}

/**
 * OAuth 인증 후 Supabase 세션을 수립하는 콜백 페이지.
 */
export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
