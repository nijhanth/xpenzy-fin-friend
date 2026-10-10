-- Drop all existing policies for messaging tables
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they are part of" ON public.conversations;

DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Recreate conversations policies
-- Allow any authenticated user to INSERT (they'll become participant right after)
CREATE POLICY "Anyone can create conversations"
ON public.conversations
FOR INSERT
TO public
WITH CHECK (true);

-- Only show conversations where user is a participant
CREATE POLICY "View own conversations"
ON public.conversations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Allow updates to conversations user participates in
CREATE POLICY "Update own conversations"
ON public.conversations
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Recreate conversation_participants policies
-- Users can add any participants (needed for creating conversations with other users)
CREATE POLICY "Add conversation participants"
ON public.conversation_participants
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- View participants of conversations user is in
CREATE POLICY "View conversation participants"
ON public.conversation_participants
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can remove themselves
CREATE POLICY "Remove self from conversations"
ON public.conversation_participants
FOR DELETE
TO public
USING (user_id = auth.uid());

-- Recreate messages policies
-- Send messages to conversations user is in
CREATE POLICY "Send messages"
ON public.messages
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- View messages from conversations user is in
CREATE POLICY "View messages"
ON public.messages
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Update own messages
CREATE POLICY "Update own messages"
ON public.messages
FOR UPDATE
TO public
USING (user_id = auth.uid());

-- Delete own messages
CREATE POLICY "Delete own messages"
ON public.messages
FOR DELETE
TO public
USING (user_id = auth.uid());

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

-- Create a function to create a conversation and add participants atomically
-- This bypasses RLS issues by running with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(
  p_type text,
  p_user1_id uuid,
  p_user2_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Create the conversation
  INSERT INTO public.conversations (type)
  VALUES (p_type)
  RETURNING id INTO v_conversation_id;
  
  -- Add both participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, p_user1_id),
    (v_conversation_id, p_user2_id);
  
  RETURN v_conversation_id;
END;
$$;

-- Allow users to delete their own conversations
CREATE POLICY "Users can delete their own conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Add CASCADE delete to conversation_participants
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_fkey,
ADD CONSTRAINT conversation_participants_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES public.conversations(id)
  ON DELETE CASCADE;

-- Add CASCADE delete to messages
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey,
ADD CONSTRAINT messages_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES public.conversations(id)
  ON DELETE CASCADE;