import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FinancialData, IncomeEntry, ExpenseEntry, SavingsGoal, InvestmentEntry, InvestmentTransaction } from '@/types/financial';
import { incomeService, expenseService, savingsService, investmentService } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

interface FinancialContextType {
  data: FinancialData;
  isLoading: boolean;
  addIncome: (income: Omit<IncomeEntry, 'id'>) => void;
  addExpense: (expense: Omit<ExpenseEntry, 'id'>) => void;
  addSavingsGoal: (savings: Omit<SavingsGoal, 'id'>) => void;
  addInvestment: (investment: Omit<InvestmentEntry, 'id'>) => void;
  addInvestmentTransaction: (transaction: Omit<InvestmentTransaction, 'id'>) => void;
  updateSavingsGoal: (id: string, current: number) => void;
  updateInvestment: (id: string, current: number) => void;
  addMoneyToInvestment: (investmentId: string, amount: number, date: string) => void;
  updateIncome: (id: string, income: Partial<Omit<IncomeEntry, 'id'>>) => void;
  updateExpense: (id: string, expense: Partial<Omit<ExpenseEntry, 'id'>>) => void;
  updateSavings: (id: string, savings: Partial<Omit<SavingsGoal, 'id'>>) => void;
  updateInvestmentEntry: (id: string, investment: Partial<Omit<InvestmentEntry, 'id'>>) => void;
  deleteIncome: (id: string) => void;
  deleteExpense: (id: string) => void;
  deleteSavings: (id: string) => void;
  deleteInvestment: (id: string) => void;
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
    investmentTransactions: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  // Load all data on component mount
  React.useEffect(() => {
    const loadAllData = async () => {
      try {
        const [incomeData, expenseData, savingsData, investmentData] = await Promise.all([
          incomeService.getAll(),
          expenseService.getAll(),
          savingsService.getAll(),
          investmentService.getAll()
        ]);

        setData({
          income: incomeData,
          expenses: expenseData,
          savings: savingsData,
          investments: investmentData,
          investmentTransactions: [] // Initialize empty for now
        });
      } catch (error) {
        console.error('Error loading financial data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your financial data."
        });
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
      const initialTransaction: InvestmentTransaction = {
        id: Date.now().toString(),
        investmentId: newInvestment.id,
        amount: newInvestment.invested,
        date: newInvestment.date,
        type: 'initial',
        notes: `Initial investment in ${newInvestment.name}`
      };
      
      setData(prev => ({
        ...prev,
        investments: [newInvestment, ...prev.investments],
        investmentTransactions: [initialTransaction, ...prev.investmentTransactions]
      }));
    } catch (error) {
      console.error('Error adding investment:', error);
      const newInvestment: InvestmentEntry = {
      ...investment,
      id: Date.now().toString()
    };
    
    // Add initial transaction record for local storage
    const initialTransaction: InvestmentTransaction = {
      id: (Date.now() + 1).toString(),
      investmentId: newInvestment.id,
      amount: newInvestment.invested,
      date: newInvestment.date,
      type: 'initial',
      notes: `Initial investment in ${newInvestment.name}`
    };
    
    setData(prev => ({
      ...prev,
      investments: [...prev.investments, newInvestment],
      investmentTransactions: [initialTransaction, ...prev.investmentTransactions]
    }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save investment to database. Saved locally instead."
      });
    }
  };

  const addInvestmentTransaction = (transaction: Omit<InvestmentTransaction, 'id'>) => {
    const newTransaction: InvestmentTransaction = {
      ...transaction,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      investmentTransactions: [newTransaction, ...prev.investmentTransactions]
    }));
  };

  const addMoneyToInvestment = (investmentId: string, amount: number, date: string) => {
    // Update the investment current amount
    setData(prev => ({
      ...prev,
      investments: prev.investments.map(inv =>
        inv.id === investmentId 
          ? { ...inv, current: inv.current + amount }
          : inv
      )
    }));

    // Add transaction record
    addInvestmentTransaction({
      investmentId,
      amount,
      date,
      type: 'addition',
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

  return (
    <FinancialContext.Provider value={{
      data,
      isLoading,
      addIncome,
      addExpense,
      addSavingsGoal,
      addInvestment,
      addInvestmentTransaction,
      addMoneyToInvestment,
      updateSavingsGoal,
      updateInvestment,
      updateIncome,
      updateExpense,
      updateSavings,
      updateInvestmentEntry,
      deleteIncome,
      deleteExpense,
      deleteSavings,
      deleteInvestment
    }}>
      {children}
    </FinancialContext.Provider>
  );
};