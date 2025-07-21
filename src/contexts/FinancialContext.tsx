import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FinancialData, IncomeEntry, ExpenseEntry, SavingsGoal, InvestmentEntry } from '@/types/financial';

interface FinancialContextType {
  data: FinancialData;
  addIncome: (income: Omit<IncomeEntry, 'id'>) => void;
  addExpense: (expense: Omit<ExpenseEntry, 'id'>) => void;
  addSavingsGoal: (savings: Omit<SavingsGoal, 'id'>) => void;
  addInvestment: (investment: Omit<InvestmentEntry, 'id'>) => void;
  updateSavingsGoal: (id: string, current: number) => void;
  updateInvestment: (id: string, current: number) => void;
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
    investments: []
  });

  const addIncome = (income: Omit<IncomeEntry, 'id'>) => {
    const newIncome: IncomeEntry = {
      ...income,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      income: [...prev.income, newIncome]
    }));
  };

  const addExpense = (expense: Omit<ExpenseEntry, 'id'>) => {
    const newExpense: ExpenseEntry = {
      ...expense,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));
  };

  const addSavingsGoal = (savings: Omit<SavingsGoal, 'id'>) => {
    const newSavings: SavingsGoal = {
      ...savings,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      savings: [...prev.savings, newSavings]
    }));
  };

  const addInvestment = (investment: Omit<InvestmentEntry, 'id'>) => {
    const newInvestment: InvestmentEntry = {
      ...investment,
      id: Date.now().toString()
    };
    setData(prev => ({
      ...prev,
      investments: [...prev.investments, newInvestment]
    }));
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

  return (
    <FinancialContext.Provider value={{
      data,
      addIncome,
      addExpense,
      addSavingsGoal,
      addInvestment,
      updateSavingsGoal,
      updateInvestment
    }}>
      {children}
    </FinancialContext.Provider>
  );
};