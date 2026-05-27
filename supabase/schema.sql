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

-- ============================================================
-- RLS: 인증된 사용자(로그인한 운영자)만 접근 허용
-- ============================================================
alter table public.assets enable row level security;
alter table public.scans  enable row level security;
alter table public.fixes  enable row level security;

drop policy if exists "auth full access - assets" on public.assets;
create policy "auth full access - assets" on public.assets
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - scans" on public.scans;
create policy "auth full access - scans" on public.scans
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access - fixes" on public.fixes;
create policy "auth full access - fixes" on public.fixes
  for all to authenticated using (true) with check (true);

-- 운영자 계정 생성: Supabase 대시보드 > Authentication > Users > Add user
-- (이메일/비밀번호) 로 추가하면 프런트 로그인에 사용됩니다.
