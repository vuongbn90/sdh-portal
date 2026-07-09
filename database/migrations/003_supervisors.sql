-- Supervisors normalized migration
create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid,
  supervisor_type text default 'both',
  max_master_students int default 15,
  max_phd_students int default 8,
  eligibility text,
  status text default 'active',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.supervisor_assignments (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid references public.supervisors(id) on delete cascade,
  student_id uuid,
  phd_student_id uuid,
  thesis_id uuid,
  role text default 'Supervisor',
  assigned_date date default current_date,
  end_date date,
  status text default 'active',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.supervisor_meetings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.supervisor_assignments(id) on delete cascade,
  meeting_date date,
  content text,
  next_action text,
  status text default 'completed',
  created_at timestamptz default now()
);

alter table public.supervisors enable row level security;
alter table public.supervisor_assignments enable row level security;
alter table public.supervisor_meetings enable row level security;

drop policy if exists dev_all on public.supervisors;
create policy dev_all on public.supervisors for all using (true) with check (true);
drop policy if exists dev_all on public.supervisor_assignments;
create policy dev_all on public.supervisor_assignments for all using (true) with check (true);
drop policy if exists dev_all on public.supervisor_meetings;
create policy dev_all on public.supervisor_meetings for all using (true) with check (true);
