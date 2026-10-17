-- RIZSIM SIM02 DRAFT ONLY. DO NOT APPLY TO PRODUCTION WITHOUT OWNER APPROVAL.
-- No private answer key included. Seed the private table ONLY through a secure,
-- separate Owner-controlled database action, never commit real keys to GitHub.
create schema if not exists private;
create table if not exists private.rizsim_s1s2_scoring_key (
  instrument_id text primary key
    check (instrument_id='riz-ai-pedagogy-2026-s1s2-v1'),
  answer_map jsonb not null
    check (jsonb_typeof(answer_map)='object'),
  installed_at timestamptz not null default now()
);
revoke all on table private.rizsim_s1s2_scoring_key from public,anon,authenticated;

create or replace function private.rizsim_s1s2_metrics(p_record jsonb)
returns jsonb
language plpgsql stable
set search_path to ''
as $function$
declare
  k jsonb;
  i integer; j integer;
  kr_locked boolean;kg_locked boolean;sl boolean;tl boolean;
  av text; bv text;
  kr_score integer:=0;kg_score integer:=0;
  source_score integer:=0;transfer_score integer:=0;
  source_locked integer:=0;transfer_locked integer:=0;
  committed integer:=0;
  krc integer[]:=array[0,0];kgc integer[]:=array[0,0];
  item_kr jsonb:='[]'::jsonb;item_kg jsonb:='[]'::jsonb;
  lt_source jsonb:='[]'::jsonb;lt_transfer jsonb:='[]'::jsonb;
  result_kr jsonb;result_kg jsonb;result_source jsonb;result_transfer jsonb;
