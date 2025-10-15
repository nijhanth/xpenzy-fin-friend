-- Drop the recursive policy
DROP POLICY IF EXISTS "View conversation participants" ON public.conversation_participants;

-- Create a security definer function to check participation without recursion
CREATE OR REPLACE FUNCTION public.user_is_in_conversation(conversation_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversation_uuid
    AND user_id = user_uuid
  );
$$;

-- Create new non-recursive policy using the function
CREATE POLICY "View conversation participants"
ON public.conversation_participants
FOR SELECT
TO public
USING (
  public.user_is_in_conversation(conversation_id, auth.uid())
);