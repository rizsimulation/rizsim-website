-- Change 3: User-owned ERP detail, never an access credential. Google sign-in remains authoritative.
-- No institution, Faculty or other Student may read another learner's ERP.
create table if not exists public.rizsim_student_erp_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 erp_number text not null check(erp_number ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{1,39}$'),
 remember boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.rizsim_student_erp_preferences enable row level security;
revoke all on public.rizsim_student_erp_preferences from anon;
grant select,insert,update on public.rizsim_student_erp_preferences to authenticated;
drop policy if exists "Own ERP preferences readable only by owner" on public.rizsim_student_erp_preferences;
create policy "Own ERP preferences readable only by owner" on public.rizsim_student_erp_preferences for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "Own ERP preferences insert only" on public.rizsim_student_erp_preferences;
create policy "Own ERP preferences insert only" on public.rizsim_student_erp_preferences for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "Own ERP preferences update only" on public.rizsim_student_erp_preferences;
create policy "Own ERP preferences update only" on public.rizsim_student_erp_preferences for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create or replace function public.get_my_rizsim_erp_preferences()
returns table(erp_number text, remember boolean)
language sql stable security invoker set search_path=public as $$
 select p.erp_number,p.remember from public.rizsim_student_erp_preferences p where p.user_id=auth.uid();
$$;
create or replace function public.set_my_rizsim_erp_preferences(p_erp_number text,p_remember boolean)
returns boolean language plpgsql security invoker set search_path=public as $$
declare clean text:=btrim(coalesce(p_erp_number,''));
begin
 if auth.uid() is null then raise exception 'Sign in before saving your ERP.'; end if;
 if clean !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{1,39}$' then
  raise exception 'Enter a valid ERP number (2-40 letters, digits or . _ / -).';
 end if;
 insert into public.rizsim_student_erp_preferences(user_id,erp_number,remember,updated_at)
 values(auth.uid(),clean,coalesce(p_remember,false),now())
 on conflict(user_id) do update set erp_number=excluded.erp_number,remember=excluded.remember,updated_at=now();
 return true;
end $$;
revoke all on function public.get_my_rizsim_erp_preferences() from public,anon;
revoke all on function public.set_my_rizsim_erp_preferences(text,boolean) from public,anon;
grant execute on function public.get_my_rizsim_erp_preferences() to authenticated;
grant execute on function public.set_my_rizsim_erp_preferences(text,boolean) to authenticated;
comment on table public.rizsim_student_erp_preferences is 'Private learner ERP identifier and explicit Do not ask again preference. Not a session authorization mechanism.';
