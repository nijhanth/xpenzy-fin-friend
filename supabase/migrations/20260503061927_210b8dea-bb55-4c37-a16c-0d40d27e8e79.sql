
-- 1. Allow users to delete their own profile (GDPR/CCPA)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Restrict conversation creation to authenticated users
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Restrict participant insertion to existing participants only.
-- Initial conversation creation must go through
-- public.create_conversation_with_participants() (SECURITY DEFINER) which
-- bypasses RLS for the atomic two-participant insert.
DROP POLICY IF EXISTS "Add conversation participants" ON public.conversation_participants;
CREATE POLICY "Existing participants can add others"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- 4. Lock down SECURITY DEFINER functions: revoke broad EXECUTE,
--    grant only where needed by client/RPC.
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_savings_goal_current() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_investment_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_budget_from_savings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_budget_from_investments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_budget_from_expenses() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_goal_completion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_goal_used_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- RPCs intended to be callable by signed-in users only
REVOKE EXECUTE ON FUNCTION public.search_users_by_name(text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.search_users_by_name(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_conversation_with_participants(text, uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_conversation_with_participants(text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_is_in_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_is_in_conversation(uuid, uuid) TO authenticated;
