import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';

const savingsSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  target: z.number().min(1, 'Target amount must be greater than 0'),
  current: z.number().min(0, 'Current amount must be 0 or greater'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().default('')
});

type SavingsFormData = z.infer<typeof savingsSchema>;

interface SavingsFormProps {
  open: boolean;
  onClose: () => void;
}

export const SavingsForm: React.FC<SavingsFormProps> = ({ open, onClose }) => {
  const { addSavingsGoal } = useFinancial();
  const { toast } = useToast();

  const form = useForm<SavingsFormData>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      name: '',
      target: 0,
      current: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  const onSubmit = (data: SavingsFormData) => {
    addSavingsGoal({
      name: data.name,
      target: data.target,
      current: data.current,
      date: data.date,
      notes: data.notes || ''
    });
    
    toast({
      title: "Savings Goal Added",
      description: `Goal "${data.name}" with target ₹${data.target.toLocaleString()} created successfully!`
    });
    
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Savings Goal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Emergency Fund, Vacation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter target amount"
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
              name="current"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter current saved amount"
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
                  <FormLabel>Target Date</FormLabel>
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
                    <Textarea placeholder="Add any notes about this goal..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-savings text-white">
                Add Goal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};