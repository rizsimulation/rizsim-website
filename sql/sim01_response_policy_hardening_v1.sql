-- SIM01 SECURITY REVIEW FILE: staged only; apply separately after RLS acceptance.
-- Correct two existing broad PERMISSIVE policies which can bypass the tighter
-- classroom-window checks. Non-classroom licensed attempts retain old behavior.
-- Authorised classroom attempts must pass the existing server-side check RPC.
drop policy if exists "Users can create responses for active attempts"
  on public.simulation_responses;
create policy "Users can create responses for active attempts"
on public.simulation_responses
for insert to authenticated
with check (
  exists (
    select 1 from public.simulation_attempts attempt
    where attempt.id=simulation_responses.attempt_id
      and attempt.user_id=(select auth.uid())
      and attempt.status='in_progress'
      and (select private.can_access_rizsim_product(attempt.product_id))
      and (
        attempt.classroom_session_id is null
        or exists (
          select 1
          from public.check_my_rizsim_classroom_attempt_access(attempt.id) access_check
          where access_check.allowed=true
            and access_check.attempt_status='in_progress'
        )
      )
  )
);

drop policy if exists "Users can update responses before submission"
  on public.simulation_responses;
create policy "Users can update responses before submission"
on public.simulation_responses
for update to authenticated
using (
  exists (
    select 1 from public.simulation_attempts attempt
    where attempt.id=simulation_responses.attempt_id
      and attempt.user_id=(select auth.uid())
      and attempt.status='in_progress'
      and (
        attempt.classroom_session_id is null
        or exists (
          select 1
          from public.check_my_rizsim_classroom_attempt_access(attempt.id) access_check
          where access_check.allowed=true
            and access_check.attempt_status='in_progress'
        )
      )
  )
)
with check (
  exists (
    select 1 from public.simulation_attempts attempt
    where attempt.id=simulation_responses.attempt_id
      and attempt.user_id=(select auth.uid())
      and attempt.status='in_progress'
      and (
        attempt.classroom_session_id is null
        or exists (
          select 1
          from public.check_my_rizsim_classroom_attempt_access(attempt.id) access_check
          where access_check.allowed=true
            and access_check.attempt_status='in_progress'
        )
      )
  )
);
-- Gate: test against active, expired, unrelated and submitted attempts,
-- and verify non-classroom licensed simulation attempts still function.
