-- Create savings_transactions table
CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own savings transactions"
  ON public.savings_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_savings_transactions_updated_at
BEFORE UPDATE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update savings goal current amount when transactions change
CREATE OR REPLACE FUNCTION public.update_savings_goal_total()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update savings goal totals
CREATE TRIGGER update_savings_goal_total_on_insert
AFTER INSERT ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_goal_total();

CREATE TRIGGER update_savings_goal_total_on_update
AFTER UPDATE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_goal_total();

CREATE TRIGGER update_savings_goal_total_on_delete
AFTER DELETE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_goal_total();

-- Add date-specific fields to budget_categories table
ALTER TABLE public.budget_categories 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN year INTEGER,
ADD COLUMN month INTEGER,
ADD COLUMN week INTEGER;

-- Create function to update savings goal current amount based on transactions
CREATE OR REPLACE FUNCTION public.update_savings_goal_current()
RETURNS trigger
LANGUAGE plpgsql
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

-- Create triggers for INSERT, UPDATE, and DELETE on savings_transactions
CREATE TRIGGER update_savings_goal_current_on_insert
  AFTER INSERT ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_current();

CREATE TRIGGER update_savings_goal_current_on_update
  AFTER UPDATE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_current();

CREATE TRIGGER update_savings_goal_current_on_delete
  AFTER DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_current();

-- Fix security vulnerability: Restrict profiles table access to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Data API grants (required on this backend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_transactions TO authenticated;
GRANT ALL ON public.savings_transactions TO service_role;