-- VibeLog Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor

-- Sessions 表
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  status text not null default 'active',
  created_at timestamptz default now()
);

-- Ideas 表
create table ideas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  images text[],
  created_at timestamptz default now()
);

-- Blockers 表
create table blockers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  problem text not null,
  solution text,
  status text not null default 'open',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- RLS 策略：仅本人可见
alter table sessions enable row level security;
alter table ideas enable row level security;
alter table blockers enable row level security;

create policy "Users can manage own sessions" on sessions
  for all using (auth.uid() = user_id);

create policy "Users can manage own ideas" on ideas
  for all using (auth.uid() = user_id);

create policy "Users can manage own blockers" on blockers
  for all using (auth.uid() = user_id);
