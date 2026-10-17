-- Support submissions: authenticated workspace users -> Owner-only inbox.
-- Apply through reviewed migration after isolated QA; do not run against production as part of staging.
create table if not exists public.rizsim_support_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null default 'general' check (category in ('general','technical','account','content','other')),
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  status text not null default 'new' check (status in ('new','reviewing','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rizsim_support_reports enable row level security;
revoke all on public.rizsim_support_reports from public, anon, authenticated;
grant insert (category,message) on public.rizsim_support_reports to authenticated;
grant select on public.rizsim_support_reports to authenticated;
grant update (status) on public.rizsim_support_reports to authenticated;
drop policy if exists rizsim_reports_authenticated_insert on public.rizsim_support_reports;
create policy rizsim_reports_authenticated_insert on public.rizsim_support_reports
for insert to authenticated
with check (
 (select auth.uid()) = reporter_id
 and status = 'new'
 and length(btrim(message)) between 10 and 3000
 and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_status = 'active'
 )
);
drop policy if exists rizsim_reports_owner_select on public.rizsim_support_reports;
create policy rizsim_reports_owner_select on public.rizsim_support_reports
for select to authenticated using ((select private.is_rizsim_owner()));
drop policy if exists rizsim_reports_owner_update on public.rizsim_support_reports;
create policy rizsim_reports_owner_update on public.rizsim_support_reports
for update to authenticated
using ((select private.is_rizsim_owner()))
with check ((select private.is_rizsim_owner()));
-- Only owner may read and change status. No deletion is granted to browser roles.
create index if not exists rizsim_support_reports_received_idx on public.rizsim_support_reports(created_at desc);
create index if not exists rizsim_support_reports_reporter_idx on public.rizsim_support_reports(reporter_id);
