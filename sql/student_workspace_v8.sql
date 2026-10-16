-- V8 student workspace: owner-scoped history and practice, no new class or licence grants.
-- SECURITY DEFINER is intentional for joined classroom metadata behind existing table RLS.
-- All entrypoints check auth.uid(), active profile, and explicit attempt ownership.
create or replace function public.get_my_rizsim_student_workspace()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and account_status='active') then
  raise exception 'An active signed-in student account is required.';
 end if;
 with joined as (
  select a.id,a.product_id,coalesce(p.title,'RizSim Simulation') as title,a.status,
   a.progress_percent,a.started_at,a.last_activity_at,a.submitted_at,a.joined_at,a.created_at,
   a.classroom_session_id,a.classroom_access_type,s.class_name,s.class_code,s.course_id,c.title as course_title,
   s.access_mode,s.practice_starts_at as planned_practice_starts_at,s.practice_ends_at,
   greatest(s.practice_starts_at,l.starts_at,pl.starts_at) as practice_starts_at,
   least(s.practice_ends_at,l.expires_at,pl.expires_at) as practice_access_ends_at,
   coalesce(s.access_mode in ('practice','both') and s.practice_starts_at is not null and s.practice_ends_at is not null,false) as has_practice,
   coalesce(s.active and s.closed_at is null and l.id is not null and l.product_id=s.product_id
    and l.revoked_at is null and (s.course_id is null or c.active)
    and (s.purchased_course_license_id is null or
      (pl.id is not null and pl.course_id=s.course_id and pl.user_id=s.created_by and pl.revoked_at is null and cat.published)),false) as access_valid,
   l.starts_at as license_starts_at,l.expires_at as license_expires_at,
   s.live_starts_at,s.live_ends_at
  from public.simulation_attempts a
  left join public.products p on p.id=a.product_id
  left join public.classroom_sessions s on s.id=a.classroom_session_id and s.product_id=a.product_id
  left join public.simulation_licenses l on l.id=s.license_id
  left join public.rizsim_courses c on c.id=s.course_id
  left join public.rizsim_purchased_course_licenses pl on pl.id=s.purchased_course_license_id
  left join public.rizsim_course_catalogue cat on cat.course_id=pl.course_id
  where a.user_id=auth.uid()
 ), classified as (
  select j.*,
   case when not has_practice then 'none'
        when status='submitted' or submitted_at is not null then 'submitted'
        when not access_valid then 'closed'
        when practice_access_ends_at<=statement_timestamp() then 'expired'
        when practice_starts_at>statement_timestamp() then 'scheduled'
        when practice_starts_at<=statement_timestamp() and practice_access_ends_at>statement_timestamp() then 'open'
        else 'unavailable' end as practice_state
  from joined j
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'product_id',product_id,'title',title,'status',status,'progress_percent',progress_percent,
  'started_at',started_at,'last_activity_at',last_activity_at,'submitted_at',submitted_at,'joined_at',joined_at,
  'classroom_session_id',classroom_session_id,'classroom_access_type',classroom_access_type,'class_name',class_name,
  'class_code',class_code,'course_id',course_id,'course_title',course_title,
  'has_practice',has_practice,'practice_starts_at',practice_starts_at,'practice_ends_at',practice_ends_at,
  'practice_access_ends_at',practice_access_ends_at,'practice_state',practice_state,'can_practice',practice_state='open'
 ) order by coalesce(last_activity_at,started_at,created_at) desc,id),'[]'::jsonb) into result from classified;
 return jsonb_build_object('server_time',statement_timestamp(),'attempts',result);
end;
$$;

create or replace function public.resume_my_rizsim_student_practice(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.simulation_attempts%rowtype; s public.classroom_sessions%rowtype; item jsonb; access_row record;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and account_status='active') then
  raise exception 'An active signed-in student account is required.';
 end if;
 select * into a from public.simulation_attempts where id=p_attempt_id and user_id=auth.uid() for update;
 if a.id is null or a.classroom_session_id is null then raise exception 'Your classroom attempt was not found.';end if;
 if a.status='submitted' or a.submitted_at is not null then raise exception 'This response is already submitted and cannot be reopened.';end if;
 select * into s from public.classroom_sessions where id=a.classroom_session_id for share;
 perform 1 from public.simulation_licenses where id=s.license_id for share;
 if s.course_id is not null then perform 1 from public.rizsim_courses where id=s.course_id for share;end if;
 if s.purchased_course_license_id is not null then
  perform 1 from public.rizsim_purchased_course_licenses where id=s.purchased_course_license_id for share;
  perform 1 from public.rizsim_course_catalogue where course_id=s.course_id for share;
 end if;
 select x into item from jsonb_array_elements(public.get_my_rizsim_student_workspace()->'attempts') x where x->>'id'=p_attempt_id::text;
 if not coalesce((item->>'can_practice')::boolean,false) then raise exception 'Practice is not currently available for this class.';end if;
 if a.classroom_access_type not in ('live','practice') or a.classroom_access_type is null then raise exception 'Invalid classroom access mode.';end if;
 -- One attempt per joined class is preserved. Mode transition is explicit and never resets progress or answers.
 if a.classroom_access_type='live' then
  update public.simulation_attempts set classroom_access_type='practice' where id=a.id and user_id=auth.uid();
 end if;
 select * into access_row from public.check_my_rizsim_classroom_attempt_access(a.id);
 if not coalesce(access_row.allowed,false) or access_row.attempt_status='submitted' or access_row.submitted_at is not null then
  raise exception 'The practice access window is no longer open.';
 end if;
 return jsonb_build_object('attempt_id',a.id,'session_id',a.classroom_session_id,'product_id',a.product_id,'classroom_access_type','practice');
end;
$$;
revoke all on function public.get_my_rizsim_student_workspace(),public.resume_my_rizsim_student_practice(uuid) from public,anon;
grant execute on function public.get_my_rizsim_student_workspace(),public.resume_my_rizsim_student_practice(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
