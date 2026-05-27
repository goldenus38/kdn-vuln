-- ============================================================
-- KDN-VULN Supabase 스키마
-- 주요정보통신기반시설 보안상세가이드(2025.12) - Linux 취약점 관리
-- Supabase 프로젝트 SQL Editor 에서 실행하세요.
-- ============================================================

-- ── 자산(점검 대상 서버) ──
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  hostname    text not null,
  ip          text default '',
  os_type     text default '',
  os_version  text default '',
  department  text default '',
  "owner"     text default '',
  location    text default '',
  note        text default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_assets_hostname on public.assets (hostname);

-- ── 점검 세션 (CSV 1개 = 1행, 개별 항목 결과는 results JSONB) ──
create table if not exists public.scans (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid references public.assets(id) on delete set null,
  hostname     text not null,
  scan_date    timestamptz not null,
  file_name    text default '',
  uploaded_at  timestamptz not null default now(),
  uploaded_by  text default '',
  total        int  not null default 0,
  vuln_count   int  not null default 0,
  good_count   int  not null default 0,
  manual_count int  not null default 0,
  score        numeric(5,1) not null default 0,
  -- [{ checkItem, result(Y/N/C), detail, message, eventTime }, ...]
  results      jsonb not null default '[]'::jsonb
);
create index if not exists idx_scans_asset on public.scans (asset_id);
create index if not exists idx_scans_hostname on public.scans (hostname);
create index if not exists idx_scans_date on public.scans (scan_date desc);

-- ── 조치(fix) 실행 세션 (조치 로그 1개 = 1행, 항목별 결과는 items JSONB) ──
create table if not exists public.fixes (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid references public.assets(id) on delete set null,
  hostname      text not null,
  fix_date      timestamptz not null,
  file_name     text default '',
  uploaded_at   timestamptz not null default now(),
  items_arg     text default '',
  total         int not null default 0,
  fixed_count   int not null default 0,
  reported_count int not null default 0,
  manual_count  int not null default 0,
  fail_count    int not null default 0,
  -- [{ code, title, result(FIXED/REPORTED/MANUAL/FAIL/UNKNOWN), actions:[{tag,message,time}] }, ...]
  items         jsonb not null default '[]'::jsonb
);
create index if not exists idx_fixes_asset on public.fixes (asset_id);
create index if not exists idx_fixes_hostname on public.fixes (hostname);
create index if not exists idx_fixes_date on public.fixes (fix_date desc);

-- ── 보안 공지사항 게시판 ──
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default '일반',   -- 긴급/점검일정/패치권고/정책/일반
  title       text not null,
  body        text default '',
  author      text default '관리자',
  pinned      boolean not null default false,
  views       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_notices_pinned on public.notices (pinned desc, created_at desc);

-- ── 보안 동향 · CVE 게시판 ──
create table if not exists public.threats (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  cve           text default '',
  severity      text not null default '중간',  -- 긴급/높음/중간/낮음
  source        text default '',
  source_url    text default '',
  published_date text default '',
  tags          jsonb not null default '[]'::jsonb,
  related_items jsonb not null default '[]'::jsonb,  -- ['U-01', ...]
  body          text default '',
  author        text default '관리자',
  views         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_threats_created on public.threats (created_at desc);

-- ── 자료실 게시판 (파일은 Storage 'resources' 버킷) ──
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default '가이드',  -- 점검스크립트/가이드/체크리스트/조치매뉴얼/기타
  title       text not null,
  description text default '',
  file_name   text default '',
  file_path   text default '',   -- Storage object path
  file_url    text default '',   -- 공개 URL
  file_size   bigint default 0,
  mime        text default '',
  author      text default '관리자',
  downloads   int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_resources_created on public.resources (created_at desc);

-- Storage 버킷(공개) — 파일 다운로드는 공개 URL로
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

-- ============================================================
-- RLS: 인증된 사용자(로그인한 운영자)만 접근 허용
-- ============================================================
alter table public.assets  enable row level security;
alter table public.scans   enable row level security;
alter table public.fixes   enable row level security;
alter table public.notices   enable row level security;
alter table public.threats   enable row level security;
alter table public.resources enable row level security;

drop policy if exists "auth full access - assets" on public.assets;
create policy "auth full access - assets" on public.assets
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - scans" on public.scans;
create policy "auth full access - scans" on public.scans
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - fixes" on public.fixes;
create policy "auth full access - fixes" on public.fixes
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - notices" on public.notices;
create policy "auth full access - notices" on public.notices
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - threats" on public.threats;
create policy "auth full access - threats" on public.threats
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - resources" on public.resources;
create policy "auth full access - resources" on public.resources
  for all to authenticated using (true) with check (true);

-- Storage 'resources' 버킷 접근 정책 (인증 사용자: 업로드/삭제, 공개: 다운로드)
drop policy if exists "resources storage read" on storage.objects;
create policy "resources storage read" on storage.objects
  for select using (bucket_id = 'resources');
drop policy if exists "resources storage write" on storage.objects;
create policy "resources storage write" on storage.objects
  for insert to authenticated with check (bucket_id = 'resources');
drop policy if exists "resources storage delete" on storage.objects;
create policy "resources storage delete" on storage.objects
  for delete to authenticated using (bucket_id = 'resources');

-- 운영자 계정 생성: Supabase 대시보드 > Authentication > Users > Add user
-- (이메일/비밀번호) 로 추가하면 프런트 로그인에 사용됩니다.
