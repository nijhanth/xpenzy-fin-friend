import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FinancialData, IncomeEntry, ExpenseEntry, SavingsGoal, InvestmentEntry, InvestmentTransaction, BudgetCategory, SavingsTransaction } from '@/types/financial';
import { incomeService, expenseService, savingsService, investmentService, budgetService, investmentTransactionService, savingsTransactionService } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FinancialContextType {
  data: FinancialData;
  isLoading: boolean;
  refreshBudgets: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshIncome: () => Promise<void>;
  refreshSavings: () => Promise<void>;
  refreshSavingsTransactions: () => Promise<void>;
  refreshInvestmentTransactions: () => Promise<void>;
  addIncome: (income: Omit<IncomeEntry, 'id'>) => void;
  addExpense: (expense: Omit<ExpenseEntry, 'id'>) => Promise<ExpenseEntry | undefined> | void;
  addSavingsGoal: (savings: Omit<SavingsGoal, 'id'>) => void;
  addInvestment: (investment: Omit<InvestmentEntry, 'id'>, showToast?: boolean) => Promise<InvestmentEntry | undefined>;
  addInvestmentTransaction: (transaction: Omit<InvestmentTransaction, 'id'>, showToast?: boolean) => Promise<void>;
  updateInvestmentTransaction: (id: string, transaction: Partial<InvestmentTransaction>, showToast?: boolean) => Promise<void>;
  deleteInvestmentTransaction: (id: string) => Promise<void>;
  getInvestmentTransactions: (investmentId: string) => InvestmentTransaction[];
  addSavingsTransaction: (transaction: Omit<SavingsTransaction, 'id'>) => Promise<boolean>;
  allocateExistingSavingsBalance: (goalId: string, amount: number, date: string) => Promise<boolean>;
  withdrawFromSavingsGoal: (goalId: string, amount: number, date: string, notes?: string) => Promise<boolean>;
  updateSavingsTransaction: (id: string, transaction: Partial<SavingsTransaction>) => Promise<void>;
  deleteSavingsTransaction: (id: string) => Promise<void>;
  getSavingsTransactions: (savingsGoalId: string) => SavingsTransaction[];
  addBudget: (budget: Omit<BudgetCategory, 'id'>) => Promise<BudgetCategory | undefined>;
  updateSavingsGoal: (id: string, current: number) => void;
  updateInvestment: (id: string, current: number) => void;
  addMoneyToInvestment: (investmentId: string, amount: number, date: string) => void;
  updateIncome: (id: string, income: Partial<Omit<IncomeEntry, 'id'>>) => void;
  updateExpense: (id: string, expense: Partial<Omit<ExpenseEntry, 'id'>>) => void;
  updateSavings: (id: string, savings: Partial<Omit<SavingsGoal, 'id'>>) => void;
  updateInvestmentEntry: (id: string, investment: Partial<Omit<InvestmentEntry, 'id'>>, showToast?: boolean) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Omit<BudgetCategory, 'id'>>) => void;
  deleteIncome: (id: string) => void;
  deleteExpense: (id: string) => void;
  deleteSavings: (id: string) => void;
  deleteInvestment: (id: string) => Promise<boolean>;
  deleteBudget: (id: string) => void;
  markGoalCompleted: (id: string) => Promise<void>;
  restoreGoal: (id: string) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unexpected database error.';
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FinancialData>({
    income: [],
    expenses: [],
    savings: [],
    investments: [],
    investmentTransactions: [],
    savingsTransactions: [],
    budgets: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  const refreshBudgets = async () => {
    try {
      const budgets = await budgetService.getAll();
      setData(prev => ({ ...prev, budgets }));
    } catch (error) {
      console.error('Error refreshing budgets after AI update:', error);
      toast({
        variant: 'destructive',
        title: 'Budget saved, but refresh failed',
        description: 'Reload the page to see the latest budget.',
      });
    }
  };

  const refreshExpenses = async () => {
    try {
      const expenses = await expenseService.getAll();
      setData(prev => ({ ...prev, expenses }));
    } catch (error) {
      console.error('Error refreshing expenses after AI update:', error);
      toast({
        variant: 'destructive',
        title: 'Expense saved, but refresh failed',
        description: 'Reload the page to see the latest expense.',
      });
    }
  };

  const refreshIncome = async () => {
    try {
      const income = await incomeService.getAll();
      setData(prev => ({ ...prev, income }));
    } catch (error) {
      console.error('Error refreshing income after AI update:', error);
      toast({
        variant: 'destructive',
        title: 'Income saved, but refresh failed',
        description: 'Reload the page to see the latest income.',
      });
    }
  };

  const refreshSavings = async () => {
    try {
      const savings = await savingsService.getAll();
      setData(prev => ({ ...prev, savings }));
    } catch (error) {
      console.error('Error refreshing savings after AI update:', error);
      toast({
        variant: 'destructive',
        title: 'Savings goal saved, but refresh failed',
        description: 'Reload the page to see the latest savings goal.',
      });
    }
  };

  const refreshSavingsTransactions = async () => {
    try {
      const savingsTransactions = await savingsTransactionService.getAll();
      setData(prev => ({ ...prev, savingsTransactions }));
      const savings = await savingsService.getAll();
      setData(prev => ({ ...prev, savings }));
    } catch (error) {
      console.error('Error refreshing savings transactions after AI update:', error);
      toast({
        variant: 'destructive',
        title: 'Savings saved, but refresh failed',
        description: 'Reload the page to see the latest savings transaction.',
      });
    }
  };

  const refreshInvestmentTransactions = async () => {
    try {
      const investmentTransactions = await investmentTransactionService.getAll();
      setData(prev => ({ ...prev, investmentTransactions }));
      const investments = await investmentService.getAll();
      setData(prev => ({ ...prev, investments }));
    } catch (error) {
      console.error('Error refreshing investment transactions after AI update:', error);
      toast({
        variant: 'destructive',
        title: 'Investment saved, but refresh failed',
        description: 'Reload the page to see the latest investment transaction.',
      });
    }
  };

  // Load all data on component mount, but only if user is authenticated
  React.useEffect(() => {
    const loadAllData = async () => {
      try {
        // Check if user is authenticated first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const [incomeData, expenseData, savingsData, investmentData, budgetData, investmentTransactionData, savingsTransactionData] = await Promise.all([
          incomeService.getAll(),
          expenseService.getAll(),
          savingsService.getAll(),
          investmentService.getAll(),
          budgetService.getAll(),
          investmentTransactionService.getAll(),
          savingsTransactionService.getAll()
        ]);

        const existingInvestmentIds = new Set(investmentData.map(investment => investment.id));
        const orphanedInvestmentIds = [...new Set(investmentTransactionData
          .filter(transaction => !existingInvestmentIds.has(transaction.investment_id))
          .map(transaction => transaction.investment_id))];
        let visibleInvestmentTransactions = investmentTransactionData;
        let visibleBudgets = budgetData;

        if (orphanedInvestmentIds.length > 0) {
          try {
            await Promise.all(orphanedInvestmentIds.map(id => investmentTransactionService.deleteByInvestmentId(id)));
            await budgetService.resetInvestmentBudgets(orphanedInvestmentIds);
            visibleInvestmentTransactions = investmentTransactionData
              .filter(transaction => !orphanedInvestmentIds.includes(transaction.investment_id));
            visibleBudgets = await budgetService.getAll();
            toast({
              title: 'Deleted investment history cleaned up',
              description: 'History and linked budget spending for removed holdings have been cleared.',
            });
          } catch (cleanupError) {
            console.error('Failed to clean up deleted investment history:', cleanupError);
            toast({
              variant: 'destructive',
              title: 'Could not clean up deleted investment history',
              description: 'Reload the app to retry clearing history and linked budget spending for removed holdings.',
            });
          }
        }

        setData({
          income: incomeData,
          expenses: expenseData,
          savings: savingsData,
          investments: investmentData,
          investmentTransactions: visibleInvestmentTransactions,
          savingsTransactions: savingsTransactionData,
          budgets: visibleBudgets
        });
      } catch (error) {
        console.error('Error loading financial data:', error);
        // Only show error toast if user is authenticated (to avoid showing errors on login page)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load your financial data."
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [toast]);

  const addIncome = async (income: Omit<IncomeEntry, 'id'>) => {
    try {
      const newIncome = await incomeService.create(income);
      setData(prev => ({
        ...prev,
        income: [newIncome, ...prev.income]
      }));
    } catch (error) {
      console.error('Error adding income:', error);
      const newIncome: IncomeEntry = {
      ...income,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      income: [...prev.income, newIncome]
    }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save income to database. Saved locally instead."
      });
    }
  };

  const refreshGoalAfterLinkedExpense = async (goalId: string | null | undefined) => {
    if (!goalId) return;
    try {
      const expenses = await expenseService.getAll();
      const usedAmount = expenses
        .filter(expense => expense.goalId === goalId)
        .reduce((total, expense) => total + Number(expense.amount || 0), 0);
      await savingsService.update(goalId, { used_amount: usedAmount });
      const refreshed = await savingsService.getAll();
      setData(prev => ({
        ...prev,
        expenses,
        savings: refreshed.map(goal => goal.id === goalId ? { ...goal, used_amount: usedAmount } : goal),
      }));
    } catch (e) {
      console.error('Failed to refresh goal after linked expense', e);
    }
  };

  const restoreGoal = async (id: string) => {
    const goalToRestore = data.savings.find(goal => goal.id === id);
    if (goalToRestore && data.savings.some(goal => {
      if (goal.id === id || goal.name.trim().toLocaleLowerCase() !== goalToRestore.name.trim().toLocaleLowerCase()) return false;
      const usedAmount = data.expenses.filter(expense => expense.goalId === goal.id).reduce((total, expense) => total + Number(expense.amount || 0), 0);
      const remaining = Math.max(0, Number(goal.current || 0) - usedAmount);
      return (goal.status ?? 'active') === 'active' || remaining > 0;
    })) {
      toast({ variant: 'destructive', title: 'This goal name is still in use', description: 'Close the active goal or release its remaining saved amount before restoring this one.' });
      return;
    }
    try {
      let updated = await savingsService.update(id, { status: 'active' } as any);
      try {
        updated = await savingsService.update(id, { completed_date: null } as any);
      } catch (dateError) {
        console.warn('Could not clear completed date; apply the savings goal schema migration.', dateError);
        updated = { ...updated, completed_date: null };
      }
      setData(prev => ({
        ...prev,
        savings: prev.savings.map(g => (g.id === id ? updated : g)),
      }));
    } catch (error) {
      console.error('Error restoring goal:', error);
      const { toast: sonnerToast } = await import('sonner');
      sonnerToast.error('Failed to restore goal');
    }
  };

  const markGoalCompleted = async (id: string) => {
    const goalToComplete = data.savings.find(goal => goal.id === id);
    if (!goalToComplete) return;
    try {
      let updated = await savingsService.update(id, { status: 'completed' } as any);
      const completedAt = new Date().toISOString();
      try {
        updated = await savingsService.update(id, { completed_date: completedAt } as any);
      } catch (dateError) {
        console.warn('Could not save completed date; apply the savings goal schema migration.', dateError);
        updated = { ...updated, completed_date: completedAt };
      }
      setData(prev => ({
        ...prev,
        savings: prev.savings.map(g => (g.id === id ? updated : g)),
      }));
      toast({
        title: 'Goal closed',
        description: `${updated.name} moved to completed goals. You can restore it from the completed goals section.`,
      });
    } catch (error) {
      console.error('Error marking goal completed:', error);
      toast({
        variant: 'destructive',
        title: 'Could not close goal',
        description: getErrorMessage(error),
      });
    }
  };

  const addExpense = async (expense: Omit<ExpenseEntry, 'id'>) => {
    try {
      const newExpense = await expenseService.create(expense);
      setData(prev => ({
        ...prev,
        expenses: [newExpense, ...prev.expenses]
      }));
      await refreshGoalAfterLinkedExpense(newExpense.goalId ?? null);
      return newExpense;
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to save expense: ${getErrorMessage(error)}`
      });
      return undefined;
    }
  };

  const addSavingsGoal = async (savings: Omit<SavingsGoal, 'id'>) => {
    const nameStillInUse = data.savings.some(goal => {
      if (goal.name.trim().toLocaleLowerCase() !== savings.name.trim().toLocaleLowerCase()) return false;
      const usedAmount = data.expenses.filter(expense => expense.goalId === goal.id).reduce((total, expense) => total + Number(expense.amount || 0), 0);
      const remaining = Math.max(0, Number(goal.current || 0) - usedAmount);
      return (goal.status ?? 'active') === 'active' || remaining > 0;
    });
    if (nameStillInUse) {
      toast({ variant: 'destructive', title: 'Goal name still has an active balance', description: 'Close the active goal and withdraw or spend its remaining saved amount before reusing the name.' });
      return;
    }
    try {
      const newSavings = await savingsService.create(savings);
      setData(prev => ({
        ...prev,
        savings: [newSavings, ...prev.savings]
      }));
    } catch (error) {
      console.error('Error adding savings goal:', error);
      const newSavings: SavingsGoal = {
      ...savings,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      savings: [...prev.savings, newSavings]
    }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save savings goal to database. Saved locally instead."
      });
    }
  };

  const addInvestment = async (investment: Omit<InvestmentEntry, 'id'>, showToast: boolean = true) => {
    try {
      const newInvestment = await investmentService.create(investment);
      
      // Add the new investment to local state
      setData(prev => ({
        ...prev,
        investments: [newInvestment, ...prev.investments]
      }));
      
      if (showToast) toast({
        title: "Success",
        description: "Investment created successfully. Use Monthly Update to record contributions and performance.",
      });
      return newInvestment;
    } catch (error) {
      console.error('Error adding investment:', error);
      if (!showToast) throw error;
      const newInvestment: InvestmentEntry = {
      ...investment,
      id: Date.now().toString()
    };
    
    setData(prev => ({
      ...prev,
      investments: [...prev.investments, newInvestment]
    }));
      if (showToast) toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save investment to database. Saved locally instead."
      });
      return newInvestment;
    }
  };

  const addInvestmentTransaction = async (transaction: Omit<InvestmentTransaction, 'id'>, showToast: boolean = true) => {
    try {
      const newTransaction = await investmentTransactionService.create(transaction);
      setData(prev => ({
        ...prev,
        investmentTransactions: [newTransaction, ...prev.investmentTransactions]
      }));
      
      // Refresh investment data to get updated totals from the database trigger
      try {
        const updatedInvestments = await investmentService.getAll();
        const updatedBudgets = await budgetService.getAll();
        setData(prev => ({
          ...prev,
          investments: updatedInvestments,
          budgets: updatedBudgets
        }));
      } catch (refreshError) {
        console.error('Error refreshing investment data:', refreshError);
      }
      
      if (showToast) {
        toast({
          title: "Success",
          description: "Investment monthly update saved successfully",
        });
      }
    } catch (error) {
      console.error('Error adding investment transaction:', error);
      if (!showToast) throw error;
      toast({
        title: "Error",
        description: "Failed to add money to investment",
        variant: "destructive",
      });
    }
  };

  const updateInvestmentTransaction = async (id: string, transaction: Partial<InvestmentTransaction>, showToast: boolean = true) => {
    try {
      const updatedTransaction = await investmentTransactionService.update(id, transaction);
      setData(prev => ({
        ...prev,
        investmentTransactions: prev.investmentTransactions.map(t => 
          t.id === id ? updatedTransaction : t
        )
      }));
      
      // Refresh investment data to get updated totals from the database trigger
      try {
        const updatedInvestments = await investmentService.getAll();
        const updatedBudgets = await budgetService.getAll();
        setData(prev => ({
          ...prev,
          investments: updatedInvestments,
          budgets: updatedBudgets
        }));
      } catch (refreshError) {
        console.error('Error refreshing investment data:', refreshError);
      }
      
      if (showToast) toast({
        title: "Success",
        description: "Investment monthly update updated successfully",
      });
    } catch (error) {
      console.error('Error updating investment transaction:', error);
      if (!showToast) throw error;
      toast({
        title: "Error",
        description: "Failed to update investment transaction",
        variant: "destructive",
      });
    }
  };

  const deleteInvestmentTransaction = async (id: string) => {
    try {
      await investmentTransactionService.delete(id);
      setData(prev => ({
        ...prev,
        investmentTransactions: prev.investmentTransactions.filter(t => t.id !== id)
      }));
      
      // Refresh investment data to get updated totals from the database trigger
      try {
        const updatedInvestments = await investmentService.getAll();
        const updatedBudgets = await budgetService.getAll();
        setData(prev => ({
          ...prev,
          investments: updatedInvestments,
          budgets: updatedBudgets
        }));
      } catch (refreshError) {
        console.error('Error refreshing investment data:', refreshError);
      }
      
      toast({
        title: "Success",
        description: "Investment transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting investment transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete investment transaction",
        variant: "destructive",
      });
    }
  };

  const getInvestmentTransactions = (investmentId: string): InvestmentTransaction[] => {
    return data.investmentTransactions.filter(t => t.investment_id === investmentId);
  };

  const addSavingsTransaction = async (transaction: Omit<SavingsTransaction, 'id'>) => {
    try {
      const newTransaction = await savingsTransactionService.create(transaction);
      setData(prev => ({
        ...prev,
        savingsTransactions: [newTransaction, ...prev.savingsTransactions]
      }));
      
      // Refresh savings data to get updated totals from the database trigger
      try {
        const updatedSavings = await savingsService.getAll();
        const updatedBudgets = await budgetService.getAll();
        setData(prev => ({
          ...prev,
          savings: updatedSavings,
          budgets: updatedBudgets
        }));
      } catch (refreshError) {
        console.error('Error refreshing savings data:', refreshError);
      }
      
      toast({
        title: "Success",
        description: "Money added to savings goal successfully",
      });
      return true;
    } catch (error) {
      console.error('Error adding savings transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add money to savings goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const allocateExistingSavingsBalance = async (goalId: string, amount: number, date: string): Promise<boolean> => {
    const goal = data.savings.find(item => item.id === goalId);
    if (!goal || !Number.isFinite(amount) || amount < 0 || !date) return false;

    const recordedAmount = data.savingsTransactions
      .filter(transaction => transaction.savings_goal_id === goalId)
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const currentAllocation = data.savingsTransactions
      .filter(transaction => transaction.savings_goal_id === goalId && transaction.notes?.startsWith('Existing balance allocation:'))
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const reconciliation = Number(goal.current || 0) - recordedAmount;
    const allocationDelta = amount - currentAllocation;
    if (Math.abs(reconciliation) < 0.01 && Math.abs(allocationDelta) < 0.01) return true;

    try {
      const createdTransactions: SavingsTransaction[] = [];
      if (Math.abs(reconciliation) >= 0.01) {
        createdTransactions.push(await savingsTransactionService.create({
          savings_goal_id: goalId,
          amount: reconciliation,
          date,
          notes: `Existing balance adjustment: reconcile recorded transactions for ${goal.name}`,
        }));
      }
      if (Math.abs(allocationDelta) >= 0.01) {
        createdTransactions.push(await savingsTransactionService.create({
          savings_goal_id: goalId,
          amount: allocationDelta,
          date,
          notes: `Existing balance allocation: set ${goal.name} to ${amount}`,
        }));
      }
      setData(prev => ({
        ...prev,
        savingsTransactions: [...createdTransactions, ...prev.savingsTransactions],
        savings: prev.savings.map(item => item.id === goalId ? { ...item, current: Number(item.current || 0) + allocationDelta } : item),
      }));

      try {
        const [savings, savingsTransactions, budgets] = await Promise.all([
          savingsService.getAll(), savingsTransactionService.getAll(), budgetService.getAll(),
        ]);
        setData(prev => ({ ...prev, savings, savingsTransactions, budgets }));
      } catch (refreshError) {
        console.error('Allocation saved but refresh failed:', refreshError);
      }
      toast({ title: 'Existing balance allocated', description: `${amount.toLocaleString('en-IN')} allocated to ${goal.name}.` });
      return true;
    } catch (error) {
      console.error('Error allocating existing balance:', error);
      toast({ variant: 'destructive', title: 'Could not save allocation', description: getErrorMessage(error) });
      return false;
    }
  };

  const withdrawFromSavingsGoal = async (goalId: string, amount: number, date: string, notes?: string): Promise<boolean> => {
    const goal = data.savings.find(item => item.id === goalId);
    const usedAmount = data.expenses
      .filter(expense => expense.goalId === goalId)
      .reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const available = goal ? Math.max(0, Number(goal.current || 0) - usedAmount) : 0;
    if (!goal || !Number.isFinite(amount) || amount <= 0 || amount > available || !date) {
      toast({ variant: 'destructive', title: 'Invalid withdrawal', description: `Enter an amount up to ${available.toLocaleString('en-IN')}.` });
      return false;
    }

    try {
      const recordedAmount = data.savingsTransactions
        .filter(transaction => transaction.savings_goal_id === goalId)
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
      const balanceAdjustment = Number(goal.current || 0) - recordedAmount;
      const createdTransactions: SavingsTransaction[] = [];
      if (Math.abs(balanceAdjustment) > 0.009) {
        createdTransactions.push(await savingsTransactionService.create({
          savings_goal_id: goalId,
          amount: balanceAdjustment,
          date,
          notes: `Existing balance adjustment: reconcile recorded transactions for ${goal.name}`,
        }));
      }

      createdTransactions.push(await savingsTransactionService.create({
        savings_goal_id: goalId,
        amount: -amount,
        date,
        notes: notes?.trim() || `Withdrawal to bank from ${goal.name}`,
      }));

      setData(prev => ({
        ...prev,
        savings: prev.savings.map(item => item.id === goalId ? { ...item, current: Number(item.current || 0) - amount } : item),
        savingsTransactions: [...createdTransactions, ...prev.savingsTransactions],
      }));

      try {
        const [savings, savingsTransactions, budgets] = await Promise.all([
          savingsService.getAll(),
          savingsTransactionService.getAll(),
          budgetService.getAll(),
        ]);
        setData(prev => ({ ...prev, savings, savingsTransactions, budgets }));
      } catch (refreshError) {
        console.error('Withdrawal saved but refresh failed:', refreshError);
      }
      toast({ title: 'Withdrawal recorded', description: `${amount.toLocaleString('en-IN')} withdrawn from ${goal.name} to your bank balance.` });
      return true;
    } catch (error) {
      console.error('Error withdrawing from savings goal:', error);
      toast({ variant: 'destructive', title: 'Could not record withdrawal', description: getErrorMessage(error) });
      return false;
    }
  };

  const updateSavingsTransaction = async (id: string, transaction: Partial<SavingsTransaction>) => {
    try {
      const updatedTransaction = await savingsTransactionService.update(id, transaction);
      setData(prev => ({
        ...prev,
        savingsTransactions: prev.savingsTransactions.map(t => 
          t.id === id ? updatedTransaction : t
        )
      }));
      
      // Refresh savings data to get updated totals from the database trigger
      try {
        const updatedSavings = await savingsService.getAll();
        const updatedBudgets = await budgetService.getAll();
        setData(prev => ({
          ...prev,
          savings: updatedSavings,
          budgets: updatedBudgets
        }));
      } catch (refreshError) {
        console.error('Error refreshing savings data:', refreshError);
      }
      
      toast({
        title: "Success",
        description: "Savings transaction updated successfully",
      });
    } catch (error) {
      console.error('Error updating savings transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update savings transaction",
        variant: "destructive",
      });
    }
  };

  const deleteSavingsTransaction = async (id: string) => {
    try {
      await savingsTransactionService.delete(id);
      setData(prev => ({
        ...prev,
        savingsTransactions: prev.savingsTransactions.filter(t => t.id !== id)
      }));
      
      // Refresh savings data to get updated totals from the database trigger
      try {
        const updatedSavings = await savingsService.getAll();
        const updatedBudgets = await budgetService.getAll();
        setData(prev => ({
          ...prev,
          savings: updatedSavings,
          budgets: updatedBudgets
        }));
      } catch (refreshError) {
        console.error('Error refreshing savings data:', refreshError);
      }
      
      toast({
        title: "Success",
        description: "Savings transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting savings transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete savings transaction",
        variant: "destructive",
      });
    }
  };

  const getSavingsTransactions = (savingsGoalId: string): SavingsTransaction[] => {
    return data.savingsTransactions.filter(t => t.savings_goal_id === savingsGoalId);
  };

  const addMoneyToInvestment = async (investmentId: string, amount: number, date: string) => {
    // Add transaction record
    await addInvestmentTransaction({
      investment_id: investmentId,
      amount,
      date,
      notes: `Added ₹${amount.toLocaleString()} to investment`
    });
  };

  const updateSavingsGoal = (id: string, current: number) => {
    setData(prev => ({
      ...prev,
      savings: prev.savings.map(goal =>
        goal.id === id ? { ...goal, current } : goal
      )
    }));
  };

  const updateInvestment = (id: string, current: number) => {
    setData(prev => ({
      ...prev,
      investments: prev.investments.map(inv =>
        inv.id === id ? { ...inv, current } : inv
      )
    }));
  };

  const updateIncome = async (id: string, income: Partial<Omit<IncomeEntry, 'id'>>) => {
    try {
      const updatedIncome = await incomeService.update(id, income);
      setData(prev => ({
        ...prev,
        income: prev.income.map(item =>
          item.id === id ? updatedIncome : item
        )
      }));
    } catch (error) {
      console.error('Error updating income:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update income in database."
      });
    }
  };

  const updateExpense = async (id: string, expense: Partial<Omit<ExpenseEntry, 'id'>>) => {
    try {
      const prevExpense = data.expenses.find(e => e.id === id);
      const updatedExpense = await expenseService.update(id, expense);
      setData(prev => ({
        ...prev,
        expenses: prev.expenses.map(item =>
          item.id === id ? updatedExpense : item
        )
      }));
      const goalsToRefresh = new Set<string>();
      if (prevExpense?.goalId) goalsToRefresh.add(prevExpense.goalId);
      if (updatedExpense.goalId) goalsToRefresh.add(updatedExpense.goalId);
      for (const gid of goalsToRefresh) {
        await refreshGoalAfterLinkedExpense(gid);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update expense in database."
      });
    }
  };

  const updateSavings = async (id: string, savings: Partial<Omit<SavingsGoal, 'id'>>) => {
    try {
      const updatedSavings = await savingsService.update(id, savings);
      setData(prev => ({
        ...prev,
        savings: prev.savings.map(item =>
          item.id === id ? updatedSavings : item
        )
      }));
    } catch (error) {
      console.error('Error updating savings goal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update savings goal in database."
      });
    }
  };

  const updateInvestmentEntry = async (id: string, investment: Partial<Omit<InvestmentEntry, 'id'>>, showToast: boolean = true) => {
    try {
      const updatedInvestment = await investmentService.update(id, investment);
      setData(prev => ({
        ...prev,
        investments: prev.investments.map(item =>
          item.id === id ? updatedInvestment : item
        )
      }));
    } catch (error) {
      console.error('Error updating investment:', error);
      if (!showToast) throw error;
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update investment in database."
      });
    }
  };

  const updateBudget = async (id: string, budget: Partial<Omit<BudgetCategory, 'id'>>) => {
    try {
      const updatedBudget = await budgetService.update(id, budget);
      setData(prev => ({
        ...prev,
        budgets: prev.budgets.map(item =>
          item.id === id ? updatedBudget : item
        )
      }));
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update budget in database."
      });
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      await incomeService.delete(id);
      setData(prev => ({
        ...prev,
        income: prev.income.filter(item => item.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete income from database."
      });
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const previousExpense = data.expenses.find(item => item.id === id);
      await expenseService.delete(id);
      setData(prev => ({
        ...prev,
        expenses: prev.expenses.filter(item => item.id !== id)
      }));
      await refreshGoalAfterLinkedExpense(previousExpense?.goalId);
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete expense from database."
      });
    }
  };

  const deleteSavings = async (id: string) => {
    try {
      await savingsService.delete(id);
      setData(prev => ({
        ...prev,
        savings: prev.savings.filter(item => item.id !== id),
        savingsTransactions: prev.savingsTransactions.filter(transaction => transaction.savings_goal_id !== id),
        expenses: prev.expenses.map(expense => expense.goalId === id ? { ...expense, goalId: null } : expense),
      }));
    } catch (error) {
      console.error('Error deleting savings goal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete savings goal from database."
      });
    }
  };

  const deleteInvestment = async (id: string): Promise<boolean> => {
    try {
      await investmentTransactionService.deleteByInvestmentId(id);
      await investmentService.delete(id);
      setData(prev => ({
        ...prev,
        investments: prev.investments.filter(item => item.id !== id),
        investmentTransactions: prev.investmentTransactions.filter(transaction => transaction.investment_id !== id),
        budgets: prev.budgets.map(budget => budget.linked_type === 'investment' && budget.linked_id === id
          ? { ...budget, current: 0 }
          : budget),
      }));

      try {
        const [investments, investmentTransactions, refreshedBudgets] = await Promise.all([
          investmentService.getAll(),
          investmentTransactionService.getAll(),
          budgetService.getAll(),
        ]);
        setData(prev => ({ ...prev, investments, investmentTransactions, budgets: refreshedBudgets }));
      } catch (refreshError) {
        console.error('Investment deleted but financial data refresh failed:', refreshError);
        toast({
          variant: 'destructive',
          title: 'Investment deleted, but refresh failed',
          description: 'Reload the page to confirm the latest investment and budget totals.',
        });
      }
      return true;
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete investment and its history: ${getErrorMessage(error)}`
      });
      return false;
    }
  };

  const addBudget = async (budget: Omit<BudgetCategory, 'id'>): Promise<BudgetCategory | undefined> => {
    try {
      const newBudget = await budgetService.create(budget);
      setData(prev => ({
        ...prev,
        budgets: [newBudget, ...prev.budgets]
      }));
      if (!newBudget.year && !newBudget.month && !newBudget.week && !newBudget.linked_type) {
        toast({
          title: 'Budget saved with limited tracking',
          description: 'Apply the latest Supabase database migration to enable date-specific and linked budgets.'
        });
      }
      return newBudget;
    } catch (error) {
      console.error('Error adding budget:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to save budget: ${getErrorMessage(error)}`
      });
      return undefined;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await budgetService.delete(id);
      setData(prev => ({
        ...prev,
        budgets: prev.budgets.filter(item => item.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete budget from database."
      });
    }
  };

  console.log('FinancialProvider rendering, addBudget exists:', typeof addBudget);
  return (
    <FinancialContext.Provider value={{
      data,
      isLoading,
      refreshBudgets,
      refreshExpenses,
      refreshIncome,
      refreshSavings,
      refreshSavingsTransactions,
      refreshInvestmentTransactions,
      addIncome,
      addExpense,
      addSavingsGoal,
      addInvestment,
      addInvestmentTransaction,
      updateInvestmentTransaction,
      deleteInvestmentTransaction,
      getInvestmentTransactions,
      addSavingsTransaction,
      allocateExistingSavingsBalance,
      withdrawFromSavingsGoal,
      updateSavingsTransaction,
      deleteSavingsTransaction,
      getSavingsTransactions,
      addBudget,
      addMoneyToInvestment,
      updateSavingsGoal,
      updateInvestment,
      updateIncome,
      updateExpense,
      updateSavings,
      updateInvestmentEntry,
      updateBudget,
      deleteIncome,
      deleteExpense,
      deleteSavings,
      deleteInvestment,
      deleteBudget,
      markGoalCompleted,
      restoreGoal
    }}>
      {children}
    </FinancialContext.Provider>
  );
};
