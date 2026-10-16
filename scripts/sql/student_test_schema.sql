-- ISOLATED TEST DATABASE ONLY. Extends the existing V6 fixture, never production.
alter table public.simulation_attempts add column product_id uuid,add column status text default 'in_progress',add column progress_percent numeric default 25,add column classroom_access_type text default 'practice',add column started_at timestamptz default now(),add column last_activity_at timestamptz default now(),add column submitted_at timestamptz,add column joined_at timestamptz default now(),add column created_at timestamptz default now();
alter table public.simulation_attempts add primary key(id);
alter table public.classroom_sessions add column class_code text;
update public.simulation_attempts a set product_id=s.product_id from public.classroom_sessions s where s.id=a.classroom_session_id;
update public.classroom_sessions set class_code=case when course_id is null then 'SOLO1234' else 'COUR1234' end;
create function public.check_my_rizsim_classroom_attempt_access(p_attempt_id uuid)
returns table(allowed boolean,attempt_status text,submitted_at timestamptz) language sql stable security definer set search_path='' as $$
 select s.active and s.closed_at is null and l.revoked_at is null and l.starts_at<=now() and l.expires_at>now()
 and a.classroom_access_type='practice' and s.practice_starts_at<=now() and s.practice_ends_at>now(),a.status,a.submitted_at
 from public.simulation_attempts a join public.classroom_sessions s on s.id=a.classroom_session_id join public.simulation_licenses l on l.id=s.license_id where a.id=p_attempt_id and a.user_id=auth.uid();
$$;
create function public.student_assert(p_label text,p_test boolean) returns void language plpgsql as $$begin if p_test is distinct from true then raise exception 'FAIL %',p_label;end if;raise notice 'PASS %',p_label;end;$$;
create function public.student_reject(p_label text,p_sql text) returns void language plpgsql as $$begin begin execute p_sql;exception when others then raise notice 'PASS %',p_label;return;end;raise exception 'FAIL % was accepted',p_label;end;$$;
