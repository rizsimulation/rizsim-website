-- SIM01 isolated SQL acceptance assertions, no production data.
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create policy "fixture student response read" on public.simulation_responses
for select to authenticated using (
 exists (select 1 from public.simulation_attempts a
         where a.id=simulation_responses.attempt_id and a.user_id=auth.uid())
);
create function public.test_assert(label text,ok boolean) returns void
language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'FAILED assertion: %',label;end if;
 raise notice 'PASS %',label;
end;
$$;
create function public.test_reject(label text,stmt text) returns void
language plpgsql as $$
begin
 begin
   execute stmt;
   raise exception using message='FAILED allowed: '||label,errcode='P0010';
 exception when others then
   if SQLSTATE='P0010' then raise;end if;
   raise notice 'PASS rejected: %',label;
 end;
end;
$$;

select public.test_assert('anonymous EXECUTE revoked',
 not has_function_privilege('anon','public.get_my_rizsim_insight_session_records(uuid)','EXECUTE'));
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.test_assert('creator faculty sees only Class A 2 attempts',
 (select count(*) from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001'))=2);
select public.test_assert('creator can see in-progress saved state',
 (select count(*) from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001') where attempt_status='in_progress' and response_data is not null)=1);
select public.test_reject('Faculty A cannot view Faculty B class',
 $$select * from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000002')$$);
select public.test_reject('wrong simulation slug blocked',
 $$select * from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000003')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_assert('Faculty B owns Class B only',
 (select count(*) from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000002'))=1);
select public.test_reject('Faculty B cannot inspect Class A',
 $$select * from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select public.test_assert('institution administrator can see authorized institution session',
 (select count(*) from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001'))=2);
select public.test_reject('institution administrator cannot see unrelated session',
 $$select * from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000002')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.test_assert('Owner can inspect Class A',
 (select count(*) from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001'))=2);
select public.test_assert('Owner can inspect Class B',
 (select count(*) from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000002'))=1);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select public.test_reject('Student may not call Faculty class RPC',
 $$select * from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001')$$);
-- A student with an active classroom attempt may update their own locked-stage
-- storage only while class open. The full integrity of stage lock transitions
-- remains a separate release review task.
do $$declare n bigint;begin
 update public.simulation_responses set response_data='{"saved":true}'::jsonb
 where attempt_id='30000000-0000-4000-8000-000000000001';
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Expected active classroom response update, got %',n;end if;
 raise notice 'PASS active student update';
end$$;
select public.test_reject('Student may not insert into already-submitted attempt',
 $$insert into public.simulation_responses(attempt_id,question_key,response_data) values('30000000-0000-4000-8000-000000000003','test','{}')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select public.test_reject('Closed classroom prevents new response insert',
 $$insert into public.simulation_responses(attempt_id,question_key,response_data) values('30000000-0000-4000-8000-000000000002','test','{}')$$);
do $$declare n bigint;begin
 update public.simulation_responses set response_data='{"bad":true}'::jsonb
 where attempt_id='30000000-0000-4000-8000-000000000002';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Closed classroom updated % response rows',n;end if;
 raise notice 'PASS closed classroom update denied';
end$$;
reset role;
set role anon;
select public.test_reject('anonymous cannot execute Faculty result function',
 $$select * from public.get_my_rizsim_insight_session_records('20000000-0000-4000-8000-000000000001')$$);
reset role;
