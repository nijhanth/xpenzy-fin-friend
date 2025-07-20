import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Plus, TrendingUp, Calendar, DollarSign, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Sample income data
const incomeEntries = [
  { id: 1, date: '2024-12-15', amount: 35000, category: 'Salary', paymentMode: 'Bank Transfer', notes: 'Monthly salary' },
  { id: 2, date: '2024-12-10', amount: 5000, category: 'Freelance', paymentMode: 'UPI', notes: 'Website project' },
  { id: 3, date: '2024-12-05', amount: 2000, category: 'Gift', paymentMode: 'Cash', notes: 'Birthday gift' },
  { id: 4, date: '2024-12-01', amount: 3000, category: 'Investment', paymentMode: 'Bank Transfer', notes: 'Dividend payout' },
];

const categoryData = [
  { category: 'Salary', amount: 35000, color: 'hsl(var(--income))' },
  { category: 'Freelance', amount: 5000, color: 'hsl(var(--primary))' },
  { category: 'Gift', amount: 2000, color: 'hsl(var(--accent))' },
  { category: 'Investment', amount: 3000, color: 'hsl(var(--savings))' },
];

const growthData = [
  { month: 'Aug', amount: 38000 },
  { month: 'Sep', amount: 42000 },
  { month: 'Oct', amount: 40000 },
  { month: 'Nov', amount: 45000 },
  { month: 'Dec', amount: 45000 },
];

export const Income = () => {
  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Income Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalIncome.toLocaleString()}</p>
        </div>
        <Button className="bg-gradient-income">
          <Plus className="w-4 h-4 mr-2" />
          Add Income
        </Button>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Income by Category Bar Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Income by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <XAxis 
                    dataKey="category" 
                    axisLine={false} 
                    tickLine={false}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis hide />
                  <Bar 
                    dataKey="amount" 
                    radius={[8, 8, 0, 0]}
                    fill="hsl(var(--income))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Income Growth Line Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Income Growth Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                    dataKey="amount" 
                    stroke="hsl(var(--income))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--income))', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: 'hsl(var(--income))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Entries List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Recent Income Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incomeEntries.map((entry) => (
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