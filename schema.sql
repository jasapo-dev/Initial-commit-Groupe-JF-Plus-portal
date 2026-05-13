-- ============================================================
-- Groupe JF Plus — Full Schema
-- Paste this entire file into Supabase SQL Editor and Run
-- ============================================================

-- CONTAINERS TABLE
create table if not exists public.containers (
  id            bigserial primary key,
  container_id  text not null unique,
  size          text not null default '20V',
  color         text not null default 'GREEN',
  status        text not null default 'Available'
                check (status in ('Available','Rented','Maintenance')),
  client        text,
  phone         text,
  address       text,
  rented_date   date,
  return_date   date,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- CLIENTS TABLE (for autocomplete)
create table if not exists public.clients (
  id          bigserial primary key,
  name        text not null unique,
  phone       text,
  address     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- AUTO-UPDATE updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end;
$$;

create trigger containers_updated_at
  before update on public.containers
  for each row execute procedure public.set_updated_at();

create trigger clients_updated_at
  before update on public.clients
  for each row execute procedure public.set_updated_at();

-- INDEXES
create index if not exists idx_containers_status on public.containers(status);
create index if not exists idx_containers_client on public.containers(client);
create index if not exists idx_clients_name on public.clients(name);

-- DISABLE RLS for now (no auth) — enable later when adding login
alter table public.containers disable row level security;
alter table public.clients disable row level security;

-- SEED YOUR 25 CONTAINERS
insert into public.containers (container_id, size, color, status) values
  ('025-7V',   '7V',       'GREEN', 'Available'),
  ('026-7V',   '7V',       'GREEN', 'Available'),
  ('001-10V',  '10V',      'GREEN', 'Available'),
  ('002-10V',  '10V',      'GREEN', 'Available'),
  ('007-10V',  '10V',      'GREEN', 'Available'),
  ('020-10V',  '10V',      'GREEN', 'Available'),
  ('003-15V',  '15V',      'BLUE',  'Available'),
  ('009-15V',  '15V',      'GREEN', 'Available'),
  ('015-15V',  '15V',      'GREEN', 'Available'),
  ('016-15V',  '15V',      'GREEN', 'Available'),
  ('027-15V',  '15V',      'GREEN', 'Available'),
  ('004-15V',  '15V',      'BLACK', 'Available'),
  ('017-20V',  '20V',      'GREEN', 'Available'),
  ('018-20V',  '20V',      'GREEN', 'Available'),
  ('005-20V',  '20V',      'GREEN', 'Available'),
  ('006-20V',  '20V',      'GREEN', 'Available'),
  ('023-20V',  '20V',      'GREEN', 'Available'),
  ('024-20V',  '20V',      'GREEN', 'Available'),
  ('013-20V',  '20V',      'GREEN', 'Available'),
  ('014-20V',  '20V',      'GREEN', 'Available'),
  ('019-20V',  '20V',      'GREEN', 'Available'),
  ('028-20V',  '20V',      'GREEN', 'Available'),
  ('029-20V',  '20V',      'GREEN', 'Available'),
  ('032-25VF', '25V (BOX)','GREEN', 'Available'),
  ('033-25VF', '25V (BOX)','GREEN', 'Available')
on conflict (container_id) do nothing;

select 'Schema created successfully — '||count(*)||' containers loaded' as status
from public.containers;