begin
  if p_record is null or jsonb_typeof(p_record)<>'object'
     or p_record->>'schema'<>'RizSimulation.Participant.v1'
     or p_record->>'assessment'<>'riz-ai-pedagogy-2026-s1s2-v1'
     or jsonb_typeof(p_record #> '{kr,a}')<>'array'
     or jsonb_array_length(p_record #> '{kr,a}')<>6
     or jsonb_typeof(p_record #> '{kg,a}')<>'array'
     or jsonb_array_length(p_record #> '{kg,a}')<>6
     or jsonb_typeof(p_record->'lt')<>'array'
     or jsonb_array_length(p_record->'lt')<>2
  then raise exception 'Invalid Simulation 02 response structure.';end if;
  select answer_map into k from private.rizsim_s1s2_scoring_key
    where instrument_id='riz-ai-pedagogy-2026-s1s2-v1';
  if k is null
    or jsonb_typeof(k->'review')<>'array'
    or jsonb_array_length(k->'review')<>6
    or jsonb_typeof(k->'pairs')<>'array'
    or jsonb_array_length(k->'pairs')<>2
  then raise exception 'Simulation 02 private scoring is not configured.';end if;
  kr_locked:=(p_record #>> '{kr,at}') is not null;
  kg_locked:=(p_record #>> '{kg,at}') is not null;
  if kg_locked and not kr_locked then raise exception 'Invalid completion sequence.';end if;
  for i in 0..5 loop
    av:=p_record->'kr'->'a'->>i;
    bv:=p_record->'kg'->'a'->>i;
    -- Validate all answered choices, even if they have not yet been locked.
    if av is not null and av !~ '^[0-3]$' then raise exception 'Invalid review choice.';end if;
    if bv is not null and bv !~ '^[0-3]$' then raise exception 'Invalid gain choice.';end if;
    if kr_locked and av is null or kg_locked and bv is null
      then raise exception 'Locked review contains an incomplete item.';end if;
    if (k->'review'->>i) !~ '^[0-3]$' then raise exception 'Invalid private review scoring configuration.';end if;
    if kr_locked then
      if av=(k->'review'->>i) then kr_score:=kr_score+1;krc[1+i/3]:=krc[1+i/3]+1;end if;
      item_kr:=item_kr||jsonb_build_array(av=(k->'review'->>i));
    else item_kr:=item_kr||'null'::jsonb; end if;
    if kg_locked then
      if bv=(k->'review'->>i) then kg_score:=kg_score+1;kgc[1+i/3]:=kgc[1+i/3]+1;end if;
      item_kg:=item_kg||jsonb_build_array(bv=(k->'review'->>i));
    else item_kg:=item_kg||'null'::jsonb; end if;
  end loop;
  if kr_locked then committed:=committed+6;end if;
  for i in 0..1 loop
    av:=p_record->'lt'->i->'source'->>'a';
    bv:=p_record->'lt'->i->'transfer'->>'a';
    sl:=(p_record->'lt'->i->'source'->>'at') is not null;
    tl:=(p_record->'lt'->i->'transfer'->>'at') is not null;
    if av is not null and av !~ '^[0-3]$' or bv is not null and bv !~ '^[0-3]$'
      then raise exception 'Invalid transfer choice.';end if;
    if sl and av is null or tl and bv is null
      then raise exception 'Locked transfer contains no answer.';end if;
    if (sl or tl) and not kr_locked
      then raise exception 'Transfer precedes Knowledge Review.';end if;
    if tl and not sl then raise exception 'Transfer precedes the source decision.';end if;
    if i=1 and (sl or tl) and
       ((p_record->'lt'->0->'transfer'->>'seen') is null)
       then raise exception 'Second case precedes completion of first case.';end if;
    if sl then
      source_locked:=source_locked+1;committed:=committed+1;
      lt_source:=lt_source||jsonb_build_array(av=(k->'pairs'->i->>'source'));
      if av=(k->'pairs'->i->>'source') then source_score:=source_score+1;end if;
    else lt_source:=lt_source||'null'::jsonb;end if;
    if tl then
      transfer_locked:=transfer_locked+1;committed:=committed+1;
      lt_transfer:=lt_transfer||jsonb_build_array(bv=(k->'pairs'->i->>'transfer'));
      if bv=(k->'pairs'->i->>'transfer') then transfer_score:=transfer_score+1;end if;
    else lt_transfer:=lt_transfer||'null'::jsonb;end if;
  end loop;
  if kg_locked and (source_locked<>2 or transfer_locked<>2)
     then raise exception 'Knowledge Gain precedes completed transfer decisions.';end if;
  if kg_locked then committed:=committed+6;end if;
  result_kr:=case when kr_locked then to_jsonb(kr_score) else 'null'::jsonb end;
  result_kg:=case when kg_locked then to_jsonb(kg_score) else 'null'::jsonb end;
  result_source:=case when source_locked=2 then to_jsonb(source_score) else 'null'::jsonb end;
  result_transfer:=case when transfer_locked=2 then to_jsonb(transfer_score) else 'null'::jsonb end;
  return jsonb_build_object(
    'kr',result_kr,'kg',result_kg,
    'gain',case when kr_locked and kg_locked then to_jsonb(kg_score-kr_score) else 'null'::jsonb end,
    'source',result_source,'transfer',result_transfer,
    'concepts',jsonb_build_array(
      jsonb_build_object('name','Bystander Effect',
        'kr',case when kr_locked then to_jsonb(krc[1]) else 'null'::jsonb end,
        'kg',case when kg_locked then to_jsonb(kgc[1]) else 'null'::jsonb end),
      jsonb_build_object('name','Confirmation Bias',
        'kr',case when kr_locked then to_jsonb(krc[2]) else 'null'::jsonb end,
        'kg',case when kg_locked then to_jsonb(kgc[2]) else 'null'::jsonb end)),
    'item_kr',item_kr,'item_kg',item_kg,'lt_source',lt_source,'lt_transfer',lt_transfer,
    'kr_locked',kr_locked,'kg_locked',kg_locked,'source_locked',source_locked,
    'transfer_locked',transfer_locked,'committed',committed,'total',16,
    'percent',round(committed*100.0/16),'completed',kg_locked
  );
end;
$function$;
revoke all on function private.rizsim_s1s2_metrics(jsonb)
  from public,anon,authenticated;

create or replace function public.get_my_rizsim_s1s2_personal_result(p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path to ''
as $function$
declare v_uid uuid:=auth.uid();v_record jsonb;v_metrics jsonb;
begin
  if v_uid is null then raise exception 'Authentication required.';end if;
  select sr.response_data->'record' into v_record
    from public.simulation_attempts a
    join public.products p on p.id=a.product_id
    join public.classroom_sessions s on s.id=a.classroom_session_id
    join public.simulation_responses sr on sr.attempt_id=a.id
      and sr.question_key='system-1-system-2-v1-record'
    where a.id=p_attempt_id and a.user_id=v_uid
      and a.status='submitted'
      and p.slug='system-1-system-2-thinking'
      and p.product_type='simulation'
      and s.product_id=a.product_id
    order by sr.updated_at desc,sr.id desc limit 1;
  if v_record is null then raise exception 'A verified submitted Simulation 02 record was not found.';end if;
  v_metrics:=private.rizsim_s1s2_metrics(v_record);
  if coalesce((v_metrics->>'committed')::int,0)<>16
    or coalesce((v_metrics->>'completed')::boolean,false)<>true
  then raise exception 'Simulation 02 has not been fully completed.';end if;
  return jsonb_build_object(
    'simulation_id','riz-ai-pedagogy-2026-s1s2-v1',
    'schema_version','1.0.0',
    'metrics',jsonb_build_object(
      'kr',v_metrics->'kr','kg',v_metrics->'kg',
      'source',v_metrics->'source','transfer',v_metrics->'transfer',
      'concepts',v_metrics->'concepts'),
    'receipt','submitted',
    'attempt_id',p_attempt_id
  );
end;
$function$;
revoke all on function public.get_my_rizsim_s1s2_personal_result(uuid) from public,anon;
grant execute on function public.get_my_rizsim_s1s2_personal_result(uuid) to authenticated;

create or replace function public.get_my_rizsim_s1s2_session_records(p_session_id uuid)
returns table(
 attempt_id uuid,student_name text,attempt_status text,
 joined_at timestamptz,submitted_at timestamptz,
 response_data jsonb,response_updated_at timestamptz,metrics jsonb
)
language plpgsql stable security definer
set search_path to ''
as $function$
declare v_uid uuid:=auth.uid();v_session record;v_allowed boolean;
begin
  if v_uid is null then raise exception 'Authentication required.';end if;
  select s.id,s.product_id,s.created_by,s.institution_id into v_session
    from public.classroom_sessions s
    join public.products p on p.id=s.product_id
    where s.id=p_session_id and p.slug='system-1-system-2-thinking'
      and p.product_type='simulation' limit 1;
  if not found then raise exception 'Simulation 02 classroom not found.';end if;
  v_allowed :=
   (select private.is_rizsim_owner())
   or exists(select 1 from public.access_out_members m
     where m.user_id=v_uid and m.active=true
       and m.role in ('faculty','course_lead')
       and v_session.created_by=v_uid)
   or exists(select 1 from public.access_out_members m
       join public.institution_members im on im.user_id=m.user_id
       where m.user_id=v_uid and m.active=true
         and m.role='institution' and im.active=true
         and im.member_type='institution_admin'
         and im.institution_id=v_session.institution_id);
  if not coalesce(v_allowed,false) then raise exception 'Not authorized for this classroom.';end if;
  return query
  select a.id,coalesce(nullif(btrim(pr.display_name),''),'RizSim Student')::text,
    a.status::text,a.joined_at,a.submitted_at,sr.response_data,sr.updated_at,
    case when sr.response_data->'record' is not null
      then private.rizsim_s1s2_metrics(sr.response_data->'record')
      else null::jsonb end
  from public.simulation_attempts a
    left join public.profiles pr on pr.id=a.user_id
    left join lateral (
      select x.response_data,x.updated_at
      from public.simulation_responses x where x.attempt_id=a.id
        and x.question_key='system-1-system-2-v1-record'
      order by x.updated_at desc,x.id desc limit 1
    ) sr on true
  where a.classroom_session_id=p_session_id and a.product_id=v_session.product_id
  order by a.joined_at asc nulls last,a.id;
end;
$function$;
revoke all on function public.get_my_rizsim_s1s2_session_records(uuid) from public,anon;
grant execute on function public.get_my_rizsim_s1s2_session_records(uuid) to authenticated;


-- STEP 5 AUTHENTICITY HARDENING (staged only):
-- Enforce immutability of committed academic stages at the PostgreSQL boundary.
-- Browser buttons and ordinary response RLS alone do not enforce permanence.
-- SECURITY DEFINER is required only to resolve a product slug across private
-- RLS boundaries; the trigger takes no arbitrary SQL or role inputs.
create or replace function private.rizsim_guard_locked_learning_response()
returns trigger
language plpgsql security definer
set search_path to ''
as $body$
declare
  v_slug text;
  v_old jsonb;
  v_new jsonb;
  v_phase text;
  v_part integer;
  v_kind text;
begin
  if old.question_key not in (
    'insight-bystander-v1-record','system-1-system-2-v1-record'
  ) then return new; end if;
  if new.question_key is distinct from old.question_key
      or new.attempt_id is distinct from old.attempt_id then
    raise exception 'Committed RizSim record identity cannot be changed.';
  end if;
  select p.slug into v_slug
    from public.simulation_attempts a
    join public.products p on p.id=a.product_id
    where a.id=old.attempt_id;
  if (v_slug='insight-to-implication-bystander'
       and old.question_key='insight-bystander-v1-record')
    or (v_slug='system-1-system-2-thinking'
       and old.question_key='system-1-system-2-v1-record') then
    v_old:=old.response_data->'record';
    v_new:=new.response_data->'record';
    if jsonb_typeof(v_new) is distinct from 'object' then
      raise exception 'A verified RizSim record cannot be removed or overwritten.';
    end if;
    if jsonb_typeof(v_old)='object' then
      if (v_old->'order') is not null
         and v_old->'order' is distinct from v_new->'order' then
        raise exception 'Saved question order must remain stable.';
      end if;
      if (v_old->>'id') is not null
         and v_old->>'id' is distinct from v_new->>'id' then
        raise exception 'Saved participant record ID must remain stable.';
      end if;
    end if;
    if v_slug='insight-to-implication-bystander' then
      if jsonb_typeof(v_new->'locks') is distinct from 'object'
         or jsonb_typeof(v_new->'picks') is distinct from 'object' then
        raise exception 'The academic progress structure is invalid.';
      end if;
      for v_phase in select unnest(array[
        'kr','source','bridge','transfer','feedback','kg'
      ]) loop
        if v_old #>> array['locks',v_phase]='true' then
          if v_new #>> array['locks',v_phase] is distinct from 'true' then
            raise exception 'A committed learning decision cannot be unlocked.';
          end if;
          if v_phase in ('kr','source','transfer','kg')
             and v_old #> array['picks',v_phase]
                   is distinct from v_new #> array['picks',v_phase] then
            raise exception 'A committed learning answer cannot be replaced.';
          end if;
          if v_old #> array['lockedAt',v_phase] is not null
             and v_old #> array['lockedAt',v_phase]
                   is distinct from v_new #> array['lockedAt',v_phase] then
            raise exception 'A committed learning timestamp cannot be replaced.';
          end if;
        end if;
      end loop;
    elsif v_slug='system-1-system-2-thinking' then
      if v_new->>'assessment' is distinct from 'riz-ai-pedagogy-2026-s1s2-v1'
         or v_new->>'schema' is distinct from 'RizSimulation.Participant.v1' then
        raise exception 'Invalid Simulation 02 academic instrument.';
      end if;
      for v_phase in select unnest(array['kr','kg']) loop
        if v_old #>> array[v_phase,'at'] is not null then
          if v_old #> array[v_phase,'at'] is distinct from v_new #> array[v_phase,'at']
             or v_old #> array[v_phase,'a'] is distinct from v_new #> array[v_phase,'a'] then
            raise exception 'A locked Simulation 02 review stage is immutable.';
          end if;
        end if;
      end loop;
      for v_part in 0..1 loop
        for v_kind in select unnest(array['source','transfer']) loop
          if v_old->'lt'->v_part->v_kind->>'at' is not null then
            if v_old->'lt'->v_part->v_kind->'at'
                 is distinct from v_new->'lt'->v_part->v_kind->'at'
               or v_old->'lt'->v_part->v_kind->'a'
                 is distinct from v_new->'lt'->v_part->v_kind->'a' then
              raise exception 'A committed Simulation 02 transfer decision is immutable.';
            end if;
          end if;
          if v_old->'lt'->v_part->v_kind->>'seen' is not null
              and v_old->'lt'->v_part->v_kind->'seen'
                is distinct from v_new->'lt'->v_part->v_kind->'seen' then
            raise exception 'A committed feedback checkpoint is immutable.';
          end if;
        end loop;
      end loop;
    end if;
  end if;
  return new;
end;
$body$;
revoke all on function private.rizsim_guard_locked_learning_response()
  from public,anon,authenticated;
drop trigger if exists rz_sim_guard_locked_learning_response
  on public.simulation_responses;
create trigger rz_sim_guard_locked_learning_response
before update on public.simulation_responses
for each row execute function private.rizsim_guard_locked_learning_response();

-- The generic submission RPC may not close an incomplete Simulation 01 or 02.
-- Scores for Simulation 02 must be computed from the real private key, not any
-- client-calculated result. Other published products are not intercepted.
create or replace function private.rizsim_guard_learning_submission()
returns trigger
language plpgsql security definer
set search_path to ''
as $body$
declare
  v_slug text;
  v_record jsonb;
  v_metrics jsonb;
begin
  if new.status='submitted' and old.status is distinct from 'submitted' then
    select p.slug into v_slug from public.products p where p.id=new.product_id;
    if v_slug='system-1-system-2-thinking' then
      select sr.response_data->'record' into v_record
        from public.simulation_responses sr
        where sr.attempt_id=new.id
          and sr.question_key='system-1-system-2-v1-record'
        order by sr.updated_at desc,sr.id desc limit 1;
      if v_record is null then
        raise exception 'Submit requires a server-saved Simulation 02 record.';
      end if;
      v_metrics:=private.rizsim_s1s2_metrics(v_record);
      if (v_metrics->>'committed')::integer is distinct from 16
         or (v_metrics->>'completed')::boolean is distinct from true then
        raise exception 'All 16 Simulation 02 decisions must be locked before submission.';
      end if;
    elsif v_slug='insight-to-implication-bystander' then
      select sr.response_data->'record' into v_record
        from public.simulation_responses sr
        where sr.attempt_id=new.id
          and sr.question_key='insight-bystander-v1-record'
        order by sr.updated_at desc,sr.id desc limit 1;
      if jsonb_typeof(v_record) is distinct from 'object'
         or v_record #>> '{locks,kr}' is distinct from 'true'
         or v_record #>> '{locks,source}' is distinct from 'true'
         or v_record #>> '{locks,bridge}' is distinct from 'true'
         or v_record #>> '{locks,transfer}' is distinct from 'true'
         or v_record #>> '{locks,feedback}' is distinct from 'true'
         or v_record #>> '{locks,kg}' is distinct from 'true'
         or (select count(*) from jsonb_object_keys(coalesce(v_record #> '{picks,kr}','{}'::jsonb)))<>6
         or (select count(*) from jsonb_object_keys(coalesce(v_record #> '{picks,kg}','{}'::jsonb)))<>6
      then raise exception 'All 14 Simulation 01 decisions must be locked before submission.';
      end if;
    end if;
  end if;
  return new;
end;
$body$;
revoke all on function private.rizsim_guard_learning_submission()
  from public,anon,authenticated;
drop trigger if exists rz_sim_guard_learning_submission
  on public.simulation_attempts;
create trigger rz_sim_guard_learning_submission
before update on public.simulation_attempts
for each row execute function private.rizsim_guard_learning_submission();

-- Integration preconditions before Owner-approved migration:
-- 1) Owner installs PRIVATE score key through a non-public secure DB channel.
-- 2) Harden broad Student response RLS windows and locked-transition writes.
-- 3) Real-role acceptance; test owner, creator faculty, foreign faculty,
--    institution admin, Student and anonymous against actual session/attempt data.
-- 4) Do not merge/publish product before these gates pass.
