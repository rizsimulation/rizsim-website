
create or replace function public.rizsim_is_course_staff(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.rizsim_courses c where c.id=p_course_id
      and (public.is_rizsim_owner() or
           (c.created_by=auth.uid() and public.is_active_rizsim_course_lead()))
      and exists (select 1 from public.profiles p
        where p.id=auth.uid() and p.account_status='active')
  );
$$;

create or replace function public.rizsim_is_course_staff_path(p_course_id_text text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.rizsim_courses c
    where c.id::text=p_course_id_text and public.rizsim_is_course_staff(c.id));
$$;

create or replace function public.rizsim_can_student_access_course_now(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active')
    and exists (
      select 1 from public.simulation_attempts a
      join public.classroom_sessions s on s.id=a.classroom_session_id
      join public.rizsim_courses c on c.id=s.course_id
      join public.simulation_licenses l on l.id=s.license_id
      where a.user_id=auth.uid() and c.id=p_course_id
        and c.active=true
        and s.active=true and s.closed_at is null
        and l.revoked_at is null and l.starts_at<=now() and l.expires_at>now()
        and (
          (s.access_mode in ('live','both') and s.live_starts_at<=now() and s.live_ends_at>now())
          or
          (s.access_mode in ('practice','both') and s.practice_starts_at<=now() and s.practice_ends_at>now())
        )
    );
$$;

create or replace function public.rizsim_can_view_course_material(p_material_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.rizsim_course_materials m
    where m.id=p_material_id and m.active=true
      and (public.rizsim_is_course_staff(m.course_id)
      or (m.material_type in ('student_handout','reading','slides','worksheet','external_link')
          and public.rizsim_can_student_access_course_now(m.course_id)))
  );
$$;

create or replace function public.get_my_rizsim_student_courses()
returns table(
  course_id uuid,course_title text,course_description text,course_active boolean,
  joined_sessions bigint,attempt_count bigint,last_activity_at timestamptz,materials_available_now boolean
) language sql stable security definer set search_path = '' as $$
  select c.id,c.title,c.description,c.active,count(distinct s.id)::bigint,
    count(a.id)::bigint,max(a.last_activity_at),
    public.rizsim_can_student_access_course_now(c.id)
  from public.simulation_attempts a
  join public.classroom_sessions s on s.id=a.classroom_session_id
  join public.rizsim_courses c on c.id=s.course_id
  join public.profiles p on p.id=a.user_id
  where a.user_id=auth.uid() and p.account_status='active'
  group by c.id,c.title,c.description,c.active
  order by max(a.last_activity_at) desc;
$$;

create or replace function public.get_my_rizsim_student_course_materials()
returns table(
  material_id uuid,course_id uuid,course_title text,title text,description text,
  material_type text,source_type text,external_url text,file_name text,
  mime_type text,sort_order integer,created_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select m.id,m.course_id,c.title,m.title,m.description,m.material_type,m.source_type,
    case when m.source_type='link' and m.external_url ~* '^https?://' then m.external_url else null end,
    m.file_name,m.mime_type,m.sort_order,m.created_at
  from public.rizsim_course_materials m join public.rizsim_courses c on c.id=m.course_id
  where m.active=true
    and m.material_type in ('student_handout','reading','slides','worksheet','external_link')
    and public.rizsim_can_student_access_course_now(m.course_id)
  order by c.title,m.sort_order,m.created_at;
$$;

create or replace function public.get_rizsim_course_material_view_context(p_material_id uuid)
returns table(
  material_id uuid,course_id uuid,course_title text,title text,material_type text,
  source_type text,external_url text,file_name text,mime_type text,file_size bigint
) language sql stable security definer set search_path = '' as $$
  select m.id,m.course_id,c.title,m.title,m.material_type,m.source_type,
    case when m.source_type='link' and m.external_url ~* '^https?://' then m.external_url else null end,
    m.file_name,m.mime_type,m.file_size
  from public.rizsim_course_materials m join public.rizsim_courses c on c.id=m.course_id
  where m.id=p_material_id and m.active=true
    and public.rizsim_can_view_course_material(m.id)
  limit 1;
$$;

revoke all on function public.rizsim_is_course_staff(uuid) from public,anon;
revoke all on function public.rizsim_is_course_staff_path(text) from public,anon;
revoke all on function public.rizsim_can_student_access_course_now(uuid) from public,anon;
revoke all on function public.rizsim_can_view_course_material(uuid) from public,anon;
revoke all on function public.get_my_rizsim_student_courses() from public,anon;
revoke all on function public.get_my_rizsim_student_course_materials() from public,anon;
revoke all on function public.get_rizsim_course_material_view_context(uuid) from public,anon;
grant execute on function public.rizsim_is_course_staff(uuid) to authenticated;
grant execute on function public.rizsim_is_course_staff_path(text) to authenticated;
grant execute on function public.rizsim_can_student_access_course_now(uuid) to authenticated;
grant execute on function public.rizsim_can_view_course_material(uuid) to authenticated;
grant execute on function public.get_my_rizsim_student_courses() to authenticated;
grant execute on function public.get_my_rizsim_student_course_materials() to authenticated;
grant execute on function public.get_rizsim_course_material_view_context(uuid) to authenticated;
