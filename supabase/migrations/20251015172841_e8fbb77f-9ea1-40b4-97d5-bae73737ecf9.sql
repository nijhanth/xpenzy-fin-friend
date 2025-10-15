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