-- RizSim Simulation 03: staged experiment migration (REVIEW ONLY; NOT APPLIED).
-- Academic source: RizHotelJudgment.v1, hotel-judgment-v1.
-- A: Does this hotel cost Less than PKR 1000 per night?
-- B: Does this hotel cost More than PKR 80,000 per night?
-- Both conditions see IDENTICAL four original photos. No correct/wrong answer.
--
-- Private assignment and response storage is intentional: the existing public
-- simulation_responses SELECT policies can expose submitted responses to roles
-- with view_submissions BEFORE Faculty releases the experimental comparison.
-- An opaque public completion marker is stored for existing RizSim workspaces.
create schema if not exists private;

create table if not exists private.rizsim_hotel_conditions (
  group_code text primary key check (group_code in ('A','B')),
  comparison_question text not null
);
insert into private.rizsim_hotel_conditions(group_code,comparison_question) values
  ('A','Does this hotel cost Less than PKR 1000 per night?'),
  ('B','Does this hotel cost More than PKR 80,000 per night?')
on conflict (group_code) do update
 set comparison_question=excluded.comparison_question;
revoke all on private.rizsim_hotel_conditions from public,anon,authenticated;

create table if not exists private.rizsim_hotel_assignments (
  attempt_id uuid primary key references public.simulation_attempts(id) on delete cascade,
  session_id uuid not null references public.classroom_sessions(id),
  group_code text not null references private.rizsim_hotel_conditions(group_code),
  assigned_at timestamptz not null default now()
);
create index if not exists rizsim_hotel_assignments_session_idx
 on private.rizsim_hotel_assignments(session_id,group_code);
alter table private.rizsim_hotel_assignments enable row level security;
revoke all on private.rizsim_hotel_assignments from public,anon,authenticated;

create table if not exists private.rizsim_hotel_judgments (
  attempt_id uuid primary key references public.simulation_attempts(id) on delete cascade,
  session_id uuid not null references public.classroom_sessions(id),
  group_code text not null references private.rizsim_hotel_conditions(group_code),
  binary_response text not null check(binary_response in ('Yes','No')),
  willingness_to_pay_pkr numeric(15,0) not null
    check(willingness_to_pay_pkr>=0 and willingness_to_pay_pkr<=1000000000000),
  participant_code text not null default '',
  response_id text not null unique,
  committed_at timestamptz not null default now()
);
create index if not exists rizsim_hotel_judgments_session_idx
 on private.rizsim_hotel_judgments(session_id,group_code);
alter table private.rizsim_hotel_judgments enable row level security;
revoke all on private.rizsim_hotel_judgments from public,anon,authenticated;

-- Explicitly prevent broad permissive public response RLS policies from
-- letting Students spoof group/price or rewrite their hotel commitment.
-- This trigger is SECURITY INVOKER; trusted SECURITY DEFINER calls run as
-- the function owner (postgres), not the 'authenticated' Data API role.
create or replace function private.rizsim_hotel_protect_public_response()
returns trigger language plpgsql
set search_path to ''
as $body$
declare v_product text;
begin
  if current_user not in ('authenticated','anon') then
    if TG_OP='DELETE' then return old; end if;
    return new;
  end if;
  select p.slug into v_product
    from public.simulation_attempts a
    join public.products p on p.id=a.product_id
   where a.id=case when TG_OP='DELETE' then old.attempt_id else new.attempt_id end;
  if v_product='hotel-judgment-lab' then
    raise exception 'Hotel Judgment responses can only be locked by the authorized RizSim submission service.';
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$body$;
revoke all on function private.rizsim_hotel_protect_public_response()
 from public,anon,authenticated;
drop trigger if exists rz_hotel_protect_response on public.simulation_responses;
create trigger rz_hotel_protect_response
before insert or update or delete on public.simulation_responses
for each row execute function private.rizsim_hotel_protect_public_response();

-- Block direct student edits to Hotel Judgment completion/status under the
-- otherwise permissive generic simulation_attempts UPDATE policies.
create or replace function private.rizsim_hotel_protect_attempt()
returns trigger language plpgsql
set search_path to ''
as $body$
declare v_slug text;
begin
  if current_user not in ('authenticated','anon') then return new;end if;
  if new.status is distinct from old.status
     or new.progress_percent is distinct from old.progress_percent
     or new.submitted_at is distinct from old.submitted_at
     or new.product_id is distinct from old.product_id
     or new.classroom_session_id is distinct from old.classroom_session_id
     or new.user_id is distinct from old.user_id
  then
    select slug into v_slug from public.products where id=old.product_id;
    if v_slug='hotel-judgment-lab' then
      raise exception 'Hotel Judgment progress and submission are server controlled.';
    end if;
  end if;
  return new;
