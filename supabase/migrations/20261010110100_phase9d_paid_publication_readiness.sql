-- Phase 9D: Fix publication readiness mismatch and enforce paid pricing at product layer.
-- Preserve the existing Phase9B security guards and all published catalogue records.
-- Existing RPC commercial and published-edit authorizations were separately hardened in production.

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

            when p.access_type='paid' and coalesce(p.price,0)<=0 then false

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
            when p.access_type='paid' and coalesce(p.price,0)<=0 then 'The Owner must set a positive base price before paid publication.'


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

CREATE OR REPLACE FUNCTION private.rizsim_guard_paid_publication_price() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $guard$ BEGIN IF NEW.status='published' AND NEW.access_type='paid' AND coalesce(NEW.price,0)<=0 THEN RAISE EXCEPTION 'Owner must set a positive price before paid publication' USING ERRCODE='23514'; END IF; RETURN NEW; END; $guard$;
DROP TRIGGER IF EXISTS rizsim_guard_paid_publication_price ON public.products;
CREATE TRIGGER rizsim_guard_paid_publication_price BEFORE INSERT OR UPDATE OF status,price,access_type ON public.products FOR EACH ROW EXECUTE FUNCTION private.rizsim_guard_paid_publication_price();
