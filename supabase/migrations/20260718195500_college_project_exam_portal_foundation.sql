-- College project exam portal foundation.
-- Apply this only to the `college_project` Supabase project.

create extension if not exists pgcrypto;

do $$
begin
  create type public.exam_kind as enum ('mid1', 'mid2', 'semester', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ingestion_status as enum ('pending', 'processing', 'ready', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users admin_users
    where admin_users.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

create table if not exists public.departments (
  code text primary key check (code = lower(code) and code ~ '^[a-z0-9_]+$'),
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  regulation text not null check (regulation ~ '^r[0-9]{2}$'),
  academic_year smallint not null check (academic_year between 1 and 4),
  semester smallint not null check (semester between 1 and 2),
  department_code text not null references public.departments(code) on update cascade,
  subject_code text not null,
  subject_name text not null,
  syllabus_source_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (regulation, academic_year, semester, department_code, subject_code)
);

create table if not exists public.subject_syllabi (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  source_url text,
  storage_bucket text not null default 'pyq-vault',
  storage_path text,
  version_label text not null default 'official',
  status public.ingestion_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  scraped_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, version_label)
);

create table if not exists public.syllabus_units (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.subject_syllabi(id) on delete cascade,
  unit_number smallint not null check (unit_number > 0),
  title text,
  content text not null,
  outcomes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  unique (syllabus_id, unit_number)
);

create table if not exists public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  exam_kind public.exam_kind not null,
  paper_year smallint not null check (paper_year between 2000 and 2100),
  exam_label text,
  storage_bucket text not null default 'pyq-vault',
  storage_path text not null unique,
  file_name text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  mime_type text not null default 'application/pdf',
  page_count integer check (page_count is null or page_count > 0),
  checksum_sha256 text,
  is_published boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_text_chunks (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  text_content text not null,
  token_count integer check (token_count is null or token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (paper_id, chunk_index)
);

create table if not exists public.syllabus_text_chunks (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.subject_syllabi(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  text_content text not null,
  token_count integer check (token_count is null or token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (syllabus_id, chunk_index)
);

create table if not exists public.admin_upload_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id) on delete set null,
  source_root text,
  manifest jsonb not null default '{}'::jsonb,
  status public.ingestion_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_prediction_runs (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  exam_kind public.exam_kind not null,
  student_academic_year smallint not null check (student_academic_year between 1 and 4),
  student_semester smallint not null check (student_semester between 1 and 2),
  current_regulation text not null check (current_regulation ~ '^r[0-9]{2}$'),
  fallback_regulations text[] not null default array[]::text[],
  input_paper_ids uuid[] not null default array[]::uuid[],
  model_provider text not null default 'nvidia',
  model_name text not null default 'nvidia/nemotron-3-ultra-550b-a55b',
  prompt_version text not null default 'v1',
  status public.ingestion_status not null default 'pending',
  result jsonb,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subject_syllabi_updated_at on public.subject_syllabi;
create trigger set_subject_syllabi_updated_at
before update on public.subject_syllabi
for each row execute function public.set_updated_at();

drop trigger if exists set_exam_papers_updated_at on public.exam_papers;
create trigger set_exam_papers_updated_at
before update on public.exam_papers
for each row execute function public.set_updated_at();

create index if not exists subjects_folder_idx
  on public.subjects (regulation, academic_year, semester, department_code, display_order);

create index if not exists exam_papers_subject_exam_idx
  on public.exam_papers (subject_id, exam_kind, paper_year desc);

create index if not exists exam_papers_published_idx
  on public.exam_papers (is_published)
  where is_published = true;

create index if not exists paper_text_chunks_paper_idx
  on public.paper_text_chunks (paper_id, chunk_index);

create index if not exists syllabus_units_syllabus_idx
  on public.syllabus_units (syllabus_id, unit_number);

create index if not exists ai_prediction_runs_lookup_idx
  on public.ai_prediction_runs (subject_id, exam_kind, current_regulation, created_at desc);

create or replace view public.paper_browser_items as
select
  papers.id as paper_id,
  subjects.regulation,
  subjects.academic_year,
  subjects.semester,
  departments.code as department_code,
  departments.name as department_name,
  subjects.subject_code,
  subjects.subject_name,
  papers.exam_kind,
  papers.paper_year,
  papers.exam_label,
  papers.storage_bucket,
  papers.storage_path,
  papers.file_name,
  papers.file_size_bytes,
  papers.mime_type,
  papers.page_count,
  papers.uploaded_at
from public.exam_papers papers
join public.subjects subjects on subjects.id = papers.subject_id
join public.departments departments on departments.code = subjects.department_code
where papers.is_published = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pyq-vault',
  'pyq-vault',
  true,
  104857600,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.admin_users enable row level security;
alter table public.departments enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_syllabi enable row level security;
alter table public.syllabus_units enable row level security;
alter table public.exam_papers enable row level security;
alter table public.paper_text_chunks enable row level security;
alter table public.syllabus_text_chunks enable row level security;
alter table public.admin_upload_batches enable row level security;
alter table public.ai_prediction_runs enable row level security;

drop policy if exists "admins read admin users" on public.admin_users;
create policy "admins read admin users"
on public.admin_users for select
to authenticated
using (public.is_admin());

drop policy if exists "public read departments" on public.departments;
create policy "public read departments"
on public.departments for select
to anon, authenticated
using (true);

drop policy if exists "admins manage departments" on public.departments;
create policy "admins manage departments"
on public.departments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read subjects" on public.subjects;
create policy "public read subjects"
on public.subjects for select
to anon, authenticated
using (true);

drop policy if exists "admins manage subjects" on public.subjects;
create policy "admins manage subjects"
on public.subjects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read active syllabi" on public.subject_syllabi;
create policy "public read active syllabi"
on public.subject_syllabi for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admins manage syllabi" on public.subject_syllabi;
create policy "admins manage syllabi"
on public.subject_syllabi for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read syllabus units" on public.syllabus_units;
create policy "public read syllabus units"
on public.syllabus_units for select
to anon, authenticated
using (
  exists (
    select 1
    from public.subject_syllabi syllabi
    where syllabi.id = syllabus_units.syllabus_id
      and syllabi.is_active = true
  )
);

drop policy if exists "admins manage syllabus units" on public.syllabus_units;
create policy "admins manage syllabus units"
on public.syllabus_units for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read published exam papers" on public.exam_papers;
create policy "public read published exam papers"
on public.exam_papers for select
to anon, authenticated
using (is_published = true);

drop policy if exists "admins manage exam papers" on public.exam_papers;
create policy "admins manage exam papers"
on public.exam_papers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage paper text chunks" on public.paper_text_chunks;
create policy "admins manage paper text chunks"
on public.paper_text_chunks for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage syllabus text chunks" on public.syllabus_text_chunks;
create policy "admins manage syllabus text chunks"
on public.syllabus_text_chunks for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage upload batches" on public.admin_upload_batches;
create policy "admins manage upload batches"
on public.admin_upload_batches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage ai prediction runs" on public.ai_prediction_runs;
create policy "admins manage ai prediction runs"
on public.ai_prediction_runs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read pyq vault files" on storage.objects;
create policy "public read pyq vault files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'pyq-vault');

drop policy if exists "admins upload pyq vault files" on storage.objects;
create policy "admins upload pyq vault files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'pyq-vault' and public.is_admin());

drop policy if exists "admins update pyq vault files" on storage.objects;
create policy "admins update pyq vault files"
on storage.objects for update
to authenticated
using (bucket_id = 'pyq-vault' and public.is_admin())
with check (bucket_id = 'pyq-vault' and public.is_admin());

drop policy if exists "admins delete pyq vault files" on storage.objects;
create policy "admins delete pyq vault files"
on storage.objects for delete
to authenticated
using (bucket_id = 'pyq-vault' and public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on
  public.departments,
  public.subjects,
  public.subject_syllabi,
  public.syllabus_units,
  public.exam_papers,
  public.paper_browser_items
to anon, authenticated;

grant select, insert, update, delete on
  public.departments,
  public.subjects,
  public.subject_syllabi,
  public.syllabus_units,
  public.exam_papers,
  public.paper_text_chunks,
  public.syllabus_text_chunks,
  public.admin_upload_batches,
  public.ai_prediction_runs
to authenticated;
