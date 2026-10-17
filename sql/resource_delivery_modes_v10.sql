-- RizSim V10: learner-selected file delivery, fail-closed for all existing resources.
-- Applies after V6 and V7. This migration is intentionally additive; no public storage objects.
begin;
alter table public.rizsim_course_materials add column if not exists delivery_mode text not null default 'secure_view' check (delivery_mode in ('secure_view','downloadable'));
alter table public.rizsim_session_resources add column if not exists delivery_mode text not null default 'secure_view' check (delivery_mode in ('secure_view','downloadable'));
comment on column public.rizsim_course_materials.delivery_mode is 'Authorized material presentation: secure_view is the legacy default; downloadable explicitly permits regular viewing and saving.';
comment on column public.rizsim_session_resources.delivery_mode is 'Authorized standalone-session file presentation; secure_view is the safe default.';

CREATE OR REPLACE FUNCTION public.get_my_rizsim_course_authoring(p_course_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare c public.rizsim_courses%rowtype; data jsonb;
 begin
 if not public.rizsim_authoring_lead() then raise exception 'Active Course Lead access is required.'; end if;
 if p_course_id is null then
  return coalesce((select jsonb_agg(jsonb_build_object('course_id',x.id,'title',x.title,'description',x.description,'active',x.active) order by x.updated_at desc,x.id)
   from public.rizsim_courses x where x.created_by=auth.uid() and not x.authoring_deleted),'[]'::jsonb);
 end if;
 select * into c from public.rizsim_courses where id=p_course_id and created_by=auth.uid() and not authoring_deleted;
 if c.id is null then raise exception 'Course not found in your created courses.'; end if;
 data:=jsonb_build_object('course_id',c.id,'title',c.title,'description',coalesce(c.description,''),'active',c.active,'updated_at',c.updated_at,
 'can_edit',c.active and not exists(select 1 from public.rizsim_course_catalogue where course_id=c.id and published),
 'simulations',coalesce((select jsonb_agg(jsonb_build_object('product_id',s.product_id,'title',p.title,'description',p.short_description,'added_at',s.added_at) order by s.sort_order,s.added_at,s.product_id)
 from public.rizsim_course_simulations s join public.products p on p.id=s.product_id where s.course_id=c.id),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'material_type',m.material_type,'source_type',m.source_type,
 'external_url',m.external_url,'file_name',m.file_name,'file_size',m.file_size,'mime_type',m.mime_type,'delivery_mode',m.delivery_mode,'published_to_class',m.published_to_class,'updated_at',m.updated_at)
 order by m.sort_order,m.created_at,m.id) from public.rizsim_course_materials m where m.course_id=c.id and m.active),'[]'::jsonb));
 return data||jsonb_build_object('revision',md5(data::text));
 end;
$function$;


CREATE OR REPLACE FUNCTION public.get_rizsim_course_runtime(p_course_id uuid, p_kind text DEFAULT 'own'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare c public.rizsim_courses%rowtype; purchase uuid; simulations jsonb; materials jsonb; sessions jsonb;
 begin
 select * into c from public.rizsim_courses where id=p_course_id and active;
 if c.id is null or not public.rizsim_runtime_faculty() then raise exception 'This course is not available to your verified account.'; end if;
 if p_kind='own' then
  if c.created_by<>auth.uid() or not public.is_active_rizsim_course_lead() then raise exception 'Course Lead ownership is required.'; end if;
 elsif p_kind='purchased' then
  purchase:=public.rizsim_runtime_purchase(c.id);
  if purchase is null then raise exception 'An active purchased-course licence is required.'; end if;
 else raise exception 'Invalid course environment.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',p.id,'title',p.title,'description',p.short_description,'sort_order',cs.sort_order) order by cs.sort_order,cs.added_at),'[]') into simulations
 from public.rizsim_course_simulations cs join public.products p on p.id=cs.product_id where cs.course_id=c.id;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'source_type',m.source_type,'material_type',m.material_type,
 'file_name',m.file_name,'mime_type',m.mime_type,'file_size',m.file_size,'external_url',m.external_url,'delivery_mode',m.delivery_mode,'published_to_class',
 case when p_kind='own' then m.published_to_class else coalesce((select r.published_to_class from public.rizsim_course_resource_publications r where r.license_id=purchase and r.material_id=m.id),false) end)
 order by m.sort_order,m.created_at),'[]') into materials from public.rizsim_course_materials m where m.course_id=c.id and m.active;
 select coalesce(jsonb_agg(jsonb_build_object('session_id',s.id,'course_id',s.course_id,'product_id',s.product_id,'class_name',s.class_name,'active',s.active,'created_at',s.created_at)
 order by s.created_at desc),'[]') into sessions from public.classroom_sessions s where s.course_id=c.id and s.created_by=auth.uid()
 and ((p_kind='own' and s.purchased_course_license_id is null) or (p_kind='purchased' and s.purchased_course_license_id=purchase));
 return jsonb_build_object('course_id',c.id,'title',c.title,'description',c.description,'kind',p_kind,'can_add',p_kind='own','license_id',purchase,'simulations',simulations,'resources',materials,'sessions',sessions);
 end;
