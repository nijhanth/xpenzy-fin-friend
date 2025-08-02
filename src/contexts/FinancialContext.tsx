import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FinancialData, IncomeEntry, ExpenseEntry, SavingsGoal, InvestmentEntry, InvestmentTransaction, BudgetCategory } from '@/types/financial';
import { incomeService, expenseService, savingsService, investmentService, budgetService, investmentTransactionService } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FinancialContextType {
  data: FinancialData;
  isLoading: boolean;
  addIncome: (income: Omit<IncomeEntry, 'id'>) => void;
  addExpense: (expense: Omit<ExpenseEntry, 'id'>) => void;
  addSavingsGoal: (savings: Omit<SavingsGoal, 'id'>) => void;
  addInvestment: (investment: Omit<InvestmentEntry, 'id'>) => void;
  addInvestmentTransaction: (transaction: Omit<InvestmentTransaction, 'id'>) => Promise<void>;
  updateInvestmentTransaction: (id: string, transaction: Partial<InvestmentTransaction>) => Promise<void>;
  deleteInvestmentTransaction: (id: string) => Promise<void>;
  getInvestmentTransactions: (investmentId: string) => InvestmentTransaction[];
  addBudget: (budget: Omit<BudgetCategory, 'id'>) => void;
  updateSavingsGoal: (id: string, current: number) => void;
  updateInvestment: (id: string, current: number) => void;
  addMoneyToInvestment: (investmentId: string, amount: number, date: string) => void;
  updateIncome: (id: string, income: Partial<Omit<IncomeEntry, 'id'>>) => void;
  updateExpense: (id: string, expense: Partial<Omit<ExpenseEntry, 'id'>>) => void;
  updateSavings: (id: string, savings: Partial<Omit<SavingsGoal, 'id'>>) => void;
  updateInvestmentEntry: (id: string, investment: Partial<Omit<InvestmentEntry, 'id'>>) => void;
  updateBudget: (id: string, budget: Partial<Omit<BudgetCategory, 'id'>>) => void;
  deleteIncome: (id: string) => void;
  deleteExpense: (id: string) => void;
  deleteSavings: (id: string) => void;
  deleteInvestment: (id: string) => void;
  deleteBudget: (id: string) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

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
    budgets: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

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

        const [incomeData, expenseData, savingsData, investmentData, budgetData, transactionData] = await Promise.all([
          incomeService.getAll(),
          expenseService.getAll(),
          savingsService.getAll(),
          investmentService.getAll(),
          budgetService.getAll(),
          investmentTransactionService.getAll()
        ]);

        setData({
          income: incomeData,
          expenses: expenseData,
          savings: savingsData,
          investments: investmentData,
          investmentTransactions: transactionData,
          budgets: budgetData
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

  const addExpense = async (expense: Omit<ExpenseEntry, 'id'>) => {
    try {
      const newExpense = await expenseService.create(expense);
      setData(prev => ({
        ...prev,
        expenses: [newExpense, ...prev.expenses]
      }));
    } catch (error) {
      console.error('Error adding expense:', error);
      const newExpense: ExpenseEntry = {
      ...expense,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save expense to database. Saved locally instead."
      });
    }
  };

  const addSavingsGoal = async (savings: Omit<SavingsGoal, 'id'>) => {
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

  const addInvestment = async (investment: Omit<InvestmentEntry, 'id'>) => {
    try {
      const newInvestment = await investmentService.create(investment);
      
      // Add initial transaction record
      try {
        await addInvestmentTransaction({
          investment_id: newInvestment.id,
          amount: newInvestment.invested,
          date: newInvestment.date,
          notes: `Initial investment in ${newInvestment.name}`
        });
      } catch (error) {
        console.error('Error creating initial transaction:', error);
      }
      
      setData(prev => ({
        ...prev,
        investments: [newInvestment, ...prev.investments]
      }));
    } catch (error) {
      console.error('Error adding investment:', error);
      const newInvestment: InvestmentEntry = {
      ...investment,
      id: Date.now().toString()
    };
    
    setData(prev => ({
      ...prev,
      investments: [...prev.investments, newInvestment]
    }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save investment to database. Saved locally instead."
      });
    }
  };

  const addInvestmentTransaction = async (transaction: Omit<InvestmentTransaction, 'id'>) => {
    try {
      const newTransaction = await investmentTransactionService.create(transaction);
      setData(prev => ({
        ...prev,
        investmentTransactions: [newTransaction, ...prev.investmentTransactions]
      }));
      
      // Refresh investment data to get updated totals from the database trigger
      try {
        const updatedInvestments = await investmentService.getAll();
        setData(prev => ({
          ...prev,
          investments: updatedInvestments
        }));
      } catch (refreshError) {
        console.error('Error refreshing investment data:', refreshError);
      }
      
      toast({
        title: "Success",
        description: "Money added to investment successfully",
      });
    } catch (error) {
      console.error('Error adding investment transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add money to investment",
        variant: "destructive",
      });
    }
  };

  const updateInvestmentTransaction = async (id: string, transaction: Partial<InvestmentTransaction>) => {
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
        setData(prev => ({
          ...prev,
          investments: updatedInvestments
        }));
      } catch (refreshError) {
        console.error('Error refreshing investment data:', refreshError);
      }
      
      toast({
        title: "Success",
        description: "Investment transaction updated successfully",
      });
    } catch (error) {
      console.error('Error updating investment transaction:', error);
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
        setData(prev => ({
          ...prev,
          investments: updatedInvestments
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
      const updatedExpense = await expenseService.update(id, expense);
      setData(prev => ({
        ...prev,
        expenses: prev.expenses.map(item =>
          item.id === id ? updatedExpense : item
        )
      }));
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

  const updateInvestmentEntry = async (id: string, investment: Partial<Omit<InvestmentEntry, 'id'>>) => {
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
      await expenseService.delete(id);
      setData(prev => ({
        ...prev,
        expenses: prev.expenses.filter(item => item.id !== id)
      }));
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
        savings: prev.savings.filter(item => item.id !== id)
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

  const deleteInvestment = async (id: string) => {
    try {
      await investmentService.delete(id);
      setData(prev => ({
        ...prev,
        investments: prev.investments.filter(item => item.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete investment from database."
      });
    }
  };

  const addBudget = async (budget: Omit<BudgetCategory, 'id'>) => {
    console.log('addBudget function called', budget);
    try {
      const newBudget = await budgetService.create(budget);
      setData(prev => ({
        ...prev,
        budgets: [newBudget, ...prev.budgets]
      }));
    } catch (error) {
      console.error('Error adding budget:', error);
      const newBudget: BudgetCategory = {
        ...budget,
        id: Date.now().toString()
      };
      setData(prev => ({
        ...prev,
        budgets: [...prev.budgets, newBudget]
      }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save budget to database. Saved locally instead."
      });
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
      addIncome,
      addExpense,
      addSavingsGoal,
      addInvestment,
      addInvestmentTransaction,
      updateInvestmentTransaction,
      deleteInvestmentTransaction,
      getInvestmentTransactions,
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
      deleteBudget
    }}>
      {children}
    </FinancialContext.Provider>
  );
};