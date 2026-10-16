-- ISOLATED POSTGRES TEST DATABASE ONLY. Never apply these stubs to Supabase.
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,storage to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
create table public.profiles(id uuid primary key,account_status text not null default 'active');
create table public.access_out_members(user_id uuid primary key,role text,active boolean default true);
create table public.rizsim_courses(id uuid primary key,created_by uuid not null,title text,description text,active boolean default true,created_at timestamptz default now());
create table public.products(id uuid primary key,title text,short_description text);
create table public.simulation_licenses(id uuid primary key,user_id uuid,product_id uuid,starts_at timestamptz,expires_at timestamptz,revoked_at timestamptz);
create table public.classroom_sessions(id uuid primary key default gen_random_uuid(),product_id uuid,license_id uuid,created_by uuid,class_name text,course_id uuid references public.rizsim_courses(id),active boolean default true,closed_at timestamptz,created_at timestamptz default now(),access_mode text,live_starts_at timestamptz,live_ends_at timestamptz,practice_starts_at timestamptz,practice_ends_at timestamptz);
create table public.rizsim_course_simulations(id uuid default gen_random_uuid(),course_id uuid,product_id uuid,sort_order integer default 0,added_at timestamptz default now());
create table public.rizsim_course_materials(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.rizsim_courses(id),created_by uuid default auth.uid(),title text,description text,material_type text,source_type text,storage_path text,external_url text,file_name text,mime_type text,file_size bigint,sort_order integer default 0,active boolean default true,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.simulation_attempts(id uuid default gen_random_uuid(),user_id uuid,classroom_session_id uuid);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert,delete on storage.objects to authenticated;
create function public.is_rizsim_owner() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from access_out_members where user_id=auth.uid() and role='owner' and active)$$;
create function public.is_active_rizsim_course_lead() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from access_out_members where user_id=auth.uid() and role='course_lead' and active)$$;
create function public.rizsim_is_course_staff(p_course_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from rizsim_courses where id=p_course_id and (is_rizsim_owner() or(created_by=auth.uid() and is_active_rizsim_course_lead())))$$;
create function public.create_rizsim_classroom_session(p_product_id uuid,p_class_name text,p_access_mode text,p_live_starts_at timestamptz,p_live_ends_at timestamptz,p_practice_starts_at timestamptz,p_practice_ends_at timestamptz)
returns table(session_id uuid) language plpgsql security definer set search_path=public as $$declare l uuid;sid uuid;begin
 select id into l from simulation_licenses where user_id=auth.uid() and product_id=p_product_id and revoked_at is null and starts_at<=now() and expires_at>now() limit 1;
 if l is null then raise exception 'No active individual simulation licence';end if;
 insert into classroom_sessions(product_id,license_id,created_by,class_name,access_mode,live_starts_at,live_ends_at,practice_starts_at,practice_ends_at) values(p_product_id,l,auth.uid(),p_class_name,p_access_mode,p_live_starts_at,p_live_ends_at,p_practice_starts_at,p_practice_ends_at) returning id into sid;
 return query select sid;end$$;
-- Seed five fictitious identities, never real users.
insert into auth.users select ('10000000-0000-4000-8000-00000000000'||x)::uuid from generate_series(1,5)x;
insert into profiles select id,'active' from auth.users;
insert into access_out_members select id,case right(id::text,1) when '1' then 'course_lead' when '2' then 'faculty' when '3' then 'faculty' when '4' then 'student' else 'owner' end,true from auth.users;
insert into rizsim_courses(id,created_by,title) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Owned course'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','Publisher course');
insert into products values('30000000-0000-4000-8000-000000000001','Included simulation','Test simulation'),('30000000-0000-4000-8000-000000000002','Unlicensed simulation','Test simulation');
insert into simulation_licenses values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',now()-interval '1 day',now()+interval '30 days',null),('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',now()-interval '1 day',now()+interval '30 days',null);
insert into classroom_sessions(id,product_id,license_id,created_by,class_name,course_id,access_mode,practice_starts_at,practice_ends_at)values
('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Own class','20000000-0000-4000-8000-000000000001','practice',now()-interval '1 hour',now()+interval '2 hours'),
('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Standalone class',null,'practice',now()-interval '1 hour',now()+interval '2 hours');
insert into rizsim_course_simulations(course_id,product_id)select id,'30000000-0000-4000-8000-000000000001'::uuid from rizsim_courses;
insert into rizsim_course_materials(id,course_id,created_by,title,material_type,source_type,external_url) values
('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Legacy reading','reading','link','https://example.org/reading'),
('60000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','Publisher reading','reading','link','https://example.org/publisher');
insert into simulation_attempts(user_id,classroom_session_id)values('10000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000002');
