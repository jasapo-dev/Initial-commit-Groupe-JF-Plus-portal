-- ============================================================
-- Groupe JF Plus — Container Tracking Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text not null,
  full_name    text,
  role         text not null default 'viewer' check (role in ('admin','viewer')),
  phone        text,
  created_at   timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Containers ──────────────────────────────────────────────
create table public.containers (
  id                uuid default uuid_generate_v4() primary key,
  container_number  text not null unique,
  client_name       text not null,
  origin            text not null,
  destination       text not null,
  status            text not null default 'in_transit'
                    check (status in ('in_transit','at_port','customs','delivered','delayed','loading')),
  last_location     text not null default '',
  last_update       timestamptz not null default now(),
  eta               timestamptz,
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger containers_updated_at
  before update on public.containers
  for each row execute procedure public.set_updated_at();

-- ── Container Events ────────────────────────────────────────
create table public.container_events (
  id            uuid default uuid_generate_v4() primary key,
  container_id  uuid references public.containers on delete cascade not null,
  event_type    text not null,   -- e.g. 'departed', 'arrived', 'cleared_customs'
  location      text not null default '',
  description   text,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz default now()
);

create index idx_container_events_container_id on public.container_events(container_id);
create index idx_container_events_occurred_at on public.container_events(occurred_at desc);

-- ── Alert Rules ─────────────────────────────────────────────
create table public.alert_rules (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  container_id    uuid references public.containers on delete cascade,   -- null = all
  trigger_status  text not null default 'delayed',
  notify_email    text,
  notify_sms      text,
  is_active       boolean not null default true,
  last_triggered  timestamptz,
  created_at      timestamptz default now()
);

create index idx_alert_rules_user_id on public.alert_rules(user_id);

-- ── Alert Log ────────────────────────────────────────────────
create table public.alert_log (
  id          uuid default uuid_generate_v4() primary key,
  rule_id     uuid references public.alert_rules on delete set null,
  container_id uuid references public.containers on delete set null,
  channel     text not null,   -- 'email' | 'sms'
  recipient   text not null,
  message     text not null,
  sent_at     timestamptz default now(),
  success     boolean not null default true,
  error       text
);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.profiles       enable row level security;
alter table public.containers      enable row level security;
alter table public.container_events enable row level security;
alter table public.alert_rules     enable row level security;
alter table public.alert_log       enable row level security;

-- Profiles: users see and edit their own
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- Containers: all authenticated users can read; only admins can write
create policy "containers_read" on public.containers
  for select using (auth.role() = 'authenticated');

create policy "containers_write" on public.containers
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Container events: all authenticated can read; only admins write
create policy "events_read" on public.container_events
  for select using (auth.role() = 'authenticated');

create policy "events_write" on public.container_events
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Alert rules: users manage their own
create policy "alerts_own" on public.alert_rules
  for all using (auth.uid() = user_id);

-- Alert log: users see logs for their rules
create policy "alert_log_own" on public.alert_log
  for select using (
    exists (select 1 from public.alert_rules where id = rule_id and user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.containers;
alter publication supabase_realtime add table public.container_events;
