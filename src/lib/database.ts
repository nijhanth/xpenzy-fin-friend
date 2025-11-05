import { supabase } from '@/integrations/supabase/client';
import { IncomeEntry, ExpenseEntry, SavingsGoal, InvestmentEntry, BudgetCategory, InvestmentTransaction, SavingsTransaction } from '@/types/financial';

// Income CRUD operations
export const incomeService = {
  async getAll(): Promise<IncomeEntry[]> {
    const { data, error } = await supabase
      .from('income_entries')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      amount: item.amount,
      date: item.date,
      category: item.category as any,
      paymentMode: item.payment_mode as any,
      notes: item.notes,
      customCategory: item.custom_category
    })) || [];
  },

  async create(income: Omit<IncomeEntry, 'id'>): Promise<IncomeEntry> {
    const { data, error } = await supabase
      .from('income_entries')
      .insert([{
        amount: income.amount,
        date: income.date,
        category: income.category,
        payment_mode: income.paymentMode,
        notes: income.notes,
        custom_category: income.customCategory,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      amount: data.amount,
      date: data.date,
      category: data.category as any,
      paymentMode: data.payment_mode as any,
      notes: data.notes,
      customCategory: data.custom_category
    };
  },

  async update(id: string, income: Partial<Omit<IncomeEntry, 'id'>>): Promise<IncomeEntry> {
    const { data, error } = await supabase
      .from('income_entries')
      .update({
        amount: income.amount,
        date: income.date,
        category: income.category,
        payment_mode: income.paymentMode,
        notes: income.notes,
        custom_category: income.customCategory
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      amount: data.amount,
      date: data.date,
      category: data.category as any,
      paymentMode: data.payment_mode as any,
      notes: data.notes,
      customCategory: data.custom_category
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('income_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Expense CRUD operations
export const expenseService = {
  async getAll(): Promise<ExpenseEntry[]> {
    const { data, error } = await supabase
      .from('expense_entries')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      amount: item.amount,
      date: item.date,
      category: item.category as any,
      subcategory: item.subcategory,
      paymentMode: item.payment_mode as any,
      notes: item.notes,
      customCategory: item.custom_category
    })) || [];
  },

  async create(expense: Omit<ExpenseEntry, 'id'>): Promise<ExpenseEntry> {
    const { data, error } = await supabase
      .from('expense_entries')
      .insert([{
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        subcategory: expense.subcategory,
        payment_mode: expense.paymentMode,
        notes: expense.notes,
        custom_category: expense.customCategory,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      amount: data.amount,
      date: data.date,
      category: data.category as any,
      subcategory: data.subcategory,
      paymentMode: data.payment_mode as any,
      notes: data.notes,
      customCategory: data.custom_category
    };
  },

  async update(id: string, expense: Partial<Omit<ExpenseEntry, 'id'>>): Promise<ExpenseEntry> {
    const { data, error } = await supabase
      .from('expense_entries')
      .update({
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        subcategory: expense.subcategory,
        payment_mode: expense.paymentMode,
        notes: expense.notes,
        custom_category: expense.customCategory
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      amount: data.amount,
      date: data.date,
      category: data.category as any,
      subcategory: data.subcategory,
      paymentMode: data.payment_mode as any,
      notes: data.notes,
      customCategory: data.custom_category
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Savings CRUD operations
export const savingsService = {
  async getAll(): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(savings: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert([{
        name: savings.name,
        target: savings.target,
        current: savings.current,
        date: savings.date,
        notes: savings.notes,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, savings: Partial<Omit<SavingsGoal, 'id'>>): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .update(savings)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Investment CRUD operations
export const investmentService = {
  async getAll(): Promise<InvestmentEntry[]> {
    const { data, error } = await supabase
      .from('investment_entries')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      type: item.type as any,
      name: item.name,
      initial_invested: item.initial_invested,
      invested: item.invested,
      current: item.current,
      date: item.date,
      notes: item.notes,
      customType: item.custom_type
    })) || [];
  },

  async create(investment: Omit<InvestmentEntry, 'id'>): Promise<InvestmentEntry> {
    const { data, error } = await supabase
      .from('investment_entries')
      .insert([{
        type: investment.type,
        name: investment.name,
        initial_invested: investment.initial_invested,
        invested: investment.invested,
        current: investment.current,
        date: investment.date,
        notes: investment.notes,
        custom_type: investment.customType,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      type: data.type as any,
      name: data.name,
      initial_invested: data.initial_invested,
      invested: data.invested,
      current: data.current,
      date: data.date,
      notes: data.notes,
      customType: data.custom_type
    };
  },

  async update(id: string, investment: Partial<Omit<InvestmentEntry, 'id'>>): Promise<InvestmentEntry> {
    const { data, error } = await supabase
      .from('investment_entries')
      .update({
        type: investment.type,
        name: investment.name,
        initial_invested: investment.initial_invested,
        invested: investment.invested,
        current: investment.current,
        date: investment.date,
        notes: investment.notes,
        custom_type: investment.customType
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      type: data.type as any,
      name: data.name,
      initial_invested: data.initial_invested,
      invested: data.invested,
      current: data.current,
      date: data.date,
      notes: data.notes,
      customType: data.custom_type
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('investment_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Budget CRUD operations
export const budgetService = {
  async getAll(): Promise<BudgetCategory[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      category: item.category,
      limit_amount: item.limit_amount,
      current: (item as any).current || 0,
      period: item.period as 'monthly' | 'weekly' | 'yearly',
      icon: (item as any).icon || '💰',
      user_id: item.user_id,
      start_date: (item as any).start_date,
      end_date: (item as any).end_date,
      year: (item as any).year,
      month: (item as any).month,
      week: (item as any).week,
      linked_type: (item as any).linked_type as 'expenses' | 'savings' | 'investment' | undefined,
      linked_id: (item as any).linked_id
    })) || [];
  },

  async create(budget: Omit<BudgetCategory, 'id'>): Promise<BudgetCategory> {
    const { data, error } = await supabase
      .from('budget_categories')
      .insert([{
        category: budget.category,
        limit_amount: budget.limit_amount,
        current: budget.current || 0,
        period: budget.period,
        icon: budget.icon || '💰',
        start_date: budget.start_date,
        end_date: budget.end_date,
        year: budget.year,
        month: budget.month,
        week: budget.week,
        linked_type: budget.linked_type || 'expenses',
        linked_id: budget.linked_id,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      category: data.category,
      limit_amount: data.limit_amount,
      current: (data as any).current || 0,
      period: data.period as 'monthly' | 'weekly' | 'yearly',
      icon: (data as any).icon || '💰',
      user_id: data.user_id,
      start_date: (data as any).start_date,
      end_date: (data as any).end_date,
      year: (data as any).year,
      month: (data as any).month,
      week: (data as any).week,
      linked_type: (data as any).linked_type as 'expenses' | 'savings' | 'investment' | undefined,
      linked_id: (data as any).linked_id
    };
  },

  async update(id: string, budget: Partial<Omit<BudgetCategory, 'id'>>): Promise<BudgetCategory> {
    const { data, error } = await supabase
      .from('budget_categories')
      .update({
        category: budget.category,
        limit_amount: budget.limit_amount,
        current: budget.current,
        period: budget.period,
        icon: budget.icon,
        start_date: budget.start_date,
        end_date: budget.end_date,
        year: budget.year,
        month: budget.month,
        week: budget.week,
        linked_type: budget.linked_type,
        linked_id: budget.linked_id
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      category: data.category,
      limit_amount: data.limit_amount,
      current: (data as any).current || 0,
      period: data.period as 'monthly' | 'weekly' | 'yearly',
      icon: (data as any).icon || '💰',
      user_id: data.user_id,
      start_date: (data as any).start_date,
      end_date: (data as any).end_date,
      year: (data as any).year,
      month: (data as any).month,
      week: (data as any).week,
      linked_type: (data as any).linked_type as 'expenses' | 'savings' | 'investment' | undefined,
      linked_id: (data as any).linked_id
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Investment Transactions Service
export const investmentTransactionService = {
  async getAll(): Promise<InvestmentTransaction[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('investment_transactions')
      .select('*')
      .eq('user_id', user.user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(transaction: Omit<InvestmentTransaction, 'id'>): Promise<InvestmentTransaction> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('investment_transactions')
      .insert([{ ...transaction, user_id: user.user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, transaction: Partial<Omit<InvestmentTransaction, 'id'>>): Promise<InvestmentTransaction> {
    const { data, error } = await supabase
      .from('investment_transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('investment_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getByInvestmentId(investmentId: string): Promise<InvestmentTransaction[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('investment_transactions')
      .select('*')
      .eq('investment_id', investmentId)
      .eq('user_id', user.user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Savings Transactions Service
export const savingsTransactionService = {
  async getAll(): Promise<SavingsTransaction[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('user_id', user.user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(transaction: Omit<SavingsTransaction, 'id'>): Promise<SavingsTransaction> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('savings_transactions')
      .insert([{ ...transaction, user_id: user.user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, transaction: Partial<Omit<SavingsTransaction, 'id'>>): Promise<SavingsTransaction> {
    const { data, error } = await supabase
      .from('savings_transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('savings_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getBySavingsGoalId(savingsGoalId: string): Promise<SavingsTransaction[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('savings_goal_id', savingsGoalId)
      .eq('user_id', user.user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Notes Service
const notesService = {
  async getAll(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(note: any): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .insert([{ ...note, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, note: any): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .update(note)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async markComplete(id: string, isCompleted: boolean): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const database = {
  income: incomeService,
  expenses: expenseService,
  savings: savingsService,
  investments: investmentService,
  investmentTransactions: investmentTransactionService,
  savingsTransactions: savingsTransactionService,
  budgets: budgetService,
  notes: notesService,
};