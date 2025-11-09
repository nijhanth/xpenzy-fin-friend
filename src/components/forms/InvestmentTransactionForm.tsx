import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';

const transactionSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  profit_loss: z.number().default(0)
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface InvestmentTransactionFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  investmentId: string;
  investmentName: string;
}

export const InvestmentTransactionForm: React.FC<InvestmentTransactionFormProps> = ({
  open,
  onClose,
  editingId,
  investmentId,
  investmentName
}) => {
  const { data, addInvestmentTransaction, updateInvestmentTransaction } = useFinancial();
  const { toast } = useToast();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 1000,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      profit_loss: 0
    }
  });

  useEffect(() => {
    if (editingId && open) {
      const transaction = data.investmentTransactions.find(t => t.id === editingId);
      if (transaction) {
        form.reset({
          amount: transaction.amount,
          date: transaction.date,
          notes: transaction.notes || '',
          profit_loss: transaction.profit_loss || 0
        });
      }
    } else if (open && !editingId) {
      form.reset({
        amount: 1000,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        profit_loss: 0
      });
    }
  }, [editingId, open, form, data.investmentTransactions]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      if (editingId) {
        await updateInvestmentTransaction(editingId, data);
      } else {
        await addInvestmentTransaction({
          investment_id: investmentId,
          amount: data.amount,
          date: data.date,
          notes: data.notes || `Added ₹${data.amount.toLocaleString()} to ${investmentName}`,
          profit_loss: data.profit_loss
        });
      }
      onClose();
    } catch (error) {
      console.error('Transaction form error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Edit Transaction' : `Add Money to ${investmentName}`}
          </DialogTitle>
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
                      placeholder="1000"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min="1"
                      step="1"
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
              name="profit_loss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profit/Loss (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter profit (+) or loss (-)"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      step="any"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Enter positive value for profit (e.g., +165) or negative for loss (e.g., -200)
                  </p>
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
                    <Textarea
                      placeholder="Add any notes about this transaction..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-investment text-white">
                {editingId ? 'Update Transaction' : 'Add Money'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};