# API 엔드포인트

이 프로젝트는 별도의 API 라우트 없이 Supabase 클라이언트를 직접 사용합니다.
모든 데이터 접근은 RLS(Row Level Security) 정책으로 보호됩니다.

## Supabase 테이블 CRUD

### categories
- SELECT: 로그인 사용자의 카테고리 목록 조회
- INSERT: 새 카테고리 생성 (단어 입력 시 함께 생성)
- DELETE: 카테고리 삭제 (CASCADE로 하위 단어도 삭제)

### words
- SELECT: 특정 카테고리의 단어 목록 조회
- INSERT: 새 단어 등록 (개별 또는 CSV 대량)
- UPDATE: 단어/뜻 수정
- DELETE: 개별 단어 삭제

### exams
- SELECT: 시험지 목록 및 상세 조회
- INSERT: 새 시험지 생성
- DELETE: 시험지 삭제

### exam_words
- SELECT: 시험지에 포함된 단어 스냅샷 조회
- INSERT: 시험지 생성 시 단어 스냅샷 저장

## 인증
- 방식: Supabase Auth (이메일/비밀번호)
- signInWithPassword: 로그인
- signUp: 회원가입
- signOut: 로그아웃
