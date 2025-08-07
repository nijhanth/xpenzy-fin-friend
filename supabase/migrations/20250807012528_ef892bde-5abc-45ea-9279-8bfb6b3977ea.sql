-- Create function to update savings goal current amount based on transactions
CREATE OR REPLACE FUNCTION public.update_savings_goal_current()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the current amount in savings_goals by summing all transactions
  UPDATE public.savings_goals 
  SET current = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.savings_transactions 
    WHERE savings_goal_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
  )
  WHERE id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for INSERT, UPDATE, and DELETE on savings_transactions
CREATE TRIGGER update_savings_goal_current_on_insert
  AFTER INSERT ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_current();

CREATE TRIGGER update_savings_goal_current_on_update
  AFTER UPDATE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_current();

CREATE TRIGGER update_savings_goal_current_on_delete
  AFTER DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goal_current();