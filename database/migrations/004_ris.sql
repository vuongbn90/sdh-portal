-- RIS normalized migration
create table if not exists public.ris_journal_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  issn_isbn text,
  publisher text,
  score_type text,
  q_if_citescore text,
  max_score numeric(10,2) default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.ris_publications (
  id uuid primary key default gen_random_uuid(),
  publication_year int,
  title text not null,
  journal_catalog_id uuid references public.ris_journal_catalog(id),
  journal text,
  publisher text,
  score_type text,
  q_if_citescore text,
  doi_link text,
  max_score numeric(10,2) default 0,
  proposed_score numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ris_publication_authors (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid references public.ris_publications(id) on delete cascade,
  faculty_id uuid,
  author_order int,
  role text,
  is_corresponding boolean default false,
  created_at timestamptz default now(),
  unique(publication_id, faculty_id)
);

alter table public.ris_journal_catalog enable row level security;
alter table public.ris_publications enable row level security;
alter table public.ris_publication_authors enable row level security;

drop policy if exists dev_all on public.ris_journal_catalog;
create policy dev_all on public.ris_journal_catalog for all using (true) with check (true);
drop policy if exists dev_all on public.ris_publications;
create policy dev_all on public.ris_publications for all using (true) with check (true);
drop policy if exists dev_all on public.ris_publication_authors;
create policy dev_all on public.ris_publication_authors for all using (true) with check (true);
