-- Fix the INSERT policy to work with the public role like other policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create INSERT policy for public role (includes authenticated users)
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);