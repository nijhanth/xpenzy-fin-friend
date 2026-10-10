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

-- Add profit_loss column to investment_transactions table
ALTER TABLE public.investment_transactions 
ADD COLUMN profit_loss NUMERIC DEFAULT 0;

-- Create budget_categories table for cross-device syncing
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own budget categories" 
ON public.budget_categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget categories" 
ON public.budget_categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget categories" 
ON public.budget_categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget categories" 
ON public.budget_categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_budget_categories_updated_at
BEFORE UPDATE ON public.budget_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add icon column to budget_categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.budget_categories ADD COLUMN icon TEXT DEFAULT '💰';
  END IF;
END $$;

-- Update existing records to have the default icon if they don't have one
UPDATE public.budget_categories 
SET icon = '💰' 
WHERE icon IS NULL OR icon = '';

-- Data API grants (required on this backend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_transactions, public.budget_categories TO authenticated;
GRANT ALL ON public.investment_transactions, public.budget_categories TO service_role;