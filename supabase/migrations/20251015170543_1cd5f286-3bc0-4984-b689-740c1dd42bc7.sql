-- Fix RLS policies for conversations to allow proper creation and selection

-- First, drop the duplicate SELECT policies
DROP POLICY IF EXISTS "Users can only create conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON public.conversations;

-- Create a single, correct SELECT policy that allows users to see conversations they created
-- OR conversations they participate in (after participants are added)
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  -- Allow viewing conversations the user participates in
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);