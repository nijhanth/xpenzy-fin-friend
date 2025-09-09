-- Fix the investment total function to correctly calculate amounts
CREATE OR REPLACE FUNCTION public.update_investment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  original_invested numeric;
  total_transaction_amount numeric;
  total_profit_loss numeric;
BEGIN
  -- Get the original invested amount (this should not change)
  SELECT invested INTO original_invested 
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
  -- invested = original invested + all transaction amounts
  -- current = invested + profit/loss
  UPDATE public.investment_entries 
  SET 
    invested = original_invested + total_transaction_amount,
    current = original_invested + total_transaction_amount + total_profit_loss
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;