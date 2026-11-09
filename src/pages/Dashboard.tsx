import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumn,
  CircleDollarSign,
  PiggyBank,
  LogOut,
  Plus,
  RefreshCw,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HomeFinancialOutlook } from '@/components/ai/HomeFinancialOutlook';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const inr = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;
const chartColors = ['hsl(var(--primary))', '#34d399', '#60a5fa', '#fbbf24', '#a78bfa'];
type RangePreset = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';
const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const useDateRangeFilter = (defaultPreset: RangePreset = 'this_month') => {
  const [preset, setPreset] = useState<RangePreset>(defaultPreset);
  const [customStart, setCustomStart] = useState(() => {
    const today = new Date();
    return toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()));
  const range = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start: Date;
    if (preset === 'this_week') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    } else if (preset === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end.setDate(0);
    } else if (preset === 'last_3_months') {
      start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    } else if (preset === 'this_year') {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (preset === 'custom') {
      const first = customStart || toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
      const last = customEnd || toDateKey(today);
      return first <= last ? { start: first, end: last } : { start: last, end: first };
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    return { start: toDateKey(start), end: toDateKey(end) };
  }, [preset, customStart, customEnd]);
  const label = `${new Date(`${range.start}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(`${range.end}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range, label };
};

type DateRangeFilter = ReturnType<typeof useDateRangeFilter>;

const DateRangeFilterControl = ({ filter, widget, options }: { filter: DateRangeFilter; widget: string; options?: Array<{ value: RangePreset; label: string }> }) => (
  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
    <Select value={filter.preset} onValueChange={(value) => filter.setPreset(value as RangePreset)}>
      <SelectTrigger className="h-9 w-full sm:w-[160px]" aria-label={`Filter ${widget} by date range`}>
        <SelectValue placeholder="Choose a range" />
      </SelectTrigger>
      <SelectContent>
        {(options || [
          { value: 'this_month', label: 'This month' },
          { value: 'last_month', label: 'Last month' },
          { value: 'last_3_months', label: 'Last 3 months' },
          { value: 'this_year', label: 'This year' },
          { value: 'custom', label: 'Custom range' },
        ]).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
    {filter.preset === 'custom' && (
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label={`${widget} start date`} type="date" value={filter.customStart} max={filter.customEnd} onChange={(event) => filter.setCustomStart(event.target.value)} className="h-9 min-w-0 px-2 text-xs" />
        <Input aria-label={`${widget} end date`} type="date" value={filter.customEnd} min={filter.customStart} onChange={(event) => filter.setCustomEnd(event.target.value)} className="h-9 min-w-0 px-2 text-xs" />
      </div>
    )}
  </div>
);

interface Props {
  onAdd: () => void;
  onNavigate: (tab: string) => void;
}

export const Dashboard = ({ onAdd, onNavigate }: Props) => {
  const { data, isLoading, refreshBudgets, refreshExpenses, refreshIncome, refreshSavingsTransactions, refreshInvestmentTransactions } = useFinancial();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryType, setCategoryType] = useState<'expenses' | 'savings' | 'investment'>('expenses');
  const budgetDateFilter = useDateRangeFilter();
  const categoryDateFilter = useDateRangeFilter();
  const cashFlowDateFilter = useDateRangeFilter('this_year');
  const activityDateFilter = useDateRangeFilter('this_week');
  const topExpensesDateFilter = useDateRangeFilter();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dayOfMonth = now.getDate();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const stats = useMemo(() => {
    const monthExpenses = data.expenses.filter((entry) => entry.date?.startsWith(monthKey));
    const monthIncome = data.income.filter((entry) => entry.date?.startsWith(monthKey));
    const inRange = (date: string | undefined, range: DateRangeFilter['range']) => Boolean(date && date >= range.start && date <= range.end);
    const cashFlowRange = cashFlowDateFilter.preset === 'this_year'
      ? { start: `${year}-01-01`, end: `${year}-12-31` }
      : cashFlowDateFilter.range;
    const budgetExpenses = data.expenses.filter((entry) => inRange(entry.date, budgetDateFilter.range));
    const categoryExpenses = data.expenses.filter((entry) => inRange(entry.date, categoryDateFilter.range));
    const cashFlowExpenses = data.expenses.filter((entry) => inRange(entry.date, cashFlowRange));
    const cashFlowIncome = data.income.filter((entry) => inRange(entry.date, cashFlowRange));
    const cashFlowSavingsTransactions = data.savingsTransactions.filter((entry) => inRange(entry.date, cashFlowRange) && !entry.notes?.startsWith('Existing balance adjustment:') && !entry.notes?.startsWith('Existing balance allocation:'));
    const cashFlowInvestmentTransactions = data.investmentTransactions.filter((entry) =>
      inRange(entry.date, cashFlowRange) && !entry.notes?.startsWith('Statement snapshot:'));
    const activityExpenses = data.expenses.filter((entry) => inRange(entry.date, activityDateFilter.range));
    const activityIncome = data.income.filter((entry) => inRange(entry.date, activityDateFilter.range));
    const topExpenses = data.expenses
      .filter((entry) => inRange(entry.date, topExpensesDateFilter.range))
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0) || b.date.localeCompare(a.date))
      .slice(0, 5);
    const spent = monthExpenses.reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const monthInvestmentContributions = data.investmentTransactions
      .filter((entry) => entry.date?.startsWith(monthKey) && Number(entry.amount || 0) > 0 && !entry.notes?.startsWith('Statement snapshot:'))
      .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const received = monthIncome.reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const rangeStartMonth = new Date(`${budgetDateFilter.range.start.slice(0, 7)}-01T00:00:00`);
    const rangeEndMonth = new Date(`${budgetDateFilter.range.end.slice(0, 7)}-01T00:00:00`);
    const monthlyBudgets = data.budgets.filter((budget) => {
      if (budget.period !== 'monthly') return false;
      if (budget.year == null && budget.month == null) return true;
      for (const cursor = new Date(rangeStartMonth); cursor <= rangeEndMonth; cursor.setMonth(cursor.getMonth() + 1)) {
        if ((budget.year == null || budget.year === cursor.getFullYear()) &&
          (budget.month == null || budget.month === cursor.getMonth())) return true;
      }
      return false;
    });
    const budget = monthlyBudgets.reduce((total, entry) => total + Number(entry.limit_amount || 0), 0);
    const expenseCategories = categoryExpenses.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.category] = (totals[entry.category] || 0) + Number(entry.amount || 0);
      return totals;
    }, {});
    const savingsCategories: Record<string, number> = {};
    const categorySavingsTransactions = data.savingsTransactions.filter((entry) => inRange(entry.date, categoryDateFilter.range) && Number(entry.amount || 0) > 0 && !entry.notes?.startsWith('Existing balance adjustment:') && !entry.notes?.startsWith('Existing balance allocation:'));
    for (const transaction of categorySavingsTransactions) {
      const goal = data.savings.find((item) => item.id === transaction.savings_goal_id);
      const name = goal?.name || 'Other savings';
      savingsCategories[name] = (savingsCategories[name] || 0) + Number(transaction.amount || 0);
    }
    for (const goal of data.savings) {
      const transactionTotal = data.savingsTransactions
        .filter((transaction) => transaction.savings_goal_id === goal.id)
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
      const startingBalance = Math.max(0, Number(goal.current || 0) - transactionTotal);
      if (startingBalance > 0 && inRange(goal.date, categoryDateFilter.range)) {
        savingsCategories[goal.name] = (savingsCategories[goal.name] || 0) + startingBalance;
      }
    }
    const investmentCategories: Record<string, number> = {};
    const categoryInvestmentTransactions = data.investmentTransactions.filter((entry) => inRange(entry.date, categoryDateFilter.range) && Number(entry.amount || 0) > 0 && !entry.notes?.startsWith('Statement snapshot:'));
    for (const transaction of categoryInvestmentTransactions) {
      const investment = data.investments.find((item) => item.id === transaction.investment_id);
      const name = investment?.name || 'Other investments';
      investmentCategories[name] = (investmentCategories[name] || 0) + Number(transaction.amount || 0);
    }
    for (const investment of data.investments) {
      if (investment.notes?.startsWith('Imported from mutual fund statement snapshots.') || investment.notes?.startsWith('Imported from Angel One statement snapshots.')) continue;
      const hasTransactions = data.investmentTransactions.some((transaction) => transaction.investment_id === investment.id);
      const startingInvestment = Number(investment.initial_invested || (!hasTransactions ? investment.invested : 0) || 0);
      if (startingInvestment > 0 && inRange(investment.date, categoryDateFilter.range)) {
        investmentCategories[investment.name] = (investmentCategories[investment.name] || 0) + startingInvestment;
      }
    }
    const categoryBreakdowns = {
      expenses: expenseCategories,
      savings: savingsCategories,
      investment: investmentCategories,
    };
    const categoryDetails = Object.fromEntries(Object.entries(categoryBreakdowns).map(([type, entries]) => {
      const categories = Object.entries(entries).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const chart = categories.slice(0, 4);
      const otherCategoryTotal = categories.slice(4).reduce((total, entry) => total + entry.value, 0);
      if (otherCategoryTotal > 0) chart.push({ name: 'Other', value: otherCategoryTotal });
      return [type, { categories, chart }];
    })) as Record<'expenses' | 'savings' | 'investment', { categories: Array<{ name: string; value: number }>; chart: Array<{ name: string; value: number }> }>;
    const budgetGroups = new Map<string, { category: string; type: 'expenses' | 'savings' | 'investment'; linkedId?: string; limit: number }>();
    monthlyBudgets.forEach((entry) => {
      const type = entry.linked_type || 'expenses';
      const key = `${type}:${entry.linked_id || entry.category}`;
      const existing = budgetGroups.get(key);
      if (existing) existing.limit += Number(entry.limit_amount || 0);
      else budgetGroups.set(key, { category: entry.category, type, linkedId: entry.linked_id, limit: Number(entry.limit_amount || 0) });
    });
    const budgetCategories = Array.from(budgetGroups.values()).map((entry) => {
      let actual = 0;
      if (entry.type === 'savings' && entry.linkedId) {
        actual = data.savingsTransactions
          .filter((transaction) => transaction.savings_goal_id === entry.linkedId && inRange(transaction.date, budgetDateFilter.range) && Number(transaction.amount || 0) > 0 && !transaction.notes?.startsWith('Existing balance adjustment:') && !transaction.notes?.startsWith('Existing balance allocation:'))
          .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
      } else if (entry.type === 'investment' && entry.linkedId) {
        actual = data.investmentTransactions
          .filter((transaction) => transaction.investment_id === entry.linkedId && inRange(transaction.date, budgetDateFilter.range) && Number(transaction.amount || 0) > 0 && !transaction.notes?.startsWith('Statement snapshot:'))
          .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
      } else if (entry.type === 'expenses') {
        actual = budgetExpenses.filter((expense) => expense.category === entry.category).reduce((total, expense) => total + Number(expense.amount || 0), 0);
      }
      return { ...entry, spent: actual };
    })
      .sort((a, b) => (b.limit > 0 ? b.spent / b.limit : 0) - (a.limit > 0 ? a.spent / a.limit : 0))
    const rangeSpent = budgetExpenses.reduce((total, entry) => total + Number(entry.amount || 0), 0)
      + budgetCategories.filter((entry) => entry.type !== 'expenses').reduce((total, entry) => total + entry.spent, 0);
    const rangeStartDate = new Date(`${cashFlowRange.start}T00:00:00`);
    const rangeEndDate = new Date(`${cashFlowRange.end}T00:00:00`);
    const monthlyMoneyBreakdown: Array<{ month: string; monthKey: string; income: number; expenses: number; setAside: number; withdrawals: number }> = [];
    const monthCursor = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), 1);
    const finalMonth = new Date(rangeEndDate.getFullYear(), rangeEndDate.getMonth(), 1);
    for (const cursor = new Date(monthCursor); cursor <= finalMonth; cursor.setMonth(cursor.getMonth() + 1)) {
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthlyMoneyBreakdown.push({
        month: cursor.toLocaleDateString('en-IN', { month: 'short' }),
        monthKey,
        income: 0,
        expenses: 0,
        setAside: 0,
        withdrawals: 0,
      });
    }
    const monthsByKey = new Map(monthlyMoneyBreakdown.map((item) => [item.monthKey, item]));
    const addToMonth = (date: string, key: 'income' | 'expenses' | 'setAside' | 'withdrawals', amount: number) => {
      const bucket = monthsByKey.get(date.slice(0, 7));
      if (bucket) bucket[key] += amount;
    };
    for (const entry of cashFlowIncome) addToMonth(entry.date, 'income', Number(entry.amount || 0));
    for (const entry of cashFlowExpenses) addToMonth(entry.date, 'expenses', Number(entry.amount || 0));
    for (const transaction of cashFlowSavingsTransactions) {
      const amount = Number(transaction.amount || 0);
      addToMonth(transaction.date, amount < 0 ? 'withdrawals' : 'setAside', Math.abs(amount));
    }
    for (const transaction of cashFlowInvestmentTransactions) {
      const amount = Number(transaction.amount || 0);
      addToMonth(transaction.date, amount < 0 ? 'withdrawals' : 'setAside', Math.abs(amount));
    }
    for (const goal of data.savings) {
      const transactionTotal = data.savingsTransactions
        .filter((transaction) => transaction.savings_goal_id === goal.id)
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
      const startingBalance = Math.max(0, Number(goal.current || 0) - transactionTotal);
      if (startingBalance > 0 && inRange(goal.date, cashFlowRange)) addToMonth(goal.date, 'setAside', startingBalance);
    }
    for (const investment of data.investments) {
      if (investment.notes?.startsWith('Imported from mutual fund statement snapshots.') ||
        investment.notes?.startsWith('Imported from Angel One statement snapshots.')) continue;
      const hasTransactions = data.investmentTransactions.some((transaction) => transaction.investment_id === investment.id);
      const startingInvestment = Number(investment.initial_invested || (!hasTransactions ? investment.invested : 0) || 0);
      if (startingInvestment > 0 && inRange(investment.date, cashFlowRange)) addToMonth(investment.date, 'setAside', startingInvestment);
    }
    const activity = [
      ...activityExpenses.map((entry) => ({
        id: `expense-${entry.id}`,
        type: 'expense' as const,
        title: entry.notes?.trim() || entry.category,
        detail: entry.category,
        date: entry.date,
        amount: Number(entry.amount || 0),
      })),
      ...activityIncome.map((entry) => ({
        id: `income-${entry.id}`,
        type: 'income' as const,
        title: entry.notes?.trim() || entry.category,
        detail: 'Income',
        date: entry.date,
        amount: Number(entry.amount || 0),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    const savings = data.savings.reduce((total, goal) => total + Number(goal.current || 0), 0);
    const investments = data.investments.reduce((total, investment) => total + Number(investment.current || investment.invested || 0), 0);

    return {
      spent,
      monthInvestmentContributions,
      received,
      budget,
      rangeSpent,
      remaining: budget - rangeSpent,
      net: received - spent - monthInvestmentContributions,
      monthExpenses,
      monthIncome,
      budgetCategories,
      monthlyMoneyBreakdown,
      categoryDetails,
      topExpenses,
      activity,
      savings,
      investments,
      dailyAverage: (spent + monthInvestmentContributions) / Math.max(dayOfMonth, 1),
    };
  }, [data, monthKey, month, year, dayOfMonth, budgetDateFilter.range, categoryDateFilter.range, cashFlowDateFilter.preset, cashFlowDateFilter.range, activityDateFilter.range, topExpensesDateFilter.range]);

  const firstName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim().split(/\s+/)[0];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const budgetUsed = stats.budget > 0 ? Math.min(100, (stats.rangeSpent / stats.budget) * 100) : 0;
  const activeCategoryDetails = stats.categoryDetails[categoryType];
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshBudgets(),
        refreshExpenses(),
        refreshIncome(),
        refreshSavingsTransactions(),
        refreshInvestmentTransactions(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out' });
      return;
    }
    window.location.href = '/auth';
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-8 pt-5 sm:space-y-8 sm:px-6 sm:pt-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here’s your money snapshot for this month.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} aria-label="Refresh financial data" title="Refresh data" className="h-10 w-10 rounded-xl">
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={handleSignOut} aria-label="Log out" title="Log out" className="h-10 w-10 rounded-xl">
            <LogOut className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </header>

      <section aria-label="Monthly cash flow">
        <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.7)] sm:p-7" style={{ background: 'linear-gradient(135deg, #18352e 0%, #214b40 54%, #2da66a 100%)' }}>
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/70">Monthly cash flow</p>
              {isLoading ? <Skeleton className="mt-3 h-11 w-44 bg-white/15" /> : (
                <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{inr(stats.net)}</p>
              )}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
                {stats.net >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {stats.net >= 0 ? 'Income is ahead of spending' : 'Spending is ahead of income'}
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm sm:h-14 sm:w-14">
              <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          </div>
          <div className="relative mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/15 pt-4 sm:mt-8 sm:gap-x-8 sm:gap-y-6">
            {[
              { label: 'Income received', value: stats.received, detail: `${stats.monthIncome.length} entries`, icon: TrendingUp },
              { label: 'Expenses recorded', value: stats.spent, detail: `${stats.monthExpenses.length} entries`, icon: TrendingDown },
              { label: 'Savings balance', value: stats.savings, detail: `${data.savings.length} goals`, icon: PiggyBank },
              { label: 'Investment value', value: stats.investments, detail: `${inr(stats.monthInvestmentContributions)} added this month`, icon: CircleDollarSign },
            ].map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="min-w-0">
                <p className="flex items-start gap-1.5 text-xs leading-5 text-white/70"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{label}</span></p>
                <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{isLoading ? '\u2014' : inr(value)}</p>
                <p className="mt-0.5 text-[11px] text-white/60">{isLoading ? ' ' : detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Spending charts">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Monthly budget</h2></div><p className="mt-1 text-xs text-muted-foreground">Expense, savings, and investment budgets | {budgetDateFilter.label}</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeFilterControl filter={budgetDateFilter} widget="Monthly budget" />
              <Button variant="ghost" size="sm" className="shrink-0 text-primary" onClick={() => onNavigate('budget')}>Manage <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Button>
            </div>
          </div>
          {isLoading ? <div className="mt-5 grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]"><Skeleton className="mx-auto h-36 w-36 rounded-full" /><div className="space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-10 w-full" />)}</div></div> : stats.budget > 0 ? (
            <>
              <div className="mt-5 grid items-center gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-muted" role="progressbar" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budgetUsed)}>
                  <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="11" />
                    <circle cx="60" cy="60" r="48" fill="none" className={budgetUsed >= 100 ? 'text-destructive' : budgetUsed >= 80 ? 'text-warning' : 'text-primary'} stroke="currentColor" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${budgetUsed * 3.016} 301.6`} />
                  </svg>
                  <div className="relative text-center"><p className="text-2xl font-bold tabular-nums text-foreground">{Math.round(budgetUsed)}%</p><p className="text-[11px] text-muted-foreground">used</p></div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Used in selected range</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{inr(stats.rangeSpent)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">of {inr(stats.budget)} total budget</p>
                  <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${stats.remaining >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    {stats.remaining >= 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {stats.remaining >= 0 ? `${inr(stats.remaining)} budget remaining` : `${inr(Math.abs(stats.remaining))} over budget`}
                  </div>
                </div>
              </div>
              <div className="mt-5 border-t border-border/70 pt-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ChartNoAxesColumn className="h-3.5 w-3.5" /> BUDGET PROGRESS</div>
                {stats.budgetCategories.length ? <div className={stats.budgetCategories.length > 5 ? 'h-[280px] overflow-y-auto pr-2' : 'pr-2'} role="region" aria-label="Budget progress list" tabIndex={0}>
                {stats.budgetCategories.map((item) => {
                const percent = item.limit > 0 ? Math.min(100, item.spent / item.limit * 100) : 0;
                const tone = percent >= 100 ? 'bg-destructive' : percent >= 80 ? 'bg-warning' : 'bg-primary';
                const typeLabel = item.type === 'savings' ? 'Savings' : item.type === 'investment' ? 'Investment' : 'Expense';
                return <div key={`${item.type}:${item.linkedId || item.category}`} className="flex h-14 flex-col justify-center gap-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-foreground">{item.category} <span className="text-muted-foreground">· {typeLabel}</span></span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{inr(item.spent)} <span className="text-muted-foreground/60">/ {inr(item.limit)}</span></span>
                  </div>
                  <div role="progressbar" aria-label={`${item.category} budget used`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percent}%` }} /></div>
                </div>;
              })}
                </div> : <p className="text-sm text-muted-foreground">Add category limits to see how spending compares.</p>}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-7 text-center">
              <Target className="mx-auto h-7 w-7 text-muted-foreground/70" />
              <p className="mt-2 text-sm font-medium text-foreground">No monthly budget yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Set expense, savings, or investment limits to see your progress here.</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => onNavigate('budget')}>Create a budget</Button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="font-semibold text-foreground">Spending by category</h2><p className="mt-1 text-xs text-muted-foreground">{categoryType === 'expenses' ? 'Expense' : categoryType === 'savings' ? 'Savings' : 'Investment'} breakdown | {categoryDateFilter.label}</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeFilterControl filter={categoryDateFilter} widget="Spending by category" />
              <button onClick={() => onNavigate(categoryType === 'expenses' ? 'expenses' : categoryType === 'savings' ? 'savings' : 'investments')} className="text-xs font-semibold text-primary hover:underline">View all</button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Category type">
            {([
              { id: 'expenses', label: 'Expense' },
              { id: 'savings', label: 'Savings' },
              { id: 'investment', label: 'Investment' },
            ] as const).map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={categoryType === id} onClick={() => setCategoryType(id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${categoryType === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          {isLoading ? <Skeleton className="mt-5 h-56 w-full" /> : activeCategoryDetails.chart.length ? (
            <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-52 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={activeCategoryDetails.chart} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                      {activeCategoryDetails.chart.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => inr(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className={`w-full sm:w-1/2 ${activeCategoryDetails.categories.length > 5 ? 'h-[200px] overflow-y-auto pr-2' : ''}`} aria-label={`${categoryType} categories`}>
                {activeCategoryDetails.categories.map((entry, index) => (
                  <li key={entry.name} className="flex h-10 items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span className="truncate">{entry.name}</span></span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">{inr(entry.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-5 flex h-56 items-center justify-center rounded-xl bg-muted/40 px-4 text-center text-sm text-muted-foreground">No {categoryType === 'expenses' ? 'expenses' : categoryType === 'savings' ? 'savings contributions' : 'investment contributions'} in this date range.</div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><h2 className="font-semibold text-foreground">Monthly money breakdown</h2><p className="mt-1 text-xs text-muted-foreground">Compare income, expenses, savings, investments, and withdrawals | {cashFlowDateFilter.preset === 'this_year' ? year : cashFlowDateFilter.label}</p></div>
            <DateRangeFilterControl filter={cashFlowDateFilter} widget="Monthly money breakdown" />
          </div>
          {isLoading ? <Skeleton className="mt-5 h-48 w-full" /> : stats.monthlyMoneyBreakdown.some((item) => item.income || item.expenses || item.setAside || item.withdrawals) ? (
            <div className="mt-5 min-w-0 rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/5 p-3 sm:p-5">
              <div className="mb-4 grid grid-cols-2 justify-center gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-600" />Income</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full bg-rose-600" />Expenses</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full bg-violet-600" />Saved & invested</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />Withdrawals</span>
              </div>
              <div className="-mx-1 min-w-0 max-w-full overflow-x-auto overscroll-x-contain sm:mx-0" role="region" aria-label="Monthly money breakdown chart; scroll horizontally to view all months" tabIndex={0}>
                <div className="h-64 sm:h-72" style={{ minWidth: stats.monthlyMoneyBreakdown.length > 6 ? 640 : '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyMoneyBreakdown} margin={{ top: 12, right: 12, left: 4, bottom: 0 }} barCategoryGap="28%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.65} />
                      <XAxis dataKey="month" interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} minTickGap={8} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value: number) => `${String.fromCharCode(8377)}${Math.abs(value) >= 1000 ? `${Math.round(value / 1000)}k` : value}`} width={52} />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.35 }}
                        formatter={(value: number, name: string) => [inr(value), name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : name === 'setAside' ? 'Saved & invested' : 'Withdrawals']}
                        contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--popover))', boxShadow: '0 12px 28px -14px rgba(15,23,42,0.4)', padding: '9px 12px' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 5 }}
                        itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, padding: '2px 0' }}
                      />
                      <Bar dataKey="income" name="income" fill="#059669" radius={[5, 5, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="expenses" name="expenses" fill="#e11d48" radius={[5, 5, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="setAside" name="setAside" fill="#7c3aed" radius={[5, 5, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="withdrawals" name="withdrawals" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {stats.monthlyMoneyBreakdown.length > 6 && <p className="mt-2 text-center text-[11px] text-muted-foreground sm:hidden">Swipe the chart sideways to view every month.</p>}
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Redemptions and savings withdrawals appear as positive withdrawal amounts, keeping the monthly comparison easy to scan.</p>
            </div>
          ) : (
            <div className="mt-5 flex h-48 items-center justify-center rounded-xl bg-muted/40 px-4 text-center text-sm text-muted-foreground">Add income, expenses, savings, or investment records to compare monthly totals.</div>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Expense and transaction activity">
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="font-semibold text-foreground">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Income and expenses | {activityDateFilter.label}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilterControl
              filter={activityDateFilter}
              widget="Recent activity"
              options={[
                { value: 'this_week', label: 'This week' },
                { value: 'this_month', label: 'This month' },
                { value: 'this_year', label: 'This year' },
                { value: 'custom', label: 'Custom range' },
              ]}
            />
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onNavigate('expenses')}>See all <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Button>
          </div>
        </div>
        {isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div> : stats.activity.length ? (
          <ul className="max-h-[28rem] divide-y divide-border/70 overflow-y-auto overscroll-contain">
            {stats.activity.map((entry) => {
              const isIncome = entry.type === 'income';
              return <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>{isIncome ? <TrendingUp className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{entry.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{entry.detail} · {new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>
                </div>
                <p className={`shrink-0 text-sm font-semibold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{isIncome ? '+' : '−'}{inr(entry.amount)}</p>
              </li>;
            })}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center sm:px-6"><ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden /><p className="mt-3 font-medium text-foreground">No activity in this range</p><p className="mt-1 text-sm text-muted-foreground">Choose another date range or add a transaction.</p><Button variant="outline" className="mt-4 rounded-xl" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add an expense</Button></div>
        )}
        <div className="grid grid-cols-2 border-t border-border/70 bg-muted/20">
          <button onClick={() => onNavigate('income')} className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Add income</button>
          <button onClick={() => onNavigate('expenses')} className="flex items-center justify-center gap-2 border-l border-border/70 px-3 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /> View expenses</button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <div><h2 className="font-semibold text-foreground">Top 5 expenses</h2><p className="mt-1 text-xs text-muted-foreground">Largest individual expenses | {topExpensesDateFilter.label}</p></div>
          <DateRangeFilterControl
            filter={topExpensesDateFilter}
            widget="Top 5 expenses"
            options={[
              { value: 'this_week', label: 'This week' },
              { value: 'this_month', label: 'This month' },
              { value: 'last_month', label: 'Last month' },
              { value: 'last_3_months', label: 'Last 3 months' },
              { value: 'this_year', label: 'This year' },
              { value: 'custom', label: 'Custom range' },
            ]}
          />
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</div>
        ) : stats.topExpenses.length ? (
          <ol className="divide-y divide-border/70">
            {stats.topExpenses.map((expense, index) => (
              <li key={expense.id} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{expense.notes?.trim() || expense.category}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{expense.category} · {new Date(`${expense.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{inr(Number(expense.amount || 0))}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-5 py-10 text-center sm:px-6"><ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden /><p className="mt-3 font-medium text-foreground">No expenses in this range</p><p className="mt-1 text-sm text-muted-foreground">Choose another period to see your largest expenses.</p></div>
        )}
        <div className="border-t border-border/70 bg-muted/20 px-5 py-3 sm:px-6"><button onClick={() => onNavigate('expenses')} className="text-xs font-semibold text-primary hover:underline">View all expenses <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden /></button></div>
      </section>
      </section>
      <HomeFinancialOutlook isFinancialLoading={isLoading} />
    </div>
  );
};
