# Project Rules

## File Structure
- 파일당 300줄 이하 유지. 초과 시 반드시 분리
- 하나의 파일은 하나의 역할만 담당 (Single Responsibility)
- 폴더 구조: feature 기반 (예: /features/auth/, /features/dashboard/)

## Naming
- 컴포넌트: PascalCase (UserCard.tsx)
- 유틸/훅: camelCase (useAuth.ts, formatDate.ts)
- 상수: UPPER_SNAKE_CASE
- 타입/인터페이스: PascalCase + 접미사 (UserProps, ApiResponse)

## Code Quality
- 함수는 한 가지 일만 수행
- 매직 넘버 금지 → 상수로 추출
- 중복 코드 발견 시 즉시 추출
- early return 패턴 사용 (중첩 if 금지)
- 모든 export 함수에 JSDoc 주석

## When Editing
- 수정 전 관련 파일을 먼저 읽고 구조 파악
- 300줄 초과하면 리팩터링 먼저 제안
- 새 파일 생성 시 index.ts에서 re-export

## Error Handling
- try-catch는 최상위에서만
- 에러 메시지는 사용자 친화적으로
- 콘솔 로그 대신 전용 logger 사용

## Testing
- 새 함수 작성 시 테스트 파일도 함께 생성
- 테스트 파일명: *.test.ts

## Dependencies
- 새 패키지 설치 전 반드시 사용자에게 확인
- 기존 라이브러리로 해결 가능한지 먼저 검토
- package.json에 없는 패키지를 임의로 추가하지 말 것

## Git & Commits
- Conventional Commits 형식: feat:, fix:, refactor:, docs:, test:, chore:
- 커밋 메시지는 한글 OK, 본문에 변경 이유 포함
- 하나의 커밋 = 하나의 논리적 변경

## Type Safety
- any 사용 금지 → unknown + 타입 가드 사용
- API 응답은 반드시 타입/인터페이스 정의
- as 타입 단언 최소화, 런타임 검증 우선

## Performance
- 불필요한 리렌더 방지 (React.memo, useMemo 적절히 사용)
- N+1 쿼리 금지
- 대량 데이터는 페이지네이션 또는 가상 스크롤 적용

## Security
- 시크릿/키는 반드시 환경변수(.env)로 관리
- 사용자 입력은 항상 검증 및 sanitize
- SQL/NoSQL 인젝션 방지 (parameterized query 사용)
- .env 파일은 절대 커밋하지 말 것

## Accessibility
- 시맨틱 HTML 사용 (div 남용 금지)
- 인터랙티브 요소에 aria 속성 포함
- 키보드 내비게이션 지원
- 색상만으로 정보를 전달하지 말 것

## Workflow
- 작업 전: 관련 파일 구조 파악 → 계획 제시 → 승인 후 코드 작성
- 작업 후: 변경된 파일 목록과 요약 제공
- 확신 없는 결정은 먼저 물어볼 것, 임의로 진행하지 말 것

---

## Documentation & Knowledge Management

### CLAUDE.md (이 파일) 유지 규칙
- 작업 중 발견한 중요한 사항, 주의점, 버그 패턴은 이 파일에 즉시 기록
- "다음에 이 코드를 수정할 때 꼭 알아야 할 것"이 있으면 반드시 추가
- 프로젝트 아키텍처 결정 사항(왜 이 방식을 선택했는지)도 기록
- 기록 시 날짜 포함 (예: [2025-03-09] Supabase RLS 정책 때문에 직접 쿼리 불가)

### docs/terms.md 관리
- 프로젝트에서 사용하는 도메인 용어, 비즈니스 용어를 정의
- 새로운 개념이나 용어가 등장하면 즉시 terms.md에 추가
- 형식:
```
  ## 용어명 (영문명)
  - 정의: ...
  - 코드에서의 사용: 변수명/타입명 등
  - 관련 파일: ...
```
- 코드에서 사용하는 변수명/타입명과 terms.md의 용어를 일치시킬 것
- 용어가 모호하면 사용자에게 확인 후 기록

