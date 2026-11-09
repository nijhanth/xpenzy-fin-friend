import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { ReminderCompletionField } from '@/components/forms/ReminderCompletionField';
import { offerReminderCompletion } from '@/lib/reminderCompletion';

const transactionSchema = z.object({
  amount: z.number().min(0, 'Contribution cannot be negative'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  profit_loss: z.number().default(0)
}).superRefine((data, context) => {
  if (data.amount === 0 && data.profit_loss === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'Add a contribution or enter this month’s profit/loss' });
  }
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface InvestmentTransactionFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initialDate?: string;
  investmentId: string;
  investmentName: string;
}

export const InvestmentTransactionForm: React.FC<InvestmentTransactionFormProps> = ({
  open,
  onClose,
  editingId,
  initialDate,
  investmentId,
  investmentName
}) => {
  const { data, addInvestmentTransaction, updateInvestmentTransaction } = useFinancial();
  const [relatedReminderId, setRelatedReminderId] = useState('');
  const submitLock = useRef(false);
  const remindersUsedElsewhere = useMemo(() => new Set([
    ...data.expenses.filter(item => item.id !== editingId && item.linkedNoteId).map(item => item.linkedNoteId as string),
    ...data.savingsTransactions.filter(item => item.linked_note_id).map(item => item.linked_note_id as string),
    ...data.investmentTransactions.filter(item => item.id !== editingId && item.linked_note_id).map(item => item.linked_note_id as string),
    ...data.investments.filter(item => item.linked_note_id).map(item => item.linked_note_id as string),
  ]), [data.expenses, data.savingsTransactions, data.investmentTransactions, data.investments, editingId]);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      date: initialDate || new Date().toISOString().split('T')[0],
      notes: '',
      profit_loss: 0
    }
  });

  useEffect(() => {
    if (open && !editingId) setRelatedReminderId('');
    if (editingId && open) {
      const transaction = data.investmentTransactions.find(t => t.id === editingId);
      if (transaction) {
        setRelatedReminderId(transaction.linked_note_id || '');
        form.reset({
          amount: transaction.amount,
          date: transaction.date,
          notes: transaction.notes || '',
          profit_loss: transaction.profit_loss || 0
        });
      }
    } else if (open && !editingId) {
      form.reset({
        amount: 0,
        date: initialDate || new Date().toISOString().split('T')[0],
        notes: '',
        profit_loss: 0
      });
    }
  }, [editingId, open, form, data.investmentTransactions, initialDate]);

  const onSubmit = async (data: TransactionFormData) => {
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      if (editingId) {
        const existingTransaction = data.investmentTransactions.find(transaction => transaction.id === editingId);
        const saved = await updateInvestmentTransaction(editingId, { ...data, linked_note_id: relatedReminderId || null });
        if (!saved) return;
        if (relatedReminderId && relatedReminderId !== existingTransaction?.linked_note_id) {
          void offerReminderCompletion(relatedReminderId);
        }
      } else {
        await addInvestmentTransaction({
          investment_id: investmentId,
          amount: data.amount,
          date: data.date,
          linked_note_id: relatedReminderId || null,
          notes: data.notes || (data.amount > 0 ? `Monthly contribution to ${investmentName}` : `Monthly performance update for ${investmentName}`),
          profit_loss: data.profit_loss
        }, false);
        void offerReminderCompletion(relatedReminderId);
      }
      onClose();
    } catch (error) {
      console.error('Transaction form error:', error);
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Edit Monthly Update' : `Monthly Update · ${investmentName}`}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New contribution this month (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min="0"
                      step="1"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Enter money added during this month. Use 0 when you only need to record performance.</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update date</FormLabel>
                  <FormControl>
                    <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Choose a date in the month you’re updating. Past dates are supported for entering history.</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profit_loss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>This month’s profit or loss (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter profit (+) or loss (-)"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(value);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      step="any"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Enter this month’s change, not your lifetime total. Use a positive number for profit or a negative number for loss.
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

            <ReminderCompletionField value={relatedReminderId} onChange={setRelatedReminderId} refreshKey={open} excludedReminderIds={remindersUsedElsewhere} />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-investment text-white" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : editingId ? 'Save update' : 'Save monthly update'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
