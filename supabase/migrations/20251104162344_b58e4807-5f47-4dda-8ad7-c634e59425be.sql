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