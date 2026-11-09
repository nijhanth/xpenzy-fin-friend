
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
  goalId?: string | null;
  linkedNoteId?: string | null;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  date: string;
  notes: string;
  used_amount?: number;
  status?: 'active' | 'completed';
  completed_date?: string | null;
}

export interface InvestmentEntry {
  id: string;
  type: 'Mutual Fund' | 'Stocks' | 'FD' | 'Crypto' | 'Gold' | 'Real Estate' | 'Custom';
  name: string;
  initial_invested: number;
  invested: number;
  current: number;
  date: string;
  notes: string;
  customType?: string;
  linked_note_id?: string | null;
}

export interface InvestmentTransaction {
  id: string;
  investment_id: string;
  amount: number;
  date: string;
  notes?: string;
  user_id?: string;
  profit_loss?: number;
  linked_note_id?: string | null;
}

export interface SavingsTransaction {
  id: string;
  savings_goal_id: string;
  amount: number;
  date: string;
  notes?: string;
  user_id?: string;
  linked_note_id?: string | null;
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
