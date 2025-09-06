-- Check existing triggers and create missing ones for budget updates

-- Create triggers for savings transactions to update budgets
DROP TRIGGER IF EXISTS update_budget_from_savings_trigger ON public.savings_transactions;
CREATE TRIGGER update_budget_from_savings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

-- Create triggers for investment transactions to update budgets
DROP TRIGGER IF EXISTS update_budget_from_investments_trigger ON public.investment_transactions;
CREATE TRIGGER update_budget_from_investments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();