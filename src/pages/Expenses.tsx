import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Plus, CreditCard, Calendar, TrendingDown, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Sample expense data
const expenseEntries = [
  { id: 1, date: '2024-12-16', amount: 5000, category: 'Food & Dining', subcategory: 'Restaurants', paymentMode: 'UPI', notes: 'Team lunch' },
  { id: 2, date: '2024-12-15', amount: 12000, category: 'Transportation', subcategory: 'Petrol', paymentMode: 'Card', notes: 'Monthly fuel' },
  { id: 3, date: '2024-12-14', amount: 3000, category: 'Shopping', subcategory: 'Clothes', paymentMode: 'UPI', notes: 'Winter jacket' },
  { id: 4, date: '2024-12-13', amount: 8000, category: 'Bills & Utilities', subcategory: 'Electricity', paymentMode: 'Net Banking', notes: 'Monthly bill' },
  { id: 5, date: '2024-12-12', amount: 1500, category: 'Entertainment', subcategory: 'Movies', paymentMode: 'Card', notes: 'Movie tickets' },
];

const categoryExpenses = [
  { name: 'Transportation', value: 12000, color: '#ef4444' },
  { name: 'Bills & Utilities', value: 8000, color: '#f97316' },
  { name: 'Food & Dining', value: 5000, color: '#eab308' },
  { name: 'Shopping', value: 3000, color: '#22c55e' },
  { name: 'Entertainment', value: 1500, color: '#3b82f6' },
];

const weeklySpending = [
  { day: 'Mon', amount: 2500 },
  { day: 'Tue', amount: 4200 },
  { day: 'Wed', amount: 1800 },
  { day: 'Thu', amount: 5500 },
  { day: 'Fri', amount: 3200 },
  { day: 'Sat', amount: 6800 },
  { day: 'Sun', amount: 2900 },
];

export const Expenses = () => {
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalExpenses.toLocaleString()}</p>
        </div>
        <Button className="bg-gradient-expense">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Expense by Category Donut Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Expense by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Weekly Spending Bar Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Weekly Spending Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Expense Entries List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenseEntries.map((entry) => (
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
        </CardContent>
      </Card>
    </div>
  );
};