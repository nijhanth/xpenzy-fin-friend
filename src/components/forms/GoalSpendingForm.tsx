import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';

type GoalSpendingFormProps = {
  open: boolean;
  onClose: () => void;
  goalId: string;
};

const paymentModes = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Net Banking'] as const;

export const GoalSpendingForm = ({ open, onClose, goalId }: GoalSpendingFormProps) => {
  const { data, addExpense } = useFinancial();
  const { toast } = useToast();
  const goal = data.savings.find((item) => item.id === goalId);
  const usedAmount = goal ? data.expenses
    .filter((expense) => expense.goalId === goal.id)
    .reduce((total, expense) => total + Number(expense.amount || 0), 0) : 0;
  const available = goal ? Math.max(0, Number(goal.current || 0) - usedAmount) : 0;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<(typeof paymentModes)[number]>('UPI');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMode('UPI');
    setNotes('');
  }, [open, goalId]);

  const submit = async () => {
    const numericAmount = Number(amount);
    if (!goal || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > available || !date) return;

    const saved = await addExpense({
      amount: numericAmount,
      date,
      category: 'Savings Goal Spending',
      subcategory: goal.name,
      paymentMode,
      notes: notes.trim() || `Spent from ${goal.name}`,
      goalId: goal.id,
    });
    if (!saved) return;

    toast({ title: 'Goal spending recorded', description: `${numericAmount.toLocaleString('en-IN')} recorded from ${goal.name}.` });
    onClose();
  };

  const numericAmount = Number(amount);
  const isInvalidAmount = !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > available;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spend from {goal?.name ?? 'savings goal'}</DialogTitle>
          <DialogDescription>Record a purchase paid from this goal. The amount will count as an expense and reduce the goal’s remaining savings.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">Available in this goal: ₹{available.toLocaleString('en-IN')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-spending-amount">Amount (₹)</Label>
            <Input id="goal-spending-amount" type="number" min="1" max={available} step="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
            {amount && isInvalidAmount && <p className="text-xs text-destructive">Enter an amount up to ₹{available.toLocaleString('en-IN')}.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-spending-date">Date</Label>
            <Input id="goal-spending-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment mode</Label>
            <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as (typeof paymentModes)[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{paymentModes.map((mode) => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-spending-notes">Notes (optional)</Label>
            <Textarea id="goal-spending-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="For example, bike purchase" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!goal || isInvalidAmount || !date}>Record spending</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
