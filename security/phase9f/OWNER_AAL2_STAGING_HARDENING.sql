-- RizSim Phase 9F (2026-10-11) -- STAGING ONLY; DO NOT DEPLOY OR MERGE.
-- No production change; preserves user records, existing role grants, existing RLS policies and UI.
-- This is a review-only candidate, not a released migration.
-- Missing/unverified JWT 'aal' denies Owner privileges; Admin/Publisher paths retain current behavior.
BEGIN;
DO $preflight$
BEGIN
 IF to_regprocedure('private.is_rizsim_owner()') IS NULL
 OR to_regprocedure('public.is_rizsim_owner()') IS NULL
 OR to_regprocedure('private.is_rizsim_admin_or_owner()') IS NULL
 OR to_regprocedure('private.is_rizsim_content_editor()') IS NULL
 OR to_regprocedure('public.can_manage_rizsim_content()') IS NULL
 OR to_regprocedure('public.get_my_classroom_session_students(uuid)') IS NULL
 OR to_regprocedure('public.get_rizsim_resource_view_context(uuid)') IS NULL
 THEN RAISE EXCEPTION 'Phase 9F preflight: expected existing function missing.';
 END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION private.is_rizsim_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $phase9f$
 SELECT auth.uid() IS NOT NULL
    AND (auth.jwt() ->> 'aal') = 'aal2'
    AND EXISTS (SELECT 1 FROM public.access_out_members m
                WHERE m.user_id = auth.uid() AND m.active = true AND m.role = 'owner');
$phase9f$;

CREATE OR REPLACE FUNCTION public.is_rizsim_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $phase9f$
 SELECT private.is_rizsim_owner();
$phase9f$;

CREATE OR REPLACE FUNCTION private.is_rizsim_admin_or_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $phase9f$
 SELECT EXISTS (SELECT 1 FROM public.access_out_members m
   WHERE m.user_id = auth.uid() AND m.active = true
     AND (m.role = 'admin' OR (m.role = 'owner' AND private.is_rizsim_owner())));
$phase9f$;

CREATE OR REPLACE FUNCTION private.is_rizsim_content_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $phase9f$
 SELECT EXISTS (SELECT 1 FROM public.access_out_members m
   WHERE m.user_id = auth.uid() AND m.active = true
     AND (m.role = 'publisher' OR (m.role = 'owner' AND private.is_rizsim_owner())));
$phase9f$;

CREATE OR REPLACE FUNCTION public.can_manage_rizsim_content()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $phase9f$
 SELECT EXISTS (SELECT 1 FROM public.access_out_members m
   WHERE m.user_id = auth.uid() AND m.active = true
     AND (m.role = 'admin' OR (m.role = 'owner' AND private.is_rizsim_owner())));
$phase9f$;

