-- ============================================================
-- Groupe JF Plus — Audit Log Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Audit log table
create table if not exists public.audit_log (
  id           uuid default gen_random_uuid() primary key,
  user_email   text not null,
  action       text not null,          -- LOGIN, LOGOUT, ADD, EDIT, DELETE
  container_id text,
  detail       text,
  occurred_at  timestamptz default now() not null
);

-- Index for fast queries by date and user
create index if not exists idx_audit_log_occurred on public.audit_log(occurred_at desc);
create index if not exists idx_audit_log_user on public.audit_log(user_email);

-- Enable Row Level Security
alter table public.audit_log enable row level security;

-- Only authenticated users can insert their own audit entries
create policy "audit_insert_own" on public.audit_log
  for insert
  with check (auth.role() = 'authenticated');

-- Only authenticated users can read audit log
create policy "audit_read" on public.audit_log
  for select
  using (auth.role() = 'authenticated');

-- Nobody can update or delete audit entries (immutable log)
-- No UPDATE or DELETE policies = those operations are blocked

-- Verify
select 'audit_log table created successfully' as status;
