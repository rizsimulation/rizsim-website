-- SIM03 DISPOSABLE CI fixture only. Never execute against production.
create schema if not exists auth;
create schema if not exists private;
do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
end $roles$;
create function auth.uid() returns uuid language sql stable
 as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.profiles(id uuid primary key,display_name text);
create table public.access_out_members(user_id uuid primary key,role text,active boolean);
create table public.institution_members(institution_id uuid,user_id uuid,member_type text,active boolean);
create table public.products(id uuid primary key,product_type text,status text,slug text,launch_path text);
create table public.classroom_sessions(
 id uuid primary key,product_id uuid,created_by uuid,institution_id uuid,
 active boolean not null default true,closed_at timestamptz,
 access_mode text not null default 'live',
 live_ends_at timestamptz,practice_ends_at timestamptz
);
create table public.simulation_attempts(
 id uuid primary key,user_id uuid,product_id uuid,classroom_session_id uuid,
 status text not null,progress_percent numeric not null default 0,
 joined_at timestamptz default now(),last_activity_at timestamptz,
 submitted_at timestamptz
);
create table public.simulation_responses(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid,question_key text,response_data jsonb,
 created_at timestamptz default now()
);
create function private.is_rizsim_owner() returns boolean
language sql stable security definer set search_path to ''
as $$select exists(select 1 from public.access_out_members
  where user_id=auth.uid() and role='owner' and active=true)$$;
create function public.check_my_rizsim_classroom_attempt_access(p_attempt_id uuid)
returns table(allowed boolean,attempt_id uuid,session_id uuid,attempt_status text)
language sql stable security definer set search_path to ''
as $$
select s.active and s.closed_at is null and now()<coalesce(s.live_ends_at,now()+interval '1 day')
   and a.status='in_progress' and a.user_id=auth.uid(),
   a.id,s.id,a.status
from public.simulation_attempts a
join public.classroom_sessions s on s.id=a.classroom_session_id
where a.id=p_attempt_id and a.user_id=auth.uid()
$$;
create function public.submit_my_rizsim_classroom_attempt(p_attempt_id uuid)
returns table(attempt_id uuid,status text,submitted_at timestamptz)
language plpgsql security definer
set search_path to ''
as $$
begin
 if not exists(select 1 from public.simulation_attempts a
   join public.classroom_sessions s on s.id=a.classroom_session_id
   where a.id=p_attempt_id and a.user_id=auth.uid()
     and a.status='in_progress' and a.progress_percent=100
     and s.active=true and s.closed_at is null
     and now()<coalesce(s.live_ends_at,now()+interval '1 day'))
 then raise exception 'No ready active submitted attempt';end if;
 update public.simulation_attempts a set status='submitted',submitted_at=now()
 where a.id=p_attempt_id and a.user_id=auth.uid() and a.status='in_progress';
 return query select a.id,a.status,a.submitted_at from public.simulation_attempts a where a.id=p_attempt_id;
end;
$$;
grant execute on function public.check_my_rizsim_classroom_attempt_access(uuid)
 to authenticated;
grant execute on function public.submit_my_rizsim_classroom_attempt(uuid)
 to authenticated;
grant select,update on public.simulation_attempts to authenticated;
grant select,insert,update,delete on public.simulation_responses to authenticated;
alter table public.simulation_attempts enable row level security;
alter table public.simulation_responses enable row level security;
create policy permissive_test_attempts on public.simulation_attempts
 for all to authenticated using(true) with check(true);
create policy permissive_test_responses on public.simulation_responses
 for all to authenticated using(true) with check(true);
-- Fixture: Owner 1, Faculty A 2, Faculty B 3, Institution admin 5,
-- Students A/B 11/12, Student unrelated 13, outsider 14.
insert into public.access_out_members(user_id,role,active) values
 ('00000000-0000-4000-8000-000000000001','owner',true),
 ('00000000-0000-4000-8000-000000000002','faculty',true),
 ('00000000-0000-4000-8000-000000000003','faculty',true),
 ('00000000-0000-4000-8000-000000000005','institution',true);
insert into public.institution_members(institution_id,user_id,member_type,active) values
 ('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000005','institution_admin',true);
insert into public.products(id,product_type,status,slug,launch_path) values
 ('10000000-0000-4000-8000-000000000001','simulation','published','hotel-judgment-lab','/simulation-hotel-judgment.html'),
 ('10000000-0000-4000-8000-000000000002','simulation','published','other-simulation','/other.html');
insert into public.classroom_sessions(id,product_id,created_by,institution_id,live_ends_at) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000099',now()+interval '1 hour'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',null,now()+interval '1 hour'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',null,now()+interval '1 hour');
insert into public.profiles values
 ('00000000-0000-4000-8000-000000000011','Student A'),
 ('00000000-0000-4000-8000-000000000012','Student B'),
 ('00000000-0000-4000-8000-000000000013','Student C'),
 ('00000000-0000-4000-8000-000000000015','Student D');
insert into public.simulation_attempts(id,user_id,product_id,classroom_session_id,status) values
 ('30000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','in_progress'),
 ('30000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','in_progress'),
 ('30000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','in_progress'),
 ('30000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','in_progress'),
 ('30000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','in_progress');
