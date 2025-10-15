-- Fix INSERT policy for conversations to allow creation without WITH CHECK restriction

-- The issue is that WITH CHECK (true) allows insertion, but then the SELECT policy
-- prevents returning the created row. We need to adjust this.

-- Drop the current INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a proper INSERT policy that doesn't restrict WITH CHECK
-- Since participants are added AFTER conversation creation, we can't check participation yet
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);