-- RizSim V15: presenter pause/resume and one concurrent active live room per presenter.
-- Additive migration. No existing session or response is modified.
alter table public.classroom_sessions
  add column if not exists presenter_paused boolean not null default false;

create or replace function public.rizsim_v15_check_live_creation()
returns trigger
language plpgsql security definer set search_path=public,pg_temp
as $body$
begin
  if new.access_mode not in ('live','both') or not new.active then
    return new;
  end if;
  -- Serializes concurrent creation requests from separate browser tabs.
  perform pg_advisory_xact_lock(hashtext(new.created_by::text), 202615);
  if exists (
    select 1 from public.classroom_sessions s
    where s.created_by=new.created_by and s.id is distinct from new.id
      and s.active=true and s.closed_at is null
      and s.access_mode in ('live','both')
      and s.live_ends_at>now()
  ) then
    raise exception 'An active Live Class already exists. End that class before launching another.'
      using errcode='P0001';
  end if;
  return new;
end;
$body$;

drop trigger if exists rizsim_v15_one_live_session on public.classroom_sessions;
create trigger rizsim_v15_one_live_session before insert on public.classroom_sessions
for each row execute function public.rizsim_v15_check_live_creation();

create or replace function public.set_rizsim_presenter_paused(p_session_id uuid,p_paused boolean)
returns table(session_id uuid,presenter_paused boolean)
language plpgsql security definer set search_path=public,pg_temp
as $body$
declare v_session public.classroom_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_paused is null then raise exception 'Pause state required.'; end if;
  select * into v_session from public.classroom_sessions
    where id=p_session_id and created_by=auth.uid() for update;
  if not found then raise exception 'This is not your authorized Live Class.'; end if;
  if not v_session.active or v_session.closed_at is not null
     or v_session.access_mode not in ('live','both')
     or v_session.live_ends_at <= now() then
    raise exception 'Only an active Live Class may be paused or resumed.';
  end if;
  update public.classroom_sessions s
     set presenter_paused=p_paused,updated_at=now()
     where s.id=v_session.id;
  return query select v_session.id,p_paused;
end;
$body$;
revoke all on function public.set_rizsim_presenter_paused(uuid,boolean) from public,anon;
grant execute on function public.set_rizsim_presenter_paused(uuid,boolean) to authenticated;

create or replace function public.get_rizsim_presenter_state(p_session_id uuid)
returns table(session_id uuid,presenter_paused boolean,live_open boolean)
language plpgsql stable security definer set search_path=public,pg_temp
as $body$
begin
 if auth.uid() is null then raise exception 'Authentication required.'; end if;
 return query
  select s.id,s.presenter_paused,
      (s.active and s.closed_at is null and s.live_starts_at <= now()
        and s.live_ends_at>now()) as live_open
  from public.classroom_sessions s
  where s.id=p_session_id and
    (s.created_by=auth.uid() or
      exists (select 1 from public.simulation_attempts a
        where a.classroom_session_id=s.id and a.user_id=auth.uid()
         and a.classroom_access_type='live'))
  limit 1;
end;
$body$;
revoke all on function public.get_rizsim_presenter_state(uuid) from public,anon;
grant execute on function public.get_rizsim_presenter_state(uuid) to authenticated;

-- Protect all student response writes, including security-definer RPC writes,
-- without changing existing scoring/response policies or personal records.
create or replace function public.rizsim_v15_stop_paused_writes()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $body$
declare v_id uuid;
begin
 if tg_table_name='simulation_attempts' then
   v_id:=new.id;
 else
   v_id:=new.attempt_id;
 end if;
 if exists (
   select 1 from public.simulation_attempts a
   join public.classroom_sessions s on s.id=a.classroom_session_id
   where a.id=v_id and a.classroom_access_type='live'
    and s.active and s.closed_at is null and s.presenter_paused=true
 ) then
   raise exception 'Your presenter has paused this simulation. Your saved work is safe; please wait to resume.'
     using errcode='P0001';
 end if;
 return new;
end;
$body$;

drop trigger if exists rizsim_v15_pause_attempt on public.simulation_attempts;
create trigger rizsim_v15_pause_attempt
 before update on public.simulation_attempts for each row
 execute function public.rizsim_v15_stop_paused_writes();
drop trigger if exists rizsim_v15_pause_responses on public.simulation_responses;
create trigger rizsim_v15_pause_responses
 before insert or update on public.simulation_responses for each row
 execute function public.rizsim_v15_stop_paused_writes();
