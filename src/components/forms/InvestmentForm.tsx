import React from 'react';
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

const investmentSchema = z.object({
  type: z.enum(['Mutual Fund', 'Stocks', 'FD', 'Crypto', 'Gold', 'Real Estate', 'Custom']),
  name: z.string().min(1, 'Investment name is required'),
  invested: z.number().min(1, 'Invested amount must be greater than 0'),
  current: z.number().min(0, 'Current value must be 0 or greater'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().default(''),
  customType: z.string().optional()
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface InvestmentFormProps {
  open: boolean;
  onClose: () => void;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ open, onClose }) => {
  const { addInvestment } = useFinancial();
  const { toast } = useToast();

  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      type: 'Mutual Fund',
      name: '',
      invested: 0,
      current: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      customType: ''
    }
  });

  const onSubmit = (data: InvestmentFormData) => {
    const finalType = data.type === 'Custom' && data.customType 
      ? data.customType as any
      : data.type;
    
    addInvestment({
      type: finalType,
      name: data.name,
      invested: data.invested,
      current: data.current,
      date: data.date,
      notes: data.notes || '',
      customType: data.type === 'Custom' ? data.customType : undefined
    });
    
    toast({
      title: "Investment Added",
      description: `${data.name} investment added successfully!`
    });
    
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Investment</DialogTitle>
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
              name="invested"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invested Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter invested amount"
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
                  <FormLabel>Current Value (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter current value"
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

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-investment text-white">
                Add Investment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};