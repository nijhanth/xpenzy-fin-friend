-- Add policy to allow viewing profiles of users in shared conversations
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = profiles.user_id
  )
);