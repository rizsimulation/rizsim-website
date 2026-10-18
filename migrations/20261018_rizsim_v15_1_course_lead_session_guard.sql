-- RizSim V15.1: Course Leads may hold only one active classroom session.
-- Replaces the V15 Live-only check to include Practice and mixed-mode sessions.
-- Deployment order: apply this migration before publishing V15.1 frontend.
-- Does not alter existing students, submissions, licences, or session records.
create or replace function public.rizsim_v15_check_live_creation()
returns trigger
language plpgsql security definer set search_path=public,pg_temp
as $body$
begin
  if new.active is distinct from true or new.closed_at is not null
     or new.access_mode not in ('live','practice','both') then
    return new;
  end if;

  -- Course Lead is the premium Faculty tier. Do not change standard Faculty,
  -- Institution, Owner or other account concurrency rights.
  if not exists (
    select 1 from public.access_out_members m
    where m.user_id=new.created_by and m.active=true and m.role='course_lead'
  ) then return new; end if;

  -- One lock per Course Lead prevents concurrent browser tabs from creating
  -- two valid sessions, even when their requests overlap.
  perform pg_advisory_xact_lock(hashtext(new.created_by::text),202615);

  if exists (
    select 1 from public.classroom_sessions s
    where s.created_by=new.created_by
      and s.id is distinct from new.id
      and s.active=true and s.closed_at is null
      and s.access_mode in ('live','practice','both')
      and (
        (s.access_mode in ('live','both')
          and coalesce(s.live_ends_at,'infinity'::timestamptz)>now())
        or
        (s.access_mode in ('practice','both')
          and coalesce(s.practice_ends_at,'infinity'::timestamptz)>now())
      )
  ) then
    raise exception
      'You already have an active classroom session. End it before launching another Live Class or Practice assignment.'
      using errcode='P0001';
  end if;
  return new;
end;
$body$;

drop trigger if exists rizsim_v15_one_live_session on public.classroom_sessions;
create trigger rizsim_v15_one_live_session
before insert or update of active,closed_at,access_mode,live_ends_at,practice_ends_at,created_by
on public.classroom_sessions
for each row execute function public.rizsim_v15_check_live_creation();
