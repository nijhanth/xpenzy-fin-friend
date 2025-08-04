
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  customCategory: z.string().optional()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
}


export const ExpenseForm: React.FC<ExpenseFormProps> = ({ open, onClose, editingId }) => {
  const { addExpense, updateExpense, updateBudget, data } = useFinancial();
  const { toast } = useToast();
  const isEditing = !!editingId;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: '',
      paymentMode: 'UPI',
      notes: '',
      customCategory: ''
    }
  });

  const selectedCategory = form.watch('category');

  // Only show budget categories plus "Custom" option
  const categoryOptions = useMemo(() => {
    const budgetCategories = data.budgets.map(budget => budget.name);
    return [...budgetCategories, 'Custom'];
  }, [data.budgets]);

  // Get budget info for the selected category
  const budgetInfo = useMemo(() => {
    if (!selectedCategory) return null;
    
    const budget = data.budgets.find(b => b.name === selectedCategory);
    if (!budget) return null;
    
    // Calculate spent amount from expenses
    const spent = data.expenses
      .filter(expense => expense.category === selectedCategory)
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    const remaining = budget.limit - spent;
    
    return {
      limit: budget.limit,
      spent,
      remaining,
      percentage: (spent / budget.limit) * 100
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
          customCategory: existingEntry.customCategory || ''
        });
      }
    } else if (!editingId) {
      form.reset({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: '',
        paymentMode: 'UPI',
        notes: '',
        customCategory: ''
      });
    }
  }, [editingId, open, data.expenses, form]);

  const onSubmit = async (formData: ExpenseFormData) => {
    const expenseData = {
      amount: formData.amount,
      date: formData.date,
      category: formData.category === 'Custom' ? formData.customCategory || 'Custom' : formData.category,
      subcategory: 'General', // Default subcategory since we removed the field
      paymentMode: formData.paymentMode,
      notes: formData.notes || '',
      customCategory: formData.category === 'Custom' ? formData.customCategory : undefined
    };

    if (isEditing && editingId) {
      await updateExpense(editingId, expenseData);
      toast({
        title: "Expense Updated",
        description: `₹${formData.amount.toLocaleString()} expense updated successfully!`
      });
    } else {
      await addExpense(expenseData);
      
      // Update budget spent amount if this category has a budget
      const budget = data.budgets.find(b => b.name === formData.category);
      if (budget) {
        const currentSpent = data.expenses
          .filter(expense => expense.category === formData.category)
          .reduce((sum, expense) => sum + expense.amount, 0);
        
        await updateBudget(budget.id, { 
          spent: currentSpent + formData.amount 
        });
      }
      
      toast({
        title: "Expense Added",
        description: `₹${formData.amount.toLocaleString()} expense added successfully!`
      });
    }
    
    form.reset();
    onClose();
  };

  return (
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
                        const isBudgetCategory = data.budgets.some(b => b.name === category);
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
  );
};
