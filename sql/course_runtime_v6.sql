-- RizSim course-running environment. Additive; no role grants or licence creation.
-- Existing materials stay published. New library items start unpublished.
alter table public.rizsim_course_materials add column if not exists published_to_class boolean not null default true;
-- Previously instructor-only classifications must not become student-visible on upgrade.
update public.rizsim_course_materials set published_to_class=false where material_type in ('teaching_material','other');
alter table public.rizsim_course_materials alter column published_to_class set default false;

-- Publisher catalogue and purchaser entitlements are provisioned by trusted content/licensing operations,
-- not by a Faculty browser. No products, purchases or licences are fabricated by this migration.
create table public.rizsim_course_catalogue (
 course_id uuid primary key references public.rizsim_courses(id),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.rizsim_purchased_course_licenses (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.rizsim_course_catalogue(course_id),
 user_id uuid not null references auth.users(id),
 starts_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 check(expires_at>starts_at)
);
create index on public.rizsim_purchased_course_licenses(user_id,course_id);
alter table public.classroom_sessions add column if not exists purchased_course_license_id uuid references public.rizsim_purchased_course_licenses(id);
create index if not exists classroom_purchased_course_license_idx on public.classroom_sessions(purchased_course_license_id) where purchased_course_license_id is not null;
create table public.rizsim_course_resource_publications (
 license_id uuid not null references public.rizsim_purchased_course_licenses(id),
 material_id uuid not null references public.rizsim_course_materials(id) on delete cascade,
 published_to_class boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(license_id,material_id)
);
create table public.rizsim_session_resources (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.classroom_sessions(id),
 created_by uuid not null references auth.users(id),
 title text not null check(length(btrim(title)) between 1 and 200),
 description text check(length(description)<=2000),
 material_type text not null check(material_type in ('student_handout','reading','slides','worksheet','external_link','other')),
 source_type text not null check(source_type in ('file','link')),
 storage_path text unique, external_url text, file_name text, mime_type text, file_size bigint,
 published_to_class boolean not null default true,
 created_at timestamptz not null default now(),
 check((source_type='file' and storage_path is not null and external_url is null and file_size between 1 and 26214400)
    or (source_type='link' and storage_path is null and external_url is not null)),
 check(mime_type is null or mime_type in ('application/pdf','image/png','image/jpeg'))
);
create index on public.rizsim_session_resources(session_id,created_at);

alter table public.rizsim_course_catalogue enable row level security;
alter table public.rizsim_purchased_course_licenses enable row level security;
alter table public.rizsim_course_resource_publications enable row level security;
alter table public.rizsim_session_resources enable row level security;
revoke all on public.rizsim_course_catalogue,public.rizsim_purchased_course_licenses,public.rizsim_course_resource_publications,public.rizsim_session_resources from public,anon,authenticated;
grant select on public.rizsim_purchased_course_licenses,public.rizsim_session_resources to authenticated;
grant all on public.rizsim_course_catalogue,public.rizsim_purchased_course_licenses,public.rizsim_course_resource_publications,public.rizsim_session_resources to service_role;
create policy purchased_course_license_own_read on public.rizsim_purchased_course_licenses for select to authenticated using(user_id=(select auth.uid()));
create policy session_resource_staff_read on public.rizsim_session_resources for select to authenticated using(created_by=(select auth.uid()) or public.is_rizsim_owner());

create or replace function public.rizsim_runtime_faculty() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.access_out_members a join public.profiles p on p.id=a.user_id
 where a.user_id=auth.uid() and a.active and p.account_status='active' and a.role in ('faculty','course_lead'));
$$;
create or replace function public.rizsim_runtime_purchase(p_course_id uuid) returns uuid language sql stable security definer set search_path='' as $$
 select l.id from public.rizsim_purchased_course_licenses l
 join public.rizsim_course_catalogue cat on cat.course_id=l.course_id
 join public.rizsim_courses c on c.id=l.course_id
 where public.rizsim_runtime_faculty() and l.user_id=auth.uid() and l.course_id=p_course_id
 and cat.published and c.active and l.revoked_at is null and l.starts_at<=now() and l.expires_at>now()
 order by l.expires_at desc,l.id limit 1;