$function$;


CREATE OR REPLACE FUNCTION public.create_rizsim_runtime_resource(p_kind text, p_scope_id uuid, p_resource_id uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare title_text text:=btrim(p_data->>'title'); descr text:=coalesce(p_data->>'description','');
 st text:=p_data->>'source_type'; mt text:=p_data->>'material_type'; path text:=p_data->>'storage_path';
 link text:=p_data->>'external_url'; mime text:=p_data->>'mime_type'; fname text:=p_data->>'file_name'; bytes bigint; expected_prefix text; result jsonb; delivery text:=coalesce(nullif(p_data->>'delivery_mode',''),'secure_view');
 begin
 if auth.uid() is null or not public.rizsim_runtime_faculty() then raise exception 'Active Faculty access is required.'; end if;
 if p_kind='own' then
  if not public.is_active_rizsim_course_lead() or not exists(select 1 from public.rizsim_courses where id=p_scope_id and created_by=auth.uid() and active) then raise exception 'Course Lead ownership is required.'; end if;
  expected_prefix:=p_scope_id::text||'/';
 elsif p_kind='simulation' then
  if not public.rizsim_runtime_manage_session(p_scope_id) then raise exception 'An active owned standalone session is required.'; end if;
  expected_prefix:='sessions/'||p_scope_id::text||'/';
 else raise exception 'Purchased content cannot be added to or edited.'; end if;
 if p_resource_id is null or title_text is null or length(title_text) not between 1 and 200 or length(descr)>2000 then raise exception 'Enter a title up to 200 characters and a description up to 2000 characters.'; end if;
 if mt not in ('student_handout','reading','slides','worksheet','external_link','other') or mt is null then raise exception 'Select a resource type.'; end if;
 if delivery not in ('secure_view','downloadable') or (st='link' and delivery<>'secure_view') then raise exception 'Choose Secure View or Downloadable for an uploaded file.'; end if;
 if st='file' then
  bytes:=(p_data->>'file_size')::bigint;
  if path is null or path not like expected_prefix||p_resource_id::text||'-%' or path like '%..%' or
   length(path)>600 or bytes is null or bytes not between 1 and 26214400 or mime is null or mime not in ('application/pdf','image/png','image/jpeg') or length(coalesce(fname,'')) not between 1 and 240 then
   raise exception 'Choose a PDF, PNG or JPEG file up to 25 MB.'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='course-materials' and o.name=path) then raise exception 'The file upload has not completed.'; end if;
  link:=null;
 elsif st='link' then
  if link is null or length(link)>2048 or link !~* '^https?://[^[:space:]/@?#]+[.][^[:space:]/@?#]+(:[0-9]+)?([/?#][^[:space:]]*)?$' or link ~ '[[:cntrl:]]' then raise exception 'Enter a complete valid http or https web link.'; end if;
  path:=null; mime:=null; fname:=null; bytes:=null;
 else raise exception 'Choose a file or web link.'; end if;
 -- Idempotent retry: a resource UUID is reused by the composer, never duplicated.
 if p_kind='own' then
  if exists(select 1 from public.rizsim_course_materials where id=p_resource_id) then
   select jsonb_build_object('id',id,'published_to_class',published_to_class,'delivery_mode',delivery_mode) into result from public.rizsim_course_materials where id=p_resource_id and course_id=p_scope_id and created_by=auth.uid() and active and title=title_text and source_type=st and storage_path is not distinct from path and external_url is not distinct from link and delivery_mode=delivery;
   if result is null then raise exception 'Resource identifier is not available.'; end if;
   return result;
  end if;
  insert into public.rizsim_course_materials(id,course_id,created_by,title,description,material_type,source_type,storage_path,external_url,file_name,mime_type,file_size,sort_order,published_to_class,delivery_mode)
  values(p_resource_id,p_scope_id,auth.uid(),title_text,nullif(descr,''),mt,st,path,link,fname,mime,bytes,
  coalesce((select max(sort_order)+1 from public.rizsim_course_materials where course_id=p_scope_id),0),true,delivery)
  returning jsonb_build_object('id',id,'published_to_class',published_to_class,'delivery_mode',delivery_mode) into result;
 else
  if exists(select 1 from public.rizsim_session_resources where id=p_resource_id) then
   select jsonb_build_object('id',id,'published_to_class',published_to_class,'delivery_mode',delivery_mode) into result from public.rizsim_session_resources where id=p_resource_id and session_id=p_scope_id and created_by=auth.uid() and title=title_text and source_type=st and storage_path is not distinct from path and external_url is not distinct from link and delivery_mode=delivery;
   if result is null then raise exception 'Resource identifier is not available.'; end if;
   return result;
  end if;
  insert into public.rizsim_session_resources(id,session_id,created_by,title,description,material_type,source_type,storage_path,external_url,file_name,mime_type,file_size,delivery_mode)
  values(p_resource_id,p_scope_id,auth.uid(),title_text,nullif(descr,''),mt,st,path,link,fname,mime,bytes,delivery)
  returning jsonb_build_object('id',id,'published_to_class',published_to_class,'delivery_mode',delivery_mode) into result;
 end if;
 return result;
 end;
