-- SIM02 ISOLATED POSTGRES FIXTURE ONLY. NEVER APPLY TO PRODUCTION.
create schema if not exists auth;create schema if not exists private;
do $roles$begin
 if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
end$roles$;
create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.profiles(id uuid primary key,display_name text);
create table public.access_out_members(user_id uuid primary key,role text,active boolean);
create table public.institution_members(institution_id uuid,user_id uuid,member_type text,active boolean);
create table public.products(id uuid primary key,product_type text,slug text);
create table public.classroom_sessions(id uuid primary key,product_id uuid,created_by uuid,institution_id uuid);
create table public.simulation_attempts(
 id uuid primary key,user_id uuid,product_id uuid,classroom_session_id uuid,
 status text,joined_at timestamptz default now(),submitted_at timestamptz
);
create table public.simulation_responses(
 id uuid primary key default gen_random_uuid(),attempt_id uuid,
 question_key text,response_data jsonb,updated_at timestamptz default now()
);
create function private.is_rizsim_owner() returns boolean
 language sql stable security definer set search_path to ''
 as $$select exists(select 1 from public.access_out_members
  where user_id=auth.uid() and active=true and role='owner')$$;
grant usage on schema public to anon,authenticated;
-- CI users: Owner 1; Faculty A 2; Faculty B 3; Student A 4; Institution 5; Student B 6.
insert into public.access_out_members values
 ('00000000-0000-4000-8000-000000000001','owner',true),
 ('00000000-0000-4000-8000-000000000002','faculty',true),
 ('00000000-0000-4000-8000-000000000003','faculty',true),
 ('00000000-0000-4000-8000-000000000005','institution',true);
insert into public.institution_members values
 ('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000005','institution_admin',true);
insert into public.products values
 ('10000000-0000-4000-8000-000000000001','simulation','system-1-system-2-thinking'),
 ('10000000-0000-4000-8000-000000000002','simulation','other-simulation');
insert into public.classroom_sessions values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000099'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',null),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',null);
insert into public.profiles values
 ('00000000-0000-4000-8000-000000000004','Student A'),
 ('00000000-0000-4000-8000-000000000006','Student B');
insert into public.simulation_attempts(id,user_id,product_id,classroom_session_id,status) values
 ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','submitted'),
 ('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','in_progress'),
 ('30000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','in_progress');
