-- Fix update_budget_from_savings function to match budget's specific time period
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
      (budget_categories.period = 'monthly' 
       AND EXTRACT(YEAR FROM st.date) = budget_categories.year
       AND EXTRACT(MONTH FROM st.date) = budget_categories.month)
      OR
      -- For yearly budgets: match the specific year
      (budget_categories.period = 'yearly' 
       AND EXTRACT(YEAR FROM st.date) = budget_categories.year)
      OR
      -- For weekly budgets: match the specific week, month and year
      (budget_categories.period = 'weekly' 
       AND EXTRACT(YEAR FROM st.date) = budget_categories.year
       AND EXTRACT(MONTH FROM st.date) = budget_categories.month
       AND CEIL(EXTRACT(DAY FROM st.date) / 7.0) = budget_categories.week)
    )
  )
  WHERE linked_type = 'savings' 
  AND linked_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix update_budget_from_investments function to match budget's specific time period
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
      (budget_categories.period = 'monthly' 
       AND EXTRACT(YEAR FROM it.date) = budget_categories.year
       AND EXTRACT(MONTH FROM it.date) = budget_categories.month)
      OR
      -- For yearly budgets: match the specific year
      (budget_categories.period = 'yearly' 
       AND EXTRACT(YEAR FROM it.date) = budget_categories.year)
      OR
      -- For weekly budgets: match the specific week, month and year
      (budget_categories.period = 'weekly' 
       AND EXTRACT(YEAR FROM it.date) = budget_categories.year
       AND EXTRACT(MONTH FROM it.date) = budget_categories.month
       AND CEIL(EXTRACT(DAY FROM it.date) / 7.0) = budget_categories.week)
    )
  )
  WHERE linked_type = 'investment' 
  AND linked_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Manually update existing budgets to sync with current transaction data
UPDATE public.budget_categories 
SET current = (
  CASE 
    WHEN linked_type = 'savings' THEN (
      SELECT COALESCE(SUM(st.amount), 0)
      FROM public.savings_transactions st
      WHERE st.savings_goal_id = budget_categories.linked_id
      AND (
        -- For monthly budgets: match the specific month and year
        (budget_categories.period = 'monthly' 
         AND EXTRACT(YEAR FROM st.date) = budget_categories.year
         AND EXTRACT(MONTH FROM st.date) = budget_categories.month)
        OR
        -- For yearly budgets: match the specific year
        (budget_categories.period = 'yearly' 
         AND EXTRACT(YEAR FROM st.date) = budget_categories.year)
        OR
        -- For weekly budgets: match the specific week, month and year
        (budget_categories.period = 'weekly' 
         AND EXTRACT(YEAR FROM st.date) = budget_categories.year
         AND EXTRACT(MONTH FROM st.date) = budget_categories.month
         AND CEIL(EXTRACT(DAY FROM st.date) / 7.0) = budget_categories.week)
      )
    )
    WHEN linked_type = 'investment' THEN (
      SELECT COALESCE(SUM(it.amount), 0)
      FROM public.investment_transactions it
      WHERE it.investment_id = budget_categories.linked_id
      AND (
        -- For monthly budgets: match the specific month and year
        (budget_categories.period = 'monthly' 
         AND EXTRACT(YEAR FROM it.date) = budget_categories.year
         AND EXTRACT(MONTH FROM it.date) = budget_categories.month)
        OR
        -- For yearly budgets: match the specific year
        (budget_categories.period = 'yearly' 
         AND EXTRACT(YEAR FROM it.date) = budget_categories.year)
        OR
        -- For weekly budgets: match the specific week, month and year
        (budget_categories.period = 'weekly' 
         AND EXTRACT(YEAR FROM it.date) = budget_categories.year
         AND EXTRACT(MONTH FROM it.date) = budget_categories.month
         AND CEIL(EXTRACT(DAY FROM it.date) / 7.0) = budget_categories.week)
      )
    )
    ELSE current
  END
)
WHERE linked_type IN ('savings', 'investment');