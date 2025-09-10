/*
  # Fix Investment Calculation Logic

  1. Changes
    - Update the investment total function to correctly calculate amounts
    - invested = sum of all transaction amounts (no original amount)
    - current = invested + profit/loss from transactions

  2. Security
    - No changes to RLS policies needed
*/

-- Fix the investment total function to correctly calculate amounts
CREATE OR REPLACE FUNCTION public.update_investment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_transaction_amount numeric;
  total_profit_loss numeric;
BEGIN
  -- Get total transaction amounts for this investment
  SELECT COALESCE(SUM(amount), 0) INTO total_transaction_amount
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total profit/loss for this investment
  SELECT COALESCE(SUM(profit_loss), 0) INTO total_profit_loss
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Update the investment entry
  -- invested = sum of all transaction amounts (no original amount)
  -- current = invested + profit/loss
  UPDATE public.investment_entries 
  SET 
    invested = total_transaction_amount,
    current = total_transaction_amount + total_profit_loss
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update all existing investment entries to fix their amounts
UPDATE public.investment_entries 
SET 
  invested = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.investment_transactions 
    WHERE investment_id = investment_entries.id
  ),
  current = (
    SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(profit_loss), 0)
    FROM public.investment_transactions 
    WHERE investment_id = investment_entries.id
  );