end;
$body$;
revoke all on function private.rizsim_hotel_protect_attempt()
 from public,anon,authenticated;
drop trigger if exists rz_hotel_protect_attempt on public.simulation_attempts;
create trigger rz_hotel_protect_attempt
before update on public.simulation_attempts
for each row execute function private.rizsim_hotel_protect_attempt();

-- One persistent, balanced, server-randomized arm per Student attempt.
-- Condition/question not selectable or editable by the browser.
create or replace function public.get_my_rizsim_hotel_assignment(p_attempt_id uuid)
returns jsonb language plpgsql volatile security definer
set search_path to ''
as $body$
declare v_uid uuid:=auth.uid();a record;v_group text;v_prompt text;
 v_A integer;v_B integer;v_access record;
begin
  if v_uid is null then raise exception 'Authentication required.';end if;
  select x.id,x.user_id,x.status,x.classroom_session_id,x.product_id,
         p.status as product_status,p.slug,p.launch_path,p.product_type,
         s.product_id as session_product_id
    into a
    from public.simulation_attempts x
    join public.products p on p.id=x.product_id
    join public.classroom_sessions s on s.id=x.classroom_session_id
   where x.id=p_attempt_id and x.user_id=v_uid
     and p.slug='hotel-judgment-lab'
     and p.product_type='simulation'
     and p.status='published'
     and p.launch_path='/simulation-hotel-judgment.html'
   limit 1;
  if a.id is null or a.product_id<>a.session_product_id then
    raise exception 'This account has no authorized Hotel Judgment classroom attempt.';
  end if;
  if a.status not in ('in_progress','submitted') then
    raise exception 'This classroom attempt is unavailable.';
  end if;
  if a.status='in_progress' then
    select * into v_access
      from public.check_my_rizsim_classroom_attempt_access(p_attempt_id);
    if v_access.allowed is distinct from true
       or v_access.attempt_status<>'in_progress'
       or v_access.session_id<>a.classroom_session_id then
      raise exception 'Your classroom or licence is not currently open.';
    end if;
  end if;
  -- Serialize allocation per class, avoiding concurrent tie/duplicate bias.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rizsim-hotel:'||a.classroom_session_id::text,0));
  select group_code into v_group from private.rizsim_hotel_assignments
    where attempt_id=p_attempt_id;
  if v_group is null then
    if a.status='submitted' then
      raise exception 'Submitted attempt has no verified experimental assignment.';
    end if;
    select count(*) filter(where group_code='A'),
           count(*) filter(where group_code='B')
      into v_A,v_B
      from private.rizsim_hotel_assignments
     where session_id=a.classroom_session_id;
    v_group:=case when v_A<v_B then 'A'
             when v_B<v_A then 'B'
             when pg_catalog.random()<0.5 then 'A' else 'B' end;
    insert into private.rizsim_hotel_assignments(attempt_id,session_id,group_code)
      values(p_attempt_id,a.classroom_session_id,v_group);
  end if;
  select comparison_question into v_prompt
    from private.rizsim_hotel_conditions where group_code=v_group;
  return jsonb_build_object(
    'attempt_id',p_attempt_id,'session_id',a.classroom_session_id,
    'group',v_group,'condition_question',v_prompt);
end;
$body$;
revoke all on function public.get_my_rizsim_hotel_assignment(uuid) from public,anon;
grant execute on function public.get_my_rizsim_hotel_assignment(uuid) to authenticated;

create or replace function private.rizsim_hotel_canonical_record(p_attempt_id uuid)
returns jsonb language sql stable
set search_path to ''
as $body$
 select jsonb_build_object(
   'version','hotel-judgment-v1','response_id',j.response_id,
   'group',j.group_code,'condition_question',c.comparison_question,
   'binary_response',j.binary_response,'willing_to_pay_pkr',j.willingness_to_pay_pkr,
   'participant_code',j.participant_code,'submitted_at',j.committed_at,
   'attempt_id',j.attempt_id,'session_id',j.session_id,'demo_only',false
 )
 from private.rizsim_hotel_judgments j
 join private.rizsim_hotel_conditions c on c.group_code=j.group_code
 where j.attempt_id=p_attempt_id
$body$;
revoke all on function private.rizsim_hotel_canonical_record(uuid)
 from public,anon,authenticated;

