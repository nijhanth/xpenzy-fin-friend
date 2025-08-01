-- Create investment_transactions table for tracking money additions
CREATE TABLE public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own investment transactions" 
ON public.investment_transactions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_transactions_updated_at
BEFORE UPDATE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update investment total when transactions change
CREATE OR REPLACE FUNCTION public.update_investment_total()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update investment totals
CREATE TRIGGER update_investment_total_on_insert
AFTER INSERT ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_investment_total();

CREATE TRIGGER update_investment_total_on_update
AFTER UPDATE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_investment_total();

CREATE TRIGGER update_investment_total_on_delete
AFTER DELETE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_investment_total();