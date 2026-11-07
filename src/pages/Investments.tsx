import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, ReferenceLine } from 'recharts';
import { TrendingUp, Plus, DollarSign, Calendar, Target, Wallet, History, ChevronDown, ChevronUp, Sparkles, WalletCards, CircleDollarSign, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useFinancial } from '@/contexts/FinancialContext';
import { InvestmentForm } from '@/components/forms/InvestmentForm';
import { InvestmentTransactionForm } from '@/components/forms/InvestmentTransactionForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';

// Investment type colors
const INVESTMENT_COLORS: Record<string, string> = {
  'Stocks': 'hsl(142, 76%, 36%)',
  'Mutual Funds': 'hsl(199, 89%, 48%)',
  'Bonds': 'hsl(262, 83%, 58%)',
  'Real Estate': 'hsl(25, 95%, 53%)',
  'Crypto': 'hsl(45, 93%, 47%)',
  'Gold': 'hsl(43, 74%, 66%)',
  'Fixed Deposit': 'hsl(340, 82%, 52%)',
  'PPF': 'hsl(173, 80%, 40%)',
  'NPS': 'hsl(221, 83%, 53%)',
  'Other': 'hsl(0, 0%, 45%)',
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount);

// Custom Tooltip for Allocation Chart
const AllocationTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-foreground">{data.name}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium text-foreground">₹{data.value.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Allocation:</span>
            <span className="font-medium text-investment">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Legend for Allocation Chart
const AllocationLegend = ({ payload }: any) => {
  if (!payload || payload.length === 0) return null;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 px-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{entry.value}</p>
            <p className="text-xs text-muted-foreground">{entry.payload.percentage.toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Custom Tooltip for Growth Chart
const GrowthTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl min-w-[160px]">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Portfolio Value:</span>
            <span className="text-sm font-semibold text-investment">₹{data.value.toLocaleString()}</span>
          </div>
          {data.change !== undefined && (
            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground">Change:</span>
              <span className={`text-sm font-medium ${data.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {data.change >= 0 ? '+' : ''}₹{data.change.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const Investments = () => {
  const { data, getInvestmentTransactions: getTransactions, deleteInvestment, deleteInvestmentTransaction } = useFinancial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  
  const { toast } = useToast();
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [currentInvestment, setCurrentInvestment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [expandedInvestments, setExpandedInvestments] = useState<Set<string>>(new Set());
  const [historyYear, setHistoryYear] = useState(String(new Date().getFullYear()));
  const [historyMonth, setHistoryMonth] = useState(String(new Date().getMonth() + 1));

  // Calculate allocation data from investments
  const allocationData = useMemo(() => {
    if (data.investments.length === 0) return [];
    
    // Group investments by type and sum their current values
    const typeMap = new Map<string, number>();
    let totalValue = 0;
    
    data.investments.forEach(inv => {
      const type = inv.type || 'Other';
      const currentVal = inv.current || inv.invested || 0;
      typeMap.set(type, (typeMap.get(type) || 0) + currentVal);
      totalValue += currentVal;
    });
    
    if (totalValue === 0) return [];
    
    // Convert to chart data format
    return Array.from(typeMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: INVESTMENT_COLORS[name] || INVESTMENT_COLORS['Other'],
        percentage: (value / totalValue) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data.investments]);

  // Calculate growth data from investment transactions
  const growthData = useMemo(() => {
    const transactions = data.investmentTransactions || [];
    if (transactions.length === 0 && data.investments.length === 0) return [];
    
    // Get last 30 days
    const days = 30;
    const today = new Date();
    const dailyData: { date: string; value: number; change: number }[] = [];
    
    // Combine initial investments and transactions
    const allEvents: { date: Date; amount: number }[] = [];
    
    // Add initial investments
    data.investments.forEach(inv => {
      allEvents.push({
        date: new Date(inv.date),
        amount: inv.initial_invested || inv.invested || 0,
      });
    });
    
    // Add transactions
    transactions.forEach(tx => {
      allEvents.push({
        date: new Date(tx.date),
        amount: tx.amount + (tx.profit_loss || 0),
      });
    });
    
    // Sort by date
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate cumulative value for each day
    let cumulativeValue = 0;
    let prevValue = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Add events up to this date
      allEvents.forEach(event => {
        if (event.date <= date && event.date > (dailyData.length > 0 ? new Date(dailyData[dailyData.length - 1].date) : new Date(0))) {
          cumulativeValue += event.amount;
        }
      });
      
      // Recalculate cumulative up to this date
      cumulativeValue = allEvents
        .filter(e => e.date <= date)
        .reduce((sum, e) => sum + e.amount, 0);
      
      const change = cumulativeValue - prevValue;
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: cumulativeValue,
        change: prevValue > 0 ? change : 0,
      });
      
      prevValue = cumulativeValue;
    }
    
    return dailyData;
  }, [data.investments, data.investmentTransactions]);

  // Calculate average for reference line
  const avgPortfolioValue = useMemo(() => {
    if (growthData.length === 0) return 0;
    return growthData.reduce((sum, d) => sum + d.value, 0) / growthData.length;
  }, [growthData]);
  
  // Calculate totals from all investments
  const totalInvested = useMemo(() => {
    return data.investments.reduce((sum, inv) => sum + (inv.invested || 0), 0);
  }, [data.investments]);
  
  const totalCurrent = useMemo(() => {
    return data.investments.reduce((sum, inv) => sum + (inv.current || 0), 0);
  }, [data.investments]);

  const totalProfitLoss = totalCurrent - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const historyYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    [...data.investments.map(entry => entry.date), ...data.investmentTransactions.map(entry => entry.date)]
      .forEach(date => {
        const year = Number(date?.slice(0, 4));
        if (Number.isFinite(year) && year > 1900) years.add(year);
      });
    return Array.from(years).sort((a, b) => b - a);
  }, [data.investments, data.investmentTransactions]);
  const historyMonthKey = `${historyYear}-${historyMonth.padStart(2, '0')}`;
  const selectedMonthLabel = new Date(Number(historyYear), Number(historyMonth) - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const selectedMonthTransactions = useMemo(() => data.investmentTransactions
    .filter(transaction => transaction.date?.startsWith(historyMonthKey))
    .sort((a, b) => b.date.localeCompare(a.date)),
  [data.investmentTransactions, historyMonthKey]);
  const monthContributions = selectedMonthTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const monthProfitLoss = selectedMonthTransactions.reduce((sum, transaction) => sum + Number(transaction.profit_loss || 0), 0);
  const selectedPeriodEnd = `${historyMonthKey}-${new Date(Number(historyYear), Number(historyMonth), 0).getDate().toString().padStart(2, '0')}`;
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedUpdateDate = historyMonthKey === todayKey.slice(0, 7) ? todayKey : selectedPeriodEnd;
  const historicalTotals = useMemo(() => data.investments.reduce((totals, investment) => {
    if (investment.date > selectedPeriodEnd) return totals;
    const allInvestmentTransactions = data.investmentTransactions.filter(transaction => transaction.investment_id === investment.id);
    const transactionsToDate = allInvestmentTransactions.filter(transaction => transaction.date <= selectedPeriodEnd);
    const legacyBase = Number(investment.initial_invested || 0)
      || (allInvestmentTransactions.length === 0 ? Number(investment.invested || 0) : 0);
    const invested = legacyBase + transactionsToDate.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const profitLoss = transactionsToDate.reduce((sum, transaction) => sum + Number(transaction.profit_loss || 0), 0);
    return { invested: totals.invested + invested, current: totals.current + invested + profitLoss };
  }, { invested: 0, current: 0 }), [data.investments, data.investmentTransactions, selectedPeriodEnd]);

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    await deleteInvestment(entryId);
    toast({
      title: "Investment Deleted",
      description: "Investment entry has been successfully deleted."
    });
  };

  const handleAddMoney = (investmentId: string, investmentName: string) => {
    setCurrentInvestment({ id: investmentId, name: investmentName });
    const existingMonthlyUpdate = getTransactions(investmentId).find(transaction => transaction.date?.startsWith(historyMonthKey));
    setEditingTransaction(existingMonthlyUpdate?.id || null);
    setTransactionFormOpen(true);
  };

  const toggleInvestmentHistory = (investmentId: string) => {
    const newExpanded = new Set(expandedInvestments);
    if (newExpanded.has(investmentId)) {
      newExpanded.delete(investmentId);
    } else {
      newExpanded.add(investmentId);
    }
    setExpandedInvestments(newExpanded);
  };

  const handleEditTransaction = (transactionId: string, investment: any) => {
    setCurrentInvestment({ id: investment.id, name: investment.name });
    setEditingTransaction(transactionId);
    setTransactionFormOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteInvestmentTransaction(transactionId);
      toast({
        title: "Success",
        description: "Investment transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete investment transaction",
        variant: "destructive",
      });
    }
  };

  // Get transactions for a specific investment
  const getInvestmentTransactions = (investmentId: string) => {
    return getTransactions(investmentId);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-8 animate-fade-in sm:p-6">
      {/* Header */}
      <div className="relative isolate flex flex-col gap-5 overflow-hidden rounded-2xl border border-investment/15 bg-gradient-to-br from-card via-card to-investment/10 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-investment/10 blur-3xl" />
        <div>
          <Badge variant="secondary" className="mb-3 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Portfolio overview</Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Track your investments over time</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Record each month’s contributions and profit or loss, then review the portfolio at any past month end.</p>
        </div>
        <Button size="lg" className="relative shrink-0 bg-investment text-white shadow-sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Investment
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
              <p className="text-2xl font-bold text-foreground">₹{totalInvested.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Current Value</p>
              <p className="text-2xl font-bold text-foreground">
                ₹{totalCurrent.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-gradient-card shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Profit / loss</p>
            <p className={`mt-2 text-xl font-bold tabular-nums ${totalProfitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(totalProfitLoss)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current value minus invested</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-card shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Total return</p>
            <p className={`mt-2 text-xl font-bold tabular-nums ${returnPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>{returnPercentage.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Since the first investment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-gradient-card shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-investment" />Monthly performance history</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Review and edit contributions and profit/loss for any month.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-64">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground" htmlFor="investment-history-month">Month</Label>
              <Select value={historyMonth} onValueChange={setHistoryMonth}>
                <SelectTrigger id="investment-history-month"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                  <SelectItem key={month} value={String(month)}>{new Date(2024, month - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground" htmlFor="investment-history-year">Year</Label>
              <Select value={historyYear} onValueChange={setHistoryYear}>
                <SelectTrigger id="investment-history-year"><SelectValue /></SelectTrigger>
                <SelectContent>{historyYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: `Invested by ${selectedMonthLabel}`, value: formatCurrency(historicalTotals.invested), icon: WalletCards },
              { label: 'Portfolio value at month end', value: formatCurrency(historicalTotals.current), icon: CircleDollarSign },
              { label: 'Contributed this month', value: formatCurrency(monthContributions), icon: Wallet },
              { label: 'Profit / loss this month', value: formatCurrency(monthProfitLoss), icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border/70 bg-background/60 p-3 sm:p-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-investment" />{label}</p>
                <p className="mt-2 text-base font-semibold tabular-nums text-foreground sm:text-lg">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Monthly profit/loss is the change for that month. Historical portfolio values are recalculated from dated updates up to the selected month.</p>
          {selectedMonthTransactions.length ? (
            <div className="max-h-[420px] space-y-2 overflow-y-auto overscroll-contain pr-2" aria-label={`${selectedMonthLabel} investment updates`}>
              {selectedMonthTransactions.map(transaction => {
                const investment = data.investments.find(entry => entry.id === transaction.investment_id);
                return (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{investment?.name || 'Investment'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{transaction.notes ? ` · ${transaction.notes}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right text-xs">
                        <p className="font-medium text-foreground">Contribution {formatCurrency(transaction.amount)}</p>
                        <p className={Number(transaction.profit_loss || 0) >= 0 ? 'text-success' : 'text-destructive'}>P/L {formatCurrency(Number(transaction.profit_loss || 0))}</p>
                      </div>
                      {investment && <EditDeleteMenu
                        onEdit={() => handleEditTransaction(transaction.id, investment)}
                        onDelete={() => handleDeleteTransaction(transaction.id)}
                        itemName="monthly investment update"
                        deleteTitle="Delete Monthly Update"
                        deleteDescription="Deleting this update will change this month and later portfolio totals."
                      />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 font-medium text-foreground">No updates for {selectedMonthLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose another month or use “Monthly update” on an investment to enter this period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Investment Allocation Pie Chart - Modern Trade Style */}
        <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-investment" />
              Investment Allocation
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {allocationData.length} Types
            </Badge>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <div className="relative">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {allocationData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`allocationGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                        <filter id="allocationShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                        </filter>
                      </defs>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        filter="url(#allocationShadow)"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#allocationGradient-${index})`}
                            className="transition-all duration-300 hover:opacity-80"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<AllocationTooltip />} />
                      <Legend content={<AllocationLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" style={{ marginTop: '-40px' }}>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold text-foreground">
                    ₹{allocationData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-investment/10 flex items-center justify-center">
                    <Target className="w-10 h-10 text-investment/50" />
                  </div>
                  <p className="font-medium">No investment allocation data</p>
                  <p className="text-sm mt-1">Add investments to see portfolio breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Growth Area Chart - Modern Trade Style */}
        <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-investment" />
              Portfolio Growth
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Last 30 Days
            </Badge>
          </CardHeader>
          <CardContent>
            {growthData.length > 0 && growthData.some(d => d.value > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="investmentGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--investment))" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="hsl(var(--investment))" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(var(--investment))" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="investmentLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--investment))" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="hsl(var(--investment))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(142, 76%, 46%)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      width={50}
                    />
                    <Tooltip content={<GrowthTooltip />} />
                    <ReferenceLine 
                      y={avgPortfolioValue} 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="url(#investmentLineGradient)"
                      strokeWidth={2.5}
                      fill="url(#investmentGrowthGradient)"
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: 'hsl(var(--investment))',
                        stroke: 'hsl(var(--background))',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-investment/80 to-investment rounded" />
                    <span>Portfolio Value</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 border-t border-dashed border-muted-foreground" />
                    <span>Avg: ₹{avgPortfolioValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-investment/10 flex items-center justify-center">
                    <TrendingUp className="w-10 h-10 text-investment/50" />
                  </div>
                  <p className="font-medium">No growth data available</p>
                  <p className="text-sm mt-1">Add investments to see portfolio growth</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Investment Holdings */}
      <Card className="border-border/80 bg-gradient-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Investment Holdings
          </CardTitle>
          <Badge variant="secondary">{data.investments.length} holdings</Badge>
        </CardHeader>
        <CardContent>
          {data.investments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {data.investments.map((investment) => {
                return (
                  <div 
                    key={investment.id} 
                    className="space-y-4 rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm transition-shadow hover:shadow-card"
                  >
                    {/* Main Investment Info */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {investment.type}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground mb-1">{investment.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">
                            Invested: ₹{investment.invested.toLocaleString()}
                          </span>
                          <span className="text-foreground">
                            Current: ₹{investment.current.toLocaleString()}
                          </span>
                          <span className={investment.current >= investment.invested ? 'text-success' : 'text-destructive'}>
                            P/L: {formatCurrency(investment.current - investment.invested)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleAddMoney(investment.id, investment.name)}
                          className="bg-investment/10 border-investment/30 text-investment hover:bg-investment/20"
                          variant="outline"
                        >
                          <Wallet className="w-3 h-3 mr-1" />
                          Monthly Update
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleInvestmentHistory(investment.id)}
                        >
                          <History className="w-3 h-3 mr-1" />
                          {expandedInvestments.has(investment.id) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                        <EditDeleteMenu
                          onEdit={() => handleEdit(investment.id)}
                          onDelete={() => handleDelete(investment.id)}
                          itemName="investment entry"
                          deleteTitle="Delete Investment Entry"
                          deleteDescription="Are you sure you want to delete this investment entry? This action cannot be undone."
                        />
                      </div>
                    </div>

                    {/* Investment Summary */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Started: {new Date(investment.date).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Transaction History */}
                    {expandedInvestments.has(investment.id) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <History className="w-3 h-3" />
                            Transaction History
                          </h4>
                          {getInvestmentTransactions(investment.id).length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {getInvestmentTransactions(investment.id).map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between text-xs p-2 bg-secondary/30 rounded">
                                  <div className="flex-1">
                                    <span className="font-medium">Monthly update</span>
                                    <p className="text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                                    {transaction.notes && (
                                      <p className="text-muted-foreground text-xs mt-1">{transaction.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="font-semibold text-investment">
                                        +₹{transaction.amount.toLocaleString()}
                                      </span>
                                      {transaction.profit_loss !== undefined && transaction.profit_loss !== 0 && (
                                        <p className={`text-xs ${transaction.profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                                          P/L: {transaction.profit_loss >= 0 ? '+' : ''}₹{transaction.profit_loss.toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                    <EditDeleteMenu
                                      onEdit={() => handleEditTransaction(transaction.id, investment)}
                                      onDelete={() => handleDeleteTransaction(transaction.id)}
                                      itemName="transaction"
                                      deleteTitle="Delete Transaction"
                                      deleteDescription="Deleting this update will change this month and later portfolio totals."
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No additional transactions yet</p>
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
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Investments</h3>
              <p className="text-sm mb-4">Start building your portfolio by adding your first investment</p>
              <Button onClick={() => setIsFormOpen(true)} className="bg-investment text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add First Investment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <InvestmentForm 
        open={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(null);
        }}
        editingId={editingEntry}
      />
      
      {/* Investment Transaction Form */}
      {currentInvestment && (
        <InvestmentTransactionForm
          open={transactionFormOpen}
          onClose={() => {
            setTransactionFormOpen(false);
            setCurrentInvestment(null);
            setEditingTransaction(null);
          }}
          investmentId={currentInvestment.id}
          investmentName={currentInvestment.name}
          initialDate={selectedUpdateDate}
          editingId={editingTransaction}
        />
      )}
    </div>
  );
};
