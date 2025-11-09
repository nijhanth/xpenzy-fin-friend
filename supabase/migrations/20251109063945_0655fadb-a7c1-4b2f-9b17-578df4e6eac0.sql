-- Fix the update_budget_from_savings trigger to correctly match JavaScript 0-indexed months
CREATE OR REPLACE FUNCTION public.update_budget_from_savings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update budget categories linked to this savings goal
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(st.amount), 0)
    FROM public.savings_transactions st
    WHERE st.savings_goal_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
    AND (
      -- For monthly budgets: match the specific month and year
      -- JavaScript months are 0-indexed (0=Jan, 10=Nov), SQL EXTRACT returns 1-indexed (1=Jan, 11=Nov)
      -- So we need to subtract 1 from SQL's month to match the stored month value
      (budget_categories.period = 'monthly' 
       AND EXTRACT(YEAR FROM st.date) = budget_categories.year
       AND (EXTRACT(MONTH FROM st.date) - 1) = budget_categories.month)
      OR
      -- For yearly budgets: match the specific year
      (budget_categories.period = 'yearly' 
       AND EXTRACT(YEAR FROM st.date) = budget_categories.year)
      OR
      -- For weekly budgets: match the specific week, month and year
      (budget_categories.period = 'weekly' 
       AND EXTRACT(YEAR FROM st.date) = budget_categories.year
       AND (EXTRACT(MONTH FROM st.date) - 1) = budget_categories.month
       AND CEIL(EXTRACT(DAY FROM st.date) / 7.0) = budget_categories.week)
    )
  )
  WHERE linked_type = 'savings' 
  AND linked_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix the update_budget_from_investments trigger to correctly match JavaScript 0-indexed months
CREATE OR REPLACE FUNCTION public.update_budget_from_investments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update budget categories linked to this investment
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(it.amount), 0)
    FROM public.investment_transactions it
    WHERE it.investment_id = COALESCE(NEW.investment_id, OLD.investment_id)
    AND (
      -- For monthly budgets: match the specific month and year
      -- JavaScript months are 0-indexed (0=Jan, 10=Nov), SQL EXTRACT returns 1-indexed (1=Jan, 11=Nov)
      -- So we need to subtract 1 from SQL's month to match the stored month value
      (budget_categories.period = 'monthly' 
       AND EXTRACT(YEAR FROM it.date) = budget_categories.year
       AND (EXTRACT(MONTH FROM it.date) - 1) = budget_categories.month)
      OR
      -- For yearly budgets: match the specific year
      (budget_categories.period = 'yearly' 
       AND EXTRACT(YEAR FROM it.date) = budget_categories.year)
      OR
      -- For weekly budgets: match the specific week, month and year
      (budget_categories.period = 'weekly' 
       AND EXTRACT(YEAR FROM it.date) = budget_categories.year
       AND (EXTRACT(MONTH FROM it.date) - 1) = budget_categories.month
       AND CEIL(EXTRACT(DAY FROM it.date) / 7.0) = budget_categories.week)
    )
  )
  WHERE linked_type = 'investment' 
  AND linked_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix the update_budget_from_expenses trigger to correctly match JavaScript 0-indexed months
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
      -- JavaScript months are 0-indexed (0=Jan, 10=Nov), SQL EXTRACT returns 1-indexed (1=Jan, 11=Nov)
      -- So we need to subtract 1 from SQL's month to match the stored month value
      (budget_categories.period = 'monthly' 
       AND EXTRACT(YEAR FROM ee.date) = budget_categories.year
       AND (EXTRACT(MONTH FROM ee.date) - 1) = budget_categories.month)
      OR
      -- For yearly budgets: match the specific year
      (budget_categories.period = 'yearly' 
       AND EXTRACT(YEAR FROM ee.date) = budget_categories.year)
      OR
      -- For weekly budgets: match the specific week, month and year
      (budget_categories.period = 'weekly' 
       AND EXTRACT(YEAR FROM ee.date) = budget_categories.year
       AND (EXTRACT(MONTH FROM ee.date) - 1) = budget_categories.month
       AND CEIL(EXTRACT(DAY FROM ee.date) / 7.0) = budget_categories.week)
    )
  )
  WHERE linked_type = 'expenses' 
  AND category = COALESCE(NEW.category, OLD.category);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Now manually update the existing budgets to reflect the correct amounts based on the fixed logic
-- This will recalculate all budget current values using the corrected month matching

-- Update all savings budgets
UPDATE public.budget_categories bc
SET current = (
  SELECT COALESCE(SUM(st.amount), 0)
  FROM public.savings_transactions st
  WHERE st.savings_goal_id = bc.linked_id
  AND (
    (bc.period = 'monthly' 
     AND EXTRACT(YEAR FROM st.date) = bc.year
     AND (EXTRACT(MONTH FROM st.date) - 1) = bc.month)
    OR
    (bc.period = 'yearly' 
     AND EXTRACT(YEAR FROM st.date) = bc.year)
    OR
    (bc.period = 'weekly' 
     AND EXTRACT(YEAR FROM st.date) = bc.year
     AND (EXTRACT(MONTH FROM st.date) - 1) = bc.month
     AND CEIL(EXTRACT(DAY FROM st.date) / 7.0) = bc.week)
  )
)
WHERE bc.linked_type = 'savings';

-- Update all investment budgets
UPDATE public.budget_categories bc
SET current = (
  SELECT COALESCE(SUM(it.amount), 0)
  FROM public.investment_transactions it
  WHERE it.investment_id = bc.linked_id
  AND (
    (bc.period = 'monthly' 
     AND EXTRACT(YEAR FROM it.date) = bc.year
     AND (EXTRACT(MONTH FROM it.date) - 1) = bc.month)
    OR
    (bc.period = 'yearly' 
     AND EXTRACT(YEAR FROM it.date) = bc.year)
    OR
    (bc.period = 'weekly' 
     AND EXTRACT(YEAR FROM it.date) = bc.year
     AND (EXTRACT(MONTH FROM it.date) - 1) = bc.month
     AND CEIL(EXTRACT(DAY FROM it.date) / 7.0) = bc.week)
  )
)
WHERE bc.linked_type = 'investment';

-- Update all expense budgets
UPDATE public.budget_categories bc
SET current = (
  SELECT COALESCE(SUM(ee.amount), 0)
  FROM public.expense_entries ee
  WHERE ee.category = bc.category
  AND (
    (bc.period = 'monthly' 
     AND EXTRACT(YEAR FROM ee.date) = bc.year
     AND (EXTRACT(MONTH FROM ee.date) - 1) = bc.month)
    OR
    (bc.period = 'yearly' 
     AND EXTRACT(YEAR FROM ee.date) = bc.year)
    OR
    (bc.period = 'weekly' 
     AND EXTRACT(YEAR FROM ee.date) = bc.year
     AND (EXTRACT(MONTH FROM ee.date) - 1) = bc.month
     AND CEIL(EXTRACT(DAY FROM ee.date) / 7.0) = bc.week)
  )
)
WHERE bc.linked_type = 'expenses';