-- Phase 9B: Admin content boundary and publishing safety.
-- Existing products, assets, classes, institutions, and licences are not rewritten.
-- Admin may author draft content, but only Owner may change commercial fields.
-- Published content must first be explicitly unpublished before revision.
create or replace function private.rizsim_is_safe_runner_path(p_path text)
returns boolean language sql immutable set search_path = ''
as $safe$
  select p_path is not null
     and char_length(p_path) between 6 and 240
     and p_path ~ '^/([A-Za-z0-9][A-Za-z0-9_.-]*/)*[A-Za-z0-9][A-Za-z0-9_.-]*[.]html?$'
     and position('..' in p_path) = 0;
$safe$;

create or replace function private.rizsim_guard_product_mutation()
returns trigger language plpgsql security definer set search_path = ''
as $guard$
declare
  v_role text;
  v_becoming_published boolean := false;
  v_runner_changed boolean := true;
begin
  select m.role into v_role
  from public.access_out_members m
  where m.user_id = auth.uid() and m.active = true
  limit 1;

  if TG_OP = 'INSERT' then
    if v_role = 'admin'
       and (new.price is distinct from 0::numeric
         or new.access_type is distinct from 'paid'
         or new.currency is distinct from 'PKR') then
      raise exception 'Product pricing and access settings are Owner-controlled. Admins create paid draft records at base price 0.'
        using errcode='42501';
    end if;
    v_becoming_published := new.status = 'published';
  else
    -- A publication can change status/updated_at only; content edits require a separate Unpublish.
    if old.status = 'published'
       and row(new.category_id,new.product_type,new.title,new.slug,new.short_description,
               new.full_description,new.price,new.currency,new.access_type,new.launch_path)
           is distinct from
           row(old.category_id,old.product_type,old.title,old.slug,old.short_description,
               old.full_description,old.price,old.currency,old.access_type,old.launch_path) then
      raise exception 'Unpublish this product before changing its content, pricing, access or runner.'
        using errcode='23514';
    end if;

    if v_role = 'admin'
       and (new.price is distinct from old.price
         or new.access_type is distinct from old.access_type
         or new.currency is distinct from old.currency) then
      raise exception 'Only the Owner may change product pricing or access settings.'
        using errcode='42501';
    end if;

    v_becoming_published := new.status = 'published'
                             and old.status is distinct from new.status;
    v_runner_changed := old.launch_path is distinct from new.launch_path;
  end if;

  if new.product_type='simulation'
     and new.launch_path is not null
     and v_runner_changed
     and not private.rizsim_is_safe_runner_path(new.launch_path) then
    raise exception 'Runner path must be an internal RizSim .html file path without query strings, traversal or external URLs.'
      using errcode='23514';
  end if;

  if v_becoming_published then
    if new.category_id is null or not exists(
       select 1 from public.categories c where c.id=new.category_id and c.active=true
    ) then
      raise exception 'Activate the selected category before publishing.'
        using errcode='23514';
    end if;

    if new.product_type='simulation'
       and not coalesce(private.rizsim_is_safe_runner_path(new.launch_path),false) then
      raise exception 'Connect a safe internal RizSim .html runner before publishing.'
        using errcode='23514';
    end if;

    if new.product_type in ('ebook','digital_product') and not exists(
       select 1 from public.rizsim_product_assets a
       join storage.objects obj on obj.bucket_id='platform-content'
                               and obj.name=a.storage_path
       where a.product_id=new.id and a.active=true
         and a.asset_type='primary_file'
         and lower(coalesce(a.mime_type,'')) in
             ('application/pdf','image/png','image/jpeg')
         and lower(coalesce(obj.metadata->>'mimetype','')) =
             lower(coalesce(a.mime_type,''))
    ) then
      raise exception 'A verifiable PDF, PNG or JPEG primary file is required to publish this resource.'
        using errcode='23514';
    end if;
  end if;

  return new;
end;
$guard$;

drop trigger if exists rizsim_guard_product_mutation on public.products;
create trigger rizsim_guard_product_mutation
before insert or update on public.products
for each row execute function private.rizsim_guard_product_mutation();

create or replace function private.rizsim_guard_category_deactivation()
returns trigger language plpgsql security definer set search_path = ''
as $guard$
begin
  if old.active=true and new.active=false and exists(
    select 1 from public.products p where p.category_id=old.id and p.status='published'
  ) then
    raise exception 'Unpublish products in this category before deactivating it.'
      using errcode='23514';
  end if;
  return new;
end;
$guard$;

drop trigger if exists rizsim_guard_category_deactivation on public.categories;
create trigger rizsim_guard_category_deactivation
before update of active on public.categories
for each row execute function private.rizsim_guard_category_deactivation();

create or replace function private.rizsim_guard_published_asset()
returns trigger language plpgsql security definer set search_path = ''
as $guard$
declare
  v_locked boolean;
begin
  if TG_OP = 'INSERT' then
    v_locked := new.active and exists(
      select 1 from public.products p where p.id=new.product_id and p.status='published'
    );
  elsif TG_OP = 'UPDATE' then
    v_locked := (old.active or new.active) and exists(
      select 1 from public.products p
      where p.id in (old.product_id,new.product_id) and p.status='published'
    );
  else
    v_locked := old.active and exists(
      select 1 from public.products p where p.id=old.product_id and p.status='published'
    );
  end if;
  if v_locked then
    raise exception 'Unpublish the resource before replacing, modifying or removing its primary file.'
      using errcode='23514';
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$guard$;

