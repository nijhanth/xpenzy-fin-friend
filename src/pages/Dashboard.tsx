import { useMemo } from 'react';
import { ArrowRight, Plus, ReceiptText } from 'lucide-react';
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
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleString('en-IN', { month: 'long' });

  const stats = useMemo(() => {
    const monthExpenses = data.expenses.filter((expense) => expense.date?.startsWith(monthKey));
    const spent = monthExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const budget = data.budgets
      .filter((item) => item.period === 'monthly' && (!item.year || (item.year === now.getFullYear() && (item.month == null || item.month === now.getMonth() + 1))))
      .reduce((total, item) => total + Number(item.limit_amount || 0), 0);
    const categoryTotals = monthExpenses.reduce<Record<string, number>>((totals, expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount || 0);
      return totals;
    }, {});
    const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const recent = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    return { spent, budget, topCategories, recent, monthCount: monthExpenses.length };
  }, [data.expenses, data.budgets, monthKey]);

  const firstName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').split(' ')[0];
  const remaining = stats.budget - stats.spent;
  const budgetUsed = stats.budget > 0 ? Math.min(100, (stats.spent / stats.budget) * 100) : 0;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-8 pt-6 sm:px-6 sm:pt-9">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{monthName} {now.getFullYear()}</p>
          <h1 className="mt-1 text-2xl font-semibold">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        </div>
        <Button onClick={onAdd} className="h-11 shrink-0 px-4">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Add expense</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)] lg:gap-12">
        <section aria-labelledby="monthly-spending-title" className="rounded-xl bg-foreground p-6 text-background sm:p-8">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="monthly-spending-title" className="text-sm font-medium text-background/75">Spent this month</h2>
                  <p className="mt-2 text-4xl font-semibold tabular-nums sm:text-5xl">{inr(stats.spent)}</p>
                  <p className="mt-2 text-sm text-background/70">{stats.monthCount} {stats.monthCount === 1 ? 'expense' : 'expenses'} recorded</p>
                </div>
                <span className="rounded-full border border-background/20 px-3 py-1 text-xs text-background/80">{monthName}</span>
              </div>

              <div className="mt-8 border-t border-background/20 pt-5">
                {stats.budget > 0 ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-background/75">Monthly budget</span>
                      <span className="font-medium tabular-nums">{inr(stats.budget)}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Monthly budget used"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(budgetUsed)}
                      className="h-2 overflow-hidden rounded-full bg-background/20"
                    >
                      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${budgetUsed}%` }} />
                    </div>
                    <p className="mt-3 text-sm">
                      {remaining >= 0 ? (
                        <><span className="font-semibold">{inr(remaining)}</span><span className="text-background/75"> left to spend</span></>
                      ) : (
                        <><span className="font-semibold">{inr(-remaining)} over</span><span className="text-background/75"> your monthly budget</span></>
                      )}
                    </p>
                  </>
                ) : (
                  <button onClick={() => onNavigate('budget')} className="text-left text-sm font-medium underline decoration-background/40 underline-offset-4 hover:decoration-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background">
                    Set a monthly budget
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-7 lg:py-1">
          <section aria-labelledby="top-categories-title">
            <div className="flex items-center justify-between">
              <h2 id="top-categories-title" className="text-base font-semibold">Where it went</h2>
              <span className="text-xs text-muted-foreground">This month</span>
            </div>
            {isLoading ? (
              <div className="mt-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : stats.topCategories.length ? (
              <ul className="mt-3 divide-y divide-border">
                {stats.topCategories.map(([category, amount]) => (
                  <li key={category} className="flex items-center justify-between gap-4 py-3">
                    <span className="truncate text-sm">{category}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{inr(amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Your spending categories will appear here.</p>
            )}
          </section>

          <Button variant="outline" className="w-full justify-between" onClick={() => onNavigate('budget')}>
            <span>View budgets</span><ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </aside>
      </div>

      <section aria-labelledby="recent-transactions-title">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 id="recent-transactions-title" className="text-lg font-semibold">Recent transactions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your latest recorded expenses</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('expenses')}>
            All transactions <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
        ) : stats.recent.length ? (
          <ul className="divide-y divide-border">
            {stats.recent.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <ReceiptText className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{expense.notes || expense.category}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {expense.category} · {new Date(`${expense.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{inr(Number(expense.amount))}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">No expenses recorded yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your transactions will show up here once added.</p>
            <Button variant="outline" className="mt-4" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add your first expense</Button>
          </div>
        )}
      </section>
    </div>
  );
};
