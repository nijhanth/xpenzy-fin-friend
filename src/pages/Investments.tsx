import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp, Plus, DollarSign, Calendar, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { InvestmentForm } from '@/components/forms/InvestmentForm';

export const Investments = () => {
  const { data } = useFinancial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const totalInvested = data.investments.reduce((sum, inv) => sum + inv.invested, 0);
  const totalCurrent = data.investments.reduce((sum, inv) => sum + inv.current, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPercent = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : '0.0';

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
              <p className="text-sm text-muted-foreground mb-1">Total Profit/Loss</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalProfit >= 0 ? '+' : ''}₹{totalProfit.toLocaleString()}
              </p>
              <p className={`text-sm ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                ({totalProfit >= 0 ? '+' : ''}{totalProfitPercent}%)
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
                const profitLoss = investment.current - investment.invested;
                const profitPercent = investment.invested > 0 ? ((profitLoss / investment.invested) * 100).toFixed(1) : '0.0';
                
                return (
                  <div 
                    key={investment.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:shadow-card transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {investment.type}
                        </Badge>
                        <Badge 
                          variant={profitLoss >= 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {profitLoss >= 0 ? '+' : ''}{profitPercent}%
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground mb-1">{investment.name}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Invested: ₹{investment.invested.toLocaleString()}
                        </span>
                        <span className={profitLoss >= 0 ? 'text-success' : 'text-destructive'}>
                          Current: ₹{investment.current.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(investment.date).toLocaleDateString()}
                      </div>
                      <p className={`text-sm font-medium ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {profitLoss >= 0 ? '+' : ''}₹{profitLoss.toLocaleString()}
                      </p>
                      <Button variant="ghost" size="sm" className="h-8 mt-1">
                        Details
                      </Button>
                    </div>
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
      
      <InvestmentForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
};