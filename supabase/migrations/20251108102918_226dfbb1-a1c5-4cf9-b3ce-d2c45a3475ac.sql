-- Create trigger to update budget from savings transactions
DROP TRIGGER IF EXISTS update_budget_from_savings_trigger ON public.savings_transactions;

CREATE TRIGGER update_budget_from_savings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_savings();

-- Create trigger to update budget from investment transactions
DROP TRIGGER IF EXISTS update_budget_from_investments_trigger ON public.investment_transactions;

CREATE TRIGGER update_budget_from_investments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_investments();

-- Create trigger to update budget from expenses
DROP TRIGGER IF EXISTS update_budget_from_expenses_trigger ON public.expense_entries;

CREATE TRIGGER update_budget_from_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_from_expenses();