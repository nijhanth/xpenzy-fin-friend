-- Remove all existing investment data and recreate clean tables

-- Drop existing tables (this will cascade delete all data)
DROP TABLE IF EXISTS public.investment_transactions CASCADE;
DROP TABLE IF EXISTS public.investment_entries CASCADE;

-- Recreate investment_entries table
CREATE TABLE public.investment_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  invested numeric NOT NULL,
  current numeric DEFAULT 0,
  date date NOT NULL,
  notes text DEFAULT '',
  custom_type text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for investment_entries
CREATE POLICY "Users can manage their own investment entries"
  ON public.investment_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate investment_transactions table
CREATE TABLE public.investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id uuid NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  profit_loss numeric DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for investment_transactions
CREATE POLICY "Users can manage their own investment transactions"
  ON public.investment_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate trigger for updated_at on investment_entries
CREATE TRIGGER update_investment_entries_updated_at
  BEFORE UPDATE ON public.investment_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate trigger for updated_at on investment_transactions
CREATE TRIGGER update_investment_transactions_updated_at
  BEFORE UPDATE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate trigger to update investment totals from transactions
CREATE TRIGGER update_investment_from_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investment_total();

-- Recreate trigger to update budgets from investment transactions
CREATE TRIGGER update_budget_from_investment_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();