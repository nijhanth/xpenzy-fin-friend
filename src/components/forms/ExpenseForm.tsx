import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';

const expenseSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Custom']),
  subcategory: z.string().min(1, 'Subcategory is required'),
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

const subcategoryOptions = {
  'Food & Dining': ['Restaurants', 'Groceries', 'Coffee', 'Takeout', 'Snacks'],
  'Transportation': ['Petrol', 'Public Transport', 'Taxi/Uber', 'Parking', 'Maintenance'],
  'Shopping': ['Clothes', 'Electronics', 'Books', 'Gifts', 'Household Items'],
  'Bills & Utilities': ['Electricity', 'Water', 'Internet', 'Phone', 'Gas', 'Insurance'],
  'Entertainment': ['Movies', 'Sports', 'Music', 'Games', 'Events'],
  'Healthcare': ['Doctor', 'Medicine', 'Hospital', 'Dental', 'Fitness'],
  'Education': ['Courses', 'Books', 'Tuition', 'Workshops', 'Certification'],
  'Custom': ['Other']
};

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ open, onClose, editingId }) => {
  const { addExpense, updateExpense, data } = useFinancial();
  const { toast } = useToast();
  const isEditing = !!editingId;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Food & Dining',
      subcategory: '',
      paymentMode: 'UPI',
      notes: '',
      customCategory: ''
    }
  });

  const selectedCategory = form.watch('category');

  // Load existing data when editing
  useEffect(() => {
    if (editingId && open) {
      const existingEntry = data.expenses.find(entry => entry.id === editingId);
      if (existingEntry) {
        form.reset({
          amount: existingEntry.amount,
          date: existingEntry.date,
          category: existingEntry.category as any,
          subcategory: existingEntry.subcategory,
          paymentMode: existingEntry.paymentMode as any,
          notes: existingEntry.notes,
          customCategory: existingEntry.customCategory || ''
        });
      }
    } else if (!editingId) {
      form.reset();
    }
  }, [editingId, open, data.expenses, form]);

  const onSubmit = async (formData: ExpenseFormData) => {
    const finalCategory = formData.category === 'Custom' && formData.customCategory 
      ? formData.customCategory as any
      : formData.category;
    
    const expenseData = {
      amount: formData.amount,
      date: formData.date,
      category: finalCategory,
      subcategory: formData.subcategory,
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
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('subcategory', '');
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Bills & Utilities">Bills & Utilities</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'Custom' && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter custom category" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategoryOptions[selectedCategory as keyof typeof subcategoryOptions]?.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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