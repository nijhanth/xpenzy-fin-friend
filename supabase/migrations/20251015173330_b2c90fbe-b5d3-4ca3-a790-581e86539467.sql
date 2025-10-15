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