import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Bell, Plus } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { UserMenu } from '@/components/ui/user-menu';
import { maskEmail, maskName, logSecurityEvent, hasDataAccess, sanitizeUserInput } from '@/lib/security';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { SavingsForm } from '@/components/forms/SavingsForm';
import { InvestmentForm } from '@/components/forms/InvestmentForm';

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
    const totalSavings = data.savings.reduce((sum, item) => sum + item.current, 0);
    const totalInvestments = data.investments.reduce((sum, item) => sum + item.invested, 0);
    const remainingBalance = totalIncome - totalExpenses - totalSavings;

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      remainingBalance
    };
  }, [data]);

  // Dynamic chart data based on real data
  const balanceData = [
    { name: 'Income', value: totals.totalIncome, color: 'hsl(var(--income))' },
    { name: 'Expenses', value: totals.totalExpenses, color: 'hsl(var(--expense))' },
    { name: 'Available', value: totals.remainingBalance, color: 'hsl(var(--savings))' },
  ].filter(item => item.value > 0);

  // Generate trend data from recent transactions
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        balance: totals.remainingBalance + Math.random() * 5000 - 2500 // Simulated daily variation
      };
    });
    return last7Days;
  }, [totals.remainingBalance]);
  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good Morning, {getSecureDisplayName()}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">December 2024</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5" />
          </Button>
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
          icon={Wallet}
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
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Balance Overview</CardTitle>
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
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {balanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
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
            <div className="flex justify-center gap-6 mt-4">
              {balanceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend Line Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daily Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
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
                  <Wallet className="w-6 h-6 text-investment" />
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
  );
};