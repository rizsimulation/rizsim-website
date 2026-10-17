-- ISOLATED test key is fake, NOT the academic instrument answer key.
insert into private.rizsim_s1s2_scoring_key(instrument_id,answer_map)
values('riz-ai-pedagogy-2026-s1s2-v1',
 '{"review":[0,0,0,0,0,0],"pairs":[{"source":0,"transfer":0},{"source":0,"transfer":0}]}'::jsonb);
insert into public.simulation_responses(attempt_id,question_key,response_data)
values(
 '30000000-0000-4000-8000-000000000001','system-1-system-2-v1-record',
 jsonb_build_object('record',jsonb_build_object(
  'schema','RizSimulation.Participant.v1',
  'assessment','riz-ai-pedagogy-2026-s1s2-v1',
  'kr',jsonb_build_object('a','[0,0,0,0,0,0]'::jsonb,'at',now()),
  'kg',jsonb_build_object('a','[0,1,0,0,0,0]'::jsonb,'at',now()),
  'lt',jsonb_build_array(
    jsonb_build_object('source',jsonb_build_object('a',0,'at',now(),'seen',now()),
      'transfer',jsonb_build_object('a',0,'at',now(),'seen',now())),
    jsonb_build_object('source',jsonb_build_object('a',0,'at',now(),'seen',now()),
      'transfer',jsonb_build_object('a',0,'at',now(),'seen',now())))
  ))
),
(
 '30000000-0000-4000-8000-000000000002','system-1-system-2-v1-record',
 jsonb_build_object('record',jsonb_build_object(
  'schema','RizSimulation.Participant.v1',
  'assessment','riz-ai-pedagogy-2026-s1s2-v1',
  'kr',jsonb_build_object('a','[0,0,0,0,0,0]'::jsonb,'at',now()),
  'kg',jsonb_build_object('a','[null,null,null,null,null,null]'::jsonb,'at',null),
  'lt',jsonb_build_array(
    jsonb_build_object('source',jsonb_build_object('a',null,'at',null,'seen',null),
      'transfer',jsonb_build_object('a',null,'at',null,'seen',null)),
    jsonb_build_object('source',jsonb_build_object('a',null,'at',null,'seen',null),
      'transfer',jsonb_build_object('a',null,'at',null,'seen',null)))
  ))
);
create function public.sim02_assert(label text,condition boolean) returns void
language plpgsql as $$
begin if condition is distinct from true then raise exception 'ASSERT FAIL: %',label;end if;
raise notice 'PASS %',label;end$$;
create function public.sim02_reject(label text,statement text) returns void
language plpgsql as $$
begin
 begin execute statement;raise exception using message='Unexpected access: '||label,errcode='P0010';
 exception when others then if SQLSTATE='P0010' then raise;end if;
 raise notice 'PASS denied: %',label;
 end;
end$$;
select public.sim02_assert('private scoring key invisible to authenticated',
 not has_table_privilege('authenticated','private.rizsim_s1s2_scoring_key','SELECT'));
select public.sim02_assert('anonymous cannot call Faculty RPC',
 not has_function_privilege('anon','public.get_my_rizsim_s1s2_session_records(uuid)','EXECUTE'));
select public.sim02_assert('anonymous cannot call personal scoring',
 not has_function_privilege('anon','public.get_my_rizsim_s1s2_personal_result(uuid)','EXECUTE'));
select public.sim02_assert('server-calculated KR 6, KG 5, change -1',
  (select (m->>'kr')::int=6 and (m->>'kg')::int=5 and (m->>'gain')::int=-1 and (m->>'committed')::int=16
  from private.rizsim_s1s2_metrics((select response_data->'record' from public.simulation_responses
    where attempt_id='30000000-0000-4000-8000-000000000001')) m));
