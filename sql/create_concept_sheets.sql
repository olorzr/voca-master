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

-- 인증된 사용자만 자신의 데이터 접근
create policy "Users can view own concept sheets"
  on concept_sheets for select
  using (auth.uid() = user_id);

create policy "Users can insert own concept sheets"
  on concept_sheets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own concept sheets"
  on concept_sheets for update
  using (auth.uid() = user_id);

create policy "Users can delete own concept sheets"
  on concept_sheets for delete
  using (auth.uid() = user_id);

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
