import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { PiggyBank, Target, Plus, TrendingUp, Award, Wallet, History, ChevronDown, ChevronUp, CheckCircle2, Sparkles, WalletCards, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDisplayDate } from '@/lib/dateFormat';
import { SavingsForm } from '@/components/forms/SavingsForm';
import { SavingsTransactionForm } from '@/components/forms/SavingsTransactionForm';
import { GoalSpendingForm } from '@/components/forms/GoalSpendingForm';
import { GoalWithdrawalForm } from '@/components/forms/GoalWithdrawalForm';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { AIInsightsCard } from '@/components/ai/AIInsights';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';

// Trade-style tooltip for savings trend
const SavingsTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-savings" />
          <span className="text-lg font-bold text-savings">₹{payload[0].value.toLocaleString()}</span>
        </div>
        {payload[0].payload.change !== undefined && (
          <p className={`text-xs mt-1 ${payload[0].payload.change >= 0 ? 'text-success' : 'text-expense'}`}>
            {payload[0].payload.change >= 0 ? '+' : ''}₹{payload[0].payload.change.toLocaleString()} from previous
          </p>
        )}
      </div>
    );
  }
  return null;
};

const savingsTips = [
  "Set up automatic transfers to your savings account",
  "Use the 50/30/20 budgeting rule",
  "Cut down on subscription services you don't use",
  "Cook more meals at home instead of ordering out",
  "Compare prices before making big purchases"
];

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount);
const isBalanceReconciliation = (notes?: string) => notes?.startsWith('Existing balance adjustment:') ?? false;
const isExistingBalanceAllocation = (notes?: string) => notes?.startsWith('Existing balance allocation:') ?? false;
const getAllocationTarget = (notes?: string) => {
  const match = notes?.match(/ to ([\d.]+)$/);
  return match ? Number(match[1]) : null;
};
type GoalActivityType = 'contribution' | 'withdrawal' | 'adjustment' | 'allocation' | 'spending';
const goalActivityLabel = (type: GoalActivityType) => ({
  contribution: 'Added to goal',
  withdrawal: 'Withdrawn to bank',
  adjustment: 'Existing balance recorded',
  allocation: 'Existing savings assigned',
  spending: 'Spent from goal',
})[type];
const goalActivityTone = (type: GoalActivityType, amount = 0) => type === 'adjustment' ? 'text-muted-foreground' : type === 'allocation' ? (amount >= 0 ? 'text-savings' : 'text-expense') : type === 'contribution' ? 'text-savings' : 'text-expense';
const goalActivitySign = (type: GoalActivityType) => type === 'adjustment' || type === 'allocation' ? '' : type === 'contribution' ? '+' : '−';