-- Prevent authenticated AAL1 Owner using direct RPC roster bypass:
CREATE OR REPLACE FUNCTION public.get_my_classroom_session_students(p_session_id uuid)
 RETURNS TABLE(session_id uuid, attempt_id uuid, student_user_id uuid, student_name text, student_email text, avatar_url text, classroom_access_type text, joined_at timestamp with time zone, progress_percent numeric, attempt_status text, last_activity_at timestamp with time zone, submitted_at timestamp with time zone, response_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

declare

    v_user_id uuid;

    v_role text;

    v_allowed boolean := false;

begin


    -- ========================================================
    -- 1. AUTHENTICATION
    -- ========================================================

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentication required.';

    end if;



    -- ========================================================
    -- 2. ACTIVE RIZSIM ROLE
    -- ========================================================

    select
        a.role

    into
        v_role

    from public.access_out_members a

    where
        a.user_id =
            v_user_id

        and a.active =
            true

    limit 1;



    if v_role is null then

        raise exception
            'Active RizSim Faculty access is required.';

    end if;



    -- ========================================================
    -- 3. VERIFY SESSION SCOPE
    -- ========================================================

    select
        exists (

            select 1

            from public.classroom_sessions cs

            where
                cs.id =
                    p_session_id

                and
                (

                    -- ----------------------------------------
                    -- OWNER
                    -- ----------------------------------------

                    v_role = 'owner' AND private.is_rizsim_owner()


                    or


                    -- ----------------------------------------
                    -- FACULTY / COURSE LEAD
                    --
                    -- May inspect sessions they created.
                    -- ----------------------------------------

                    (

                        v_role in (
                            'faculty',
                            'course_lead'
                        )

                        and

                        cs.created_by =
                            v_user_id

                    )


                    or


                    -- ----------------------------------------
                    -- INSTITUTION
                    --
                    -- Institution admin may inspect sessions
                    -- belonging to the institution.
                    -- ----------------------------------------

                    (

                        v_role =
                            'institution'

                        and

                        cs.institution_id
                            is not null

                        and

                        exists (

                            select 1

                            from public.institution_members im

                            where
                                im.institution_id =
                                    cs.institution_id

                                and im.user_id =
                                    v_user_id

                                and im.member_type =
                                    'institution_admin'

                                and im.active =
                                    true

                        )

                    )

                )

        )

    into
        v_allowed;



    if
        coalesce(
            v_allowed,
            false
        ) <> true

    then

        raise exception
            'You are not authorized to view this classroom session.';

    end if;



    -- ========================================================
    -- 4. RETURN STUDENT ROSTER
    --
    -- simulation_attempts is the enrollment source.
    -- One Student + one Classroom Session = one attempt.
    -- ========================================================

    return query

    select

        cs.id
            as session_id,

        sa.id
            as attempt_id,

        sa.user_id
            as student_user_id,

        coalesce(

            nullif(
                p.display_name,
                ''
            ),

            nullif(
                p.email,
                ''
            ),

            'RizSim Student'

        )::text
            as student_name,

        p.email::text
            as student_email,

        p.avatar_url::text
            as avatar_url,

        sa.classroom_access_type::text
            as classroom_access_type,

        sa.joined_at,

        sa.progress_percent,

        sa.status::text
            as attempt_status,

        sa.last_activity_at,

        sa.submitted_at,

        (
            select
                count(*)

            from public.simulation_responses sr

            where
                sr.attempt_id =
                    sa.id

        )::bigint
            as response_count


    from public.classroom_sessions cs


    join public.simulation_attempts sa
      on sa.classroom_session_id =
         cs.id


    left join public.profiles p
      on p.id =
         sa.user_id


    where
        cs.id =
            p_session_id


    order by

        case
            when sa.status = 'in_progress'
            then 0
            else 1
        end,

        sa.joined_at asc,

        sa.started_at asc;


end;

$function$;

-- Prevent authenticated AAL1 Owner accessing protected draft-view metadata:
CREATE OR REPLACE FUNCTION public.get_rizsim_resource_view_context(p_product_id uuid)
 RETURNS TABLE(product_id uuid, title text, product_type text, status text, access_type text, file_name text, mime_type text, file_size bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare

    v_admin_or_owner boolean := false;
    v_allowed boolean := false;

begin


    /* --------------------------------------------------------
       AUTHENTICATION
       -------------------------------------------------------- */

    if auth.uid() is null then

        raise exception
            'Authentication required.'
            using errcode = '42501';

    end if;


    /* --------------------------------------------------------
       ACTIVE RIZSIM PROFILE REQUIRED
       -------------------------------------------------------- */

    if not exists (

        select 1

        from public.profiles profile

        where profile.id = auth.uid()

          and profile.account_status = 'active'

    ) then

        raise exception
            'Active RizSim account required.'
            using errcode = '42501';

    end if;


    /* --------------------------------------------------------
       ADMIN / OWNER DRAFT PREVIEW
       -------------------------------------------------------- */

    select exists (

        select 1

        from public.access_out_members member

        where member.user_id = auth.uid()

          and member.active = true

          and ( member.role = 'admin' OR (member.role = 'owner' AND private.is_rizsim_owner()) )

    )
    into v_admin_or_owner;


    /* --------------------------------------------------------
       RESOURCE MUST EXIST
       -------------------------------------------------------- */

    if not exists (

        select 1

        from public.products product

        where product.id = p_product_id

          and product.product_type in (
              'ebook',
              'digital_product'
          )

    ) then

        raise exception
            'RizSim resource not found.';

    end if;


    /* --------------------------------------------------------
       NORMAL USERS:
       PUBLISHED + AUTHORIZED
       -------------------------------------------------------- */

    if not v_admin_or_owner then


        if not exists (

            select 1

            from public.products product

            where product.id =
                p_product_id

              and product.status =
                'published'

        ) then

            raise exception
                'This resource is not currently available.'
                using errcode = '42501';

        end if;


        select
            private.can_access_rizsim_product(
                p_product_id
            )

        into
            v_allowed;


        if coalesce(
            v_allowed,
            false
        ) <> true then

            raise exception
                'You do not currently have access to this RizSim resource.'
                using errcode = '42501';

        end if;


    end if;


    /* --------------------------------------------------------
       ACTIVE PRIMARY FILE REQUIRED
       -------------------------------------------------------- */

    if not exists (

        select 1

        from public.rizsim_product_assets asset

        where asset.product_id =
            p_product_id

          and asset.asset_type =
            'primary_file'

          and asset.active =
            true

    ) then

        raise exception
            'This RizSim resource does not have an active viewer file.';

    end if;


    /* --------------------------------------------------------
       SAFE VIEWER METADATA ONLY

       No storage path.
       No signed URL.
       -------------------------------------------------------- */

    return query

    select

        product.id,

        product.title,

        product.product_type,

        product.status,

        product.access_type,

        asset.file_name,

        asset.mime_type,

        asset.file_size

    from public.products product

    join public.rizsim_product_assets asset
      on asset.product_id =
         product.id

     and asset.asset_type =
         'primary_file'

     and asset.active =
         true

    where product.id =
          p_product_id

    limit 1;


end;
$function$;

COMMIT;
