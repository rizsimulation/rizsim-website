-- V10 additive material-mode tests. Run ONLY in disposable PostgreSQL after V6/V7 fixtures.
\set ON_ERROR_STOP on
reset role;
select public.test_assert('Existing course resources keep Secure View by default',
  (select bool_and(delivery_mode='secure_view') from public.rizsim_course_materials));
select public.test_assert('New file-mode columns have a restrictive default',
  (select count(*) from information_schema.columns
   where table_schema='public' and table_name in ('rizsim_course_materials','rizsim_session_resources')
   and column_name='delivery_mode' and column_default like '%secure_view%')=2);
select public.test_assert('Anonymous delivery lookup denied',
  not has_function_privilege('anon','public.get_rizsim_material_delivery_mode(uuid)','execute'));
select public.test_assert('Authenticated delivery lookup permitted',
  has_function_privilege('authenticated','public.get_rizsim_material_delivery_mode(uuid)','execute'));

set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
insert into storage.objects(bucket_id,name)
values('course-materials','sessions/50000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000001-downloadable.pdf');
select public.test_assert('Faculty saves explicitly downloadable standalone handout',
  (public.create_rizsim_runtime_resource(
    'simulation','50000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',
    '{"title":"Downloadable class reading","material_type":"reading","source_type":"file","file_name":"downloadable.pdf",
      "storage_path":"sessions/50000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000001-downloadable.pdf",
      "mime_type":"application/pdf","file_size":124,"delivery_mode":"downloadable"}'
   )->>'delivery_mode')='downloadable');
select public.test_assert('Standalone mode saved in the database',
 (select delivery_mode='downloadable' from public.rizsim_session_resources where id='71000000-0000-4000-8000-000000000001'));
select public.test_assert('Exact idempotent retry preserves mode',
 (public.create_rizsim_runtime_resource('simulation',
 '50000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',
 '{"title":"Downloadable class reading","material_type":"reading","source_type":"file","file_name":"downloadable.pdf",
   "storage_path":"sessions/50000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000001-downloadable.pdf",
   "mime_type":"application/pdf","file_size":124,"delivery_mode":"downloadable"}')->>'delivery_mode')='downloadable');
select public.test_reject('Cannot downgrade existing file mode through a stale retry',
 $q$select public.create_rizsim_runtime_resource('simulation','50000000-0000-4000-8000-000000000002',
 '71000000-0000-4000-8000-000000000001',
 '{"title":"Downloadable class reading","material_type":"reading","source_type":"file","file_name":"downloadable.pdf",
 "storage_path":"sessions/50000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000001-downloadable.pdf",
 "mime_type":"application/pdf","file_size":124,"delivery_mode":"secure_view"}')$q$,
 'Resource identifier is not available');
select public.test_reject('Unrecognized mode rejected at runtime RPC',
 $q$select public.create_rizsim_runtime_resource('simulation','50000000-0000-4000-8000-000000000002',gen_random_uuid(),
 '{"title":"Invalid mode","material_type":"reading","source_type":"link","external_url":"https://example.org","delivery_mode":"downloadable"}')$q$,
 'Choose Secure View or Downloadable');
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select public.test_assert('Authorized student resolves the explicit mode',
 public.get_rizsim_material_delivery_mode('71000000-0000-4000-8000-000000000001')='downloadable');
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select public.test_assert('Unrelated user cannot query another class file mode',
 public.get_rizsim_material_delivery_mode('71000000-0000-4000-8000-000000000001') is null);
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
select public.set_rizsim_resource_publication('simulation','50000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',false);
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select public.test_assert('Revocation hides download permission from learners',
 public.get_rizsim_material_delivery_mode('71000000-0000-4000-8000-000000000001') is null);

set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select public.prepare_rizsim_course_authoring('70000000-0000-4000-8000-0000000000a1');
insert into storage.objects(bucket_id,name)
values('course-materials',
 '70000000-0000-4000-8000-0000000000a1/authoring/10000000-0000-4000-8000-000000000001/80000000-0000-4000-8000-0000000000a1/reading.pdf');
select public.test_assert('Course Lead atomically saves a downloadable file',
  (public.save_my_rizsim_course_authoring('70000000-0000-4000-8000-0000000000a1',
   '90000000-0000-4000-8000-0000000000a1',null,
   '{"title":"V10 course","description":"Mode test","simulations":["30000000-0000-4000-8000-000000000001"],
    "keep_resources":[],"new_resources":[{"id":"80000000-0000-4000-8000-0000000000a1","title":"Reading PDF",
    "source_type":"file","material_type":"reading","mime_type":"application/pdf","file_name":"reading.pdf",
    "file_size":124,"delivery_mode":"downloadable",
    "storage_path":"70000000-0000-4000-8000-0000000000a1/authoring/10000000-0000-4000-8000-000000000001/80000000-0000-4000-8000-0000000000a1/reading.pdf"}]}'
   )->'resources'->0->>'delivery_mode')='downloadable');
select public.test_assert('Course authoring persists chosen file mode',
 (select delivery_mode='downloadable' and published_to_class=false
 from public.rizsim_course_materials where id='80000000-0000-4000-8000-0000000000a1'));
select public.test_assert('Existing secure-mode course file stayed secure',
 (select delivery_mode='secure_view' from public.rizsim_course_materials
 where id='80000000-0000-4000-8000-000000000001'));
select public.test_assert('Runtime course data exposes only selected mode, never storage path',
 (select (m->>'delivery_mode')='downloadable' and not m ? 'storage_path'
 from jsonb_array_elements(public.get_rizsim_course_runtime('70000000-0000-4000-8000-0000000000a1','own')->'resources') m
 where m->>'id'='80000000-0000-4000-8000-0000000000a1'));
reset role;
