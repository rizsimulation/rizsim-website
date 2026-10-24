
drop policy if exists rizsim_course_materials_authorized_read
on public.rizsim_course_materials;
create policy rizsim_course_materials_authorized_read
on public.rizsim_course_materials
for select to authenticated
using (public.rizsim_is_course_staff(course_id));

drop policy if exists rizsim_course_materials_storage_read
on storage.objects;
create policy rizsim_course_materials_storage_read
on storage.objects
for select to authenticated
using (
  bucket_id='course-materials'
  and public.rizsim_is_course_staff_path(split_part(name,'/',1))
);
