import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  PiggyBank,
  Plus,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';

const inr = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

interface Props {
  onAdd: () => void;
  onNavigate: (tab: string) => void;
}

export const Dashboard = ({ onAdd, onNavigate }: Props) => {
  const { data, isLoading } = useFinancial();
  const { user } = useAuth();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = now.toLocaleString('en-IN', { month: 'long' });
  const stats = useMemo(() => {
    const monthExpenses = data.expenses.filter((entry) => entry.date?.startsWith(monthKey));
    const monthIncome = data.income.filter((entry) => entry.date?.startsWith(monthKey));
    const spent = monthExpenses.reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const received = monthIncome.reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const monthlyBudgets = data.budgets.filter((entry) =>
      entry.period === 'monthly' && (!entry.year || entry.year === year) &&
      (!entry.month || entry.month === month)
    );
    const budget = monthlyBudgets.reduce((total, entry) => total + Number(entry.limit_amount || 0), 0);
    const categories = monthExpenses.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.category] = (totals[entry.category] || 0) + Number(entry.amount || 0);
      return totals;
    }, {});
    const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const budgetCategories = monthlyBudgets
      .map((entry) => ({
        category: entry.category,
        limit: Number(entry.limit_amount || 0),
        spent: categories[entry.category] || 0,
      }))
      .sort((a, b) => (b.limit > 0 ? b.spent / b.limit : 0) - (a.limit > 0 ? a.spent / a.limit : 0))
      .slice(0, 4);
    const activity = [
      ...monthExpenses.map((entry) => ({
        id: `expense-${entry.id}`,
        type: 'expense' as const,
        title: entry.notes?.trim() || entry.category,
        detail: entry.category,
        date: entry.date,
        amount: Number(entry.amount || 0),
      })),
      ...monthIncome.map((entry) => ({
        id: `income-${entry.id}`,
        type: 'income' as const,
        title: entry.notes?.trim() || entry.category,
        detail: 'Income',
        date: entry.date,
        amount: Number(entry.amount || 0),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const savings = data.savings.reduce((total, goal) => total + Number(goal.current || 0), 0);
    const investments = data.investments.reduce((total, investment) => total + Number(investment.current || investment.invested || 0), 0);

    return {
      spent,
      received,
      budget,
      remaining: budget - spent,
      net: received - spent,
      monthExpenses,
      monthIncome,
      categories: topCategories,
      budgetCategories,
      activity,
      savings,
      investments,
      dailyAverage: spent / Math.max(now.getDate(), 1),
    };
  }, [data, monthKey, month, year]);

  const firstName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim().split(/\s+/)[0];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const budgetUsed = stats.budget > 0 ? Math.min(100, (stats.spent / stats.budget) * 100) : 0;
  const progressTone = budgetUsed >= 100 ? 'bg-red-400' : budgetUsed >= 80 ? 'bg-amber-300' : 'bg-emerald-300';
  const monthLabel = `${monthName} ${year}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-8 pt-5 sm:space-y-8 sm:px-6 sm:pt-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> {monthLabel}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here’s your money snapshot for this month.</p>
        </div>
        <Button onClick={onAdd} className="h-11 shrink-0 rounded-xl px-3.5 sm:px-4">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Add expense</span><span className="sm:hidden">Add</span>
        </Button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.75fr)]" aria-label="Monthly finances">
        <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.7)] sm:p-7" style={{ background: 'linear-gradient(135deg, #18352e 0%, #214b40 54%, #2da66a 100%)' }}>
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/70">Monthly cash flow</p>
              {isLoading ? <Skeleton className="mt-3 h-11 w-44 bg-white/15" /> : (
                <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{inr(stats.net)}</p>
              )}
              <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium ${stats.net >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
                {stats.net >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {stats.net >= 0 ? 'Income is ahead of spending' : 'Spending is ahead of income'}
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm sm:h-14 sm:w-14">
              <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          </div>
          <div className="relative mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 sm:mt-8 sm:gap-8">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-white/65"><TrendingUp className="h-3.5 w-3.5" /> Income received</p>
              <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{isLoading ? '—' : inr(stats.received)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs text-white/65"><TrendingDown className="h-3.5 w-3.5" /> Expenses recorded</p>
              <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{isLoading ? '—' : inr(stats.spent)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-primary" /> Monthly budget</div>
              <p className="mt-1 text-xs text-muted-foreground">{stats.budget > 0 ? `${Math.round(budgetUsed)}% of your limit used` : 'Create a plan for your spending'}</p>
            </div>
            <button onClick={() => onNavigate('budget')} className="text-xs font-semibold text-primary hover:underline">View budgets</button>
          </div>
          {isLoading ? <Skeleton className="mt-5 h-14 w-full" /> : stats.budget > 0 ? (
            <>
              <div className="mt-5 flex items-end justify-between gap-3">
                <p className="text-2xl font-bold tabular-nums text-foreground">{inr(stats.spent)}<span className="text-sm font-normal text-muted-foreground"> / {inr(stats.budget)}</span></p>
                <span className={`pb-1 text-xs font-semibold ${stats.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {stats.remaining >= 0 ? `${inr(stats.remaining)} left` : `${inr(Math.abs(stats.remaining))} over`}
                </span>
              </div>
              <div role="progressbar" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budgetUsed)} className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all ${progressTone}`} style={{ width: `${budgetUsed}%` }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{stats.budgetCategories.length ? 'Category budgets are shown below.' : `Your average daily spend is ${inr(stats.dailyAverage)}.`}</p>
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">Set a monthly limit to track how much you have left to spend.</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => onNavigate('budget')}>Set a budget <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Financial totals">
        {[
          { label: 'Income', value: stats.received, count: stats.monthIncome.length, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', tint: 'bg-emerald-500/10', action: 'income' },
          { label: 'Expenses', value: stats.spent, count: stats.monthExpenses.length, icon: ReceiptText, color: 'text-rose-600 dark:text-rose-400', tint: 'bg-rose-500/10', action: 'expenses' },
          { label: 'Savings goals', value: stats.savings, count: data.savings.length, icon: PiggyBank, color: 'text-sky-600 dark:text-sky-400', tint: 'bg-sky-500/10', action: 'savings' },
          { label: 'Investments', value: stats.investments, count: data.investments.length, icon: CircleDollarSign, color: 'text-violet-600 dark:text-violet-400', tint: 'bg-violet-500/10', action: 'investments' },
        ].map(({ label, value, count, icon: Icon, color, tint, action }) => (
          <button key={label} onClick={() => onNavigate(action)} className="group rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint} ${color}`}><Icon className="h-4 w-4" /></span>
            </div>
            {isLoading ? <Skeleton className="mt-3 h-7 w-28" /> : <p className="mt-3 truncate text-xl font-bold tabular-nums text-foreground sm:text-2xl">{inr(value)}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{count} {label === 'Savings goals' ? 'goals' : label === 'Investments' ? 'assets' : 'entries'}{label === 'Income' || label === 'Expenses' ? ' this month' : ''}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold text-foreground">Budget by category</h2><p className="mt-1 text-xs text-muted-foreground">How your spending compares to your limits</p></div>
            <button onClick={() => onNavigate('budget')} aria-label="Open budgets" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowRight className="h-4 w-4" /></button>
          </div>
          {isLoading ? <div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div> : stats.budgetCategories.length ? (
            <div className="mt-5 space-y-4">
              {stats.budgetCategories.map((item) => {
                const percent = item.limit > 0 ? Math.min(100, item.spent / item.limit * 100) : 0;
                const tone = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-400' : 'bg-primary';
                return <div key={item.category}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-foreground">{item.category}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{inr(item.spent)} <span className="text-muted-foreground/60">/ {inr(item.limit)}</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} /></div>
                </div>;
              })}
              <button onClick={() => onNavigate('budget')} className="pt-1 text-xs font-semibold text-primary hover:underline">Manage category budgets</button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-7 text-center">
              <Target className="mx-auto h-7 w-7 text-muted-foreground/70" />
              <p className="mt-2 text-sm font-medium text-foreground">No category budgets yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add limits to see your progress in this space.</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => onNavigate('budget')}>Create a budget</Button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold text-foreground">Where it went</h2><p className="mt-1 text-xs text-muted-foreground">Top spending categories · {monthName}</p></div>
            <button onClick={() => onNavigate('expenses')} className="text-xs font-semibold text-primary hover:underline">All expenses</button>
          </div>
          {isLoading ? <div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-10 w-full" />)}</div> : stats.categories.length ? (
            <div className="mt-5 space-y-4">
              {stats.categories.map(([category, amount]) => {
                const share = stats.spent > 0 ? amount / stats.spent * 100 : 0;
                return <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-foreground">{category}</span><span className="shrink-0 font-semibold tabular-nums text-foreground">{inr(amount)} <span className="font-normal text-muted-foreground">{Math.round(share)}%</span></span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${share}%` }} /></div>
                </div>;
              })}
              <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs"><span className="text-muted-foreground">Average per day</span><span className="font-semibold tabular-nums text-foreground">{inr(stats.dailyAverage)}</span></div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-muted/50 px-4 py-8 text-center"><ReceiptText className="mx-auto h-7 w-7 text-muted-foreground/70" /><p className="mt-2 text-sm font-medium text-foreground">No spending to break down</p><p className="mt-1 text-xs text-muted-foreground">Your categories will appear when you add expenses.</p></div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <div><h2 className="font-semibold text-foreground">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Your latest income and expenses for {monthName}</p></div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onNavigate('expenses')}>See all <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Button>
        </div>
        {isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div> : stats.activity.length ? (
          <ul className="divide-y divide-border/70">
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
          <div className="px-5 py-10 text-center sm:px-6"><ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden /><p className="mt-3 font-medium text-foreground">Nothing recorded this month yet</p><p className="mt-1 text-sm text-muted-foreground">Add your first transaction to see your activity here.</p><Button variant="outline" className="mt-4 rounded-xl" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add an expense</Button></div>
        )}
        <div className="grid grid-cols-2 border-t border-border/70 bg-muted/20">
          <button onClick={() => onNavigate('income')} className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Add income</button>
          <button onClick={() => onNavigate('expenses')} className="flex items-center justify-center gap-2 border-l border-border/70 px-3 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /> View expenses</button>
        </div>
      </section>
    </div>
  );
};
