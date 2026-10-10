-- Drop the overly permissive policy that exposes all user emails
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy - users can only view their own full profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function for safe user search (returns only display_name, not email)
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_query text, current_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.user_id != current_user_id
  AND p.display_name ILIKE '%' || search_query || '%'
  LIMIT 20;
$$;

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

-- 1. Add goal_id to expense_entries
ALTER TABLE public.expense_entries
ADD COLUMN goal_id uuid REFERENCES public.savings_goals(id) ON DELETE SET NULL;

CREATE INDEX idx_expense_entries_goal_id ON public.expense_entries(goal_id);

-- 2. Add tracking fields to savings_goals
ALTER TABLE public.savings_goals
ADD COLUMN used_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN status text NOT NULL DEFAULT 'active',
ADD COLUMN completed_date timestamp with time zone;

-- 3. Trigger function: recompute used_amount and status for affected goal(s)
CREATE OR REPLACE FUNCTION public.update_goal_used_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_goal_id uuid;
  goal_target numeric;
  goal_saved numeric;
  new_used numeric;
BEGIN
  -- Handle both NEW and OLD goal_ids (covers UPDATE that changes the link)
  FOR affected_goal_id IN
    SELECT DISTINCT g FROM (
      VALUES (CASE WHEN TG_OP <> 'DELETE' THEN NEW.goal_id END),
             (CASE WHEN TG_OP <> 'INSERT' THEN OLD.goal_id END)
    ) AS t(g)
    WHERE g IS NOT NULL
  LOOP
    -- Recompute used_amount from all linked expenses
    SELECT COALESCE(SUM(amount), 0) INTO new_used
    FROM public.expense_entries
    WHERE goal_id = affected_goal_id;

    -- Get current target and saved amount
    SELECT target, current INTO goal_target, goal_saved
    FROM public.savings_goals
    WHERE id = affected_goal_id;

    -- Update used_amount and check completion
    UPDATE public.savings_goals
    SET
      used_amount = new_used,
      status = CASE
        WHEN goal_saved >= goal_target AND new_used >= goal_target THEN 'completed'
        ELSE 'active'
      END,
      completed_date = CASE
        WHEN goal_saved >= goal_target AND new_used >= goal_target AND completed_date IS NULL THEN now()
        WHEN NOT (goal_saved >= goal_target AND new_used >= goal_target) THEN NULL
        ELSE completed_date
      END
    WHERE id = affected_goal_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Trigger on expense_entries
DROP TRIGGER IF EXISTS trg_update_goal_used_amount ON public.expense_entries;
CREATE TRIGGER trg_update_goal_used_amount
AFTER INSERT OR UPDATE OF goal_id, amount OR DELETE ON public.expense_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_goal_used_amount();

-- 5. Also re-evaluate completion when savings_goals.current changes (saved amount grows)
CREATE OR REPLACE FUNCTION public.check_goal_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current >= NEW.target AND NEW.used_amount >= NEW.target THEN
    NEW.status := 'completed';
    IF NEW.completed_date IS NULL THEN
      NEW.completed_date := now();
    END IF;
  ELSE
    NEW.status := 'active';
    NEW.completed_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_goal_completion ON public.savings_goals;
CREATE TRIGGER trg_check_goal_completion
BEFORE UPDATE OF current, used_amount, target ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.check_goal_completion();

-- Switch to manual goal completion: keep recomputing used_amount from linked expenses,
-- but never auto-flip status to 'completed' or 'active'. Status is user-controlled.

-- 1) Drop the BEFORE UPDATE trigger that forced status based on current/used vs target
DROP TRIGGER IF EXISTS trg_check_goal_completion ON public.savings_goals;
DROP TRIGGER IF EXISTS check_goal_completion_trigger ON public.savings_goals;

-- 2) Replace check_goal_completion to be a no-op (kept for safety if referenced elsewhere)
CREATE OR REPLACE FUNCTION public.check_goal_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Manual completion only; do not auto-change status here
  RETURN NEW;
END;
$function$;

-- 3) Replace update_goal_used_amount: only recompute used_amount, never touch status
CREATE OR REPLACE FUNCTION public.update_goal_used_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  affected_goal_id uuid;
  new_used numeric;
BEGIN
  FOR affected_goal_id IN
    SELECT DISTINCT g FROM (
      VALUES (CASE WHEN TG_OP <> 'DELETE' THEN NEW.goal_id END),
             (CASE WHEN TG_OP <> 'INSERT' THEN OLD.goal_id END)
    ) AS t(g)
    WHERE g IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO new_used
    FROM public.expense_entries
    WHERE goal_id = affected_goal_id;

    UPDATE public.savings_goals
    SET used_amount = new_used
    WHERE id = affected_goal_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

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