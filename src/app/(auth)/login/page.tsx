'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: '인증 요청이 올바르지 않습니다. 다시 시도해주세요.',
  token_failed: '네이버 웍스 인증에 실패했습니다. 다시 시도해주세요.',
  user_info_failed: '사용자 정보를 가져오지 못했습니다.',
  unauthorized_domain: '@araeducation.co.kr 계정만 사용할 수 있습니다.',
  create_user_failed: '사용자 등록에 실패했습니다. 관리자에게 문의해주세요.',
  session_failed: '로그인 세션 생성에 실패했습니다. 다시 시도해주세요.',
  verification_failed: '인증 검증에 실패했습니다. 다시 시도해주세요.',
  invalid_callback: '잘못된 인증 콜백입니다. 다시 시도해주세요.',
};

/**
 * 에러 메시지를 표시하는 내부 컴포넌트.
 */
function ErrorMessage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? '알 수 없는 오류가 발생했습니다.' : null;

  if (!errorMessage) return null;

  return <p className="text-sm text-red-600 text-center">{errorMessage}</p>;
}

/**
 * 로그인 페이지. 네이버 웍스 OAuth로 로그인한다.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-teal-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold" style={{ fontFamily: "'Gmarket Sans', sans-serif" }}>아라국어논술</CardTitle>
          <CardDescription>단어 관리 및 시험지 생성 시스템 🌷</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense>
            <ErrorMessage />
          </Suspense>
          <a
            href="/api/auth/naver-works"
            className="flex h-10 w-full items-center justify-center rounded-lg bg-[#03C75A] text-sm font-medium text-white transition-colors hover:bg-[#02b351]"
          >
            네이버 웍스로 로그인
          </a>
          <p className="text-xs text-gray-400 text-center">
            @araeducation.co.kr 계정만 로그인할 수 있습니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
