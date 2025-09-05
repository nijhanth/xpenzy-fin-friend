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