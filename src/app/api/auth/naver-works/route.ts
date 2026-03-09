import { NextResponse } from 'next/server';

const NAVER_WORKS_AUTH_URL = 'https://auth.worksmobile.com/oauth2/v2.0/authorize';

/**
 * 네이버 웍스 OAuth 인증 페이지로 리다이렉트한다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/naver-works/callback`;

  const params = new URLSearchParams({
    client_id: process.env.NAVER_WORKS_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user',
    state,
  });

  const response = NextResponse.redirect(`${NAVER_WORKS_AUTH_URL}?${params}`);

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
