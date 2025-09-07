-- Fix the update_investment_total function to correctly calculate current value
CREATE OR REPLACE FUNCTION public.update_investment_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the current amount in investment_entries 
  -- Current = invested + sum of all profit_loss from transactions
  UPDATE public.investment_entries 
  SET current = invested + (
    SELECT COALESCE(SUM(profit_loss), 0) 
    FROM public.investment_transactions 
    WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id)
  )
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_investment_current_trigger ON investment_transactions;
CREATE TRIGGER update_investment_current_trigger
  AFTER INSERT OR UPDATE OR DELETE ON investment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_investment_total();

-- Manually update all existing investment entries to fix current values
UPDATE public.investment_entries 
SET current = invested + (
  SELECT COALESCE(SUM(profit_loss), 0) 
  FROM public.investment_transactions 
  WHERE investment_id = investment_entries.id
);