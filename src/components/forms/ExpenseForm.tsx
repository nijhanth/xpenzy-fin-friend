
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';

const expenseSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  paymentMode: z.enum(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Net Banking']),
  notes: z.string().optional().default(''),
  customCategory: z.string().optional(),
  goalId: z.string().nullable().optional()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
}


export const ExpenseForm: React.FC<ExpenseFormProps> = ({ open, onClose, editingId }) => {
  const { addExpense, updateExpense, updateBudget, data, markGoalCompleted } = useFinancial();
  const { toast } = useToast();
  const isEditing = !!editingId;
  const [completionPrompt, setCompletionPrompt] = React.useState<{ goalId: string; goalName: string } | null>(null);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: undefined,
      paymentMode: 'UPI',
      notes: '',
      customCategory: '',
      goalId: null
    }
  });

  const selectedCategory = form.watch('category');

  // Only show budget categories relevant to the expense date plus "Custom" option
  const categoryOptions = useMemo(() => {
    const expenseDate = form.watch('date');
    if (!expenseDate) {
      return ['Custom'];
    }

    const expenseDateObj = new Date(expenseDate);
    const expenseYear = expenseDateObj.getFullYear();
    const expenseMonth = expenseDateObj.getMonth();
    const expenseWeek = Math.ceil(expenseDateObj.getDate() / 7);

    const relevantBudgets = data.budgets.filter(budget => {
      // Only show expense budgets, not savings or investment budgets
      if (budget.linked_type && budget.linked_type !== 'expenses') {
        return false;
      }

      // Legacy budgets without date fields should always be shown
      if (!budget.year && !budget.month && !budget.week) {
        return true;
      }

      // Check if budget is relevant to the expense date
      if (budget.period === 'yearly' && budget.year === expenseYear) {
        return true;
      }
      if (budget.period === 'monthly' && budget.year === expenseYear && budget.month === expenseMonth) {
        return true;
      }
      if (budget.period === 'weekly' && budget.year === expenseYear && budget.month === expenseMonth && budget.week === expenseWeek) {
        return true;
      }
      
      return false;
    });

    const budgetCategories = relevantBudgets
      .map(budget => budget.category)
      .filter(category => category && category.trim() !== '');
    
    return [...budgetCategories, 'Custom'];
  }, [data.budgets, form.watch('date')]);

  // Get budget info for the selected category
  const budgetInfo = useMemo(() => {
    if (!selectedCategory) return null;
    
    const budget = data.budgets.find(b => b.category === selectedCategory);
    if (!budget) return null;
    
    // Calculate spent amount from expenses
    const spent = data.expenses
      .filter(expense => expense.category === selectedCategory)
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    const remaining = budget.limit_amount - spent;
    
    return {
      limit: budget.limit_amount,
      spent,
      remaining,
      percentage: (spent / budget.limit_amount) * 100
    };
  }, [selectedCategory, data.budgets, data.expenses]);

  // Load existing data when editing
  useEffect(() => {
    if (editingId && open) {
      const existingEntry = data.expenses.find(entry => entry.id === editingId);
      if (existingEntry) {
        form.reset({
          amount: existingEntry.amount,
          date: existingEntry.date,
          category: existingEntry.category,
          paymentMode: existingEntry.paymentMode as any,
          notes: existingEntry.notes,
          customCategory: existingEntry.customCategory || '',
          goalId: existingEntry.goalId ?? null
        });
      }
    } else if (!editingId) {
      form.reset({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: undefined,
        paymentMode: 'UPI',
        notes: '',
        customCategory: '',
        goalId: null
      });
    }
  }, [editingId, open, data.expenses, form]);

  // Active goals (status === 'active' OR no status set yet)
  const activeGoals = useMemo(
    () => data.savings.filter(g => (g.status ?? 'active') === 'active'),
    [data.savings]
  );

  // Smart suggestion: when category/notes match an active goal name
  const watchedCategory = form.watch('category');
  const watchedCustomCategory = form.watch('customCategory');
  const watchedNotes = form.watch('notes');
  const watchedGoalId = form.watch('goalId');

  const suggestedGoal = useMemo(() => {
    if (watchedGoalId) return null;
    const haystacks = [
      watchedCategory,
      watchedCustomCategory,
      watchedNotes
    ]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());
    if (haystacks.length === 0) return null;
    return activeGoals.find(g => {
      const name = g.name.toLowerCase();
      return haystacks.some(h => h.includes(name) || name.includes(h));
    }) || null;
  }, [activeGoals, watchedCategory, watchedCustomCategory, watchedNotes, watchedGoalId]);

  const onSubmit = async (formData: ExpenseFormData) => {
    const expenseData = {
      amount: formData.amount,
      date: formData.date,
      category: formData.category === 'Custom' ? formData.customCategory || 'Custom' : formData.category,
      subcategory: 'General', // Default subcategory since we removed the field
      paymentMode: formData.paymentMode,
      notes: formData.notes || '',
      customCategory: formData.category === 'Custom' ? formData.customCategory : undefined,
      goalId: formData.goalId || null
    };

    if (isEditing && editingId) {
      await updateExpense(editingId, expenseData);
      toast({
        title: "Expense Updated",
        description: `₹${formData.amount.toLocaleString()} expense updated successfully!`
      });
    } else {
      await addExpense(expenseData);

      toast({
        title: "Expense Added",
        description: `₹${formData.amount.toLocaleString()} expense added successfully!`
      });
    }

    // If linked to an active goal, ask the user if they want to mark it completed
    const linkedGoal = expenseData.goalId
      ? data.savings.find(g => g.id === expenseData.goalId)
      : null;
    if (linkedGoal && (linkedGoal.status ?? 'active') === 'active') {
      setCompletionPrompt({ goalId: linkedGoal.id, goalName: linkedGoal.name });
    }

    form.reset();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
              <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border-border z-50">
                      {categoryOptions.map(category => {
                        const isBudgetCategory = data.budgets.some(b => b.category === category);
                        return (
                          <SelectItem key={category} value={category}>
                            <div className="flex items-center gap-2">
                              {category}
                              {isBudgetCategory && (
                                <Badge variant="secondary" className="text-xs">Budget</Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Budget Information Display */}
            {budgetInfo && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Budget Status</span>
                  <Badge 
                    variant={budgetInfo.percentage >= 100 ? "destructive" : budgetInfo.percentage >= 80 ? "secondary" : "default"}
                  >
                    {budgetInfo.percentage.toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Limit: ₹{budgetInfo.limit.toLocaleString()}</div>
                  <div>Spent: ₹{budgetInfo.spent.toLocaleString()}</div>
                  <div className={budgetInfo.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Remaining: ₹{budgetInfo.remaining.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'Custom' && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paymentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Net Banking">Net Banking</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linked Goal (Optional) */}
            <FormField
              control={form.control}
              name="goalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Goal (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
                    value={field.value ?? '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No goal linked" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="__none__">No goal linked</SelectItem>
                      {activeGoals.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Smart suggestion */}
            {suggestedGoal && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                <p className="text-sm">
                  Link this expense to <span className="font-medium">'{suggestedGoal.name}'</span>?
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => form.setValue('goalId', suggestedGoal.id, { shouldDirty: true })}
                >
                  Link
                </Button>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-expense">
                {isEditing ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Goal completion prompt */}
    <Dialog
      open={!!completionPrompt}
      onOpenChange={(isOpen) => !isOpen && setCompletionPrompt(null)}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Did you complete this goal?</DialogTitle>
          <DialogDescription>
            You linked this expense to <span className="font-medium">'{completionPrompt?.goalName}'</span>. Mark it as completed?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setCompletionPrompt(null)}>
            No
          </Button>
          <Button
            className="bg-success text-white hover:bg-success/90"
            onClick={async () => {
              if (completionPrompt) {
                await markGoalCompleted(completionPrompt.goalId);
              }
              setCompletionPrompt(null);
            }}
          >
            Yes, mark completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
