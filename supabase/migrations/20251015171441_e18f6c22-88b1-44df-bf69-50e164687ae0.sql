-- Check and fix the INSERT policy for conversations
-- The issue is the policy role might not be set correctly

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create INSERT policy that allows authenticated users to insert
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);