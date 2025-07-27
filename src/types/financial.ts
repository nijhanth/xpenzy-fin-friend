export interface IncomeEntry {
  id: string;
  amount: number;
  date: string;
  category: 'Salary' | 'Freelance' | 'Gift' | 'Investment' | 'Business' | 'Custom';
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Net Banking';
  notes: string;
  customCategory?: string;
}

export interface ExpenseEntry {
  id: string;
  amount: number;
  date: string;
  category: 'Food & Dining' | 'Transportation' | 'Shopping' | 'Bills & Utilities' | 'Entertainment' | 'Healthcare' | 'Education' | 'Custom';
  subcategory: string;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Net Banking';
  notes: string;
  customCategory?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  date: string;
  notes: string;
}

export interface InvestmentEntry {
  id: string;
  type: 'Mutual Fund' | 'Stocks' | 'FD' | 'Crypto' | 'Gold' | 'Real Estate' | 'Custom';
  name: string;
  invested: number;
  current: number;
  date: string;
  notes: string;
  customType?: string;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  amount: number;
  date: string;
  type: 'initial' | 'addition';
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  spent: number;
  icon: string;
  period: 'monthly' | 'weekly' | 'yearly';
  userId?: string;
}

export interface FinancialData {
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  savings: SavingsGoal[];
  investments: InvestmentEntry[];
  investmentTransactions: InvestmentTransaction[];
  budgets: BudgetCategory[];
}