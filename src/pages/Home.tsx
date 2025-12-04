import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { AudioWaveform, TrendingUp, TrendingDown, PiggyBank, Plus, BarChart3, LineChart as LineChartIcon, Activity, Target, CandlestickChart } from 'lucide-react';
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

// Custom tooltip for pie chart
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

// Custom tooltip for area chart (trade style)
const TradeChartTooltip = ({ active, payload, label }: any) => {
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

  // Security access check
  const userHasAccess = hasDataAccess(user?.user_metadata?.role || 'user');

  // Get and sanitize user display name with security measures
  const getSecureDisplayName = () => {
    if (!user || !userHasAccess) {
      logSecurityEvent('unauthorized_name_access_attempt');
      return 'User';
    }

    const rawName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    const sanitizedName = sanitizeUserInput(rawName);

    // Apply privacy preferences and security mode
    if (preferences.securityMode === 'strict' && !hasConsent('showFullName')) {
      return maskName(sanitizedName);
    }

    return sanitizedName;
  };

  // Get dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Log security event for data access
  React.useEffect(() => {
    if (user) {
      logSecurityEvent('home_page_accessed', {
        userId: user.id,
        securityMode: preferences.securityMode,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, preferences.securityMode]);

  // Calculate real-time totals
  const totals = useMemo(() => {
    const totalIncome = data.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalSavings = data.savings.reduce((sum, item) => sum + (item.current || 0), 0);
    const totalInvestments = data.investments.reduce((sum, item) => sum + item.invested, 0);
    const remainingBalance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      remainingBalance
    };
  }, [data]);

  // Dynamic chart data based on real data with percentages
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

  // Generate real trend data from actual transactions
  const trendData = useMemo(() => {
    const last7Days: { date: Date; day: string; fullDate: string; income: number; expense: number; balance: number }[] = [];
    
    // Get dates for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate income for this day
      const dayIncome = data.income
        .filter(item => item.date === dateStr)
        .reduce((sum, item) => sum + item.amount, 0);
      
      // Calculate expenses for this day
      const dayExpense = data.expenses
        .filter(item => item.date === dateStr)
        .reduce((sum, item) => sum + item.amount, 0);
      
      last7Days.push({
        date,
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        income: dayIncome,
        expense: dayExpense,
        balance: dayIncome - dayExpense
      });
    }

    // Calculate cumulative balance
    let cumulative = 0;
    return last7Days.map(day => {
      cumulative += day.balance;
      return {
        ...day,
        balance: cumulative,
        dailyChange: day.balance
      };
    });
  }, [data.income, data.expenses]);

  // Calculate min/max for chart domain
  const chartDomain = useMemo(() => {
    const values = trendData.map(d => d.balance);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const padding = Math.max(Math.abs(max - min) * 0.1, 1000);
    return [min - padding, max + padding];
  }, [trendData]);

  return (
    <div className="relative p-4 space-y-6 animate-fade-in font-xpenzy overflow-hidden">
      {/* Background Motion Graphics */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-10 right-10 opacity-10">
          <BarChart3 className="w-32 h-32 text-primary animate-float" />
        </div>
        <div className="absolute bottom-20 left-10 opacity-10">
          <LineChartIcon className="w-24 h-24 text-accent animate-float-delayed" />
        </div>
        <div className="absolute top-1/3 left-20 opacity-10">
          <Activity className="w-28 h-28 text-success animate-float-slow" />
        </div>
        <div className="absolute bottom-1/3 right-20 opacity-10">
          <Target className="w-20 h-20 text-investment animate-float" />
        </div>
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 opacity-10">
          <AudioWaveform className="w-36 h-36 text-primary animate-pulse-glow" />
        </div>
      </div>
      
      {/* Content with higher z-index */}
      <div className="relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👋</span>
          <div>
            <h1 className="text-3xl font-bold font-outfit bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {getGreeting()}, {getSecureDisplayName()}!
            </h1>
            <p className="text-sm text-muted-foreground font-inter">December 2024</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Income"
          value={`₹${totals.totalIncome.toLocaleString()}`}
          subtitle="This month"
          icon={TrendingUp}
          variant="income"
          trend={{ value: `${data.income.length} entries`, isPositive: true }}
        />
        <StatCard
          title="Total Expenses"
          value={`₹${totals.totalExpenses.toLocaleString()}`}
          subtitle="This month"
          icon={TrendingDown}
          variant="expense"
          trend={{ value: `${data.expenses.length} entries`, isPositive: false }}
        />
        <StatCard
          title="Remaining Balance"
          value={`₹${totals.remainingBalance.toLocaleString()}`}
          subtitle="Available"
          icon={AudioWaveform}
          variant="default"
          trend={{ value: totals.remainingBalance >= 0 ? "Positive" : "Deficit", isPositive: totals.remainingBalance >= 0 }}
        />
        <StatCard
          title="Total Savings"
          value={`₹${totals.totalSavings.toLocaleString()}`}
          subtitle="Current amount"
          icon={PiggyBank}
          variant="savings"
          trend={{ value: `${data.savings.length} goals`, isPositive: true }}
        />
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Balance Overview Pie Chart */}
        <Card className="glass-card bg-gradient-card border-border shadow-elevated backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Balance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {balanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={balanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {balanceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <PiggyBank className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>No financial data yet</p>
                    <p className="text-sm">Start by adding income or expenses</p>
                  </div>
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {balanceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trade-Style Daily Balance Trend Chart */}
        <Card className="glass-card border-border shadow-elevated backdrop-blur-xl overflow-hidden relative">
          {/* Trade-style header */}
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CandlestickChart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Daily Balance Trend</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">7-Day Performance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-md text-sm font-mono font-bold ${
                  totals.remainingBalance >= 0 
                    ? 'bg-income/10 text-income border border-income/30' 
                    : 'bg-expense/10 text-expense border border-expense/30'
                }`}>
                  {totals.remainingBalance >= 0 ? '+' : ''}₹{totals.remainingBalance.toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Chart stats bar */}
            <div className="flex justify-between mb-4 px-2">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">High</p>
                <p className="text-sm font-mono font-semibold text-income">
                  ₹{Math.max(...trendData.map(d => d.balance)).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Low</p>
                <p className="text-sm font-mono font-semibold text-expense">
                  ₹{Math.min(...trendData.map(d => d.balance)).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg</p>
                <p className="text-sm font-mono font-semibold text-foreground">
                  ₹{Math.round(trendData.reduce((a, b) => a + b.balance, 0) / trendData.length).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-56 relative">
              {/* Grid background effect */}
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full" style={{
                  backgroundImage: 'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGradientPositive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="balanceGradientNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      <stop offset="50%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'monospace' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    domain={chartDomain}
                  />
                  <Tooltip content={<TradeChartTooltip />} />
                  <ReferenceLine 
                    y={0} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5" 
                    strokeOpacity={0.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2.5}
                    fill="url(#balanceGradientPositive)"
                    dot={{ 
                      fill: 'hsl(var(--background))', 
                      stroke: 'hsl(142, 76%, 36%)', 
                      strokeWidth: 2, 
                      r: 4 
                    }}
                    activeDot={{ 
                      r: 6, 
                      stroke: 'hsl(142, 76%, 36%)', 
                      strokeWidth: 2,
                      fill: 'hsl(var(--background))'
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom ticker-style info */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-income mr-1.5" />
                  Income: <span className="text-income font-mono font-semibold">+₹{trendData.reduce((a, b) => a + b.income, 0).toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-expense mr-1.5" />
                  Expenses: <span className="text-expense font-mono font-semibold">-₹{trendData.reduce((a, b) => a + b.expense, 0).toLocaleString()}</span>
                </span>
              </div>
              <span className="text-muted-foreground font-mono">
                {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="glass-card bg-gradient-card border-border shadow-elevated backdrop-blur-xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Quick Actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">Add your financial data quickly</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Button 
              onClick={() => setActiveForm('income')}
              className="h-20 rounded-2xl bg-gradient-income hover:bg-gradient-income/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">Add Income</span>
              </div>
            </Button>
            <Button 
              onClick={() => setActiveForm('expense')}
              className="h-20 rounded-2xl bg-gradient-expense hover:bg-gradient-expense/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">Add Expense</span>
              </div>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => setActiveForm('savings')}
              variant="outline"
              className="h-20 rounded-2xl border-2 border-savings/30 bg-savings/5 hover:bg-savings/10 hover:border-savings/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-savings/20 rounded-full group-hover:bg-savings/30 transition-colors">
                  <PiggyBank className="w-6 h-6 text-savings" />
                </div>
                <span className="text-sm font-medium text-savings">Add Savings</span>
              </div>
            </Button>
            <Button 
              onClick={() => setActiveForm('investment')}
              variant="outline"
              className="h-20 rounded-2xl border-2 border-investment/30 bg-investment/5 hover:bg-investment/10 hover:border-investment/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-investment/20 rounded-full group-hover:bg-investment/30 transition-colors">
                  <AudioWaveform className="w-6 h-6 text-investment" />
                </div>
                <span className="text-sm font-medium text-investment">Add Investment</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forms */}
      <IncomeForm 
        open={activeForm === 'income'} 
        onClose={() => setActiveForm(null)} 
      />
      <ExpenseForm 
        open={activeForm === 'expense'} 
        onClose={() => setActiveForm(null)} 
      />
      <SavingsForm 
        open={activeForm === 'savings'} 
        onClose={() => setActiveForm(null)} 
      />
      <InvestmentForm 
        open={activeForm === 'investment'} 
        onClose={() => setActiveForm(null)} 
      />
      </div>
    </div>
  );
};