$function$;


CREATE OR REPLACE FUNCTION public.save_my_rizsim_course_authoring(p_course_id uuid, p_request_id uuid, p_expected_revision text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare c public.rizsim_courses%rowtype; receipt public.rizsim_course_authoring_receipts%rowtype; payload_hash text;
 before_data jsonb; result jsonb; sim_ids uuid[]; keep_ids uuid[]; incoming_ids uuid[]; r jsonb; rid uuid;
 title_text text:=btrim(p_data->>'title'); description_text text:=coalesce(p_data->>'description',''); pos integer:=0;
 path text; link text; mt text; st text; mime text; bytes bigint; fname text; delivery text;
 begin
 if not public.rizsim_authoring_lead() or p_course_id is null or p_request_id is null then raise exception 'Active Course Lead access is required.'; end if;
 if jsonb_typeof(p_data)<>'object' or title_text is null or length(title_text) not between 1 and 160 or length(description_text)>1200 then raise exception 'Enter a course title up to 160 characters and a description up to 1,200 characters.'; end if;
 if jsonb_typeof(p_data->'simulations') is distinct from 'array' or jsonb_typeof(p_data->'keep_resources') is distinct from 'array'
 or jsonb_typeof(p_data->'new_resources') is distinct from 'array' then raise exception 'The course draft is incomplete.'; end if;
 if jsonb_array_length(p_data->'simulations')>100 or jsonb_array_length(p_data->'keep_resources')+jsonb_array_length(p_data->'new_resources')>100 then raise exception 'A course supports up to 100 simulations and 100 resources.'; end if;
 -- Serialize same-course writes and exact retries, including a new UUID before its row exists.
 perform pg_advisory_xact_lock(hashtextextended(p_course_id::text,7));
 payload_hash:=md5(p_course_id::text||coalesce(p_expected_revision,'NEW')||p_data::text);
 select * into receipt from public.rizsim_course_authoring_receipts where request_id=p_request_id;
 if receipt.request_id is not null then
  if receipt.user_id<>auth.uid() or receipt.course_id<>p_course_id or receipt.payload_hash<>payload_hash then raise exception 'This save request has changed. Reload the saved course before continuing.'; end if;
  return receipt.result;
 end if;
 select * into c from public.rizsim_courses where id=p_course_id for update;
 if c.id is not null then
  if c.created_by<>auth.uid() or not c.active or c.authoring_deleted then raise exception 'This course cannot be edited by this account.'; end if;
  if exists(select 1 from public.rizsim_course_catalogue where course_id=c.id and published) then raise exception 'Publisher-listed courses cannot be edited in this workspace.'; end if;
  -- Lock child rows before reading the revision, including resource publication changes.
  perform 1 from public.rizsim_course_materials where course_id=c.id order by id for update;
  perform 1 from public.rizsim_course_simulations where course_id=c.id order by id for update;
  before_data:=public.get_my_rizsim_course_authoring(c.id);
  if p_expected_revision is null or p_expected_revision<>before_data->>'revision' then raise exception 'This course changed in another workspace. Reload before saving; your draft has not overwritten it.'; end if;
 elsif p_expected_revision is not null then raise exception 'The course no longer exists.';
 elsif exists(select 1 from public.rizsim_course_authoring_uploads where course_id=p_course_id and user_id<>auth.uid()) then raise exception 'Course identifier unavailable.';
 end if;
 select coalesce(array_agg(v::uuid),'{}'::uuid[]) into sim_ids from jsonb_array_elements_text(p_data->'simulations')v;
 select coalesce(array_agg(v::uuid),'{}'::uuid[]) into keep_ids from jsonb_array_elements_text(p_data->'keep_resources')v;
 select coalesce(array_agg((v->>'id')::uuid),'{}'::uuid[]) into incoming_ids from jsonb_array_elements(p_data->'new_resources')v;
 if array_position(sim_ids,null) is not null or array_position(keep_ids,null) is not null or array_position(incoming_ids,null) is not null then raise exception 'An item identifier is missing.'; end if;
 if cardinality(sim_ids)<>(select count(distinct x) from unnest(sim_ids)x) or cardinality(keep_ids)<>(select count(distinct x) from unnest(keep_ids)x)
 or cardinality(incoming_ids)<>(select count(distinct x) from unnest(incoming_ids)x) then raise exception 'Duplicate course items are not allowed.'; end if;
 if exists(select 1 from unnest(keep_ids)i where not exists(select 1 from public.rizsim_course_materials where id=i and course_id=p_course_id and active))
 or exists(select 1 from public.rizsim_course_materials where id=any(incoming_ids)) then raise exception 'A resource does not belong to this draft.'; end if;
 -- Keep legacy included items when their licence expires, but never add an unlicensed item.
 if exists(select 1 from unnest(sim_ids)i where not exists(select 1 from public.rizsim_course_simulations where course_id=p_course_id and product_id=i)
 and not public.has_my_active_simulation_license(i)) then raise exception 'An active simulation licence is required for every newly added simulation.'; end if;
 if exists(select 1 from public.classroom_sessions s where s.course_id=p_course_id and s.active and s.closed_at is null and not(s.product_id=any(sim_ids))) then
 raise exception 'A simulation has an open course session. End that session in Live Classroom before removing the simulation.'; end if;
 if c.id is null then
  insert into public.rizsim_courses(id,created_by,title,description) values(p_course_id,auth.uid(),title_text,nullif(btrim(description_text),''));
 else
  update public.rizsim_courses set title=title_text,description=nullif(btrim(description_text),''),updated_at=now() where id=c.id;
 end if;
 delete from public.rizsim_course_simulations where course_id=p_course_id and not(product_id=any(sim_ids));
 foreach rid in array sim_ids loop
  if not exists(select 1 from public.rizsim_course_simulations where course_id=p_course_id and product_id=rid) then
   insert into public.rizsim_course_simulations(course_id,product_id,sort_order,added_by) values(p_course_id,rid,pos,auth.uid());
  else update public.rizsim_course_simulations set sort_order=pos where course_id=p_course_id and product_id=rid; end if;
  pos:=pos+1;
 end loop;
 -- Remove only from the authoring/library view. Never physically delete material or result records.
 update public.rizsim_course_materials set active=false,published_to_class=false,updated_at=now() where course_id=p_course_id and active and not(id=any(keep_ids));
 pos:=cardinality(keep_ids);
 for r in select value from jsonb_array_elements(p_data->'new_resources') loop
  rid:=(r->>'id')::uuid;mt:=r->>'material_type';st:=r->>'source_type';path:=r->>'storage_path';link:=r->>'external_url';mime:=r->>'mime_type';fname:=r->>'file_name';bytes:=null;delivery:=coalesce(nullif(r->>'delivery_mode',''),'secure_view');
  if delivery not in ('secure_view','downloadable') or (st='link' and delivery<>'secure_view') then raise exception 'Choose Secure View or Downloadable for the file.'; end if;
  if length(coalesce(btrim(r->>'title'),'')) not between 1 and 200 or length(coalesce(r->>'description',''))>2000
  or mt is null or mt not in ('student_handout','reading','slides','worksheet','external_link','other','teaching_material') then raise exception 'A learning resource has invalid details.'; end if;
  if st='file' then
   bytes:=(r->>'file_size')::bigint;
   if not public.rizsim_authoring_upload_path(path) or path not like p_course_id::text||'/authoring/'||auth.uid()::text||'/'||rid::text||'/%'
   or bytes is null or bytes not between 1 and 26214400 or mime is null or mime not in ('application/pdf','image/png','image/jpeg') or length(coalesce(fname,'')) not between 1 and 240 then raise exception 'A file does not match its authorized upload scope.'; end if;
   if not exists(select 1 from storage.objects where bucket_id='course-materials' and name=path) then raise exception 'A file upload is incomplete. No course changes were saved.'; end if;
   link:=null;
  elsif st='link' then
   if link is null or length(link)>2048 or link !~* '^https?://[^[:space:]/@?#]+[.][^[:space:]/@?#]+(:[0-9]+)?([/?#][^[:space:]]*)?$' or link ~ '[[:cntrl:]]' or position(chr(92) in link)>0 then raise exception 'Enter a complete valid http or https web link.'; end if;
   path:=null;mime:=null;fname:=null;
  else raise exception 'Choose a file or a valid web link.'; end if;
  insert into public.rizsim_course_materials(id,course_id,created_by,title,description,material_type,source_type,storage_path,external_url,file_name,mime_type,file_size,sort_order,published_to_class,delivery_mode)
  values(rid,p_course_id,auth.uid(),btrim(r->>'title'),nullif(btrim(r->>'description'),''),mt,st,path,link,fname,mime,bytes,pos,false,delivery);
  pos:=pos+1;
 end loop;
 result:=public.get_my_rizsim_course_authoring(p_course_id);
 insert into public.rizsim_course_authoring_receipts(request_id,user_id,course_id,payload_hash,result) values(p_request_id,auth.uid(),p_course_id,payload_hash,result);
 return result;
 end;
$function$;


-- Permission-checked mode lookup used by the viewer; no public storage URI, path or private metadata is disclosed.
create or replace function public.get_rizsim_material_delivery_mode(p_material_id uuid)
returns text
language sql stable security definer set search_path to ''
as $mode$
 select delivery_mode from public.rizsim_course_materials m
 where auth.uid() is not null and m.id=p_material_id and m.active and m.source_type='file'
 and public.rizsim_can_view_course_material(m.id)
 union all
 select delivery_mode from public.rizsim_session_resources r
 where auth.uid() is not null and r.id=p_material_id and r.source_type='file'
 and public.rizsim_runtime_view_session_resource(r.id)
 limit 1
$mode$;
revoke all on function public.get_rizsim_material_delivery_mode(uuid) from public, anon;
grant execute on function public.get_rizsim_material_delivery_mode(uuid) to authenticated;
commit;