-- The *only* supported way to lock a Hotel Judgment decision and submit:
-- No input group, no client-set anchor, no client-set time or response_id.
-- One transaction atomically stores the sealed private judgment,
-- adds a non-sensitive public completion marker, and obtains the standard
-- RizSim server submission receipt. Any failure rolls back the whole action.
create or replace function public.submit_my_rizsim_hotel_judgment(
  p_attempt_id uuid,p_binary_response text,
  p_willingness_to_pay_pkr numeric,p_participant_code text default ''
)
returns jsonb language plpgsql volatile security definer
set search_path to ''
as $body$
declare v_uid uuid:=auth.uid();a record;v_access record;v_group text;
 v_saved jsonb;v_receipt record;v_response_id text;
begin
  if v_uid is null then raise exception 'Authentication required.';end if;
  if p_binary_response not in ('Yes','No') or p_binary_response is null
     or p_willingness_to_pay_pkr is null
     or p_willingness_to_pay_pkr<0
     or p_willingness_to_pay_pkr>1000000000000
     or trunc(p_willingness_to_pay_pkr)<>p_willingness_to_pay_pkr
     or length(coalesce(p_participant_code,''))>40 then
    raise exception 'Please enter Yes/No and a valid whole-number PKR amount.';
  end if;
  select x.id,x.status,x.user_id,x.product_id,x.classroom_session_id,
     p.slug,p.status as product_status,p.launch_path,p.product_type,
     s.product_id as session_product_id into a
    from public.simulation_attempts x
    join public.products p on p.id=x.product_id
    join public.classroom_sessions s on s.id=x.classroom_session_id
   where x.id=p_attempt_id and x.user_id=v_uid
   for update of x;
  if not found or a.product_id<>a.session_product_id
     or a.slug<>'hotel-judgment-lab'
     or a.product_type<>'simulation'
     or a.product_status<>'published'
     or a.launch_path<>'/simulation-hotel-judgment.html' then
    raise exception 'This account has no authorized Hotel Judgment attempt.';
  end if;
  if a.status='submitted' then
    v_saved:=private.rizsim_hotel_canonical_record(p_attempt_id);
    if v_saved is null then raise exception 'Submitted Hotel Judgment has no sealed record.';end if;
    return jsonb_build_object('status','submitted','attempt_id',p_attempt_id,
      'record',v_saved,'idempotent',true);
  end if;
  if a.status<>'in_progress' then raise exception 'Attempt is not active.';end if;
  select * into v_access from public.check_my_rizsim_classroom_attempt_access(p_attempt_id);
  if v_access.allowed is distinct from true
     or v_access.session_id<>a.classroom_session_id
     or v_access.attempt_status<>'in_progress' then
    raise exception 'The classroom window or licence is not open.';
  end if;
  select group_code into v_group
    from private.rizsim_hotel_assignments
   where attempt_id=p_attempt_id and session_id=a.classroom_session_id
   for key share;
  if v_group is null then raise exception 'The randomized group assignment is missing.';end if;
  if exists(select 1 from private.rizsim_hotel_judgments where attempt_id=p_attempt_id)
    then raise exception 'A locked judgment already exists; contact the Course Lead.';end if;
  v_response_id:='HJ-'||pg_catalog.gen_random_uuid()::text;
  insert into private.rizsim_hotel_judgments(
    attempt_id,session_id,group_code,binary_response,
    willingness_to_pay_pkr,participant_code,response_id)
  values(p_attempt_id,a.classroom_session_id,v_group,p_binary_response,
    p_willingness_to_pay_pkr,coalesce(p_participant_code,''),v_response_id);
  insert into public.simulation_responses(
    attempt_id,question_key,response_data)
  values(p_attempt_id,'hotel-judgment-v1-locked',
    jsonb_build_object(
      'instrument_id','RizHotelJudgment.v1',
      'schema_version','hotel-judgment-v1',
      'sealed',true,'committed_count',1));
  update public.simulation_attempts
     set progress_percent=100,last_activity_at=now()
   where id=p_attempt_id and user_id=v_uid and status='in_progress';
  if not found then raise exception 'Could not lock the classroom attempt.';end if;
  select * into v_receipt
    from public.submit_my_rizsim_classroom_attempt(p_attempt_id);
  if v_receipt.attempt_id is distinct from p_attempt_id
     or v_receipt.status<>'submitted' then
    raise exception 'RizSim has not confirmed this submission.';
  end if;
  v_saved:=private.rizsim_hotel_canonical_record(p_attempt_id);
  return jsonb_build_object('status','submitted','attempt_id',p_attempt_id,
    'submitted_at',v_receipt.submitted_at,'record',v_saved,'idempotent',false);
end;
$body$;
revoke all on function public.submit_my_rizsim_hotel_judgment(uuid,text,numeric,text)
 from public,anon;
grant execute on function public.submit_my_rizsim_hotel_judgment(uuid,text,numeric,text)
 to authenticated;