### docs/architecture.md 관리
- 프로젝트 전체 구조도 유지 (모듈 간 의존관계)
- 주요 데이터 흐름 설명
- 새 모듈 추가 시 이 문서도 함께 업데이트
- 형식:
```
  ## 모듈명
  - 역할: ...
  - 의존: ...
  - 주요 파일: ...
```

### docs/env.example 관리
- 필요한 환경변수 목록과 설명을 예시 파일로 유지
- 새 환경변수 추가 시 반드시 이 파일도 업데이트
- 형식:
```
  # 데이터베이스
  DATABASE_URL=postgresql://user:password@localhost:5432/dbname
  
  # 인증
  JWT_SECRET=your-secret-key-here
```

### docs/api.md 관리
- API 엔드포인트 목록과 요청/응답 형식 기록
- 엔드포인트 변경 시 반드시 업데이트
- 형식:
```
  ## POST /api/auth/login
  - 설명: 로그인
  - Body: { email: string, password: string }
  - Response: { token: string, user: User }
  - 에러: 401 (잘못된 인증정보), 429 (요청 제한)
```

### CHANGELOG.md 관리
- 프로젝트 루트에 유지
- 버전별 주요 변경사항 기록
- 형식:
```
  ## [0.2.0] - 2025-03-09
  ### Added
  - 소셜 로그인 (Google, Kakao)
  ### Fixed
  - 토큰 만료 시 무한 리다이렉트 버그
  ### Changed
  - API 응답 형식 통일
```

### 문서 업데이트 원칙
- 코드 변경 시 관련 문서도 반드시 함께 업데이트
- 문서가 코드와 불일치하면 즉시 수정
- 모든 문서는 한글로 작성

---

## Known Issues
- [2026-03-09] Tailwind CSS v4에서 `print\:hidden` 같은 이스케이프 pseudo-class가 CSS 파싱 에러를 발생시킴 → `data-no-print` 어트리뷰트 + 순수 CSS로 대체
- [2026-03-09] shadcn Select의 `onValueChange`가 `string | null`을 전달함 → `(v) => { if (v) setter(v); }` 패턴 필요

## Architecture Decisions
- [2026-03-09] 포인트 컬러 `#81D8D0`을 CSS 변수 `--primary`로 통합 → Tailwind `text-primary`, `bg-primary` 등으로 일관되게 사용
- [2026-03-09] 카테고리 포맷팅/그룹화 로직을 `lib/format.ts`로 추출 → words, exam/create 등 여러 페이지에서 중복 제거
- [2026-03-09] words/new 페이지를 CategoryForm + WordEntryTable로 분리 → 300줄 제한 준수
- [2026-03-09] App Router route 그룹 `(auth)`, `(main)`으로 인증 필요/불필요 영역 분리
- [2026-03-09] 네이버 웍스(LINE WORKS) OAuth 로그인으로 전환 → email/password 인증 제거, `@araeducation.co.kr` 도메인만 허용, Supabase admin API + magic link로 세션 수립

- [2026-03-10] 카테고리 마스터 테이블 도입 (publishers, major_chapters, sub_chapters, schools, school_materials) → 모든 사용자 공유, RLS는 authenticated만 체크. 기존 categories 테이블은 단어 그룹 매핑용으로 유지 (텍스트 값 저장)
- [2026-03-10] 외부지문 트리 구조: 학교명 > 프린트/작품명 (2레벨), 중등/고등: 출판사 > 학기 > 대단원 > 소단원 (4레벨)
- [2026-03-10] CategoryTree 컴포넌트를 단어 관리/시험지 생성에서 공유 → 단일 선택(onSelect) / 다중 선택(onToggle+multiSelect) 모드 지원

## Gotchas
- [2026-03-09] `@supabase/auth-helpers-nextjs`는 deprecated됨. 현재 직접 `@supabase/supabase-js` 사용 중
- [2026-03-09] exam_words 테이블은 단어 스냅샷이므로 원본 단어를 수정해도 기존 시험지에는 영향 없음