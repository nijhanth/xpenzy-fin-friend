-- Create income_entries table
CREATE TABLE public.income_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  notes TEXT DEFAULT '',
  custom_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense_entries table
CREATE TABLE public.expense_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  notes TEXT DEFAULT '',
  custom_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create savings_goals table
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create investment_entries table
CREATE TABLE public.investment_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  invested NUMERIC NOT NULL,
  current NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  custom_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for income_entries
CREATE POLICY "Users can manage their own income entries" ON public.income_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for expense_entries
CREATE POLICY "Users can manage their own expense entries" ON public.expense_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for savings_goals
CREATE POLICY "Users can manage their own savings goals" ON public.savings_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for investment_entries
CREATE POLICY "Users can manage their own investment entries" ON public.investment_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_income_entries_updated_at
  BEFORE UPDATE ON public.income_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_entries_updated_at
  BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investment_entries_updated_at
  BEFORE UPDATE ON public.investment_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();