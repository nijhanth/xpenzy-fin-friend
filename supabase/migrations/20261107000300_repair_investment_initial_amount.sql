-- Restore the original investment basis expected by the investment tracker.
ALTER TABLE public.investment_entries
  ADD COLUMN IF NOT EXISTS initial_invested numeric;

UPDATE public.investment_entries
SET initial_invested = invested
WHERE initial_invested IS NULL;

ALTER TABLE public.investment_entries
  ALTER COLUMN initial_invested SET NOT NULL;

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
  investment_row_id uuid;
BEGIN
  investment_row_id := COALESCE(NEW.investment_id, OLD.investment_id);

  SELECT initial_invested INTO base_invested
  FROM public.investment_entries
  WHERE id = investment_row_id;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(profit_loss), 0)
  INTO total_transaction_amount, total_profit_loss
  FROM public.investment_transactions
  WHERE investment_id = investment_row_id;

  UPDATE public.investment_entries
  SET invested = base_invested + total_transaction_amount,
      current = base_invested + total_transaction_amount + total_profit_loss
  WHERE id = investment_row_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Refresh PostgREST metadata so the app can see the restored column immediately.
NOTIFY pgrst, 'reload schema';
