-- DRAFT ONLY: PHASE 9F class-safety hardening proposal.
-- Derived from CURRENT staging function definitions on 2026-10-11.
-- NOT EXECUTED. Requires sandbox-safe tests, review, and staging release gate.
-- Do not merge/apply to production from this branch without deployment approval.
-- 1. Direct classroom join requires active profile, not merely auth.uid().
CREATE OR REPLACE FUNCTION public.join_rizsim_classroom_session(p_class_code text DEFAULT NULL::text, p_share_token uuid DEFAULT NULL::uuid, p_requested_access_type text DEFAULT NULL::text)
 RETURNS TABLE(attempt_id uuid, session_id uuid, product_id uuid, simulation_title text, class_name text, class_code text, classroom_access_type text, attempt_status text, progress_percent numeric, submitted_at timestamp with time zone, live_starts_at timestamp with time zone, live_ends_at timestamp with time zone, practice_starts_at timestamp with time zone, practice_ends_at timestamp with time zone, license_expires_at timestamp with time zone, is_existing_attempt boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

declare

    v_user_id uuid;

    v_access record;

    v_requested text;

    v_selected_access text;

    v_attempt_id uuid;

    v_attempt_status text;

    v_progress numeric;

    v_submitted_at timestamptz;

    v_existing boolean :=
        false;

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
    -- 2. ENSURE PROFILE EXISTS
    -- ========================================================

    insert into
    public.profiles as profile_row (

        id,

        display_name,

        email,

        avatar_url

    )

    values (

        v_user_id,

        coalesce(

            nullif(
                auth.jwt()
                -> 'user_metadata'
                ->> 'full_name',
                ''
            ),

            nullif(
                auth.jwt()
                -> 'user_metadata'
                ->> 'name',
                ''
            ),

            nullif(
                auth.jwt()
                ->> 'email',
                ''
            ),

            'RizSim Student'

        ),

        nullif(
            auth.jwt()
            ->> 'email',
            ''
        ),

        coalesce(

            nullif(
                auth.jwt()
                -> 'user_metadata'
                ->> 'avatar_url',
                ''
            ),

            nullif(
                auth.jwt()
                -> 'user_metadata'
                ->> 'picture',
                ''
            )

        )

    )

    on conflict (id)
    do nothing;

    -- Phase 9F: direct classroom RPC must enforce active account status.
    -- The protected course-material RPC already checks this, but join
    -- independently creates simulation attempts and must enforce it too.
    if not exists (
        select 1 from public.profiles p
        where p.id = v_user_id and p.account_status = 'active'
    ) then
        raise exception 'An active RizSim profile is required to join a classroom.'
            using errcode = '42501';
    end if;




    -- ========================================================
    -- 3. RESOLVE CLASSROOM SESSION
    -- ========================================================

    select
        access_row.*

    into v_access

    from public.resolve_rizsim_classroom_access(

        p_class_code,

        p_share_token

    ) as access_row

    limit 1;



    if v_access.session_id is null then

        raise exception
            'Classroom session not found.';

    end if;



    -- ========================================================
    -- 4. SESSION MUST BE OPEN
    -- ========================================================

    if v_access.access_status <> 'open' then


        case v_access.access_status


            when 'scheduled' then

                raise exception
                    'This classroom session has not opened yet.';


            when 'ended' then

                raise exception
                    'This classroom session has ended.';


            when 'closed' then

                raise exception
                    'This classroom session has been closed by Faculty.';


            when 'licence_revoked' then

                raise exception
                    'Access is unavailable because the simulation licence has been revoked.';


            when 'licence_expired' then

                raise exception
                    'Access is unavailable because the simulation licence has expired.';


            when 'licence_not_started' then

                raise exception
                    'The simulation licence has not started yet.';


            else

                raise exception
                    'This classroom session is not currently available.';


        end case;


    end if;



    -- ========================================================
    -- 5. NORMALIZE REQUESTED ACCESS TYPE
    -- ========================================================

    v_requested :=
        lower(
            trim(
                coalesce(
                    p_requested_access_type,
                    ''
                )
            )
        );


    if
        v_requested <> ''

        and

        v_requested not in (
            'live',
            'practice'
        )

    then

        raise exception
            'Requested access type must be live or practice.';

    end if;



    -- ========================================================
    -- 6. CHOOSE LIVE OR PRACTICE
    -- ========================================================

    if v_requested = 'live' then


        if v_access.live_open <> true then

            raise exception
                'Live Class is not currently open.';

        end if;


        v_selected_access :=
            'live';



    elsif v_requested = 'practice' then


        if v_access.practice_open <> true then

            raise exception
                'Practice is not currently open.';

        end if;


        v_selected_access :=
            'practice';



    else


        if v_access.live_open = true then

            v_selected_access :=
                'live';


        elsif v_access.practice_open = true then

            v_selected_access :=
                'practice';


        else

            raise exception
                'No classroom access window is currently open.';


        end if;


    end if;



    -- ========================================================
    -- 7. CHECK FOR EXISTING ATTEMPT
    -- ========================================================

    select

        attempt_row.id,

        attempt_row.status,

        attempt_row.progress_percent,

        attempt_row.submitted_at

    into

        v_attempt_id,

        v_attempt_status,

        v_progress,

        v_submitted_at

    from public.simulation_attempts
        as attempt_row

    where

        attempt_row.user_id =
            v_user_id

        and

        attempt_row.classroom_session_id =
            v_access.session_id

    limit 1;



    -- ========================================================
    -- 8. RETURN EXISTING ATTEMPT
    -- ========================================================

    if v_attempt_id is not null then


        v_existing :=
            true;


        return query

        select

            v_attempt_id,

            v_access.session_id,

            v_access.product_id,

            v_access.simulation_title,

            v_access.class_name,

            v_access.class_code,

            existing_attempt.classroom_access_type,

            v_attempt_status,

            v_progress,

            v_submitted_at,

            v_access.live_starts_at,

            v_access.live_ends_at,

            v_access.practice_starts_at,

            v_access.practice_ends_at,

            v_access.license_expires_at,

            true

        from public.simulation_attempts
            as existing_attempt

        where
            existing_attempt.id =
                v_attempt_id

        limit 1;


        return;


    end if;



    -- ========================================================
    -- 9. CREATE NEW CLASSROOM ATTEMPT
    --
    -- IMPORTANT FIX:
    -- The INSERT target is explicitly aliased as
    -- "new_attempt".
    --
    -- RETURNING fields are also fully qualified.
    --
    -- This removes PostgreSQL ambiguity between
    -- table columns such as progress_percent
    -- and RETURNS TABLE variables of the same name.
    -- ========================================================

    begin


        insert into
        public.simulation_attempts
        as new_attempt (

            user_id,

            product_id,

            classroom_session_id,

            classroom_access_type,

            joined_at

        )

        values (

            v_user_id,

            v_access.product_id,

            v_access.session_id,

            v_selected_access,

            now()

        )

        returning

            new_attempt.id,

            new_attempt.status,

            new_attempt.progress_percent,

            new_attempt.submitted_at

        into

            v_attempt_id,

            v_attempt_status,

            v_progress,

            v_submitted_at;



    exception

        when unique_violation then


            -- =================================================
            -- SAFE RECOVERY FROM SIMULTANEOUS JOIN REQUEST
            -- =================================================

            select

                existing_attempt.id,

                existing_attempt.status,

                existing_attempt.progress_percent,

                existing_attempt.submitted_at

            into

                v_attempt_id,

                v_attempt_status,

                v_progress,

                v_submitted_at

            from public.simulation_attempts
                as existing_attempt

            where

                existing_attempt.user_id =
                    v_user_id

                and

                existing_attempt.classroom_session_id =
                    v_access.session_id

            limit 1;


            v_existing :=
                true;


    end;



    -- ========================================================
    -- 10. RETURN CLASSROOM ATTEMPT
    -- ========================================================

    return query

    select

        v_attempt_id,

        v_access.session_id,

        v_access.product_id,

        v_access.simulation_title,

        v_access.class_name,

        v_access.class_code,

        created_attempt.classroom_access_type,

        v_attempt_status,

        v_progress,

        v_submitted_at,

        v_access.live_starts_at,

        v_access.live_ends_at,

        v_access.practice_starts_at,

        v_access.practice_ends_at,

        v_access.license_expires_at,

        v_existing

    from public.simulation_attempts
        as created_attempt

    where
        created_attempt.id =
            v_attempt_id

    limit 1;


end;

$function$;

-- 2. Closing a class requires active Faculty/Course Lead creator,
--    OR the already-AAL2-gated RizSim Owner authorization.
CREATE OR REPLACE FUNCTION public.close_rizsim_classroom_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

declare

    v_user_id uuid;

begin


    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentication required.';

    end if;


    update public.classroom_sessions cs

    set
        active =
            false,

        closed_at =
            now()

    where
        cs.id =
            p_session_id

        and cs.active =
            true

        and (

            public.is_rizsim_owner()
            or (
                cs.created_by = v_user_id
                and exists (
                    select 1 from public.access_out_members m
                    join public.profiles p on p.id = m.user_id
                    where m.user_id = v_user_id
                      and m.active = true
                      and m.role in ('faculty', 'course_lead')
                      and p.account_status = 'active'
                )
            )

        );


    if not found then

        raise exception
            'Active session not found or you are not authorized to close it.';

    end if;


    return
        true;


end;

$function$;