export const Savings = () => {
  const { data, isLoading: isFinancialLoading, getSavingsTransactions, deleteSavingsTransaction, deleteExpense, markGoalCompleted, restoreGoal, allocateExistingSavingsBalance } = useFinancial();
  const { user } = useAuth();
  const openingBalanceStorageKey = `xpenzy-opening-balance-${user?.id || 'local'}`;
  const [openingBalance, setOpeningBalance] = useState(0);
  const [openingDate, setOpeningDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const [openingBalanceDraft, setOpeningBalanceDraft] = useState('0');
  const [openingDateDraft, setOpeningDateDraft] = useState(openingDate);
  const [isOpeningBalanceDialogOpen, setIsOpeningBalanceDialogOpen] = useState(false);
  const [goalAmountTarget, setGoalAmountTarget] = useState<{ id: string; name: string; current: number } | null>(null);
  const [goalAmountDraft, setGoalAmountDraft] = useState('0');
  const [spendingGoalId, setSpendingGoalId] = useState<string | null>(null);
  const [withdrawalGoalId, setWithdrawalGoalId] = useState<string | null>(null);
  const [editingGoalExpenseId, setEditingGoalExpenseId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(openingBalanceStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { amount?: number; date?: string };
      const amount = Number(parsed.amount);
      if (Number.isFinite(amount) && amount >= 0) {
        setOpeningBalance(amount);
        setOpeningBalanceDraft(String(amount));
      }
      if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
        setOpeningDate(parsed.date);
        setOpeningDateDraft(parsed.date);
      }
    } catch (error) {
      console.error('Unable to load opening balance:', error);
    }
  }, [openingBalanceStorageKey]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const { deleteSavings } = useFinancial();
  const { toast } = useToast();
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [currentSavingsGoal, setCurrentSavingsGoal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '3m'>('30d');
  const getGoalUsedAmount = (goalId: string) => data.expenses
    .filter(expense => expense.goalId === goalId)
    .reduce((total, expense) => total + Number(expense.amount || 0), 0);
  
  // Lifetime: total ever saved across all goals (active + completed)
  const currentGoalBalances = data.savings.reduce((sum, goal) => sum + Number(goal.current || 0), 0);
  const lifetimeAddMoneyContributions = data.savingsTransactions
    .filter(transaction => Number(transaction.amount || 0) > 0 && !isBalanceReconciliation(transaction.notes) && !isExistingBalanceAllocation(transaction.notes))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const totalUsedFromGoals = data.savings.reduce((sum, goal) => sum + getGoalUsedAmount(goal.id), 0);

  // Active-only buckets — KPI/circle should reflect only active goals
  const activeGoals = data.savings.filter(g => (g.status ?? 'active') === 'active');
  const activeGoalAllocation = activeGoals.reduce((sum, g) => sum + g.current, 0);
  const activeTargets = activeGoals.reduce((sum, g) => sum + g.target, 0);
  const activeUsed = activeGoals.reduce((sum, goal) => sum + getGoalUsedAmount(goal.id), 0);
  const activeRemainingSaved = Math.max(0, activeGoalAllocation - activeUsed);
  const overallProgress = activeTargets > 0 ? Math.min((activeRemainingSaved / activeTargets) * 100, 100) : 0;
  const hasActiveGoals = activeGoals.length > 0;
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthlyContributions = data.savingsTransactions
    .filter(transaction => transaction.date?.startsWith(currentMonthKey) && !isBalanceReconciliation(transaction.notes) && !isExistingBalanceAllocation(transaction.notes))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const completedGoalsCount = data.savings.filter(goal => (goal.status ?? 'active') === 'completed').length;

  // Real money currently in account = lifetime saved minus everything spent from goals
  const savingsBalance = Math.max(0, currentGoalBalances - totalUsedFromGoals);
  const balanceIncome = data.income.filter((entry) => entry.date >= openingDate).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const balanceExpenses = data.expenses.filter((entry) => entry.date >= openingDate).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const balanceSavings = data.savingsTransactions.filter((entry) => entry.date >= openingDate && !isBalanceReconciliation(entry.notes) && !isExistingBalanceAllocation(entry.notes)).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const balanceInvestments = data.investmentTransactions.filter((entry) => entry.date >= openingDate && !entry.notes?.startsWith('Statement snapshot:')).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const estimatedBankBalance = openingBalance + balanceIncome - balanceExpenses - balanceSavings - balanceInvestments;
  const getExistingAllocationForGoal = (goalId: string) => data.savingsTransactions
    .filter(transaction => transaction.savings_goal_id === goalId && isExistingBalanceAllocation(transaction.notes))
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const totalExistingBalanceAllocated = data.savingsTransactions
    .filter(transaction => isExistingBalanceAllocation(transaction.notes))
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const availableStartingBalance = Math.max(0, openingBalance - totalExistingBalanceAllocated);
  const currentGoalExistingAllocation = goalAmountTarget ? getExistingAllocationForGoal(goalAmountTarget.id) : 0;
  const goalAmountLimit = currentGoalExistingAllocation + availableStartingBalance;

  const saveOpeningBalance = () => {
    const amount = Number(openingBalanceDraft);
    if (!Number.isFinite(amount) || amount < 0 || !openingDateDraft) return;
    setOpeningBalance(amount);
    setOpeningDate(openingDateDraft);
    setIsOpeningBalanceDialogOpen(false);
    try {
      localStorage.setItem(openingBalanceStorageKey, JSON.stringify({ amount, date: openingDateDraft }));
    } catch (error) {
      console.error('Unable to persist opening balance:', error);
      toast({ title: 'Balance updated for this session', description: 'Browser storage was unavailable, so this balance may not be saved after you close the app.', variant: 'destructive' });
    }
  };
  const openOpeningBalanceDialog = () => {
    setOpeningBalanceDraft(String(openingBalance));
    setOpeningDateDraft(openingDate);
    setIsOpeningBalanceDialogOpen(true);
  };
  const openGoalAmountDialog = (goal: { id: string; name: string; current: number }) => {
    setGoalAmountTarget(goal);
    setGoalAmountDraft(String(getExistingAllocationForGoal(goal.id)));
  };
  const saveExistingGoalAmount = async () => {
    if (!goalAmountTarget) return;
    const amount = Number(goalAmountDraft);
    if (!Number.isFinite(amount) || amount < 0 || amount > goalAmountLimit) return;
    const now = new Date();
    const allocationDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const saved = await allocateExistingSavingsBalance(goalAmountTarget.id, amount, allocationDate);
    if (!saved) return;
    setGoalAmountTarget(null);
  };

  // Circle displays active progress
  const totalSavings = activeRemainingSaved;
  const totalTargets = activeTargets;

  // Generate savings trend from transactions with time period filter
  const savingsTrend = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (timePeriod) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Collect all savings transactions
    const allTransactions: { date: string; amount: number }[] = [];
    data.savings.forEach(goal => {
      const transactions = getSavingsTransactions(goal.id);
      transactions.forEach(t => {
        if (isBalanceReconciliation(t.notes) || isExistingBalanceAllocation(t.notes)) return;
        const tDate = new Date(t.date);
        if (tDate >= startDate && tDate <= now) {
          allTransactions.push({ date: t.date, amount: t.amount });
        }
      });
    });

    // Group by date and calculate cumulative
    const dailyTotals: Record<string, number> = {};
    allTransactions.forEach(t => {
      dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.amount;
    });

    const sortedDates = Object.keys(dailyTotals).sort();
    let cumulative = 0;
    let prevAmount = 0;
    
    const trendData = sortedDates.map(date => {
      cumulative += dailyTotals[date];
      const change = cumulative - prevAmount;
      prevAmount = cumulative;
      return {
        date,
        displayDate: formatDisplayDate(date),
        amount: cumulative,
        daily: dailyTotals[date],
        change
      };
    });

    // If no transaction data, fall back to goal-based data
    if (trendData.length === 0) {
      const monthlyData = data.savings.reduce((acc, goal) => {
        const month = new Date(goal.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + goal.current;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(monthlyData).map(([month, amount], index, arr) => ({
        date: month,
        displayDate: month,
        amount,
        daily: amount,
        change: index > 0 ? amount - arr[index - 1][1] : 0
      }));
    }

    return trendData;
  }, [data.savings, getSavingsTransactions, timePeriod]);

  const avgSavings = savingsTrend.length > 0
    ? savingsTrend.reduce((sum, d) => sum + d.amount, 0) / savingsTrend.length
    : 0;

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    await deleteSavings(entryId);
    toast({
      title: "Savings Goal Deleted",
      description: "Savings goal has been successfully deleted."
    });
  };

  const handleAddMoney = (goalId: string, goalName: string) => {
    setCurrentSavingsGoal({ id: goalId, name: goalName });
    setEditingTransaction(null);
    setTransactionFormOpen(true);
  };

  const toggleGoalHistory = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const handleEditTransaction = (transactionId: string, goal: any) => {
    setCurrentSavingsGoal({ id: goal.id, name: goal.name });
    setEditingTransaction(transactionId);
    setTransactionFormOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteSavingsTransaction(transactionId);
      toast({
        title: "Success",
        description: "Savings transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete savings transaction",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoalSpending = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      toast({ title: 'Goal spending deleted', description: 'The goal balance and spending history have been updated.' });
    } catch (error) {
      console.error('Error deleting goal spending:', error);
      toast({ title: 'Could not delete goal spending', description: 'Please try again.', variant: 'destructive' });
    }
  };

  // Combine contributions and linked expenses so the history explains goal spending.
  const getSavingsGoalActivity = (goalId: string) => [
    ...getSavingsTransactions(goalId).filter(transaction => !isBalanceReconciliation(transaction.notes)).map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      amount: isExistingBalanceAllocation(transaction.notes) ? getAllocationTarget(transaction.notes) ?? Math.abs(Number(transaction.amount || 0)) : Math.abs(Number(transaction.amount || 0)),
      notes: isExistingBalanceAllocation(transaction.notes) ? null : transaction.notes,
      type: isExistingBalanceAllocation(transaction.notes) ? 'allocation' as const : Number(transaction.amount) < 0 ? 'withdrawal' as const : 'contribution' as const,
      transaction,
    })),
    ...data.expenses.filter(expense => expense.goalId === goalId).map(expense => ({
      id: expense.id,
      date: expense.date,
      amount: Number(expense.amount || 0),
      notes: expense.notes,
      type: 'spending' as const,
      transaction: null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-8 animate-fade-in sm:p-6">
      {/* Header */}
      <div className="relative isolate flex flex-col gap-5 overflow-hidden rounded-2xl border border-savings/15 bg-gradient-to-br from-card via-card to-savings/10 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-savings/10 blur-3xl" />
        <div className="relative min-w-0 flex-1">
          <Badge variant="secondary" className="mb-3 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Savings &amp; bank balance</Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Track your balance and savings</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Start with the money already in your bank. Add savings goals only if you want to set money aside for something specific.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 bg-background/70"><Target className="h-3.5 w-3.5 text-savings" />{activeGoals.length} active {activeGoals.length === 1 ? 'goal' : 'goals'}</Badge>
            <Badge variant="outline" className="gap-1.5 bg-background/70"><CalendarDays className="h-3.5 w-3.5 text-savings" />{formatCurrency(monthlyContributions)} net added this month</Badge>
            <Badge variant="outline" className="gap-1.5 bg-background/70"><WalletCards className="h-3.5 w-3.5 text-savings" />{formatCurrency(availableStartingBalance)} unallocated starting savings</Badge>
          </div>
        </div>
        <Button size="lg" className="relative shrink-0 bg-savings text-white shadow-sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create savings goal
        </Button>
      </div>

      <Card aria-label="Estimated current bank balance" className="border-border shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Estimated current bank balance</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{isFinancialLoading ? '—' : formatCurrency(estimatedBankBalance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Starting balance on {formatDisplayDate(openingDate)}: {isFinancialLoading ? '—' : formatCurrency(openingBalance)}. Since then: income {isFinancialLoading ? '—' : `+${formatCurrency(balanceIncome)}`}, expenses {isFinancialLoading ? '—' : `−${formatCurrency(balanceExpenses)}`}, savings transfers {isFinancialLoading ? '—' : `${balanceSavings >= 0 ? '−' : '+'}${formatCurrency(Math.abs(balanceSavings))}`}, investments {isFinancialLoading ? '—' : `${balanceInvestments >= 0 ? '−' : '+'}${formatCurrency(Math.abs(balanceInvestments))}`}.</p>
          </div>
          <Button variant="outline" onClick={openOpeningBalanceDialog}>
            {openingBalance > 0 ? 'Edit starting bank balance' : 'Set starting bank balance'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpeningBalanceDialogOpen} onOpenChange={setIsOpeningBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter your starting bank balance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="opening-balance" className="text-sm font-medium">Amount already in your bank account</label>
              <Input id="opening-balance" type="number" min="0" step="0.01" value={openingBalanceDraft} onChange={(event) => setOpeningBalanceDraft(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="opening-balance-date" className="text-sm font-medium">Date of this bank balance</label>
              <Input id="opening-balance-date" type="date" max={new Date().toISOString().slice(0, 10)} value={openingDateDraft} onChange={(event) => setOpeningDateDraft(event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Enter the amount currently in your bank account on this date. Transactions after this date will be added or deducted automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpeningBalanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOpeningBalance} disabled={!openingDateDraft || Number(openingBalanceDraft) < 0}>Save balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(goalAmountTarget)} onOpenChange={(open) => { if (!open) setGoalAmountTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign existing savings{goalAmountTarget ? ` to ${goalAmountTarget.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Unallocated starting savings: {formatCurrency(availableStartingBalance)}</p>
              <p className="mt-1 text-xs text-muted-foreground">This uses only your starting bank balance of {formatCurrency(openingBalance)}. Recorded income is kept separate for Add Money. {formatCurrency(totalExistingBalanceAllocated)} of the starting balance is already allocated across goals.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="existing-goal-amount" className="text-sm font-medium">Existing savings assigned to this goal</label>
              <Input
                id="existing-goal-amount"
                type="number"
                min="0"
                max={goalAmountLimit}
                step="1"
                value={goalAmountDraft}
                onChange={(event) => setGoalAmountDraft(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Up to {formatCurrency(goalAmountLimit)} can be assigned to this goal. This only allocates existing money; it won’t record new income or reduce the bank balance.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalAmountTarget(null)}>Cancel</Button>
            <Button onClick={saveExistingGoalAmount} disabled={!goalAmountTarget || Number(goalAmountDraft) < 0 || Number(goalAmountDraft) > goalAmountLimit}>Save assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Summary */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Starting bank balance</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(openingBalance)}</p>
              <p className="mt-1 text-xs text-muted-foreground">As of {formatDisplayDate(openingDate)}</p>
            </div>
            <div className="p-4 rounded-lg bg-savings/10 border border-savings/20">
              <p className="text-xs text-muted-foreground">Currently saved in goals</p>
              <p className="text-lg font-bold text-savings">₹{savingsBalance.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">Total added via Add Money</p>
              <p className="text-lg font-bold text-foreground">₹{lifetimeAddMoneyContributions.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-expense/10 border border-expense/20">
              <p className="text-xs text-muted-foreground">Total Spent from Goals</p>
              <p className="text-lg font-bold text-expense">₹{totalUsedFromGoals.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress */}
      <Card className="border-border/80 bg-gradient-card shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="mx-auto grid w-full max-w-2xl items-center gap-5 sm:grid-cols-[auto_1fr]">
            <div className="relative mx-auto h-28 w-28 sm:mx-0 sm:h-32 sm:w-32">
              {/* Circular Progress */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="hsl(var(--savings))"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - overallProgress / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{Math.round(overallProgress)}%</p>
                  <p className="text-xs text-muted-foreground">{hasActiveGoals ? 'Active' : 'No active goals'}</p>
                </div>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg font-semibold text-foreground">₹{totalSavings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveGoals ? `of ₹${totalTargets.toLocaleString()} active goal` : 'No active goals'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Goals */}
      <Card className="border-border/80 bg-gradient-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Savings Goals
          </CardTitle>
          <Badge variant="secondary">{activeGoals.length} active</Badge>
        </CardHeader>
        <CardContent>
          {activeGoals.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {activeGoals.map((goal) => {
                const used = getGoalUsedAmount(goal.id);
                const netSaved = Math.max(0, goal.current - used);
                const progress = goal.target > 0 ? (netSaved / goal.target) * 100 : 0;
                const remaining = Math.max(0, goal.target - netSaved);

                return (
                  <div key={goal.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm transition-shadow hover:shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{goal.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Saved {formatCurrency(netSaved)} of {formatCurrency(goal.target)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMoney(goal.id, goal.name)}
                          className="bg-savings/10 border-savings/30 text-savings hover:bg-savings/20"
                        >
                          <Wallet className="w-3 h-3 mr-1" />
                          Add Money
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openGoalAmountDialog(goal)}
                          aria-label={`Set existing saved amount for ${goal.name}`}
                        >
                          Assign existing savings
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSpendingGoalId(goal.id)}>
                          Spend from goal
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setWithdrawalGoalId(goal.id)} disabled={netSaved <= 0}>
                          Withdraw to bank
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markGoalCompleted(goal.id)}
                          className="bg-success/10 border-success/30 text-success hover:bg-success/20"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Close goal
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleGoalHistory(goal.id)}
                        >
                          <History className="w-3 h-3 mr-1" />
                          {expandedGoals.has(goal.id) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                        <EditDeleteMenu
                          onEdit={() => handleEdit(goal.id)}
                          onDelete={() => handleDelete(goal.id)}
                          itemName="savings goal"
                          deleteTitle="Delete Savings Goal"
                          deleteDescription="This permanently deletes the goal and its contribution history. Expenses linked to it remain in your expense records but are no longer counted toward this goal. Goal totals and savings trends will change."
                        />
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
                      <span className="text-muted-foreground">
                        Used: ₹{used.toLocaleString()} • ₹{remaining.toLocaleString()} remaining
                      </span>
                    </div>
                    {netSaved > 0 && <p className="text-xs text-muted-foreground">Closing archives this goal; {formatCurrency(netSaved)} remains assigned. Withdraw or spend it before reusing this goal name.</p>}

                    {/* Transaction History */}
                    {expandedGoals.has(goal.id) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <History className="w-3 h-3" />
                            Transaction History
                          </h4>
                          {getSavingsGoalActivity(goal.id).length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {getSavingsGoalActivity(goal.id).map((activity) => (
                                <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between text-xs p-2 bg-secondary/30 rounded">
                                  <div className="flex-1">
                                    <span className="font-medium">{goalActivityLabel(activity.type)}</span>
                                    <p className="text-muted-foreground">{formatDisplayDate(activity.date)}</p>
                                    {activity.notes && (
                                      <p className="text-muted-foreground text-xs mt-1">{activity.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className={`font-semibold ${goalActivityTone(activity.type, activity.amount)}`}>
                                        {goalActivitySign(activity.type)}{formatCurrency(activity.amount)}
                                      </span>
                                    </div>
                                    {activity.type === 'contribution' && activity.transaction && <EditDeleteMenu
                                      onEdit={() => handleEditTransaction(activity.transaction.id, goal)}
                                      onDelete={() => handleDeleteTransaction(activity.transaction.id)}
                                      itemName="transaction"
                                      deleteTitle="Delete Contribution"
                                      deleteDescription="Are you sure you want to delete this contribution? This will affect the total saved amount."
                                    />}
                                    {activity.type === 'allocation' && <Button variant="ghost" size="sm" onClick={() => openGoalAmountDialog(goal)} aria-label="Edit existing savings assignment">Edit assignment</Button>}
                                    {activity.type === 'spending' && <EditDeleteMenu
                                      onEdit={() => setEditingGoalExpenseId(activity.id)}
                                      onDelete={() => handleDeleteGoalSpending(activity.id)}
                                      itemName="goal spending"
                                      deleteTitle="Delete Goal Spending"
                                      deleteDescription="This removes the linked expense and updates the amount used from this goal."
                                    />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No transactions yet</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No active savings goals</h3>
              <p className="mx-auto mb-4 max-w-md text-sm">Already have money saved? Enter your current bank balance above. You can add savings goals later if you want to track money for specific plans.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={openOpeningBalanceDialog}>
                  Enter existing bank balance
                </Button>
                <Button onClick={() => setIsFormOpen(true)} className="bg-savings text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create a savings goal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Goals (History) */}
      {data.savings.some(g => (g.status ?? 'active') === 'completed') && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-success" />
              Completed Goals
            </CardTitle>
            <Badge variant="outline">{completedGoalsCount} completed</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.savings.filter(g => (g.status ?? 'active') === 'completed').map(goal => {
                const activity = getSavingsGoalActivity(goal.id);
                const withdrawable = Math.max(0, Number(goal.current || 0) - getGoalUsedAmount(goal.id));
                return (
                  <div key={goal.id} className="rounded-xl border border-success/20 bg-success/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-muted-foreground line-through">{goal.name}</h3>
                          <Badge variant="outline" className="text-success border-success">
                            <Award className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Saved {formatCurrency(goal.current)} • Used {formatCurrency(getGoalUsedAmount(goal.id))} • Target {formatCurrency(goal.target)}
                        </p>
                        {goal.completed_date && <p className="text-xs text-muted-foreground">Completed on {formatDisplayDate(goal.completed_date)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggleGoalHistory(goal.id)}>
                          <History className="mr-1 h-3.5 w-3.5" />
                          {expandedGoals.has(goal.id) ? 'Hide history' : 'View history'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setWithdrawalGoalId(goal.id)} disabled={withdrawable <= 0}>
                          Withdraw to bank
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => restoreGoal(goal.id)}>Restore</Button>
                      </div>
                    </div>
                    {expandedGoals.has(goal.id) && (
                      <div className="mt-4 space-y-2 border-t border-success/20 pt-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Goal history</h4>
                        {activity.length > 0 ? activity.map(item => (
                          <div key={`${item.type}-${item.id}`} className="flex items-start justify-between gap-3 rounded-lg bg-background/70 p-3 text-sm">
                            <div>
                              <p className="font-medium">{goalActivityLabel(item.type)}</p>
                              <p className="text-xs text-muted-foreground">{formatDisplayDate(item.date)}</p>
                              {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`shrink-0 font-semibold ${goalActivityTone(item.type, item.amount)}`}>
                                {goalActivitySign(item.type)}{formatCurrency(item.amount)}
                              </span>
                              {item.type === 'allocation' && <Button variant="ghost" size="sm" onClick={() => openGoalAmountDialog(goal)} aria-label="Edit existing savings assignment">Edit assignment</Button>}
                              {item.type === 'spending' && <EditDeleteMenu
                                onEdit={() => setEditingGoalExpenseId(item.id)}
                                onDelete={() => handleDeleteGoalSpending(item.id)}
                                itemName="goal spending"
                                deleteTitle="Delete Goal Spending"
                                deleteDescription="This removes the linked expense and updates the amount used from this goal."
                              />}
                            </div>
                          </div>
                        )) : <p className="text-xs text-muted-foreground">No contribution or spending history for this goal.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Savings Trend - Trade Style */}
      <Card className="relative overflow-hidden border-border/80 bg-card shadow-sm">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-savings/5 via-transparent to-transparent pointer-events-none" />
        
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="p-2 rounded-lg bg-savings/10">
                <TrendingUp className="w-4 h-4 text-savings" />
              </div>
              Savings Goal Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cumulative savings over time
            </p>
          </div>
          {/* Time Period Selector */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(['7d', '30d', '3m'] as const).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 px-3 text-xs ${
                  timePeriod === period 
                    ? 'bg-savings text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTimePeriod(period)}
              >
                {period === '7d' ? '7D' : period === '30d' ? '30D' : '3M'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="relative pt-0">
          {savingsTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={savingsTrend} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="hsl(217 91% 60%)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip content={<SavingsTrendTooltip />} />
                  {avgSavings > 0 && (
                    <ReferenceLine 
                      y={avgSavings} 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                      label={{ 
                        value: 'Avg', 
                        position: 'right',
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: 10
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth={2.5}
                    fill="url(#savingsGradient)"
                    dot={false}
                    activeDot={{ 
                      r: 6, 
                      fill: 'hsl(217 91% 60%)', 
                      stroke: 'white', 
                      strokeWidth: 2,
                      className: 'drop-shadow-lg'
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">No savings trend available</p>
                <p className="text-sm mt-1">Add savings goals and transactions to see trends</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      
      <AIInsightsCard title="AI savings tips" focus="savings" autoGenerate isDataLoading={isFinancialLoading} showLanguageSelector refreshKey={data.savings} />
      <SavingsForm 
        open={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(null);
        }}
        editingId={editingEntry}
      />
      
      {/* Savings Transaction Form */}
      {currentSavingsGoal && (
        <SavingsTransactionForm
          open={transactionFormOpen}
          onClose={() => {
            setTransactionFormOpen(false);
            setCurrentSavingsGoal(null);
            setEditingTransaction(null);
          }}
          savingsGoalId={currentSavingsGoal.id}
          savingsGoalName={currentSavingsGoal.name}
          editingId={editingTransaction}
        />
      )}
      <GoalSpendingForm
        open={Boolean(spendingGoalId)}
        onClose={() => setSpendingGoalId(null)}
        goalId={spendingGoalId ?? ''}
      />
      <GoalWithdrawalForm
        open={Boolean(withdrawalGoalId)}
        onClose={() => setWithdrawalGoalId(null)}
        goalId={withdrawalGoalId ?? ''}
      />
      <ExpenseForm
        open={Boolean(editingGoalExpenseId)}
        onClose={() => setEditingGoalExpenseId(null)}
        editingId={editingGoalExpenseId}
      />
    </div>
  );
};
