import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFinancial } from '@/contexts/FinancialContext';

type GoalWithdrawalFormProps = {
  open: boolean;
  onClose: () => void;
  goalId: string;
};

export const GoalWithdrawalForm = ({ open, onClose, goalId }: GoalWithdrawalFormProps) => {
  const { data, withdrawFromSavingsGoal } = useFinancial();
  const goal = data.savings.find(item => item.id === goalId);
  const usedAmount = goal ? data.expenses
    .filter(expense => expense.goalId === goal.id)
    .reduce((total, expense) => total + Number(expense.amount || 0), 0) : 0;
  const available = goal ? Math.max(0, Number(goal.current || 0) - usedAmount) : 0;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  }, [open, goalId]);

  const numericAmount = Number(amount);
  const invalidAmount = !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > available;
  const submit = async () => {
    if (!goal || invalidAmount || !date) return;
    const success = await withdrawFromSavingsGoal(goal.id, numericAmount, date, notes);
    if (success) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw from {goal?.name ?? 'savings goal'}</DialogTitle>
          <DialogDescription>This moves money out of this goal and adds it back to your estimated bank balance. It is not recorded as an expense.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">Available to withdraw: {formatAmount(available)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-withdrawal-amount">Withdrawal amount</Label>
            <Input id="goal-withdrawal-amount" type="number" min="1" max={available} step="1" value={amount} onChange={event => setAmount(event.target.value)} />
            {amount && invalidAmount && <p className="text-xs text-destructive">Enter an amount up to {formatAmount(available)}.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-withdrawal-date">Date</Label>
            <Input id="goal-withdrawal-date" type="date" value={date} onChange={event => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-withdrawal-notes">Notes (optional)</Label>
            <Textarea id="goal-withdrawal-notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="For example, returned to bank balance" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!goal || invalidAmount || !date}>Withdraw to bank</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const formatAmount = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount);
