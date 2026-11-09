import React, { useEffect, useMemo, useState } from 'react';
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
import { ReminderCompletionField } from '@/components/forms/ReminderCompletionField';
import { offerReminderCompletion } from '@/lib/reminderCompletion';

const investmentSchema = z.object({
  type: z.enum(['Mutual Fund', 'Stocks', 'FD', 'Crypto', 'Gold', 'Real Estate', 'Custom']),
  name: z.string().min(1, 'Investment name is required'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().default(''),
  customType: z.string().optional()
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface InvestmentFormProps {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ open, onClose, editingId }) => {
  const { addInvestment, updateInvestmentEntry, data } = useFinancial();
  const { toast } = useToast();
  const isEditing = !!editingId;
  const [relatedReminderId, setRelatedReminderId] = useState('');
  const remindersUsedElsewhere = useMemo(() => new Set([
    ...data.expenses.filter(item => item.linkedNoteId).map(item => item.linkedNoteId as string),
    ...data.savingsTransactions.filter(item => item.linked_note_id).map(item => item.linked_note_id as string),
    ...data.investmentTransactions.filter(item => item.linked_note_id).map(item => item.linked_note_id as string),
    ...data.investments.filter(item => item.id !== editingId && item.linked_note_id).map(item => item.linked_note_id as string),
  ]), [data.expenses, data.savingsTransactions, data.investmentTransactions, data.investments, editingId]);

  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      type: 'Mutual Fund',
      name: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      customType: ''
    }
  });

  // Load existing data when editing
  useEffect(() => {
    if (editingId && open) {
      const existingEntry = data.investments.find(entry => entry.id === editingId);
      if (existingEntry) {
        setRelatedReminderId(existingEntry.linked_note_id || '');
        form.reset({
          type: existingEntry.type as any,
          name: existingEntry.name,
          date: existingEntry.date,
          notes: existingEntry.notes,
          customType: existingEntry.customType || ''
        });
      }
    } else if (!editingId) {
      setRelatedReminderId('');
      form.reset();
    }
  }, [editingId, open, data.investments, form]);

  const onSubmit = async (formData: InvestmentFormData) => {
    const finalType = formData.type === 'Custom' && formData.customType 
      ? formData.customType as any
      : formData.type;
    
    const investmentData = {
      type: finalType,
      name: formData.name,
      initial_invested: 0, // Base investment amount (never changes)
      invested: 0, // Will be calculated as initial_invested + sum(transactions)
      current: 0, // Will be calculated as invested + profit/loss
      date: formData.date,
      notes: formData.notes || '',
      customType: formData.type === 'Custom' ? formData.customType : undefined,
      linked_note_id: relatedReminderId || null
    };

    if (isEditing && editingId) {
      const existingEntry = data.investments.find(entry => entry.id === editingId);
      const saved = await updateInvestmentEntry(editingId, investmentData);
      if (saved === false) return;
      if (relatedReminderId && relatedReminderId !== existingEntry?.linked_note_id) {
        void offerReminderCompletion(relatedReminderId);
      }
      toast({
        title: "Investment Updated",
        description: `${formData.name} investment updated successfully!`
      });
    } else {
      const saved = await addInvestment(investmentData);
      if (saved && relatedReminderId) void offerReminderCompletion(relatedReminderId);
      toast({
        title: "Investment Added",
        description: `${formData.name} investment added successfully!`
      });
    }
    
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Investment' : 'Add Investment Holding'}</DialogTitle>
          {!isEditing && <p className="text-sm text-muted-foreground">Create the holding once, then use Monthly Update to record contributions and profit/loss by date.</p>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select investment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                      <SelectItem value="Stocks">Stocks</SelectItem>
                      <SelectItem value="FD">Fixed Deposit</SelectItem>
                      <SelectItem value="Crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Real Estate">Real Estate</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('type') === 'Custom' && (
              <FormField
                control={form.control}
                name="customType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter custom investment type" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HDFC Equity Fund, Apple Stock" {...field} />
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
                  <FormLabel>Investment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Add any notes about this investment..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ReminderCompletionField
              value={relatedReminderId}
              onChange={setRelatedReminderId}
              refreshKey={`${open}-${editingId ?? 'new'}`}
              excludedReminderIds={remindersUsedElsewhere}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-investment text-white">
                {isEditing ? 'Update Investment' : 'Add Investment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
