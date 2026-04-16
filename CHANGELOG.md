# Changelog

## [0.1.1] - 2026-04-16
### Security
- concept_sheets.editor_html 의 Stored XSS 취약점 수정 — `isomorphic-dompurify` 화이트리스트 sanitize 를 저장 경로(`handleSave`) 와 렌더 변환 경로(`exam-transform` 3개 함수) 양쪽에 적용해 다층 방어 구성
- `next.config.ts` 에 Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy 추가 — `object-src 'none'` / `frame-ancestors 'none'` / `connect-src` 화이트리스트로 외부 유출 경로 차단
### Added
- `src/lib/sanitize-html.ts` + 테스트 10건 (`<script>`, `onerror`, `javascript:` 제거 및 TipTap 합법 마크업 보존 검증)

## [0.1.0] - 2026-03-09
### Added
- 프로젝트 초기 설정 (Next.js 16, Tailwind CSS v4, Shadcn UI)
- Supabase Auth 기반 로그인/회원가입
- 단어 관리 (카테고리 체계: 중등/고등/외부지문)
- 개별 단어 입력 및 CSV 대량 업로드
- 임시 저장 및 불러오기 (localStorage)
- 시험지 생성 (카테고리 선택, 합격선 자동 계산, 셔플)
- 시험지/답안지/단어장 3종 보기
- A4 인쇄 최적화 (Print CSS)
- 시험 이력 대시보드
- Supabase RLS 보안 정책
