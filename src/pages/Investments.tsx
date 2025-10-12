import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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

  // Generate allocation data from investments
  const allocationData = useMemo(() => {
    const types = data.investments.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + inv.current;
      return acc;
    }, {} as Record<string, number>);

    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
    
    return Object.entries(types).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [data.investments]);

  // Generate growth data based on monthly investments
  const growthData = useMemo(() => {
    const monthlyData = data.investments.reduce((acc, inv) => {
      const month = new Date(inv.date).toLocaleDateString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + inv.current;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData).map(([month, value]) => ({
      month,
      value
    }));
  }, [data.investments]);

  // Get total invested and current values directly from data
  const totalInvested = data.investments.reduce((sum, inv) => sum + inv.invested, 0);
  const totalCurrent = data.investments.reduce((sum, inv) => sum + inv.current, 0);

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
        {/* Investment Allocation Pie Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Investment Allocation
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {allocationData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No investment allocation data</p>
                  <p className="text-sm">Add investments to see portfolio breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Growth Line Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Portfolio Growth
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false}
                      className="text-xs text-muted-foreground"
                    />
                    <YAxis hide />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--investment))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--investment))', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: 'hsl(var(--investment))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No growth data available</p>
                  <p className="text-sm">Add investments to see portfolio growth</p>
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