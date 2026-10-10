-- Phase 9D final: canonical production RPC definitions after Owner-only commercial and published-product locking hardening.
-- These routines were already deployed and tested in production. Keep this idempotent for new environments.

CREATE OR REPLACE FUNCTION public.admin_attach_rizsim_product_file(p_product_id uuid, p_storage_path text, p_file_name text, p_mime_type text DEFAULT NULL::text, p_file_size bigint DEFAULT NULL::bigint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage', 'private', 'pg_temp'
AS $function$
DECLARE
 v_phase9d_locked public.products%ROWTYPE;

    v_asset_id uuid;

begin

    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;
SELECT p.* INTO v_phase9d_locked FROM public.products p WHERE p.id=p_product_id AND p.product_type IN ('ebook','digital_product') FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Product not found' USING ERRCODE='P0002'; END IF; IF v_phase9d_locked.status='published' THEN RAISE EXCEPTION 'Unpublish before editing' USING ERRCODE='23514'; END IF;


    if not exists (
        select 1
        from public.products
        where id = p_product_id
          and product_type in (
              'ebook',
              'digital_product'
          )
    ) then

        raise exception
            'Resource product not found.';

    end if;


    if p_storage_path is null
       or trim(p_storage_path) = '' then

        raise exception
            'Storage path is required.';

    end if;


    if p_storage_path not like
       p_product_id::text || '/%' then

        raise exception
            'Invalid RizSim resource storage path.';

    end if;


    if not exists (
        select 1
        from storage.objects o
        where o.bucket_id =
              'platform-content'

          and o.name =
              p_storage_path
    ) then

        raise exception
            'Uploaded file could not be verified.';

    end if;


    update public.rizsim_product_assets

    set
        active = false,
        replaced_at = now()

    where product_id =
          p_product_id

      and asset_type =
          'primary_file'

      and active =
          true;


    insert into public.rizsim_product_assets (

        product_id,

        asset_type,

        storage_bucket,
        storage_path,

        file_name,

        mime_type,
        file_size,

        active,

        created_by,

        created_at

    )
    values (

        p_product_id,

        'primary_file',

        'platform-content',
        p_storage_path,

        p_file_name,

        p_mime_type,
        p_file_size,

        true,

        auth.uid(),

        now()

    )
    returning id
    into v_asset_id;


    return v_asset_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_rizsim_resource(p_category_id uuid, p_product_type text, p_title text, p_slug text DEFAULT NULL::text, p_short_description text DEFAULT NULL::text, p_full_description text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_access_type text DEFAULT 'paid'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare

    v_id uuid;

    v_type text;
    v_title text;
    v_slug text;

    v_price numeric;
    v_access_type text;

begin

    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;
IF NOT private.is_rizsim_owner() AND (coalesce(p_price,0)<>0 OR lower(trim(coalesce(p_access_type,'paid')))<>'paid') THEN RAISE EXCEPTION 'Only RizSim Owner controls commercial terms' USING ERRCODE='42501'; END IF;


    v_type :=
        lower(
            trim(
                coalesce(
                    p_product_type,
                    ''
                )
            )
        );


    if v_type not in (
        'ebook',
        'digital_product'
    ) then

        raise exception
            'Resource type must be ebook or digital_product.';

    end if;


    if p_category_id is null then

        raise exception
            'Select a category.';

    end if;


    if not exists (
        select 1
        from public.categories
        where id = p_category_id
    ) then

        raise exception
            'Selected category does not exist.';

    end if;


    v_title :=
        trim(
            coalesce(
                p_title,
                ''
            )
        );


    if v_title = '' then

        raise exception
            'Title is required.';

    end if;


    v_slug :=
        lower(
            trim(
                coalesce(
                    nullif(
                        trim(p_slug),
                        ''
                    ),
                    v_title
                )
            )
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '[^a-z0-9]+',
            '-',
            'g'
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '(^-+|-+$)',
            '',
            'g'
        );


    if v_slug = '' then

        raise exception
            'A valid slug could not be created.';

    end if;


    if exists (
        select 1
        from public.products
        where lower(slug) =
              lower(v_slug)
    ) then

        raise exception
            'A product already uses this slug.';

    end if;


    v_access_type :=
        lower(
            trim(
                coalesce(
                    p_access_type,
                    'paid'
                )
            )
        );


    if v_access_type not in (
        'paid',
        'free',
        'restricted'
    ) then

        raise exception
            'Invalid access type.';

    end if;


    v_price :=
        coalesce(
            p_price,
            0
        );


    if v_price < 0 then

        raise exception
            'Price cannot be negative.';

    end if;


    if v_access_type = 'free' then
        v_price := 0;
    end if;


    insert into public.products (

        category_id,

        product_type,

        title,
        slug,

        short_description,
        full_description,

        price,
        currency,

        access_type,

        status,

        created_by,

        created_at,
        updated_at

    )
    values (

        p_category_id,

        v_type,

        v_title,
        v_slug,

        nullif(
            trim(
                coalesce(
                    p_short_description,
                    ''
                )
            ),
            ''
        ),

        nullif(
            trim(
                coalesce(
                    p_full_description,
                    ''
                )
            ),
            ''
        ),

        v_price,
        'PKR',

        v_access_type,

        'draft',

        auth.uid(),

        now(),
        now()

    )
    returning id
    into v_id;


    return v_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_rizsim_simulation(p_category_id uuid, p_title text, p_slug text DEFAULT NULL::text, p_short_description text DEFAULT NULL::text, p_full_description text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_currency text DEFAULT 'PKR'::text, p_access_type text DEFAULT 'paid'::text, p_launch_path text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare

    v_id uuid;

    v_title text;
    v_slug text;

    v_short_description text;
    v_full_description text;

    v_price numeric;
    v_currency text;
    v_access_type text;

    v_launch_path text;

begin


    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;
IF NOT private.is_rizsim_owner() AND (coalesce(p_price,0)<>0 OR lower(trim(coalesce(p_access_type,'paid')))<>'paid' OR upper(trim(coalesce(nullif(p_currency,''),'PKR')))<>'PKR') THEN RAISE EXCEPTION 'Only RizSim Owner controls commercial terms' USING ERRCODE='42501'; END IF;


    -- CATEGORY

    if p_category_id is null then

        raise exception
            'Select a category.';

    end if;


    if not exists (

        select 1

        from public.categories c

        where c.id = p_category_id

    ) then

        raise exception
            'Selected category does not exist.';

    end if;


    -- TITLE

    v_title :=
        trim(
            coalesce(
                p_title,
                ''
            )
        );


    if v_title = '' then

        raise exception
            'Simulation title is required.';

    end if;


    if length(v_title) > 200 then

        raise exception
            'Simulation title must be 200 characters or fewer.';

    end if;


    -- SLUG

    v_slug :=
        lower(
            trim(
                coalesce(
                    nullif(
                        trim(p_slug),
                        ''
                    ),
                    v_title
                )
            )
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '[^a-z0-9]+',
            '-',
            'g'
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '(^-+|-+$)',
            '',
            'g'
        );


    if v_slug = '' then

        raise exception
            'A valid simulation slug could not be created.';

    end if;


    if exists (

        select 1

        from public.products p

        where lower(p.slug) =
              lower(v_slug)

    ) then

        raise exception
            'A product already uses this slug.';

    end if;


    -- DESCRIPTIONS

    v_short_description :=
        nullif(
            trim(
                coalesce(
                    p_short_description,
                    ''
                )
            ),
            ''
        );


    v_full_description :=
        nullif(
            trim(
                coalesce(
                    p_full_description,
                    ''
                )
            ),
            ''
        );


    -- PRICE

    v_price :=
        coalesce(
            p_price,
            0
        );


    if v_price < 0 then

        raise exception
            'Price cannot be negative.';

    end if;


    -- ACCESS TYPE

    v_access_type :=
        lower(
            trim(
                coalesce(
                    p_access_type,
                    'paid'
                )
            )
        );


    if v_access_type not in (
        'paid',
        'free',
        'restricted'
    ) then

        raise exception
            'Invalid access type.';

    end if;


    if v_access_type = 'free' then

        v_price := 0;

    end if;


    -- CURRENCY

    v_currency :=
        upper(
            trim(
                coalesce(
                    nullif(
                        p_currency,
                        ''
                    ),
                    'PKR'
                )
            )
        );


    -- LAUNCH PATH

    v_launch_path :=
        nullif(
            trim(
                coalesce(
                    p_launch_path,
                    ''
                )
            ),
            ''
        );


    if v_launch_path is not null then

        if left(v_launch_path, 1) <> '/' then

            raise exception
                'Launch path must begin with /.';

        end if;


        if position(
            '://'
            in v_launch_path
        ) > 0 then

            raise exception
                'Launch path must be a RizSim internal path, not an external URL.';

        end if;


        if position(
            '..'
            in v_launch_path
        ) > 0 then

            raise exception
                'Launch path cannot contain ..';

        end if;

    end if;


    -- CREATE

    insert into public.products (

        category_id,

        product_type,

        title,
        slug,

        short_description,
        full_description,

        price,
        currency,
        access_type,

        status,

        launch_path,

        created_by,

        created_at,
        updated_at

    )

    values (

        p_category_id,

        'simulation',

        v_title,
        v_slug,

        v_short_description,
        v_full_description,

        v_price,
        v_currency,
        v_access_type,

        'draft',

        v_launch_path,

        auth.uid(),

        now(),
        now()

    )

    returning id
    into v_id;


    return v_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_rizsim_product_publication(p_product_id uuid, p_publish boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$

declare

    v_product_type text;

    v_category_id uuid;
    v_category_active boolean;

    v_status text;

    v_launch_path text;

    v_storage_path text;
    v_mime_type text;

    v_new_status text;

begin


    /* ========================================================
       AUTHORIZATION
       ======================================================== */

    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;


    /* ========================================================
       REQUIRED INPUTS
       ======================================================== */

    if p_product_id is null then

        raise exception
            'Product ID is required.';

    end if;


    if p_publish is null then

        raise exception
            'Publish instruction is required.'
            using errcode = '22004';

    end if;


    /* ========================================================
       LOCK PRODUCT
       ======================================================== */

    select

        p.product_type,

        p.category_id,

        p.status,

        p.launch_path

    into

        v_product_type,

        v_category_id,

        v_status,

        v_launch_path

    from public.products p

    where p.id =
          p_product_id

    for update;


    if not found then

        raise exception
            'RizSim product not found.';

    end if;


    if v_product_type not in (
        'simulation',
        'ebook',
        'digital_product'
    ) then

        raise exception
            'This product type cannot be published through RizSim Publishing.';

    end if;



    /* ========================================================
       PUBLISH
       ======================================================== */

    IF p_publish IS TRUE AND EXISTS(SELECT 1 FROM public.products WHERE id=p_product_id AND access_type='paid' AND price<=0) THEN RAISE EXCEPTION 'Owner must set a positive price for paid publication' USING ERRCODE='23514'; END IF; IF p_publish IS TRUE AND v_product_type='simulation' AND (v_launch_path IS NULL OR v_launch_path !~ '^/([A-Za-z0-9][A-Za-z0-9_.-]*/)*[A-Za-z0-9][A-Za-z0-9_.-]*[.]html?$' OR position('..' in v_launch_path)>0) THEN RAISE EXCEPTION 'Invalid internal HTML runner' USING ERRCODE='23514'; END IF;
if p_publish = true then


        if v_status = 'archived' then

            raise exception
                'Archived products cannot be published.';

        end if;


        if v_category_id is null then

            raise exception
                'Select a category before publishing.';

        end if;


        select
            c.active

        into
            v_category_active

        from public.categories c

        where c.id =
              v_category_id;


        if not found then

            raise exception
                'The selected category no longer exists.';

        end if;


        if coalesce(
            v_category_active,
            false
        ) <> true then

            raise exception
                'Activate the category before publishing.';

        end if;



        /* ----------------------------------------------------
           SIMULATION READINESS
           ---------------------------------------------------- */

        if v_product_type =
           'simulation' then


            if nullif(
                trim(
                    coalesce(
                        v_launch_path,
                        ''
                    )
                ),
                ''
            ) is null then

                raise exception
                    'Connect a RizSim runner before publishing.';

            end if;


        end if;



        /* ----------------------------------------------------
           RESOURCE READINESS
           ---------------------------------------------------- */

        if v_product_type in (
            'ebook',
            'digital_product'
        ) then


            select

                asset.storage_path,
                asset.mime_type

            into

                v_storage_path,
                v_mime_type

            from public.rizsim_product_assets asset

            where asset.product_id =
                  p_product_id

              and asset.asset_type =
                  'primary_file'

              and asset.active =
                  true

            order by asset.created_at desc

            limit 1;


            if not found
               or v_storage_path is null then

                raise exception
                    'Attach a primary resource file before publishing.';

            end if;


            if lower(
                coalesce(
                    v_mime_type,
                    ''
                )
            )
            not in (
                'application/pdf',
                'image/png',
                'image/jpeg'
            ) then

                raise exception
                    'This file format is not yet compatible with the Protected RizSim Viewer. Convert it before publishing.';

            end if;


        end if;


        v_new_status :=
            'published';



    /* ========================================================
       UNPUBLISH
       ======================================================== */

    else


        if v_status =
           'archived' then

            raise exception
                'Archived products cannot be changed through Publish / Unpublish.';

        end if;


        v_new_status :=
            'draft';


    end if;



    /* ========================================================
       NO-OP
       ======================================================== */

    if v_status =
       v_new_status then

        return v_new_status;

    end if;



    /* ========================================================
       UPDATE PRODUCT
       ======================================================== */

    update public.products

    set

        status =
            v_new_status,

        updated_at =
            now()

    where id =
          p_product_id;



    /* ========================================================
       RECORD PUBLICATION HISTORY
       ======================================================== */

    insert into public.rizsim_publication_events (

        product_id,

        action,

        from_status,

        to_status,

        actor_user_id,

        created_at

    )

    values (

        p_product_id,

        case

            when p_publish = true
                then 'publish'

            else
                'unpublish'

        end,

        v_status,

        v_new_status,

        auth.uid(),

        now()

    );


    return v_new_status;


end;

$function$;

CREATE OR REPLACE FUNCTION public.admin_update_rizsim_resource(p_product_id uuid, p_category_id uuid, p_product_type text, p_title text, p_slug text, p_short_description text, p_full_description text, p_price numeric, p_access_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
 v_phase9d_locked public.products%ROWTYPE;

    v_type text;
    v_title text;
    v_slug text;

    v_price numeric;
    v_access_type text;

begin

    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;
SELECT p.* INTO v_phase9d_locked FROM public.products p WHERE p.id=p_product_id AND p.product_type IN ('ebook','digital_product') FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Product not found' USING ERRCODE='P0002'; END IF; IF v_phase9d_locked.status='published' THEN RAISE EXCEPTION 'Unpublish before editing' USING ERRCODE='23514'; END IF; IF NOT private.is_rizsim_owner() AND (v_phase9d_locked.price IS DISTINCT FROM coalesce(p_price,0) OR v_phase9d_locked.access_type IS DISTINCT FROM lower(trim(coalesce(p_access_type,'paid'))) ) THEN RAISE EXCEPTION 'Owner-only commercial terms' USING ERRCODE='42501'; END IF;


    if not exists (
        select 1
        from public.products
        where id = p_product_id
          and product_type in (
              'ebook',
              'digital_product'
          )
    ) then

        raise exception
            'Resource not found.';

    end if;


    if not exists (
        select 1
        from public.categories
        where id = p_category_id
    ) then

        raise exception
            'Selected category does not exist.';

    end if;


    v_type :=
        lower(
            trim(
                coalesce(
                    p_product_type,
                    ''
                )
            )
        );


    if v_type not in (
        'ebook',
        'digital_product'
    ) then

        raise exception
            'Invalid resource type.';

    end if;


    v_title :=
        trim(
            coalesce(
                p_title,
                ''
            )
        );


    if v_title = '' then

        raise exception
            'Title is required.';

    end if;


    v_slug :=
        lower(
            trim(
                coalesce(
                    nullif(
                        trim(p_slug),
                        ''
                    ),
                    v_title
                )
            )
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '[^a-z0-9]+',
            '-',
            'g'
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '(^-+|-+$)',
            '',
            'g'
        );


    if exists (
        select 1
        from public.products
        where lower(slug) =
              lower(v_slug)

          and id <> p_product_id
    ) then

        raise exception
            'Another product already uses this slug.';

    end if;


    v_access_type :=
        lower(
            trim(
                coalesce(
                    p_access_type,
                    'paid'
                )
            )
        );


    if v_access_type not in (
        'paid',
        'free',
        'restricted'
    ) then

        raise exception
            'Invalid access type.';

    end if;


    v_price :=
        coalesce(
            p_price,
            0
        );


    if v_price < 0 then

        raise exception
            'Price cannot be negative.';

    end if;


    if v_access_type = 'free' then
        v_price := 0;
    end if;


    update public.products

    set

        category_id =
            p_category_id,

        product_type =
            v_type,

        title =
            v_title,

        slug =
            v_slug,

        short_description =
            nullif(
                trim(
                    coalesce(
                        p_short_description,
                        ''
                    )
                ),
                ''
            ),

        full_description =
            nullif(
                trim(
                    coalesce(
                        p_full_description,
                        ''
                    )
                ),
                ''
            ),

        price =
            v_price,

        access_type =
            v_access_type,

        updated_at =
            now()

    where id =
          p_product_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_rizsim_simulation(p_product_id uuid, p_category_id uuid, p_title text, p_slug text, p_short_description text, p_full_description text, p_price numeric, p_currency text, p_access_type text, p_launch_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
 v_phase9d_locked public.products%ROWTYPE;

    v_title text;
    v_slug text;

    v_short_description text;
    v_full_description text;

    v_price numeric;
    v_currency text;
    v_access_type text;

    v_launch_path text;

begin


    if not private.is_rizsim_admin_or_owner() then

        raise exception
            'Admin or Owner access required.'
            using errcode = '42501';

    end if;
SELECT p.* INTO v_phase9d_locked FROM public.products p WHERE p.id=p_product_id AND p.product_type ='simulation' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Product not found' USING ERRCODE='P0002'; END IF; IF v_phase9d_locked.status='published' THEN RAISE EXCEPTION 'Unpublish before editing' USING ERRCODE='23514'; END IF; IF NOT private.is_rizsim_owner() AND (v_phase9d_locked.price IS DISTINCT FROM coalesce(p_price,0) OR v_phase9d_locked.access_type IS DISTINCT FROM lower(trim(coalesce(p_access_type,'paid'))) OR v_phase9d_locked.currency IS DISTINCT FROM upper(trim(coalesce(nullif(p_currency,''),'PKR')))) THEN RAISE EXCEPTION 'Owner-only commercial terms' USING ERRCODE='42501'; END IF;


    if p_product_id is null then

        raise exception
            'Simulation ID is required.';

    end if;


    if not exists (

        select 1

        from public.products p

        where p.id = p_product_id
          and p.product_type = 'simulation'

    ) then

        raise exception
            'Simulation not found.';

    end if;


    if p_category_id is null then

        raise exception
            'Select a category.';

    end if;


    if not exists (

        select 1

        from public.categories c

        where c.id = p_category_id

    ) then

        raise exception
            'Selected category does not exist.';

    end if;


    -- TITLE

    v_title :=
        trim(
            coalesce(
                p_title,
                ''
            )
        );


    if v_title = '' then

        raise exception
            'Simulation title is required.';

    end if;


    if length(v_title) > 200 then

        raise exception
            'Simulation title must be 200 characters or fewer.';

    end if;


    -- SLUG

    v_slug :=
        lower(
            trim(
                coalesce(
                    nullif(
                        trim(p_slug),
                        ''
                    ),
                    v_title
                )
            )
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '[^a-z0-9]+',
            '-',
            'g'
        );


    v_slug :=
        regexp_replace(
            v_slug,
            '(^-+|-+$)',
            '',
            'g'
        );


    if exists (

        select 1

        from public.products p

        where lower(p.slug) =
              lower(v_slug)

          and p.id <>
              p_product_id

    ) then

        raise exception
            'Another product already uses this slug.';

    end if;


    -- DESCRIPTIONS

    v_short_description :=
        nullif(
            trim(
                coalesce(
                    p_short_description,
                    ''
                )
            ),
            ''
        );


    v_full_description :=
        nullif(
            trim(
                coalesce(
                    p_full_description,
                    ''
                )
            ),
            ''
        );


    -- PRICE

    v_price :=
        coalesce(
            p_price,
            0
        );


    if v_price < 0 then

        raise exception
            'Price cannot be negative.';

    end if;


    -- ACCESS TYPE

    v_access_type :=
        lower(
            trim(
                coalesce(
                    p_access_type,
                    'paid'
                )
            )
        );


    if v_access_type not in (
        'paid',
        'free',
        'restricted'
    ) then

        raise exception
            'Invalid access type.';

    end if;


    if v_access_type = 'free' then

        v_price := 0;

    end if;


    -- CURRENCY

    v_currency :=
        upper(
            trim(
                coalesce(
                    nullif(
                        p_currency,
                        ''
                    ),
                    'PKR'
                )
            )
        );


    -- LAUNCH PATH

    v_launch_path :=
        nullif(
            trim(
                coalesce(
                    p_launch_path,
                    ''
                )
            ),
            ''
        );


    if v_launch_path is not null then

        if left(v_launch_path, 1) <> '/' then

            raise exception
                'Launch path must begin with /.';

        end if;


        if position(
            '://'
            in v_launch_path
        ) > 0 then

            raise exception
                'Launch path must be a RizSim internal path, not an external URL.';

        end if;


        if position(
            '..'
            in v_launch_path
        ) > 0 then

            raise exception
                'Launch path cannot contain ..';

        end if;

    end if;


    update public.products

    set

        category_id =
            p_category_id,

        title =
            v_title,

        slug =
            v_slug,

        short_description =
            v_short_description,

        full_description =
            v_full_description,

        price =
            v_price,

        currency =
            v_currency,

        access_type =
            v_access_type,

        launch_path =
            v_launch_path,

        updated_at =
            now()

    where id =
          p_product_id;

end;
$function$;
