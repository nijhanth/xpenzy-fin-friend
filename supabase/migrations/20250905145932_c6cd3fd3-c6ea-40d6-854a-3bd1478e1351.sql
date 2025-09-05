-- Add columns to budget_categories for linking to savings/investment goals
ALTER TABLE public.budget_categories 
ADD COLUMN linked_type text DEFAULT 'expenses',
ADD COLUMN linked_id uuid;

-- Add index for better performance on linked fields
CREATE INDEX idx_budget_categories_linked ON public.budget_categories(linked_type, linked_id);

-- Create function to update budget current amount when savings transactions are added
CREATE OR REPLACE FUNCTION public.update_budget_from_savings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update budget categories linked to this savings goal
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(st.amount), 0)
    FROM public.savings_transactions st
    WHERE st.savings_goal_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
    AND EXTRACT(YEAR FROM st.date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM st.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  )
  WHERE linked_type = 'savings' 
  AND linked_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
  AND period = 'monthly'
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create function to update budget current amount when investment transactions are added
CREATE OR REPLACE FUNCTION public.update_budget_from_investments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update budget categories linked to this investment
  UPDATE public.budget_categories 
  SET current = (
    SELECT COALESCE(SUM(it.amount), 0)
    FROM public.investment_transactions it
    WHERE it.investment_id = COALESCE(NEW.investment_id, OLD.investment_id)
    AND EXTRACT(YEAR FROM it.date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM it.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  )
  WHERE linked_type = 'investment' 
  AND linked_id = COALESCE(NEW.investment_id, OLD.investment_id)
  AND period = 'monthly'
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for savings transactions
CREATE TRIGGER update_budget_from_savings_on_insert
  AFTER INSERT ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

CREATE TRIGGER update_budget_from_savings_on_update
  AFTER UPDATE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

CREATE TRIGGER update_budget_from_savings_on_delete
  AFTER DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

-- Create triggers for investment transactions
CREATE TRIGGER update_budget_from_investments_on_insert
  AFTER INSERT ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

CREATE TRIGGER update_budget_from_investments_on_update
  AFTER UPDATE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

CREATE TRIGGER update_budget_from_investments_on_delete
  AFTER DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();