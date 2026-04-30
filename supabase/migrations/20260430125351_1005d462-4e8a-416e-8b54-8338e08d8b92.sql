
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
