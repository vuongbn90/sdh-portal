-- SDH Portal Enterprise v1.0 - Core migration
create extension if not exists pgcrypto;

create table if not exists public.system_roles (
  id uuid primary key default gen_random_uuid(),
  role_code text unique,
  role_name text,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.system_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  full_name text,
  email text,
  phone text,
  role_id uuid references public.system_roles(id),
  role_code text,
  faculty_id uuid,
  student_id uuid,
  phd_student_id uuid,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  module text,
  action text,
  description text,
  created_at timestamptz default now()
);

alter table public.system_roles enable row level security;
alter table public.system_users enable row level security;
alter table public.system_logs enable row level security;

drop policy if exists dev_all on public.system_roles;
create policy dev_all on public.system_roles for all using (true) with check (true);
drop policy if exists dev_all on public.system_users;
create policy dev_all on public.system_users for all using (true) with check (true);
drop policy if exists dev_all on public.system_logs;
create policy dev_all on public.system_logs for all using (true) with check (true);
