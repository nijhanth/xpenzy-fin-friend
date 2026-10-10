-- Create notes table for bills, EMI, and payment reminders
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  reminder TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notes"
ON public.notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_preferences table for storing user settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  language TEXT NOT NULL DEFAULT 'en',
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  weekly_reports BOOLEAN NOT NULL DEFAULT true,
  budget_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update budget from savings transactions
DROP TRIGGER IF EXISTS update_budget_from_savings_trigger ON public.savings_transactions;

CREATE TRIGGER update_budget_from_savings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

-- Create trigger to update budget from investment transactions
DROP TRIGGER IF EXISTS update_budget_from_investments_trigger ON public.investment_transactions;

CREATE TRIGGER update_budget_from_investments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

-- Create trigger to update budget from expenses
DROP TRIGGER IF EXISTS update_budget_from_expenses_trigger ON public.expense_entries;

CREATE TRIGGER update_budget_from_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_expenses();

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

-- Data API grants (required on this backend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes, public.user_preferences TO authenticated;
GRANT ALL ON public.notes, public.user_preferences TO service_role;