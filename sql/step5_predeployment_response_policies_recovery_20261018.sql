-- RIZSIM STEP 5 RECOVERY ONLY. DO NOT EXECUTE AS AN ORDINARY DEPLOYMENT.
-- Verbatim legacy production RLS predicates as of 2026-10-18.
-- Restores only the two policies replaced by the staged Sim01 hardening.
-- These older policies are broader and should not be restored without a
-- conscious privacy/security assessment and separate Owner approval.

drop policy if exists "Users can create responses for active attempts" on public.simulation_responses;
create policy "Users can create responses for active attempts" on public.simulation_responses
for insert to authenticated
with check (
(EXISTS ( SELECT 1
   FROM simulation_attempts attempt
  WHERE ((attempt.id = simulation_responses.attempt_id) AND (attempt.user_id = ( SELECT auth.uid() AS uid)) AND (attempt.status = 'in_progress'::text) AND ( SELECT private.can_access_rizsim_product(attempt.product_id) AS can_access_rizsim_product))))
);

drop policy if exists "Users can update responses before submission" on public.simulation_responses;
create policy "Users can update responses before submission" on public.simulation_responses
for update to authenticated
using (
(EXISTS ( SELECT 1
   FROM simulation_attempts attempt
  WHERE ((attempt.id = simulation_responses.attempt_id) AND (attempt.user_id = ( SELECT auth.uid() AS uid)) AND (attempt.status = 'in_progress'::text))))
)
with check (
(EXISTS ( SELECT 1
   FROM simulation_attempts attempt
  WHERE ((attempt.id = simulation_responses.attempt_id) AND (attempt.user_id = ( SELECT auth.uid() AS uid)) AND (attempt.status = 'in_progress'::text))))
);
