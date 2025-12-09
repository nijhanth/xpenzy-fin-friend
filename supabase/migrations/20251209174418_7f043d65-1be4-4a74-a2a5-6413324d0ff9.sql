-- Drop the overly permissive policy that exposes all user emails
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy - users can only view their own full profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function for safe user search (returns only display_name, not email)
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_query text, current_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.user_id != current_user_id
  AND p.display_name ILIKE '%' || search_query || '%'
  LIMIT 20;
$$;