-- Admin-editable portal settings for the college project.
-- Apply this only to the `college_project` Supabase project.

create table if not exists public.portal_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_portal_settings_updated_at on public.portal_settings;
create trigger set_portal_settings_updated_at
before update on public.portal_settings
for each row execute function public.set_updated_at();

alter table public.portal_settings enable row level security;

drop policy if exists "admins manage portal settings" on public.portal_settings;
create policy "admins manage portal settings"
on public.portal_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.portal_settings to authenticated;
