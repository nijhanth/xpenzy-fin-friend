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