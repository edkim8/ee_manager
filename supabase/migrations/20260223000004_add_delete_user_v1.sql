-- Migration: Add delete_user_v1 security definer function
-- Target: Supabase RPC for super admin usage

create or replace function public.delete_user_v1(target_user_id uuid)
returns void
language plpgsql
security definer -- Elevates privileges to bypass RLS on auth.users
set search_path = '' -- Security best practice for security definer
as $$
declare
    requestor_is_admin boolean;
begin
    -- 1. Security Check: Only super admins can use this
    select is_super_admin into requestor_is_admin
    from public.profiles
    where id = auth.uid();

    if not coalesce(requestor_is_admin, false) then
        raise exception 'Unauthorized: Only super admins can delete users.';
    end if;

    -- 2. Execute deletion
    -- Deleting from auth.users will cascade to public.profiles due to the profile FK constraint
    delete from auth.users where id = target_user_id;

end;
$$;

-- Grant permission to authenticated users (function itself has the admin check)
grant execute on function public.delete_user_v1(uuid) to authenticated;
