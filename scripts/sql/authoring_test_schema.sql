-- Isolated fixture completion: the production columns/helpers already exist.
alter table public.rizsim_courses add column updated_at timestamptz not null default now();
alter table public.rizsim_courses add column ended_at timestamptz;
alter table public.rizsim_course_simulations add column added_by uuid;
create function public.has_my_active_simulation_license(p_product_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.simulation_licenses where user_id=auth.uid() and product_id=p_product_id and starts_at<=now() and expires_at>now() and revoked_at is null)
$$;
create function public.test_assert(label text,actual boolean) returns void language plpgsql as $$begin
 if actual is distinct from true then raise exception 'FAIL %',label;end if;raise notice 'PASS %',label;end$$;
create function public.test_reject(label text,statement text,expected text) returns void language plpgsql as $$begin
 begin execute statement;exception when others then
 if position(expected in sqlerrm)=0 then raise exception 'FAIL %, unexpected error: %',label,sqlerrm;end if;
 raise notice 'PASS %',label;return;end;
 raise exception 'FAIL %, operation was accepted',label;end$$;
