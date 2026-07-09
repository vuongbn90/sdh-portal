-- Academic core compatibility migration
alter table public.faculty add column if not exists faculty_code text;
alter table public.faculty add column if not exists full_name text;
alter table public.faculty add column if not exists degree text;
alter table public.faculty add column if not exists academic_rank text;
alter table public.faculty add column if not exists email text;
alter table public.faculty add column if not exists phone text;
alter table public.faculty add column if not exists department_id uuid;
alter table public.faculty add column if not exists status text default 'active';
alter table public.faculty add column if not exists created_at timestamptz default now();
alter table public.faculty add column if not exists updated_at timestamptz default now();

create table if not exists public.study_plan_classes (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid,
  class_code text,
  class_name text,
  teacher_id uuid,
  max_students int default 30,
  start_date date,
  end_date date,
  room text,
  status text default 'planned',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.study_plan_schedules (
  id uuid primary key default gen_random_uuid(),
  study_plan_class_id uuid references public.study_plan_classes(id) on delete cascade,
  session_no int,
  study_date date,
  time_slot text,
  room text,
  teacher_id uuid,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.course_registrations (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid,
  study_plan_class_id uuid,
  student_id uuid,
  phd_student_id uuid,
  registration_date date default current_date,
  status text default 'registered',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.study_plan_classes enable row level security;
alter table public.study_plan_schedules enable row level security;
alter table public.course_registrations enable row level security;

drop policy if exists dev_all on public.study_plan_classes;
create policy dev_all on public.study_plan_classes for all using (true) with check (true);
drop policy if exists dev_all on public.study_plan_schedules;
create policy dev_all on public.study_plan_schedules for all using (true) with check (true);
drop policy if exists dev_all on public.course_registrations;
create policy dev_all on public.course_registrations for all using (true) with check (true);
