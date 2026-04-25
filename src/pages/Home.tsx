import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, Plus, CandlestickChart, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { UserMenu } from '@/components/ui/user-menu';
import { maskName, logSecurityEvent, hasDataAccess, sanitizeUserInput } from '@/lib/security';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { SavingsForm } from '@/components/forms/SavingsForm';
import { InvestmentForm } from '@/components/forms/InvestmentForm';
import { NotificationBell } from '@/components/ui/notification-bell';
import { SmartExpenseInput } from '@/components/ai/SmartExpenseInput';
import { AIInsightsCard, ExpensePredictionCard } from '@/components/ai/AIInsights';

const PieChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-elevated">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-lg font-bold" style={{ color: data.color }}>
          ₹{data.value.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{data.percentage}% of total</p>
      </div>
    );
  }
  return null;
};

const TradeChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.balance >= 0;
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-elevated min-w-[160px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-mono">{data.fullDate}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isPositive ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'}`}>
            {isPositive ? '▲' : '▼'}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Balance</span>
            <span className={`font-bold font-mono ${isPositive ? 'text-income' : 'text-expense'}`}>
              ₹{Math.abs(data.balance).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Income</span>
            <span className="text-xs text-income font-mono">+₹{data.income.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Expense</span>
            <span className="text-xs text-expense font-mono">-₹{data.expense.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const Home = () => {
  const { data } = useFinancial();
  const { user } = useAuth();
  const { preferences, hasConsent } = usePrivacy();
  const [activeForm, setActiveForm] = useState<'income' | 'expense' | 'savings' | 'investment' | null>(null);

  const userHasAccess = hasDataAccess(user?.user_metadata?.role || 'user');

  const getSecureDisplayName = () => {
    if (!user || !userHasAccess) {
      logSecurityEvent('unauthorized_name_access_attempt');
      return 'User';
    }
    const rawName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    const sanitizedName = sanitizeUserInput(rawName);
    if (preferences.securityMode === 'strict' && !hasConsent('showFullName')) {
      return maskName(sanitizedName);
    }
    return sanitizedName;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  React.useEffect(() => {
    if (user) {
      logSecurityEvent('home_page_accessed', {
        userId: user.id,
        securityMode: preferences.securityMode,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, preferences.securityMode]);

  const totals = useMemo(() => {
    const totalIncome = data.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalSavings = data.savings.reduce((sum, item) => sum + (item.current || 0), 0);
    const totalInvestments = data.investments.reduce((sum, item) => sum + item.invested, 0);
    const remainingBalance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, totalSavings, totalInvestments, remainingBalance };
  }, [data]);

  const balanceData = useMemo(() => {
    const total = totals.totalIncome + totals.totalExpenses + Math.max(0, totals.remainingBalance);
    const items = [
      { name: 'Income', value: totals.totalIncome, color: 'hsl(142, 76%, 36%)' },
      { name: 'Expenses', value: totals.totalExpenses, color: 'hsl(0, 84%, 60%)' },
      { name: 'Savings', value: totals.totalSavings, color: 'hsl(212, 95%, 68%)' },
      { name: 'Investments', value: totals.totalInvestments, color: 'hsl(271, 91%, 65%)' },
    ].filter(item => item.value > 0);
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
    }));
  }, [totals]);

  const trendData = useMemo(() => {
    const last7Days: { date: Date; day: string; fullDate: string; income: number; expense: number; balance: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayIncome = data.income.filter(item => item.date === dateStr).reduce((sum, item) => sum + item.amount, 0);
      const dayExpense = data.expenses.filter(item => item.date === dateStr).reduce((sum, item) => sum + item.amount, 0);
      last7Days.push({
        date, day: date.toLocaleDateString('en', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        income: dayIncome, expense: dayExpense, balance: dayIncome - dayExpense
      });
    }
    let cumulative = 0;
    return last7Days.map(day => { cumulative += day.balance; return { ...day, balance: cumulative, dailyChange: day.balance }; });
  }, [data.income, data.expenses]);

  const chartDomain = useMemo(() => {
    const values = trendData.map(d => d.balance);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const padding = Math.max(Math.abs(max - min) * 0.1, 1000);
    return [min - padding, max + padding];
  }, [trendData]);

  const currentMonth = new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full p-4 space-y-6 animate-fade-in font-xpenzy">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm md:text-base text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            {getSecureDisplayName()}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{currentMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* Balance Hero Card */}
      <Card className="bg-gradient-to-br from-primary to-primary-glow border-0 shadow-elevated overflow-hidden">
        <CardContent className="p-5 md:p-7 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm md:text-base font-medium">Total Balance</p>
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mt-1">
                ₹{totals.remainingBalance.toLocaleString()}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm md:text-base font-medium ${totals.remainingBalance >= 0 ? 'text-primary-foreground/80' : 'text-red-200'}`}>
                {totals.remainingBalance >= 0 ? <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" /> : <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5" />}
                <span>{totals.remainingBalance >= 0 ? 'Positive Balance' : 'Deficit'}</span>
              </div>
            </div>
            <div className="p-3 md:p-4 bg-primary-foreground/15 rounded-2xl backdrop-blur-sm">
              <Wallet className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Income"
          value={`₹${totals.totalIncome.toLocaleString()}`}
          subtitle="This month"
          icon={TrendingUp}
          variant="income"
          trend={{ value: `${data.income.length} entries`, isPositive: true }}
        />
        <StatCard
          title="Expenses"
          value={`₹${totals.totalExpenses.toLocaleString()}`}
          subtitle="This month"
          icon={TrendingDown}
          variant="expense"
          trend={{ value: `${data.expenses.length} entries`, isPositive: false }}
        />
        <StatCard
          title="Savings"
          value={`₹${totals.totalSavings.toLocaleString()}`}
          subtitle="Current"
          icon={PiggyBank}
          variant="savings"
          trend={{ value: `${data.savings.length} goals`, isPositive: true }}
        />
        <StatCard
          title="Investments"
          value={`₹${totals.totalInvestments.toLocaleString()}`}
          subtitle="Total invested"
          icon={TrendingUp}
          variant="default"
          trend={{ value: `${data.investments.length} assets`, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {[
          { key: 'income' as const, label: 'Income', icon: TrendingUp, color: 'bg-income/10 text-income border-income/20' },
          { key: 'expense' as const, label: 'Expense', icon: TrendingDown, color: 'bg-expense/10 text-expense border-expense/20' },
          { key: 'savings' as const, label: 'Savings', icon: PiggyBank, color: 'bg-savings/10 text-savings border-savings/20' },
          { key: 'investment' as const, label: 'Invest', icon: TrendingUp, color: 'bg-investment/10 text-investment border-investment/20' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveForm(key)}
            className={`flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${color}`}
          >
            <div className="p-2 md:p-2.5 rounded-lg bg-background/50">
              <Icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xs md:text-sm font-medium">+ {label}</span>
          </button>
        ))}
      </div>

      {/* Smart AI Expense Input */}
      <SmartExpenseInput />

      {/* AI Insights & Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <AIInsightsCard />
        <ExpensePredictionCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* Balance Overview Pie Chart */}
      <Card className="bg-card border-border shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Balance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            {balanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={balanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {balanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No financial data yet</p>
                  <p className="text-xs text-muted-foreground">Start by adding income or expenses</p>
                </div>
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {balanceData.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium text-foreground">₹{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 7-Day Trend Chart */}
      <Card className="bg-card border-border shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <CandlestickChart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Daily Trend</CardTitle>
                <p className="text-xs text-muted-foreground font-mono">7-Day Performance</p>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
              totals.remainingBalance >= 0
                ? 'bg-income/10 text-income border border-income/30'
                : 'bg-expense/10 text-expense border border-expense/30'
            }`}>
              {totals.remainingBalance >= 0 ? '+' : ''}₹{totals.remainingBalance.toLocaleString()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {/* Stats row */}
          <div className="flex justify-between mb-3 px-1">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">High</p>
              <p className="text-xs font-mono font-semibold text-income">
                ₹{Math.max(...trendData.map(d => d.balance)).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Low</p>
              <p className="text-xs font-mono font-semibold text-expense">
                ₹{Math.min(...trendData.map(d => d.balance)).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg</p>
              <p className="text-xs font-mono font-semibold text-foreground">
                ₹{Math.round(trendData.reduce((a, b) => a + b.balance, 0) / trendData.length).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGradientPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} domain={chartDomain} />
                <Tooltip content={<TradeChartTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeOpacity={0.4} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  fill="url(#balanceGradientPositive)"
                  dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: 'hsl(142, 76%, 36%)', strokeWidth: 2, fill: 'hsl(var(--background))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom ticker */}
          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-income" />
                Income: <span className="text-income font-mono font-semibold">+₹{trendData.reduce((a, b) => a + b.income, 0).toLocaleString()}</span>
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-expense" />
                Expense: <span className="text-expense font-mono font-semibold">-₹{trendData.reduce((a, b) => a + b.expense, 0).toLocaleString()}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Forms */}
      <IncomeForm open={activeForm === 'income'} onClose={() => setActiveForm(null)} />
      <ExpenseForm open={activeForm === 'expense'} onClose={() => setActiveForm(null)} />
      <SavingsForm open={activeForm === 'savings'} onClose={() => setActiveForm(null)} />
      <InvestmentForm open={activeForm === 'investment'} onClose={() => setActiveForm(null)} />
    </div>
  );
};
