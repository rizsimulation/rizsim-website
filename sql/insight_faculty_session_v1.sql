-- SIM01 RELEASE GATE (STAGED ONLY): DO NOT APPLY TO PRODUCTION WITHOUT APPROVAL.
-- A Faculty/Owner session-scoped read, including in-progress committed records.
-- No synthetic data, test accounts, licences, or published catalogue entries.
create or replace function public.get_my_rizsim_insight_session_records(p_session_id uuid)
returns table (
  attempt_id uuid,
  student_name text,
  attempt_status text,
  joined_at timestamptz,
  submitted_at timestamptz,
  response_data jsonb,
  response_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_session record;
  v_allowed boolean := false;
begin
  if v_user is null then
    raise exception 'Authentication required.';
  end if;
  if p_session_id is null then
    raise exception 'A valid classroom session is required.';
  end if;
  select cs.id, cs.created_by, cs.institution_id, cs.product_id
  into v_session
  from public.classroom_sessions cs
  join public.products p on p.id=cs.product_id
  where cs.id=p_session_id
    and p.product_type='simulation'
    and p.slug='insight-to-implication-bystander'
  limit 1;
  if not found then
    raise exception 'Simulation classroom not found.';
  end if;

  -- Owner and teaching/institution permissions are evaluated server-side;
  -- no hidden UI element or client-supplied role is an authorization source.
  v_allowed :=
    (select private.is_rizsim_owner())
    or exists (
      select 1 from public.access_out_members member
      where member.user_id=v_user and member.active=true
        and member.role in ('faculty','course_lead')
        and v_session.created_by=v_user
    )
    or exists (
      select 1 from public.access_out_members member
      join public.institution_members im on im.user_id=member.user_id
      where member.user_id=v_user and member.active=true
        and member.role='institution'
        and im.institution_id=v_session.institution_id
        and im.member_type='institution_admin'
        and im.active=true
    );
  if not coalesce(v_allowed,false) then
    raise exception 'Not authorized to review this classroom.';
  end if;

  -- Return only records attached to this explicitly authorized session.
  -- Never merge attempts from a different Faculty, class, or product.
  return query
  select sa.id,
    coalesce(nullif(btrim(profile.display_name),''),'RizSim Student')::text,
    sa.status::text,
    sa.joined_at,
    sa.submitted_at,
    response.response_data,
    response.updated_at
  from public.simulation_attempts sa
  left join public.profiles profile on profile.id=sa.user_id
  left join lateral (
    select sr.response_data,sr.updated_at
    from public.simulation_responses sr
    where sr.attempt_id=sa.id and sr.question_key='insight-bystander-v1-record'
    order by sr.updated_at desc, sr.id desc
    limit 1
  ) response on true
  where sa.classroom_session_id=p_session_id
    and sa.product_id=v_session.product_id
  order by sa.joined_at asc nulls last,sa.id;
end;
$function$;

revoke all on function public.get_my_rizsim_insight_session_records(uuid) from PUBLIC,anon;
grant execute on function public.get_my_rizsim_insight_session_records(uuid) to authenticated;

-- IMPORTANT: Read the RLS hardening note in docs/SIM01_INTEGRATION_GATES.md
-- before executing this migration. Do not create a public Faculty page.
