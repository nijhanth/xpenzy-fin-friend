import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, ReferenceLine } from 'recharts';
import { TrendingUp, Plus, DollarSign, Calendar, Target, BarChart3, Edit, Wallet, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    setEditingTransaction(null);
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
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investment Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Current Value: ₹{totalCurrent.toLocaleString()}
          </p>
        </div>
        <Button className="bg-investment text-white" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Investment
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
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
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Investment Holdings
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {data.investments.length > 0 ? (
            <div className="space-y-4">
              {data.investments.map((investment) => {
                return (
                  <div 
                    key={investment.id} 
                    className="p-4 rounded-xl bg-background/50 border border-border/50 hover:shadow-card transition-all duration-200 space-y-4"
                  >
                    {/* Main Investment Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {investment.type}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground mb-1">{investment.name}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Invested: ₹{investment.invested.toLocaleString()}
                          </span>
                          <span className="text-foreground">
                            Current: ₹{investment.current.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddMoney(investment.id, investment.name)}
                          className="bg-investment/10 border-investment/30 text-investment hover:bg-investment/20"
                          variant="outline"
                        >
                          <Wallet className="w-3 h-3 mr-1" />
                          Add Money
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
                                    <span className="font-medium">Money Added</span>
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
                                      deleteDescription="Are you sure you want to delete this transaction? This will affect the total invested amount."
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
          editingId={editingTransaction}
        />
      )}
    </div>
  );
};