$$;
create or replace function public.rizsim_runtime_manage_session(p_session_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.rizsim_runtime_faculty() and exists(select 1 from public.classroom_sessions s join public.simulation_licenses l on l.id=s.license_id
 where s.id=p_session_id and s.created_by=auth.uid() and s.course_id is null and s.active and s.closed_at is null
 and l.revoked_at is null and l.starts_at<=now() and l.expires_at>now());
$$;
create or replace function public.rizsim_runtime_session_path(p_path text) returns boolean language plpgsql stable security definer set search_path='' as $$
 begin
 if split_part(p_path,'/',1)<>'sessions' or array_length(string_to_array(p_path,'/'),1)<>3 or p_path like '%..%' then return false; end if;
 return public.rizsim_runtime_manage_session(split_part(p_path,'/',2)::uuid);
 exception when invalid_text_representation then return false;
 end;
$$;
-- Additive policies use a disjoint sessions/<UUID>/ path; they never allow ordinary Faculty into course paths.
create policy runtime_session_file_insert on storage.objects for insert to authenticated with check(bucket_id='course-materials' and public.rizsim_runtime_session_path(name));
create policy runtime_session_file_read on storage.objects for select to authenticated using(bucket_id='course-materials' and public.rizsim_runtime_session_path(name));
create policy runtime_session_file_cleanup on storage.objects for delete to authenticated using(bucket_id='course-materials' and public.rizsim_runtime_session_path(name));

create or replace function public.rizsim_runtime_student_session(p_session_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active')
 and exists(select 1 from public.simulation_attempts a
 join public.classroom_sessions s on s.id=a.classroom_session_id join public.simulation_licenses l on l.id=s.license_id
 left join public.rizsim_courses c on c.id=s.course_id
 left join public.rizsim_purchased_course_licenses cl on cl.id=s.purchased_course_license_id
 where a.user_id=auth.uid() and s.id=p_session_id and s.active and s.closed_at is null
 and (s.course_id is null or c.active) and l.revoked_at is null and l.starts_at<=now() and l.expires_at>now()
 and (s.purchased_course_license_id is null or (cl.revoked_at is null and cl.starts_at<=now() and cl.expires_at>now()))
 and ((s.access_mode in ('live','both') and s.live_starts_at<=now() and s.live_ends_at>now())
 or (s.access_mode in ('practice','both') and s.practice_starts_at<=now() and s.practice_ends_at>now())));
$$;
create or replace function public.rizsim_runtime_student_material(p_material_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rizsim_course_materials m join public.classroom_sessions s on s.course_id=m.course_id
 where m.id=p_material_id and m.active and m.material_type in ('student_handout','reading','slides','worksheet','external_link','other')
 and public.rizsim_runtime_student_session(s.id)
 and ((s.purchased_course_license_id is null and m.published_to_class)
 or (s.purchased_course_license_id is not null and exists(select 1 from public.rizsim_course_resource_publications r
 where r.license_id=s.purchased_course_license_id and r.material_id=m.id and r.published_to_class))));
$$;
create or replace function public.rizsim_runtime_view_session_resource(p_resource_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.rizsim_session_resources r where r.id=p_resource_id and
 ((public.rizsim_runtime_faculty() and r.created_by=auth.uid()) or public.is_rizsim_owner()
 or (r.published_to_class and public.rizsim_runtime_student_session(r.session_id))));
$$;

create or replace function public.get_rizsim_session_runtime_scope(p_session_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare s public.classroom_sessions%rowtype; kind text; selection uuid;
 begin
 if auth.uid() is null then raise exception 'Sign in required.'; end if;
 select * into s from public.classroom_sessions where id=p_session_id and (created_by=auth.uid() or public.is_rizsim_owner());
 if s.id is null then raise exception 'Session is not available to your account.'; end if;
 kind:='simulation';selection:=s.product_id;
 if public.rizsim_runtime_faculty() and s.created_by=auth.uid() then
  if s.purchased_course_license_id is not null and public.rizsim_runtime_purchase(s.course_id) is not null then kind:='purchased';selection:=s.course_id;
  elsif s.purchased_course_license_id is null and s.course_id is not null and public.is_active_rizsim_course_lead() and exists(select 1 from public.rizsim_courses c where c.id=s.course_id and c.created_by=auth.uid() and c.active) then kind:='own';selection:=s.course_id;
  end if;
 elsif not public.is_rizsim_owner() then raise exception 'Active Faculty access is required.';
 end if;
 return jsonb_build_object('mode',kind,'selection',selection);
 end;
$$;

create or replace function public.get_my_rizsim_purchased_courses() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('course_id',c.id,'title',c.title,'description',c.description,'active',c.active,'license_id',public.rizsim_runtime_purchase(c.id)) order by c.title),'[]'::jsonb)
 from public.rizsim_courses c where public.rizsim_runtime_purchase(c.id) is not null;
$$;
create or replace function public.get_rizsim_course_runtime(p_course_id uuid,p_kind text default 'own') returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 'file_name',m.file_name,'mime_type',m.mime_type,'file_size',m.file_size,'external_url',m.external_url,'published_to_class',
 case when p_kind='own' then m.published_to_class else coalesce((select r.published_to_class from public.rizsim_course_resource_publications r where r.license_id=purchase and r.material_id=m.id),false) end)
 order by m.sort_order,m.created_at),'[]') into materials from public.rizsim_course_materials m where m.course_id=c.id and m.active;
 select coalesce(jsonb_agg(jsonb_build_object('session_id',s.id,'course_id',s.course_id,'product_id',s.product_id,'class_name',s.class_name,'active',s.active,'created_at',s.created_at)
 order by s.created_at desc),'[]') into sessions from public.classroom_sessions s where s.course_id=c.id and s.created_by=auth.uid()
 and ((p_kind='own' and s.purchased_course_license_id is null) or (p_kind='purchased' and s.purchased_course_license_id=purchase));
 return jsonb_build_object('course_id',c.id,'title',c.title,'description',c.description,'kind',p_kind,'can_add',p_kind='own','license_id',purchase,'simulations',simulations,'resources',materials,'sessions',sessions);
 end;