drop trigger if exists rizsim_guard_published_asset on public.rizsim_product_assets;
create trigger rizsim_guard_published_asset
before insert or update or delete on public.rizsim_product_assets
for each row execute function private.rizsim_guard_published_asset();

-- Protect the backing object as well as the database asset record.
create or replace function public.rizsim_can_mutate_platform_object(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $access$
  select public.can_manage_rizsim_content()
     and not exists(
       select 1 from public.rizsim_product_assets a
       join public.products p on p.id=a.product_id
       where a.storage_bucket='platform-content'
         and a.storage_path=p_path and a.active=true
         and p.status='published'
     );
$access$;

alter policy "RizSim content managers can remove platform content"
 on storage.objects
 using (bucket_id='platform-content' and public.rizsim_can_mutate_platform_object(name));

alter policy "RizSim content managers can update platform content"
 on storage.objects
 using (bucket_id='platform-content' and public.rizsim_can_mutate_platform_object(name))
 with check (bucket_id='platform-content' and public.rizsim_can_mutate_platform_object(name));

-- Only authenticated users can call path-mutation predicate through policies.
revoke all on function public.rizsim_can_mutate_platform_object(text) from public, anon;
grant execute on function public.rizsim_can_mutate_platform_object(text) to authenticated, service_role;

-- The publication queue must agree with the server's actual file/path readiness checks.

CREATE OR REPLACE FUNCTION public.admin_get_rizsim_publication_queue()
 RETURNS TABLE(id uuid, title text, slug text, product_type text, category_id uuid, category_name text, category_active boolean, status text, access_type text, price numeric, launch_path text, file_name text, mime_type text, ready boolean, readiness_message text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin


    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;


    return query

    select

        p.id,

        p.title,
        p.slug,

        p.product_type,

        p.category_id,
        c.name,
        c.active,

        p.status,

        p.access_type,
        p.price,

        p.launch_path,

        a.file_name,
        a.mime_type,


        case

            when p.status = 'archived'
                then false

            when p.category_id is null
                then false

            when c.id is null
                then false

            when coalesce(c.active, false) = false
                then false

            when
                p.product_type = 'simulation'
                and
                nullif(
                    trim(
                        coalesce(
                            p.launch_path,
                            ''
                        )
                    ),
                    ''
                ) is null
                then false

            when p.product_type = 'simulation'
                 and not private.rizsim_is_safe_runner_path(p.launch_path)
                then false

            when
                p.product_type in (
                    'ebook',
                    'digital_product'
                )
                and
                a.storage_path is null
                then false

            when p.product_type in ('ebook','digital_product')
                 and not exists (
                    select 1 from storage.objects obj
                    where obj.bucket_id = 'platform-content'
                      and obj.name = a.storage_path
                      and lower(coalesce(obj.metadata->>'mimetype','')) = lower(coalesce(a.mime_type,''))
                 )
                then false

            when
                p.product_type in (
                    'ebook',
                    'digital_product'
                )
                and
                lower(
                    coalesce(
                        a.mime_type,
                        ''
                    )
                )
                not in (
                    'application/pdf',
                    'image/png',
                    'image/jpeg'
                )
                then false

            else true

        end
        as ready,


        case

            when p.status = 'archived'
                then
                    'Archived products cannot be published.'

            when p.category_id is null
                then
                    'Select a category before publishing.'

            when c.id is null
                then
                    'The selected category no longer exists.'

            when coalesce(c.active, false) = false
                then
                    'Activate the category before publishing.'

            when
                p.product_type = 'simulation'
                and
                nullif(
                    trim(
                        coalesce(
                            p.launch_path,
                            ''
                        )
                    ),
                    ''
                ) is null
                then
                    'Connect a RizSim runner before publishing.'

            when p.product_type = 'simulation'
                 and not private.rizsim_is_safe_runner_path(p.launch_path)
                then
                    'Use a safe RizSim .html runner path on this website.'

            when
                p.product_type in (
                    'ebook',
                    'digital_product'
                )
                and
                a.storage_path is null
                then
                    'Attach a primary resource file before publishing.'

            when p.product_type in ('ebook','digital_product')
                 and not exists (
                    select 1 from storage.objects obj
                    where obj.bucket_id='platform-content'
                      and obj.name=a.storage_path
                      and lower(coalesce(obj.metadata->>'mimetype','')) = lower(coalesce(a.mime_type,''))
                 )
                then
                    'The protected resource file is missing or does not match its metadata.'

            when
                p.product_type in (
                    'ebook',
                    'digital_product'
                )
                and
                lower(
                    coalesce(
                        a.mime_type,
                        ''
                    )
                )
                not in (
                    'application/pdf',
                    'image/png',
                    'image/jpeg'
                )
                then
                    'Convert this resource to a Protected Viewer compatible format before publishing.'

            else
                'Ready to publish.'

        end
        as readiness_message,


        p.updated_at


    from public.products p


    left join public.categories c
        on c.id = p.category_id


    left join lateral (

        select

            asset.storage_path,
            asset.file_name,
            asset.mime_type

        from public.rizsim_product_assets asset

        where asset.product_id = p.id

          and asset.asset_type =
              'primary_file'

          and asset.active =
              true

        order by asset.created_at desc

        limit 1

    ) a
    on true


    where p.product_type in (
        'simulation',
        'ebook',
        'digital_product'
    )


    order by

        case

            when p.status = 'draft'
                then 1

            when p.status = 'published'
                then 2

            else 3

        end,

        p.updated_at desc;


end;
$function$;
