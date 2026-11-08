-- Create savings_transactions table
CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  savings_goal_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
DROP POLICY IF EXISTS "Users can manage their own savings transactions" ON public.savings_transactions;
CREATE POLICY "Users can manage their own savings transactions" 
ON public.savings_transactions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_savings_transactions_updated_at ON public.savings_transactions;
CREATE TRIGGER update_savings_transactions_updated_at
BEFORE UPDATE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
