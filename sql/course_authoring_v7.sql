-- V7 authoring only. No session execution, result or student writes.
-- Delete is an authoring tombstone; existing submissions and stored files are retained.
alter table public.rizsim_courses add column if not exists authoring_deleted boolean not null default false;
create table public.rizsim_course_authoring_uploads (
 course_id uuid primary key, user_id uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '1 day', created_at timestamptz not null default now()
);
create table public.rizsim_course_authoring_receipts (
 request_id uuid primary key, user_id uuid not null references auth.users(id), course_id uuid not null,
 payload_hash text not null, result jsonb not null, created_at timestamptz not null default now()
);
alter table public.rizsim_course_authoring_uploads enable row level security;
alter table public.rizsim_course_authoring_receipts enable row level security;
revoke all on public.rizsim_course_authoring_uploads, public.rizsim_course_authoring_receipts from public, anon, authenticated;
grant select on public.rizsim_course_authoring_uploads, public.rizsim_course_authoring_receipts to authenticated;
grant all on public.rizsim_course_authoring_uploads, public.rizsim_course_authoring_receipts to service_role;
create policy authoring_upload_owner on public.rizsim_course_authoring_uploads for select to authenticated using(user_id=(select auth.uid()));
create policy authoring_receipt_owner on public.rizsim_course_authoring_receipts for select to authenticated using(user_id=(select auth.uid()));
create index on public.rizsim_course_authoring_uploads(user_id,expires_at);
create index on public.rizsim_course_authoring_receipts(user_id,course_id);

create or replace function public.rizsim_authoring_lead() returns boolean
 language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_active_rizsim_course_lead()
 and exists(select 1 from public.profiles where id=auth.uid() and account_status='active');
$$;

-- One read contract for the library and editor. It deliberately returns no sessions or results.
create or replace function public.get_my_rizsim_course_authoring(p_course_id uuid default null) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
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
 'external_url',m.external_url,'file_name',m.file_name,'file_size',m.file_size,'mime_type',m.mime_type,'published_to_class',m.published_to_class,'updated_at',m.updated_at)
 order by m.sort_order,m.created_at,m.id) from public.rizsim_course_materials m where m.course_id=c.id and m.active),'[]'::jsonb));
 return data||jsonb_build_object('revision',md5(data::text));
 end;
$$;