$$;
create or replace function public.get_rizsim_session_resources(p_session_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin
 if not public.rizsim_runtime_faculty() or not exists(select 1 from public.classroom_sessions s where s.id=p_session_id and s.created_by=auth.uid() and s.course_id is null) then
 raise exception 'This standalone session is not available.'; end if;
 return jsonb_build_object('can_add',public.rizsim_runtime_manage_session(p_session_id),'resources',coalesce((select jsonb_agg(to_jsonb(r)-'storage_path'-'created_by' order by r.created_at) from public.rizsim_session_resources r where r.session_id=p_session_id),'[]'::jsonb));
 end;
$$;

create or replace function public.set_rizsim_resource_publication(p_kind text,p_scope_id uuid,p_resource_id uuid,p_published boolean) returns jsonb language plpgsql security definer set search_path='' as $$
 declare purchase uuid; result jsonb;
 begin
 if p_published is null or not public.rizsim_runtime_faculty() then raise exception 'Active Faculty access is required.'; end if;
 if p_published and p_kind in ('own','purchased') and exists(select 1 from public.rizsim_course_materials where id=p_resource_id and material_type='teaching_material') then raise exception 'Instructor-only material cannot be published to students.'; end if;
 if p_kind='own' then
  if not public.is_active_rizsim_course_lead() or not exists(select 1 from public.rizsim_courses where id=p_scope_id and created_by=auth.uid() and active) then raise exception 'Course Lead ownership is required.'; end if;
  update public.rizsim_course_materials set published_to_class=p_published,updated_at=now() where id=p_resource_id and course_id=p_scope_id and active returning jsonb_build_object('id',id,'published_to_class',published_to_class) into result;
 elsif p_kind='purchased' then
  purchase:=public.rizsim_runtime_purchase(p_scope_id);
  if purchase is null or not exists(select 1 from public.rizsim_course_materials where id=p_resource_id and course_id=p_scope_id and active) then raise exception 'This purchased resource is not available.'; end if;
  insert into public.rizsim_course_resource_publications(license_id,material_id,published_to_class) values(purchase,p_resource_id,p_published)
  on conflict(license_id,material_id) do update set published_to_class=excluded.published_to_class,updated_at=now();
  result:=jsonb_build_object('id',p_resource_id,'published_to_class',p_published);
 elsif p_kind='simulation' then
  if not public.rizsim_runtime_manage_session(p_scope_id) then raise exception 'An active owned standalone session is required.'; end if;
  update public.rizsim_session_resources set published_to_class=p_published where id=p_resource_id and session_id=p_scope_id and created_by=auth.uid() returning jsonb_build_object('id',id,'published_to_class',published_to_class) into result;
 else raise exception 'Invalid resource scope.'; end if;
 if result is null then raise exception 'Resource not found in this scope.'; end if;
 return result;
 end;
$$;

create or replace function public.create_rizsim_runtime_resource(p_kind text,p_scope_id uuid,p_resource_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare title_text text:=btrim(p_data->>'title'); descr text:=coalesce(p_data->>'description','');
 st text:=p_data->>'source_type'; mt text:=p_data->>'material_type'; path text:=p_data->>'storage_path';
 link text:=p_data->>'external_url'; mime text:=p_data->>'mime_type'; fname text:=p_data->>'file_name'; bytes bigint; expected_prefix text; result jsonb;
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
   select jsonb_build_object('id',id,'published_to_class',published_to_class) into result from public.rizsim_course_materials where id=p_resource_id and course_id=p_scope_id and created_by=auth.uid() and active and title=title_text and source_type=st and storage_path is not distinct from path and external_url is not distinct from link;
   if result is null then raise exception 'Resource identifier is not available.'; end if;
   return result;
  end if;
  insert into public.rizsim_course_materials(id,course_id,created_by,title,description,material_type,source_type,storage_path,external_url,file_name,mime_type,file_size,sort_order,published_to_class)
  values(p_resource_id,p_scope_id,auth.uid(),title_text,nullif(descr,''),mt,st,path,link,fname,mime,bytes,
  coalesce((select max(sort_order)+1 from public.rizsim_course_materials where course_id=p_scope_id),0),true)
  returning jsonb_build_object('id',id,'published_to_class',published_to_class) into result;
 else
  if exists(select 1 from public.rizsim_session_resources where id=p_resource_id) then
   select jsonb_build_object('id',id,'published_to_class',published_to_class) into result from public.rizsim_session_resources where id=p_resource_id and session_id=p_scope_id and created_by=auth.uid() and title=title_text and source_type=st and storage_path is not distinct from path and external_url is not distinct from link;
   if result is null then raise exception 'Resource identifier is not available.'; end if;
   return result;
  end if;
  insert into public.rizsim_session_resources(id,session_id,created_by,title,description,material_type,source_type,storage_path,external_url,file_name,mime_type,file_size)
  values(p_resource_id,p_scope_id,auth.uid(),title_text,nullif(descr,''),mt,st,path,link,fname,mime,bytes)
  returning jsonb_build_object('id',id,'published_to_class',published_to_class) into result;
 end if;
 return result;
 end;
$$;

create or replace function public.create_rizsim_purchased_course_session(p_course_id uuid,p_product_id uuid,p_class_name text,p_access_mode text,
 p_live_starts_at timestamptz,p_live_ends_at timestamptz,p_practice_starts_at timestamptz,p_practice_ends_at timestamptz)
 returns jsonb language plpgsql security definer set search_path='' as $$
 declare purchase uuid; expiry timestamptz; created record;
 begin
 purchase:=public.rizsim_runtime_purchase(p_course_id);
 if purchase is null then raise exception 'An active purchased-course licence is required.'; end if;
 if not exists(select 1 from public.rizsim_course_simulations where course_id=p_course_id and product_id=p_product_id) then raise exception 'This simulation is not included in the licensed course.'; end if;
 select expires_at into expiry from public.rizsim_purchased_course_licenses where id=purchase;
 if (p_access_mode in ('live','both') and p_live_ends_at>expiry) or (p_access_mode in ('practice','both') and p_practice_ends_at>expiry) then raise exception 'Session timing exceeds the purchased-course licence.'; end if;
 -- The existing simulation entitlement check remains mandatory. Purchasing does not invent individual licences.
 select * into created from public.create_rizsim_classroom_session(p_product_id,p_class_name,p_access_mode,p_live_starts_at,p_live_ends_at,p_practice_starts_at,p_practice_ends_at);
 if created.session_id is null then raise exception 'Session could not be created.'; end if;
 update public.classroom_sessions set course_id=p_course_id,purchased_course_license_id=purchase where id=created.session_id and created_by=auth.uid();
 return jsonb_build_object('session_id',created.session_id,'course_id',p_course_id);
 end;
$$;
-- Revoke purchased access without deleting classes, progress, or responses.
create or replace function public.rizsim_runtime_close_revoked_purchase() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if new.revoked_at is not null or new.expires_at<=now() then
  update public.classroom_sessions set active=false,closed_at=coalesce(closed_at,now()) where purchased_course_license_id=new.id and active;
 end if;
 return new;
 end;
$$;
create trigger close_revoked_purchased_course after update of revoked_at,expires_at on public.rizsim_purchased_course_licenses for each row execute function public.rizsim_runtime_close_revoked_purchase();

-- Preserve the existing student interface: the same read RPCs enforce publication state.
create or replace function public.rizsim_can_view_course_material(p_material_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.rizsim_course_materials m where m.id=p_material_id and m.active and
 (public.rizsim_is_course_staff(m.course_id) or public.rizsim_runtime_purchase(m.course_id) is not null or public.rizsim_runtime_student_material(m.id)));
$$;
create or replace function public.get_rizsim_course_material_view_context(p_material_id uuid)
 returns table(material_id uuid,course_id uuid,course_title text,title text,material_type text,source_type text,external_url text,file_name text,mime_type text,file_size bigint)
 language sql stable security definer set search_path='' as $$
 select m.id,m.course_id,c.title,m.title,m.material_type,m.source_type,
 case when m.source_type='link' and m.external_url ~* '^https?://' then m.external_url else null end,m.file_name,m.mime_type,m.file_size
 from public.rizsim_course_materials m join public.rizsim_courses c on c.id=m.course_id
 where m.id=p_material_id and m.active and public.rizsim_can_view_course_material(m.id)
 union all
 select r.id,r.session_id,s.class_name,r.title,r.material_type,r.source_type,r.external_url,r.file_name,r.mime_type,r.file_size
 from public.rizsim_session_resources r join public.classroom_sessions s on s.id=r.session_id
 where r.id=p_material_id and public.rizsim_runtime_view_session_resource(r.id);
$$;
create or replace function public.get_my_rizsim_student_course_materials()
 returns table(material_id uuid,course_id uuid,course_title text,title text,description text,material_type text,source_type text,external_url text,file_name text,mime_type text,sort_order integer,created_at timestamptz)
 language sql stable security definer set search_path='' as $$
 select m.id,m.course_id,c.title,m.title,m.description,m.material_type,m.source_type,
 case when m.source_type='link' and m.external_url ~* '^https?://' then m.external_url else null end,m.file_name,m.mime_type,m.sort_order,m.created_at
 from public.rizsim_course_materials m join public.rizsim_courses c on c.id=m.course_id
 where m.active and public.rizsim_runtime_student_material(m.id)
 union all
 select r.id,r.session_id,s.class_name,r.title,r.description,r.material_type,r.source_type,r.external_url,r.file_name,r.mime_type,0,r.created_at
 from public.rizsim_session_resources r join public.classroom_sessions s on s.id=r.session_id
 where r.published_to_class and public.rizsim_runtime_student_session(r.session_id)
 order by 3,11,12;
$$;
-- Explicit function grants. Nothing new is callable anonymously or by PUBLIC.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and (p.proname like 'rizsim_runtime_%' or p.proname in ('get_my_rizsim_purchased_courses','get_rizsim_session_runtime_scope','get_rizsim_course_runtime','get_rizsim_session_resources','set_rizsim_resource_publication','create_rizsim_runtime_resource','create_rizsim_purchased_course_session')) loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated,service_role',f.signature);
 end loop;
end $$;
notify pgrst,'reload schema';
