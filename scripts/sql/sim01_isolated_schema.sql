-- Simulation 01 isolated CI schema. NEVER EXECUTE AGAINST PRODUCTION.
create schema if not exists auth;
create schema if not exists private;
do $$begin
 if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
end$$;
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table public.profiles(id uuid primary key,display_name text);
create table public.access_out_members(user_id uuid primary key,role text not null,active boolean not null);
create table public.institution_members(institution_id uuid,user_id uuid,member_type text,active boolean);
create table public.products(id uuid primary key,product_type text not null,slug text not null);
create table public.classroom_sessions(
 id uuid primary key,product_id uuid,created_by uuid,institution_id uuid,class_name text,active boolean not null default true
);
create table public.simulation_attempts(
 id uuid primary key,user_id uuid,product_id uuid,classroom_session_id uuid,status text not null,
 joined_at timestamptz default now(),submitted_at timestamptz
);
create table public.simulation_responses(
 id uuid primary key default gen_random_uuid(),attempt_id uuid not null,question_key text,response_data jsonb,
 updated_at timestamptz default now()
);
alter table public.simulation_responses enable row level security;
grant usage on schema public to authenticated,anon;
grant select on public.simulation_attempts to authenticated;
grant select,insert,update on public.simulation_responses to authenticated;
grant usage on schema private to authenticated;
create function private.is_rizsim_owner() returns boolean
language sql stable security definer set search_path to ''
as $$
 select exists(select 1 from public.access_out_members
 where user_id=auth.uid() and role='owner' and active=true)
$$;
create function private.can_access_rizsim_product(p_product_id uuid) returns boolean
language sql stable security definer set search_path to ''
as $$
 select exists(select 1 from public.products where id=p_product_id)
$$;
create function public.check_my_rizsim_classroom_attempt_access(p_attempt_id uuid)
returns table(allowed boolean,attempt_status text)
language sql stable security definer set search_path to ''
as $$
 select cs.active and sa.status='in_progress' and sa.user_id=auth.uid() as allowed,
        sa.status as attempt_status
 from public.simulation_attempts sa join public.classroom_sessions cs on cs.id=sa.classroom_session_id
 where sa.id=p_attempt_id and sa.user_id=auth.uid()
$$;
revoke all on function public.check_my_rizsim_classroom_attempt_access(uuid) from public,anon;
grant execute on function public.check_my_rizsim_classroom_attempt_access(uuid) to authenticated;
-- Immutable fixture identifiers: Owner 1; Faculty A 2; Faculty B 3; Student 4;
-- Institution administrator 5; Section B student 6.
insert into public.access_out_members(user_id,role,active) values
 ('00000000-0000-4000-8000-000000000001','owner',true),
 ('00000000-0000-4000-8000-000000000002','faculty',true),
 ('00000000-0000-4000-8000-000000000003','faculty',true),
 ('00000000-0000-4000-8000-000000000005','institution',true);
insert into public.institution_members(institution_id,user_id,member_type,active)
values('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000005','institution_admin',true);
insert into public.products(id,product_type,slug) values
 ('10000000-0000-4000-8000-000000000001','simulation','insight-to-implication-bystander'),
 ('10000000-0000-4000-8000-000000000002','simulation','another-simulation');
insert into public.classroom_sessions(id,product_id,created_by,institution_id,class_name,active) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000099','Class A',true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',null,'Class B',false),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',null,'Wrong product',true);
insert into public.profiles(id,display_name) values
 ('00000000-0000-4000-8000-000000000004','Student A'),
 ('00000000-0000-4000-8000-000000000006','Student B');
insert into public.simulation_attempts(id,user_id,product_id,classroom_session_id,status) values
 ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','in_progress'),
 ('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','in_progress'),
 ('30000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','submitted');
insert into public.simulation_responses(attempt_id,question_key,response_data) values
 ('30000000-0000-4000-8000-000000000001','insight-bystander-v1-record','{"record":{"test":"in_progress"}}'),
 ('30000000-0000-4000-8000-000000000002','insight-bystander-v1-record','{"record":{"test":"other_session"}}'),
 ('30000000-0000-4000-8000-000000000003','insight-bystander-v1-record','{"record":{"test":"submitted"}}');
