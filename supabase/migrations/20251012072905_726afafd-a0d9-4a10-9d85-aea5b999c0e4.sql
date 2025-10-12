-- Fix investment calculation logic by separating initial investment from transaction additions

-- Add initial_invested column to track the original investment amount
ALTER TABLE public.investment_entries 
ADD COLUMN initial_invested numeric;

-- Populate initial_invested with current invested values for existing records
UPDATE public.investment_entries 
SET initial_invested = invested;

-- Make initial_invested NOT NULL after populating
ALTER TABLE public.investment_entries 
ALTER COLUMN initial_invested SET NOT NULL;

-- Update the trigger function to use initial_invested
CREATE OR REPLACE FUNCTION public.update_investment_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_invested numeric;
  total_transaction_amount numeric;
  total_profit_loss numeric;
BEGIN
  -- Get the initial invested amount (this never changes)
  SELECT initial_invested INTO base_invested 
  FROM public.investment_entries 
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total transaction amounts for this investment
  SELECT COALESCE(SUM(amount), 0) INTO total_transaction_amount
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total profit/loss for this investment
  SELECT COALESCE(SUM(profit_loss), 0) INTO total_profit_loss
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Update the investment entry
  -- invested = base investment + all transaction amounts
  -- current = invested + profit/loss
  UPDATE public.investment_entries 
  SET 
    invested = base_invested + total_transaction_amount,
    current = base_invested + total_transaction_amount + total_profit_loss
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;