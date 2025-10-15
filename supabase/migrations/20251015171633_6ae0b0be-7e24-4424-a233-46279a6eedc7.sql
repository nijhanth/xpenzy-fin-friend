-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a new INSERT policy with explicit role targeting
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);