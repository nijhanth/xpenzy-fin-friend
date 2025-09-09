-- Update the investment total function to also update invested amount when transactions are added
CREATE OR REPLACE FUNCTION public.update_investment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update both invested and current amounts in investment_entries
  -- Invested = original invested + sum of all transaction amounts
  -- Current = new invested amount + sum of all profit_loss from transactions
  UPDATE public.investment_entries 
  SET 
    invested = (
      SELECT ie_original.invested + COALESCE(SUM(it.amount), 0)
      FROM public.investment_entries ie_original
      LEFT JOIN public.investment_transactions it ON it.investment_id = ie_original.id
      WHERE ie_original.id = COALESCE(NEW.investment_id, OLD.investment_id)
      GROUP BY ie_original.invested
    ),
    current = (
      SELECT ie_original.invested + COALESCE(SUM(it.amount), 0) + COALESCE(SUM(it.profit_loss), 0)
      FROM public.investment_entries ie_original
      LEFT JOIN public.investment_transactions it ON it.investment_id = ie_original.id
      WHERE ie_original.id = COALESCE(NEW.investment_id, OLD.investment_id)
      GROUP BY ie_original.invested
    )
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for investment transactions if it doesn't exist
DROP TRIGGER IF EXISTS update_investment_totals_trigger ON public.investment_transactions;
CREATE TRIGGER update_investment_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investment_total();