
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
  category: string; // Changed to string to allow budget categories
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
  investment_id: string;
  amount: number;
  date: string;
  notes?: string;
  user_id?: string;
  profit_loss?: number;
}

export interface SavingsTransaction {
  id: string;
  savings_goal_id: string;
  amount: number;
  date: string;
  notes?: string;
  user_id?: string;
}

export interface BudgetCategory {
  id: string;
  category: string;
  limit_amount: number;
  current?: number;
  period: 'monthly' | 'weekly' | 'yearly';
  icon?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  year?: number;
  month?: number;
  week?: number;
  linked_type?: 'expenses' | 'savings' | 'investment';
  linked_id?: string;
}

export interface FinancialData {
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  savings: SavingsGoal[];
  investments: InvestmentEntry[];
  investmentTransactions: InvestmentTransaction[];
  savingsTransactions: SavingsTransaction[];
  budgets: BudgetCategory[];
}
