-- SIM03 isolated assertions. Invented Student/Faculty identities and prices only.
create function public.sim03_assert(label text,ok boolean) returns void
language plpgsql as $body$
begin if ok is distinct from true then raise exception 'ASSERT FAIL: %',label;end if;
raise notice 'PASS %',label;end;
$body$;
create function public.sim03_reject(label text,statement text) returns void
language plpgsql as $body$
begin
 begin execute statement;
   raise exception using message='Unexpectedly allowed: '||label,errcode='P0010';
 exception when others then if SQLSTATE='P0010' then raise;end if;
   raise notice 'PASS rejected: %',label;
 end;
end;
$body$;
select public.sim03_assert('source experiment conditions preserved',
 (select comparison_question='Does this hotel cost Less than PKR 1000 per night?'
 from private.rizsim_hotel_conditions where group_code='A') and
 (select comparison_question='Does this hotel cost More than PKR 80,000 per night?'
 from private.rizsim_hotel_conditions where group_code='B'));
select public.sim03_assert('no direct private assignment access',
 not has_table_privilege('authenticated','private.rizsim_hotel_assignments','SELECT') and
 not has_table_privilege('authenticated','private.rizsim_hotel_judgments','SELECT'));
select public.sim03_assert('anonymous assignment and data RPCs revoked',
 not has_function_privilege('anon','public.get_my_rizsim_hotel_assignment(uuid)','EXECUTE') and
 not has_function_privilege('anon','public.get_my_rizsim_hotel_personal_result(uuid)','EXECUTE') and
 not has_function_privilege('anon','public.get_my_rizsim_hotel_session_records(uuid)','EXECUTE') and
 not has_function_privilege('anon','public.submit_my_rizsim_hotel_judgment(uuid,text,numeric,text)','EXECUTE'));
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',false);
select public.sim03_assert('assignment returned to original Student',
 (public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000011')->>'group') in ('A','B'));
select public.sim03_assert('same attempt keeps assignment after reload',
 (public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000011')->>'group')=
 (public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000011')->>'group'));
select public.sim03_reject('Student cannot assign foreign attempt',
 $$select public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000012')$$);
select public.sim03_reject('Student cannot directly spoof public hotel response',
 $$insert into public.simulation_responses(attempt_id,question_key,response_data)
   values('30000000-0000-4000-8000-000000000011','hotel-judgment-v1-locked','{"group":"B","willing_to_pay_pkr":999999}')$$);
select public.sim03_reject('Student cannot escalate Hotel attempt progress',
 $$update public.simulation_attempts set progress_percent=100
   where id='30000000-0000-4000-8000-000000000011'$$);
select public.sim03_reject('Student cannot submit decimal PKR',
 $$select public.submit_my_rizsim_hotel_judgment(
   '30000000-0000-4000-8000-000000000011','Yes',1000.5,'S-A')$$);
select public.sim03_reject('Student cannot submit invalid Yes/No',
 $$select public.submit_my_rizsim_hotel_judgment(
   '30000000-0000-4000-8000-000000000011','Maybe',1000,'S-A')$$);
select public.sim03_reject('Student cannot submit 10^12+1 PKR',
 $$select public.submit_my_rizsim_hotel_judgment(
   '30000000-0000-4000-8000-000000000011','Yes',1000000000001,'S-A')$$);
select public.sim03_assert('Student A atomic lock and submission receipt',
 (select x->>'status'='submitted' and (x->'record'->>'willing_to_pay_pkr')::numeric=12000
    and x->'record'->>'binary_response'='Yes'
    and x->'record'->>'attempt_id'='30000000-0000-4000-8000-000000000011'
    from public.submit_my_rizsim_hotel_judgment(
      '30000000-0000-4000-8000-000000000011','Yes',12000,'S-A') x));
select public.sim03_assert('public marker seals judgment, not group or PKR',
 (select (response_data->>'sealed')::boolean=true
   and not response_data ? 'group'
   and not response_data ? 'willing_to_pay_pkr'
   from public.simulation_responses
   where attempt_id='30000000-0000-4000-8000-000000000011'));
select public.sim03_assert('one private judgment only, no duplicates',
 (select count(*) from public.simulation_responses
   where attempt_id='30000000-0000-4000-8000-000000000011')=1);
select public.sim03_assert('repeat submission returns original locked record',
 (select x->>'status'='submitted' and (x->>'idempotent')::boolean=true
    and (x->'record'->>'willing_to_pay_pkr')::numeric=12000
    from public.submit_my_rizsim_hotel_judgment(
      '30000000-0000-4000-8000-000000000011','No',45000,'NEW') x));
select public.sim03_reject('Student cannot edit even the public sealed marker',
 $$update public.simulation_responses set response_data='{"group":"B"}'
 where attempt_id='30000000-0000-4000-8000-000000000011'$$);
select public.sim03_assert('Student own submitted personal result matches accepted record',
 (select x->>'status'='submitted' and (x->'record'->>'willing_to_pay_pkr')::numeric=12000
    from public.get_my_rizsim_hotel_personal_result(
      '30000000-0000-4000-8000-000000000011') x));
select public.sim03_reject('Student cannot call private Faculty classroom results',
 $$select * from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000001')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
select public.sim03_assert('Student B assigned to same class',
 (public.get_my_rizsim_hotel_assignment(
   '30000000-0000-4000-8000-000000000012')->>'group') in ('A','B'));
reset role;
select public.sim03_assert('first two allocations are balanced 1:1',
 (select count(*) from private.rizsim_hotel_assignments where session_id=
  '20000000-0000-4000-8000-000000000001' and group_code='A')=1
 and (select count(*) from private.rizsim_hotel_assignments where session_id=
  '20000000-0000-4000-8000-000000000001' and group_code='B')=1);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
select public.sim03_assert('Student B also locks and submits independently',
 (select x->>'status'='submitted'
 from public.submit_my_rizsim_hotel_judgment(
  '30000000-0000-4000-8000-000000000012','No',38000,'S-B') x));
select public.sim03_reject('Student B cannot read Student A personal results',
 $$select public.get_my_rizsim_hotel_personal_result('30000000-0000-4000-8000-000000000011')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
select public.sim03_reject('Student in other classroom cannot forge group',
 $$select public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000011')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.sim03_assert('creator Faculty sees roster but NO conditions before close',
 (select count(*)=3 and count(record)=0 and bool_and(collection_revealed=false)
    and count(*) filter(where progress_percent=100)=2
    from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000001')));
select public.sim03_reject('Faculty A cannot inspect Faculty B session',
 $$select * from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000002')$$);
select public.sim03_reject('wrong product cannot be queried as hotel experiment',
 $$select * from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000003')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select public.sim03_assert('institution administrator sees their roster sealed',
 (select count(*)=3 and count(record)=0
   from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000001')));
select public.sim03_reject('institution cannot inspect unrelated classroom',
 $$select * from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000002')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.sim03_assert('Owner can inspect roster but cannot force early reveal',
 (select count(*)=3 and bool_and(collection_revealed=false)
  from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000001')));
reset role;
update public.classroom_sessions set closed_at=now()
 where id='20000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.sim03_assert('class closed reveals exactly two submitted canonical records',
 (select count(*)=3 and count(record)=2 and bool_and(collection_revealed)
  from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000001')));
select public.sim03_assert('revealed A/B medians are based on actual two prices',
 (select min((record->>'willing_to_pay_pkr')::numeric)=12000
   and max((record->>'willing_to_pay_pkr')::numeric)=38000
   and count(distinct record->>'group')=2
  from public.get_my_rizsim_hotel_session_records('20000000-0000-4000-8000-000000000001')));
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000015',false);
select public.sim03_reject('closed classroom blocks a new assignment for uncommitted Student',
 $select public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000015')$);
reset role;
set role anon;
select public.sim03_reject('anonymous cannot call assign RPC',
 $$select public.get_my_rizsim_hotel_assignment('30000000-0000-4000-8000-000000000011')$$);
reset role;
