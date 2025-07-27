import { supabase } from '@/integrations/supabase/client';
import { IncomeEntry, ExpenseEntry, SavingsGoal, InvestmentEntry } from '@/types/financial';

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
    // For now, use localStorage since we don't have budget table in Supabase
    const stored = localStorage.getItem('budgets');
    return stored ? JSON.parse(stored) : [];
  },

  async create(budget: Omit<BudgetCategory, 'id'>): Promise<BudgetCategory> {
    const newBudget: BudgetCategory = {
      ...budget,
      id: Date.now().toString()
    };
    
    const existing = await this.getAll();
    const updated = [newBudget, ...existing];
    localStorage.setItem('budgets', JSON.stringify(updated));
    
    return newBudget;
  },

  async update(id: string, budget: Partial<Omit<BudgetCategory, 'id'>>): Promise<BudgetCategory> {
    const existing = await this.getAll();
    const index = existing.findIndex(b => b.id === id);
    
    if (index === -1) throw new Error('Budget not found');
    
    const updated = { ...existing[index], ...budget };
    existing[index] = updated;
    localStorage.setItem('budgets', JSON.stringify(existing));
    
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await this.getAll();
    const filtered = existing.filter(b => b.id !== id);
    localStorage.setItem('budgets', JSON.stringify(filtered));
  }
};