-- Fix anonymous access policies by restricting to authenticated users only
-- Update all policies to use 'TO authenticated' instead of allowing anonymous access

-- Fix budget_categories policies
DROP POLICY IF EXISTS "Users can delete their own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can update their own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can view their own budget categories" ON public.budget_categories;

CREATE POLICY "Users can delete their own budget categories" 
ON public.budget_categories 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget categories" 
ON public.budget_categories 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget categories" 
ON public.budget_categories 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Fix expense_entries policies
DROP POLICY IF EXISTS "Users can manage their own expense entries" ON public.expense_entries;

CREATE POLICY "Users can manage their own expense entries" 
ON public.expense_entries 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix income_entries policies
DROP POLICY IF EXISTS "Users can manage their own income entries" ON public.income_entries;

CREATE POLICY "Users can manage their own income entries" 
ON public.income_entries 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix investment_entries policies
DROP POLICY IF EXISTS "Users can manage their own investment entries" ON public.investment_entries;

CREATE POLICY "Users can manage their own investment entries" 
ON public.investment_entries 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix investment_transactions policies
DROP POLICY IF EXISTS "Users can manage their own investment transactions" ON public.investment_transactions;

CREATE POLICY "Users can manage their own investment transactions" 
ON public.investment_transactions 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix savings_goals policies
DROP POLICY IF EXISTS "Users can manage their own savings goals" ON public.savings_goals;

CREATE POLICY "Users can manage their own savings goals" 
ON public.savings_goals 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix savings_transactions policies
DROP POLICY IF EXISTS "Users can manage their own savings transactions" ON public.savings_transactions;

CREATE POLICY "Users can manage their own savings transactions" 
ON public.savings_transactions 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix function search path issues by setting search_path for all functions
CREATE OR REPLACE FUNCTION public.update_investment_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update the invested amount in investment_entries by summing all transactions
  UPDATE public.investment_entries 
  SET invested = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.investment_transactions 
    WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id)
  )
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_savings_goal_current()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update the current amount in savings_goals by summing all transactions
  UPDATE public.savings_goals 
  SET current = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.savings_transactions 
    WHERE savings_goal_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
  )
  WHERE id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add columns to budget_categories for linking to savings/investment goals
ALTER TABLE public.budget_categories 
ADD COLUMN linked_type text DEFAULT 'expenses',
ADD COLUMN linked_id uuid;

-- Add index for better performance on linked fields
CREATE INDEX idx_budget_categories_linked ON public.budget_categories(linked_type, linked_id);

-- Create function to update budget current amount when savings transactions are added
CREATE OR REPLACE FUNCTION public.update_budget_from_savings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update budget categories linked to this savings goal
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(st.amount), 0)
    FROM public.savings_transactions st
    WHERE st.savings_goal_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
    AND EXTRACT(YEAR FROM st.date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM st.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  )
  WHERE linked_type = 'savings' 
  AND linked_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
  AND period = 'monthly'
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create function to update budget current amount when investment transactions are added
CREATE OR REPLACE FUNCTION public.update_budget_from_investments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update budget categories linked to this investment
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(it.amount), 0)
    FROM public.investment_transactions it
    WHERE it.investment_id = COALESCE(NEW.investment_id, OLD.investment_id)
    AND EXTRACT(YEAR FROM it.date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM it.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  )
  WHERE linked_type = 'investment' 
  AND linked_id = COALESCE(NEW.investment_id, OLD.investment_id)
  AND period = 'monthly'
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for savings transactions
CREATE TRIGGER update_budget_from_savings_on_insert
  AFTER INSERT ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

CREATE TRIGGER update_budget_from_savings_on_update
  AFTER UPDATE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

CREATE TRIGGER update_budget_from_savings_on_delete
  AFTER DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

-- Create triggers for investment transactions
CREATE TRIGGER update_budget_from_investments_on_insert
  AFTER INSERT ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

CREATE TRIGGER update_budget_from_investments_on_update
  AFTER UPDATE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

CREATE TRIGGER update_budget_from_investments_on_delete
  AFTER DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

-- Add current field to budget_categories table to track current spending/progress
ALTER TABLE public.budget_categories 
ADD COLUMN current numeric DEFAULT 0;

-- Check existing triggers and create missing ones for budget updates

-- Create triggers for savings transactions to update budgets
DROP TRIGGER IF EXISTS update_budget_from_savings_trigger ON public.savings_transactions;
CREATE TRIGGER update_budget_from_savings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

-- Create triggers for investment transactions to update budgets
DROP TRIGGER IF EXISTS update_budget_from_investments_trigger ON public.investment_transactions;
CREATE TRIGGER update_budget_from_investments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();