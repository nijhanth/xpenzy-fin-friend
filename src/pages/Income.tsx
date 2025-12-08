import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { Plus, TrendingUp, Calendar, DollarSign, Tag, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';

// Trade-style tooltip for bar chart
const BarChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
        <p className="text-lg font-bold text-income">₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

// Trade-style tooltip for growth chart
const GrowthChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-income" />
          <span className="text-lg font-bold text-income">₹{payload[0].value.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Category colors for bar chart
const CATEGORY_COLORS = [
  'hsl(142 76% 36%)',  // Green
  'hsl(142 71% 45%)',  // Light green
  'hsl(160 84% 39%)',  // Teal
  'hsl(172 66% 50%)',  // Cyan
  'hsl(187 92% 35%)',  // Ocean
  'hsl(199 89% 48%)',  // Blue
];

export const Income = () => {
  const { data } = useFinancial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '3m'>('30d');
  
  const totalIncome = data.income.reduce((sum, entry) => sum + entry.amount, 0);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const { deleteIncome } = useFinancial();
  const { toast } = useToast();

  // Generate category data from actual income entries
  const categoryData = useMemo(() => {
    const categories = data.income.reduce((acc, entry) => {
      const category = entry.category;
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories)
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data.income]);

  // Generate growth data based on daily income with time period filter
  const growthData = useMemo(() => {
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

    // Group income by date
    const dailyIncome: Record<string, number> = {};
    data.income.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate >= startDate && entryDate <= now) {
        const dateKey = entry.date;
        dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + entry.amount;
      }
    });

    // Create cumulative growth data
    const sortedDates = Object.keys(dailyIncome).sort();
    let cumulative = 0;
    
    return sortedDates.map(date => {
      cumulative += dailyIncome[date];
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        amount: cumulative,
        daily: dailyIncome[date]
      };
    });
  }, [data.income, timePeriod]);

  const avgIncome = growthData.length > 0 
    ? growthData[growthData.length - 1]?.amount / growthData.length 
    : 0;

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    await deleteIncome(entryId);
    toast({
      title: "Income Deleted",
      description: "Income entry has been successfully deleted."
    });
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Income Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalIncome.toLocaleString()}</p>
        </div>
        <Button className="bg-gradient-income" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Income
        </Button>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Income by Category Bar Chart - Trade Style */}
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-income/5 via-transparent to-transparent pointer-events-none" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <div className="p-2 rounded-lg bg-income/10">
                  <Tag className="w-4 h-4 text-income" />
                </div>
                Income by Category
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {categoryData.length} categories tracked
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="relative pt-0">
            {categoryData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="incomeBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="hsl(var(--border))" 
                      opacity={0.3}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      width={45}
                    />
                    <Tooltip content={<BarChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                    <Bar 
                      dataKey="amount" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          className="drop-shadow-sm"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <DollarSign className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">No income data available</p>
                  <p className="text-sm mt-1">Add your first income entry to see the chart</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Growth Trend - Trade Style */}
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-income/5 via-transparent to-transparent pointer-events-none" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <div className="p-2 rounded-lg bg-income/10">
                  <TrendingUp className="w-4 h-4 text-income" />
                </div>
                Income Growth Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Cumulative income over time
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
                      ? 'bg-income text-white shadow-sm' 
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
            {growthData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="incomeGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="hsl(142 71% 45%)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
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
                    <Tooltip content={<GrowthChartTooltip />} />
                    {avgIncome > 0 && (
                      <ReferenceLine 
                        y={avgIncome} 
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
                      stroke="hsl(142 76% 36%)"
                      strokeWidth={2.5}
                      fill="url(#incomeGrowthGradient)"
                      dot={false}
                      activeDot={{ 
                        r: 6, 
                        fill: 'hsl(142 76% 36%)', 
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
                  <p className="font-medium">No trend data available</p>
                  <p className="text-sm mt-1">Add income entries to see growth trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Entries List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Recent Income Entries
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {data.income.length > 0 ? (
            <div className="space-y-4">
              {data.income.map((entry) => (
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
                    <EditDeleteMenu
                      onEdit={() => handleEdit(entry.id)}
                      onDelete={() => handleDelete(entry.id)}
                      itemName="income entry"
                      deleteTitle="Delete Income Entry"
                      deleteDescription="Are you sure you want to delete this income entry? This action cannot be undone."
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Income Entries</h3>
              <p className="text-sm mb-4">Start tracking your income by adding your first entry</p>
              <Button onClick={() => setIsFormOpen(true)} className="bg-gradient-income">
                <Plus className="w-4 h-4 mr-2" />
                Add First Income
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <IncomeForm 
        open={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(null);
        }}
        editingId={editingEntry}
      />
    </div>
  );
};