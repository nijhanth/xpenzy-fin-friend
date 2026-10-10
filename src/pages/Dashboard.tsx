import { useMemo } from 'react';
import { Plus, ArrowRight, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

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
    const monthExp = data.expenses.filter((e) => e.date?.startsWith(monthKey));
    const spent = monthExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    const monthlyBudgets = data.budgets.filter(
      (b) => b.period === 'monthly' && (!b.year || (b.year === now.getFullYear() && (b.month == null || b.month === now.getMonth() + 1)))
    );
    const budget = monthlyBudgets.reduce((s, b) => s + Number(b.limit_amount || 0), 0);
    const byCat: Record<string, number> = {};
    monthExp.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const recent = [...data.expenses].sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 5);
    return { spent, budget, top, recent };
  }, [data.expenses, data.budgets, monthKey]);

  const name = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').split(' ')[0];
  const remaining = stats.budget - stats.spent;
  const pct = stats.budget > 0 ? Math.min(100, (stats.spent / stats.budget) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-6 space-y-6">
      <header>
        <p className="text-muted-foreground">Hello{name ? `, ${name}` : ''}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your {monthName} at a glance</h1>
      </header>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-5">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Spent this month</p>
                <p className="text-4xl font-semibold tracking-tight mt-1">{inr(stats.spent)}</p>
              </div>
              {stats.budget > 0 ? (
                <div className="space-y-2">
                  <Progress value={pct} aria-label="Budget used" />
                  <p className="text-sm">
                    {remaining >= 0 ? (
                      <><span className="font-medium">{inr(remaining)}</span> <span className="text-muted-foreground">left of your {inr(stats.budget)} budget</span></>
                    ) : (
                      <span className="text-destructive font-medium">{inr(-remaining)} over your {inr(stats.budget)} budget</span>
                    )}
                  </p>
                </div>
              ) : (
                <button onClick={() => onNavigate('budget')} className="text-sm text-primary font-medium hover:underline">
                  Set a monthly budget to see what's left →
                </button>
              )}
              <Button size="lg" className="w-full h-12 text-base" onClick={onAdd}>
                <Plus className="w-5 h-5 mr-1" /> Add expense
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {stats.top.length > 0 && (
        <section aria-label="Top categories" className="grid grid-cols-3 gap-3">
          {stats.top.map(([cat, amt]) => (
            <div key={cat} className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground truncate">{cat}</p>
              <p className="font-semibold">{inr(amt)}</p>
            </div>
          ))}
        </section>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent</CardTitle>
          {stats.recent.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('expenses')}>
              See all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : stats.recent.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden />
              <p className="font-medium">No expenses yet</p>
              <p className="text-sm text-muted-foreground">Add your first one — it only takes a few seconds.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.notes || e.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.category} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{inr(Number(e.amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