-- Reserves a new course UUID for file staging without creating a half-published course.
create or replace function public.prepare_rizsim_course_authoring(p_course_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
 begin
 if not public.rizsim_authoring_lead() or p_course_id is null then raise exception 'Active Course Lead access is required.'; end if;
 if exists(select 1 from public.rizsim_courses where id=p_course_id and (created_by<>auth.uid() or not active or authoring_deleted))
 or exists(select 1 from public.rizsim_course_catalogue where course_id=p_course_id and published) then raise exception 'This course cannot be edited.'; end if;
 if exists(select 1 from public.rizsim_course_authoring_uploads where course_id=p_course_id and user_id<>auth.uid()) then raise exception 'This upload reservation is unavailable.'; end if;
 insert into public.rizsim_course_authoring_uploads(course_id,user_id) values(p_course_id,auth.uid())
 on conflict(course_id) do update set expires_at=now()+interval '1 day' where rizsim_course_authoring_uploads.user_id=auth.uid();
 return jsonb_build_object('course_id',p_course_id);
 end;
$$;

create or replace function public.rizsim_authoring_upload_path(p_path text) returns boolean
 language plpgsql stable security definer set search_path='' as $$
 declare cid uuid; uid uuid; rid uuid;
 begin
 if not public.rizsim_authoring_lead() or array_length(string_to_array(p_path,'/'),1)<>5 or split_part(p_path,'/',2)<>'authoring'
 or p_path like '%..%' or length(p_path)>600 or split_part(p_path,'/',5) !~ '^[A-Za-z0-9_.-]+$' then return false; end if;
 cid:=split_part(p_path,'/',1)::uuid;uid:=split_part(p_path,'/',3)::uuid;rid:=split_part(p_path,'/',4)::uuid;
 return uid=auth.uid() and exists(select 1 from public.rizsim_course_authoring_uploads where course_id=cid and user_id=auth.uid() and expires_at>now())
 and not exists(select 1 from public.rizsim_courses where id=cid and (created_by<>auth.uid() or not active or authoring_deleted));
 exception when invalid_text_representation then return false;
 end;
$$;
-- A disjoint scoped path: no new permission into another course, a session prefix or public storage.
create policy authoring_staged_file_insert on storage.objects for insert to authenticated with check(bucket_id='course-materials' and public.rizsim_authoring_upload_path(name));
create policy authoring_staged_file_read on storage.objects for select to authenticated using(bucket_id='course-materials' and public.rizsim_authoring_upload_path(name));
-- No UPDATE or DELETE grant is added for staged storage, preventing replacement of confirmed files.

create or replace function public.save_my_rizsim_course_authoring(p_course_id uuid,p_request_id uuid,p_expected_revision text,p_data jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare c public.rizsim_courses%rowtype; receipt public.rizsim_course_authoring_receipts%rowtype; payload_hash text;
 before_data jsonb; result jsonb; sim_ids uuid[]; keep_ids uuid[]; incoming_ids uuid[]; r jsonb; rid uuid;
 title_text text:=btrim(p_data->>'title'); description_text text:=coalesce(p_data->>'description',''); pos integer:=0;
 path text; link text; mt text; st text; mime text; bytes bigint; fname text;
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
  rid:=(r->>'id')::uuid;mt:=r->>'material_type';st:=r->>'source_type';path:=r->>'storage_path';link:=r->>'external_url';mime:=r->>'mime_type';fname:=r->>'file_name';bytes:=null;
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
  insert into public.rizsim_course_materials(id,course_id,created_by,title,description,material_type,source_type,storage_path,external_url,file_name,mime_type,file_size,sort_order,published_to_class)
  values(rid,p_course_id,auth.uid(),btrim(r->>'title'),nullif(btrim(r->>'description'),''),mt,st,path,link,fname,mime,bytes,pos,false);
  pos:=pos+1;
 end loop;
 result:=public.get_my_rizsim_course_authoring(p_course_id);
 insert into public.rizsim_course_authoring_receipts(request_id,user_id,course_id,payload_hash,result) values(p_request_id,auth.uid(),p_course_id,payload_hash,result);
 return result;
 end;
$$;

create or replace function public.delete_my_rizsim_course_authoring(p_course_id uuid,p_expected_revision text) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare c public.rizsim_courses%rowtype;
 begin
 if not public.rizsim_authoring_lead() then raise exception 'Active Course Lead access is required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_course_id::text,7));
 select * into c from public.rizsim_courses where id=p_course_id and created_by=auth.uid() for update;
 if c.id is null then raise exception 'Course not found in your created courses.'; end if;
 if c.authoring_deleted then return jsonb_build_object('course_id',p_course_id,'deleted',true); end if;
 if p_expected_revision is null or p_expected_revision<>(public.get_my_rizsim_course_authoring(p_course_id)->>'revision') then raise exception 'This course changed. Refresh before deleting.'; end if;
 if exists(select 1 from public.classroom_sessions where course_id=c.id and active and closed_at is null) then raise exception 'This course has open sessions. End them in Live Classroom before deleting the course.'; end if;
 if exists(select 1 from public.rizsim_course_catalogue where course_id=c.id and published)
 or exists(select 1 from public.rizsim_purchased_course_licenses where course_id=c.id and revoked_at is null and expires_at>now()) then raise exception 'A publisher-listed or licensed course cannot be deleted here.'; end if;
 update public.rizsim_courses set active=false,authoring_deleted=true,ended_at=coalesce(ended_at,now()),updated_at=now() where id=c.id;
 return jsonb_build_object('course_id',c.id,'deleted',true);
 end;
$$;

revoke all on function public.rizsim_authoring_lead(),public.get_my_rizsim_course_authoring(uuid),public.prepare_rizsim_course_authoring(uuid),
 public.rizsim_authoring_upload_path(text),public.save_my_rizsim_course_authoring(uuid,uuid,text,jsonb),public.delete_my_rizsim_course_authoring(uuid,text) from public,anon,authenticated;
grant execute on function public.rizsim_authoring_lead(),public.get_my_rizsim_course_authoring(uuid),public.prepare_rizsim_course_authoring(uuid),
 public.rizsim_authoring_upload_path(text),public.save_my_rizsim_course_authoring(uuid,uuid,text,jsonb),public.delete_my_rizsim_course_authoring(uuid,text) to authenticated,service_role;
