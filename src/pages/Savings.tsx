import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { PiggyBank, Target, Plus, TrendingUp, Award, BarChart3, Wallet, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFinancial } from '@/contexts/FinancialContext';
import { SavingsForm } from '@/components/forms/SavingsForm';
import { SavingsTransactionForm } from '@/components/forms/SavingsTransactionForm';
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

export const Savings = () => {
  const { data, getSavingsTransactions, deleteSavingsTransaction } = useFinancial();
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
  
  const totalSavings = data.savings.reduce((sum, goal) => sum + goal.current, 0);
  const totalTargets = data.savings.reduce((sum, goal) => sum + goal.target, 0);
  const overallProgress = totalTargets > 0 ? (totalSavings / totalTargets) * 100 : 0;

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
        displayDate: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
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
    ? savingsTrend.reduce((sum, d) => sum + d.daily, 0) / savingsTrend.length 
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

  // Get transactions for a specific savings goal
  const getSavingsGoalTransactions = (goalId: string) => {
    return getSavingsTransactions(goalId);
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Savings Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalSavings.toLocaleString()}</p>
        </div>
        <Button className="bg-savings text-white" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Overall Progress */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto">
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
                  <p className="text-xs text-muted-foreground">Overall</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">₹{totalSavings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">of ₹{totalTargets.toLocaleString()} goal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Goals */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Savings Goals
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {data.savings.length > 0 ? (
            <div className="space-y-6">
              {data.savings.map((goal) => {
                const progress = (goal.current / goal.target) * 100;
                const isCompleted = progress >= 100;
                
                return (
                  <div key={goal.id} className="space-y-3 p-4 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{goal.name}</h3>
                        {isCompleted && (
                          <Badge variant="outline" className="text-success border-success">
                            <Award className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          ₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMoney(goal.id, goal.name)}
                          disabled={isCompleted}
                          className="bg-savings/10 border-savings/30 text-savings hover:bg-savings/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Wallet className="w-3 h-3 mr-1" />
                          {isCompleted ? 'Completed' : 'Add Money'}
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
                          deleteDescription="Are you sure you want to delete this savings goal? This action cannot be undone."
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
                        ₹{Math.max(0, goal.target - goal.current).toLocaleString()} remaining
                      </span>
                    </div>

                    {/* Transaction History */}
                    {expandedGoals.has(goal.id) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <History className="w-3 h-3" />
                            Transaction History
                          </h4>
                          {getSavingsGoalTransactions(goal.id).length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {getSavingsGoalTransactions(goal.id).map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between text-xs p-2 bg-secondary/30 rounded">
                                  <div className="flex-1">
                                    <span className="font-medium">Money Added</span>
                                    <p className="text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                                    {transaction.notes && (
                                      <p className="text-muted-foreground text-xs mt-1">{transaction.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="font-semibold text-savings">
                                        +₹{transaction.amount.toLocaleString()}
                                      </span>
                                    </div>
                                    <EditDeleteMenu
                                      onEdit={() => handleEditTransaction(transaction.id, goal)}
                                      onDelete={() => handleDeleteTransaction(transaction.id)}
                                      itemName="transaction"
                                      deleteTitle="Delete Transaction"
                                      deleteDescription="Are you sure you want to delete this transaction? This will affect the total saved amount."
                                    />
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
              <h3 className="text-lg font-medium mb-2">No Savings Goals</h3>
              <p className="text-sm mb-4">Set your first savings goal to start tracking progress</p>
              <Button onClick={() => setIsFormOpen(true)} className="bg-savings text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add First Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Trend - Trade Style */}
      <Card className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
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

      {/* Savings Tips */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Savings Tips
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savingsTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <div className="w-6 h-6 rounded-full bg-savings/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-savings">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
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
    </div>
  );
};