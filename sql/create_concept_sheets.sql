-- 개념지 저장 테이블
create table concept_sheets (
  id uuid primary key default gen_random_uuid(),
  title text not null default '제목 없음',
  -- 카테고리 정보 (BuilderCategory 필드)
  level text not null default '중등',
  grade text not null default '',
  publisher text not null default '',
  semester text not null default '',
  unit text not null default '',
  subunit text not null default '',
  -- 에디터 콘텐츠
  editor_html text not null default '',
  marks jsonb not null default '[]'::jsonb,
  -- 메타
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS 활성화
alter table concept_sheets enable row level security;

-- 모든 인증된 사용자 공유 (감사 로그로 변경 이력 추적)
create policy "Authenticated users can manage concept_sheets"
  on concept_sheets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- updated_at 자동 갱신 트리거
create or replace function update_concept_sheets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger concept_sheets_updated_at
  before update on concept_sheets
  for each row
  execute function update_concept_sheets_updated_at();
