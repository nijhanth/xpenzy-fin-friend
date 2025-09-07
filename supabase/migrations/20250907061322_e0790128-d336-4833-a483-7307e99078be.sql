-- Fix the "Savings" budget category to link to savings instead of expenses
UPDATE public.budget_categories 
SET linked_type = 'savings' 
WHERE category = 'Savings' AND linked_type = 'expenses';

-- Ensure we have the correct trigger for updating budgets from expenses
-- This trigger should update budget categories linked to expenses when expense entries change
CREATE OR REPLACE FUNCTION public.update_budget_from_expenses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update budget categories linked to expenses based on the expense category
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(ee.amount), 0)
    FROM public.expense_entries ee
    WHERE ee.category = budget_categories.category
    AND (
      -- For monthly budgets: match the specific month and year
      (budget_categories.period = 'monthly' 
       AND EXTRACT(YEAR FROM ee.date) = budget_categories.year
       AND EXTRACT(MONTH FROM ee.date) = budget_categories.month)
      OR
      -- For yearly budgets: match the specific year
      (budget_categories.period = 'yearly' 
       AND EXTRACT(YEAR FROM ee.date) = budget_categories.year)
      OR
      -- For weekly budgets: match the specific week, month and year
      (budget_categories.period = 'weekly' 
       AND EXTRACT(YEAR FROM ee.date) = budget_categories.year
       AND EXTRACT(MONTH FROM ee.date) = budget_categories.month
       AND CEIL(EXTRACT(DAY FROM ee.date) / 7.0) = budget_categories.week)
    )
  )
  WHERE linked_type = 'expenses' 
  AND category = COALESCE(NEW.category, OLD.category);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for expenses if it doesn't exist
DROP TRIGGER IF EXISTS update_budget_from_expenses_trigger ON expense_entries;
CREATE TRIGGER update_budget_from_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expense_entries
  FOR EACH ROW EXECUTE FUNCTION update_budget_from_expenses();

-- Manually update all budget categories to sync with current data
-- Update expense-linked budgets
UPDATE public.budget_categories 
SET current = (
  SELECT COALESCE(SUM(ee.amount), 0)
  FROM public.expense_entries ee
  WHERE ee.category = budget_categories.category
  AND (
    (budget_categories.period = 'monthly' 
     AND EXTRACT(YEAR FROM ee.date) = budget_categories.year
     AND EXTRACT(MONTH FROM ee.date) = budget_categories.month)
    OR
    (budget_categories.period = 'yearly' 
     AND EXTRACT(YEAR FROM ee.date) = budget_categories.year)
    OR
    (budget_categories.period = 'weekly' 
     AND EXTRACT(YEAR FROM ee.date) = budget_categories.year
     AND EXTRACT(MONTH FROM ee.date) = budget_categories.month
     AND CEIL(EXTRACT(DAY FROM ee.date) / 7.0) = budget_categories.week)
  )
)
WHERE linked_type = 'expenses' AND linked_id IS NULL;

-- Update savings-linked budgets (for specific savings goals)
UPDATE public.budget_categories 
SET current = (
  SELECT COALESCE(SUM(st.amount), 0)
  FROM public.savings_transactions st
  WHERE st.savings_goal_id = budget_categories.linked_id
  AND (
    (budget_categories.period = 'monthly' 
     AND EXTRACT(YEAR FROM st.date) = budget_categories.year
     AND EXTRACT(MONTH FROM st.date) = budget_categories.month)
    OR
    (budget_categories.period = 'yearly' 
     AND EXTRACT(YEAR FROM st.date) = budget_categories.year)
    OR
    (budget_categories.period = 'weekly' 
     AND EXTRACT(YEAR FROM st.date) = budget_categories.year
     AND EXTRACT(MONTH FROM st.date) = budget_categories.month
     AND CEIL(EXTRACT(DAY FROM st.date) / 7.0) = budget_categories.week)
  )
)
WHERE linked_type = 'savings' AND linked_id IS NOT NULL;

-- Update savings-linked budgets (for general savings without specific goal)
UPDATE public.budget_categories 
SET current = (
  SELECT COALESCE(SUM(st.amount), 0)
  FROM public.savings_transactions st
  JOIN public.savings_goals sg ON st.savings_goal_id = sg.id
  WHERE (
    (budget_categories.period = 'monthly' 
     AND EXTRACT(YEAR FROM st.date) = budget_categories.year
     AND EXTRACT(MONTH FROM st.date) = budget_categories.month)
    OR
    (budget_categories.period = 'yearly' 
     AND EXTRACT(YEAR FROM st.date) = budget_categories.year)
    OR
    (budget_categories.period = 'weekly' 
     AND EXTRACT(YEAR FROM st.date) = budget_categories.year
     AND EXTRACT(MONTH FROM st.date) = budget_categories.month
     AND CEIL(EXTRACT(DAY FROM st.date) / 7.0) = budget_categories.week)
  )
)
WHERE linked_type = 'savings' AND linked_id IS NULL;