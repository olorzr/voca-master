import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const scriptSrc = isProd
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // globals.css 가 cdn.jsdelivr.net 에서 Pretendard/GmarketSans 폰트 스타일시트를
  // @import 하고, 그 시트가 같은 CDN 의 woff2 폰트를 불러온다. self 만 허용하면
  // 프로덕션에서 폰트가 차단되므로 해당 CDN 을 style-src/font-src 에 추가한다.
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://auth.worksmobile.com https://www.worksapis.com",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
];

const contentSecurityPolicy = cspDirectives.join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