select public.sim02_assert('source and transfer 2/2 and two concept subtotals',
  (select (m->>'source')::int=2 and (m->>'transfer')::int=2 and
    (m #>> '{concepts,0,kr}')::int=3 and (m #>> '{concepts,1,kg}')::int=3
   from private.rizsim_s1s2_metrics((select response_data->'record' from public.simulation_responses
    where attempt_id='30000000-0000-4000-8000-000000000001')) m));
select public.sim02_assert('in-progress KR-only record scores KG as NULL',
  (select (m->>'kr')::int=6 and m->>'kg' is null and (m->>'committed')::int=6 and
    (m->>'percent')::numeric=38 and (m->'item_kg'->0)='null'::jsonb
   from private.rizsim_s1s2_metrics((select response_data->'record' from public.simulation_responses
    where attempt_id='30000000-0000-4000-8000-000000000002')) m));
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.sim02_assert('creator Faculty sees only their class rows',
 (select count(*) from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000001'))=1);
select public.sim02_reject('Faculty A cannot see Faculty B class',
 $$select * from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000002')$$);
select public.sim02_reject('wrong product is blocked',
 $$select * from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000003')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.sim02_assert('Faculty B sees their KR-only Student but not other class',
 (select count(*) from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000002')
   where (metrics->>'committed')::int=6)=1);
select public.sim02_reject('Faculty B cannot see Faculty A class',
 $$select * from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000001')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select public.sim02_assert('institution admin limited to their institution',
 (select count(*) from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000001'))=1);
select public.sim02_reject('institution admin cannot see unrelated Faculty class',
 $$select * from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000002')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.sim02_assert('Owner sees multiple classroom sessions',
 (select count(*) from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000001'))=1
 and (select count(*) from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000002'))=1);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select public.sim02_assert('submitted Student gets ONLY own verified personal summary',
 (select (v #>> '{metrics,kg}')::int=5 and v->>'receipt'='submitted'
 from public.get_my_rizsim_s1s2_personal_result('30000000-0000-4000-8000-000000000001') v));
select public.sim02_reject('Student cannot call Faculty group RPC',
 $$select * from public.get_my_rizsim_s1s2_session_records('20000000-0000-4000-8000-000000000001')$$);
select public.sim02_reject('Student cannot view another Student personal result',
 $$select public.get_my_rizsim_s1s2_personal_result('30000000-0000-4000-8000-000000000002')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select public.sim02_reject('incomplete Student cannot request scored RGA',
 $$select public.get_my_rizsim_s1s2_personal_result('30000000-0000-4000-8000-000000000002')$$);
reset role;
set role anon;
select public.sim02_reject('anonymous blocked from authorized scores',
 $$select public.get_my_rizsim_s1s2_personal_result('30000000-0000-4000-8000-000000000001')$$);
reset role;


-- STEP 5: real-database authoritative locking, independent of browser behavior.
-- All role/attempt IDs and response values below are synthetic CI fixtures.
select public.sim02_reject('student cannot replace locked KR option via direct UPDATE',
 $$update public.simulation_responses
      set response_data=jsonb_set(response_data,'{record,kr,a,0}','3'::jsonb)
    where attempt_id='30000000-0000-4000-8000-000000000002'
      and question_key='system-1-system-2-v1-record'$$);
select public.sim02_reject('student cannot clear locked KR timestamp',
 $$update public.simulation_responses
      set response_data=jsonb_set(response_data,'{record,kr,at}','null'::jsonb)
    where attempt_id='30000000-0000-4000-8000-000000000002'
      and question_key='system-1-system-2-v1-record'$$);
select public.sim02_reject('student cannot rewrite locked KG',
 $$update public.simulation_responses
      set response_data=jsonb_set(response_data,'{record,kg,a,0}','3'::jsonb)
    where attempt_id='30000000-0000-4000-8000-000000000001'
      and question_key='system-1-system-2-v1-record'$$);
update public.simulation_responses
 set response_data=jsonb_set(response_data,'{record,kg,a,0}','1'::jsonb)
 where attempt_id='30000000-0000-4000-8000-000000000002'
   and question_key='system-1-system-2-v1-record';
select public.sim02_assert('genuine unlocked KG answer remains editable',
 (select response_data #>> '{record,kg,a,0}'='1' from public.simulation_responses
   where attempt_id='30000000-0000-4000-8000-000000000002'));
select public.sim02_reject('incomplete Student cannot force a submitted attempt',
 $$update public.simulation_attempts set status='submitted'
    where id='30000000-0000-4000-8000-000000000002'$$);
select public.sim02_assert('attempt remains in progress after rejected submission',
 (select status='in_progress' from public.simulation_attempts
  where id='30000000-0000-4000-8000-000000000002'));
-- A new unrelated simulation cannot be accidentally locked by Sim01/Sim02 rules.
insert into public.simulation_responses(attempt_id,question_key,response_data)
values('30000000-0000-4000-8000-000000000003','unrelated-test','{"saved":true}'::jsonb);
update public.simulation_responses set response_data='{"saved":false}'::jsonb
  where attempt_id='30000000-0000-4000-8000-000000000003'
    and question_key='unrelated-test';
select public.sim02_assert('unrelated product remains unaffected',
 (select response_data->>'saved'='false' from public.simulation_responses
 where attempt_id='30000000-0000-4000-8000-000000000003'
   and question_key='unrelated-test'));
-- Sim01 locked Knowledge Review must be immutable without relying on JS.
insert into public.products values
 ('10000000-0000-4000-8000-000000000004','simulation','insight-to-implication-bystander');
insert into public.simulation_attempts(id,user_id,product_id,classroom_session_id,status) values
 ('30000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000004',null,'in_progress');
insert into public.simulation_responses(attempt_id,question_key,response_data) values
 ('30000000-0000-4000-8000-000000000004','insight-bystander-v1-record',
 jsonb_build_object('record',jsonb_build_object(
  'id','synthetic-locked-01',
  'order',jsonb_build_object('kr','["K1","K2","K3","K4","K5","K6"]'::jsonb),
  'locks','{"kr":true,"source":false,"bridge":false,"transfer":false,"feedback":false,"kg":false}'::jsonb,
  'picks','{"kr":{"K1":"A","K2":"C","K3":"B","K4":"D","K5":"B","K6":"C"},"source":null,"transfer":null,"kg":{}}'::jsonb,
  'lockedAt',jsonb_build_object('kr',now())
  )));
select public.sim02_reject('Sim01 KR cannot change after server lock',
 $$update public.simulation_responses
   set response_data=jsonb_set(response_data,'{record,picks,kr,K1}','"D"'::jsonb)
   where attempt_id='30000000-0000-4000-8000-000000000004'$$);
select public.sim02_reject('Sim01 KR cannot be unlocked',
 $$update public.simulation_responses
   set response_data=jsonb_set(response_data,'{record,locks,kr}','false'::jsonb)
   where attempt_id='30000000-0000-4000-8000-000000000004'$$);
select public.sim02_reject('Sim01 incomplete student cannot force submit',
 $$update public.simulation_attempts set status='submitted'
    where id='30000000-0000-4000-8000-000000000004'$$);
select public.sim02_assert('Sim01 progress/records still unchanged',
 (select response_data #>> '{record,picks,kr,K1}'='A' from public.simulation_responses
 where attempt_id='30000000-0000-4000-8000-000000000004'));
