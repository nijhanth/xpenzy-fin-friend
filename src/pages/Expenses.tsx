import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Plus, CreditCard, Calendar, TrendingDown, ShoppingBag, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { ExpenseForm } from '@/components/forms/ExpenseForm';

export const Expenses = () => {
  const { data } = useFinancial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const totalExpenses = data.expenses.reduce((sum, entry) => sum + entry.amount, 0);

  // Generate category data from actual expense entries
  const categoryExpenses = useMemo(() => {
    const categories = data.expenses.reduce((acc, entry) => {
      const category = entry.category;
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [data.expenses]);

  // Generate daily spending data
  const weeklySpending = useMemo(() => {
    const dailyData = data.expenses.reduce((acc, entry) => {
      const day = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      amount: dailyData[day] || 0
    }));
  }, [data.expenses]);

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalExpenses.toLocaleString()}</p>
        </div>
        <Button className="bg-gradient-expense" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Expense by Category Donut Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Expense by Category
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            {categoryExpenses.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryExpenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryExpenses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {categoryExpenses.map((item, index) => (
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
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No expense data available</p>
                  <p className="text-sm">Add your first expense to see the breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Spending Bar Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Daily Spending Pattern
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            {weeklySpending.some(item => item.amount > 0) ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySpending}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false}
                      className="text-xs text-muted-foreground"
                    />
                    <YAxis hide />
                    <Bar 
                      dataKey="amount" 
                      radius={[6, 6, 0, 0]}
                      fill="hsl(var(--expense))"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingDown className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No spending pattern available</p>
                  <p className="text-sm">Add expenses to see daily spending trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Entries List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Recent Expenses
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {data.expenses.length > 0 ? (
            <div className="space-y-4">
              {data.expenses.slice(0, 5).map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {entry.subcategory}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        {entry.paymentMode}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground">₹{entry.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Expenses</h3>
              <p className="text-sm mb-4">Start tracking your expenses by adding your first entry</p>
              <Button onClick={() => setIsFormOpen(true)} className="bg-gradient-expense">
                <Plus className="w-4 h-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ExpenseForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
};