create or replace function public.get_my_rizsim_hotel_personal_result(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer
set search_path to ''
as $body$
declare v_uid uuid:=auth.uid();v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required.';end if;
  select private.rizsim_hotel_canonical_record(a.id) into v_result
    from public.simulation_attempts a
    join public.products p on p.id=a.product_id
    join public.classroom_sessions s on s.id=a.classroom_session_id
   where a.id=p_attempt_id and a.user_id=v_uid and a.status='submitted'
     and s.product_id=a.product_id
     and p.slug='hotel-judgment-lab';
  if v_result is null then raise exception 'A verified submitted hotel judgment was not found.';end if;
  return jsonb_build_object('status','submitted','attempt_id',p_attempt_id,
    'record',v_result);
end;
$body$;
revoke all on function public.get_my_rizsim_hotel_personal_result(uuid)
 from public,anon;
grant execute on function public.get_my_rizsim_hotel_personal_result(uuid)
 to authenticated;

-- Returns session-scoped roster while LIVE; raw group/answers/WTP are
-- withheld at the RPC level until *all* collection windows are closed.
-- The private judgment table is not exposed through the Data API.
create or replace function public.get_my_rizsim_hotel_session_records(p_session_id uuid)
returns table(
  attempt_id uuid,student_name text,attempt_status text,
  joined_at timestamptz,submitted_at timestamptz,
  progress_percent numeric,assignment_stage text,
  collection_revealed boolean,record jsonb
)
language plpgsql stable security definer
set search_path to ''
as $body$
declare v_uid uuid:=auth.uid();s record;v_owner boolean;v_can boolean;v_reveal boolean;
begin
  if v_uid is null then raise exception 'Authentication required.';end if;
  select cs.id,cs.created_by,cs.institution_id,cs.active,cs.closed_at,
      cs.live_ends_at,cs.practice_ends_at,cs.access_mode,cs.product_id
    into s from public.classroom_sessions cs
    join public.products p on p.id=cs.product_id
   where cs.id=p_session_id and p.slug='hotel-judgment-lab'
     and p.product_type='simulation';
  if s.id is null then raise exception 'Hotel Judgment classroom not found.';end if;
  v_owner:=private.is_rizsim_owner();
  v_can:=v_owner
    or exists(select 1 from public.access_out_members m
      where m.user_id=v_uid and m.active=true
        and m.role in ('faculty','course_lead')
        and s.created_by=v_uid)
    or exists(select 1 from public.access_out_members m
      join public.institution_members im on im.user_id=m.user_id
      where m.user_id=v_uid and m.active=true and m.role='institution'
        and im.active=true and im.member_type='institution_admin'
        and im.institution_id=s.institution_id);
  if not coalesce(v_can,false) then raise exception 'Not authorized for this classroom.';end if;
  v_reveal:=s.closed_at is not null or s.active is distinct from true or
    (
      (s.live_ends_at is null or now()>=s.live_ends_at) and
      (s.practice_ends_at is null or now()>=s.practice_ends_at) and
      (s.live_ends_at is not null or s.practice_ends_at is not null)
    );
  return query
  select a.id,
    coalesce(nullif(btrim(pr.display_name),''),'RizSim Student')::text,
    a.status::text,a.joined_at,a.submitted_at,
    case when j.attempt_id is not null and a.status='submitted' then 100::numeric else 0::numeric end,
    case when j.attempt_id is not null then 'Submitted'::text
         when ass.attempt_id is not null then 'Assigned'::text
         else 'Joined'::text end,
    v_reveal,
    case when v_reveal and a.status='submitted'
      then private.rizsim_hotel_canonical_record(a.id)
      else null::jsonb end
    from public.simulation_attempts a
      left join public.profiles pr on pr.id=a.user_id
      left join private.rizsim_hotel_assignments ass on ass.attempt_id=a.id
      left join private.rizsim_hotel_judgments j on j.attempt_id=a.id
   where a.classroom_session_id=p_session_id
     and a.product_id=s.product_id
   order by a.joined_at asc nulls last,a.id;
end;
$body$;
revoke all on function public.get_my_rizsim_hotel_session_records(uuid)
 from public,anon;
grant execute on function public.get_my_rizsim_hotel_session_records(uuid)
 to authenticated;

-- Owner deployment gates:
-- 1. Review SECURITY DEFINER ownership, search_path, table grants & triggers.
-- 2. Run isolated role/RLS negative tests incl. direct writes to broad policies.
-- 3. Test concurrent same-session assignments (balanced + sticky).
-- 4. Test no Faculty data before all windows close and clear Student own results.
-- 5. Run real signed-in classroom trial in an authorized nonproduction setting.
-- 6. DO NOT apply this SQL, merge, publish or license without express approval.
