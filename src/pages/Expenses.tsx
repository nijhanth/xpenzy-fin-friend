import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area, ReferenceLine } from 'recharts';
import { Plus, CreditCard, Calendar, TrendingDown, ShoppingBag, BarChart3, Filter, Search, ReceiptText, Calculator } from 'lucide-react';

// Trade-style tooltip for donut chart
const DonutChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="text-sm font-semibold text-foreground">{data.name}</span>
        </div>
        <p className="text-lg font-bold text-expense">₹{data.value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{data.percentage?.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

// Trade-style tooltip for spending pattern
const SpendingTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <span className="text-lg font-bold text-expense">₹{payload[0].value.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Category colors with better variety
const EXPENSE_COLORS = [
  'hsl(0 84% 60%)',     // Red
  'hsl(25 95% 53%)',    // Orange
  'hsl(45 93% 47%)',    // Yellow
  'hsl(142 71% 45%)',   // Green
  'hsl(217 91% 60%)',   // Blue
  'hsl(263 70% 50%)',   // Purple
  'hsl(330 81% 60%)',   // Pink
  'hsl(174 72% 40%)',   // Teal
];
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount);
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancial } from '@/contexts/FinancialContext';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { AIInsightsCard } from '@/components/ai/AIInsights';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

export const Expenses = () => {
  const { data } = useFinancial();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const { deleteExpense } = useFinancial();
  const { toast } = useToast();

  // Date filter states
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(
    () => [...new Set(data.expenses.map((expense) => expense.category))].sort((a, b) => a.localeCompare(b)),
    [data.expenses]
  );

  // Generate years from expenses data
  const availableYears = useMemo(() => {
    const years = new Set(data.expenses.map(expense => new Date(expense.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [data.expenses]);

  // Generate months for selected year
  const availableMonths = useMemo(() => {
    const months = [];
    const year = selectedYear === 'all' ? new Date().getFullYear() : parseInt(selectedYear);
    for (let i = 1; i <= 12; i++) {
      months.push({
        value: i.toString(),
        label: new Date(year, i - 1).toLocaleDateString('en-US', { month: 'long' })
      });
    }
    return months;
  }, [selectedYear]);

  // Generate weeks for selected month
  const availableWeeks = useMemo(() => {
    if (!selectedYear || selectedYear === 'all' || selectedMonth === 'all') return [];
    
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeks = [];
    let currentWeek = startOfWeek(firstDay, { weekStartsOn: 1 });
    let weekNumber = 1;
    
    while (currentWeek <= lastDay) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      weeks.push({
        value: weekNumber.toString(),
        label: `Week ${weekNumber} (${format(currentWeek, 'MMM d')} - ${format(weekEnd, 'MMM d')})`,
        start: currentWeek,
        end: weekEnd
      });
      currentWeek = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      weekNumber++;
    }
    
    return weeks;
  }, [selectedYear, selectedMonth]);

  // Generate dates for selected period
  const availableDates = useMemo(() => {
    const dates = new Set(data.expenses.map(expense => expense.date));
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [data.expenses]);

  // Filter expenses based on selected filters
  const filteredExpenses = useMemo(() => {
    let filtered = data.expenses;

    // Filter by specific date first
    if (selectedDate && selectedDate !== 'all') {
      filtered = filtered.filter(expense => expense.date === selectedDate);
    } else if (selectedWeek && selectedWeek !== 'all' && selectedYear && selectedYear !== 'all' && selectedMonth && selectedMonth !== 'all') {
      // Filter by week
      const week = availableWeeks.find(w => w.value === selectedWeek);
      if (week) {
        filtered = filtered.filter(expense => {
          const expenseDate = parseISO(expense.date);
          return isWithinInterval(expenseDate, { start: week.start, end: week.end });
        });
      }
    } else if (selectedMonth && selectedMonth !== 'all') {
      // A month can be selected across all years, or within one selected year.
      const month = parseInt(selectedMonth) - 1;
      filtered = filtered.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return expenseDate.getMonth() === month && (selectedYear === 'all' || expenseDate.getFullYear() === parseInt(selectedYear));
      });
    } else if (selectedYear && selectedYear !== 'all') {
      // Filter by year
      const year = parseInt(selectedYear);
      const yearStart = startOfYear(new Date(year, 0));
      const yearEnd = endOfYear(new Date(year, 0));
      
      filtered = filtered.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start: yearStart, end: yearEnd });
      });
    }

    const query = searchQuery.trim().toLocaleLowerCase();
    return filtered.filter((expense) => {
      const matchesQuery = !query || [expense.category, expense.notes, expense.subcategory, expense.paymentMode]
        .some((value) => value?.toLocaleLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [data.expenses, selectedYear, selectedMonth, selectedWeek, selectedDate, availableWeeks, searchQuery, categoryFilter]);

  const totalExpenses = filteredExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const averageTransaction = filteredExpenses.length ? totalExpenses / filteredExpenses.length : 0;
  const hasActiveFilters = selectedYear !== 'all' || selectedMonth !== 'all' || selectedWeek !== 'all' || selectedDate !== 'all' || categoryFilter !== 'all' || !!searchQuery.trim();

  // Generate category data from filtered expense entries with percentages
  const categoryExpenses = useMemo(() => {
    const categories = filteredExpenses.reduce((acc, entry) => {
      const category = entry.category;
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categories)
      .map(([name, value], index) => ({
        name,
        value,
        color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);
  const topCategory = categoryExpenses[0];

  // Generate daily spending data with running total
  const weeklySpending = useMemo(() => {
    const dailyData = filteredExpenses.reduce((acc, entry) => {
      const day = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let cumulative = 0;
    return days.map(day => {
      cumulative += dailyData[day] || 0;
      return {
        day,
        amount: dailyData[day] || 0,
        cumulative
      };
    });
  }, [filteredExpenses]);

  const avgDailySpending = weeklySpending.reduce((sum, d) => sum + d.amount, 0) / 7;

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    await deleteExpense(entryId);
    toast({
      title: "Expense Deleted",
      description: "Expense entry has been successfully deleted."
    });
  };

  const handleViewReport = (reportType: string) => {
    navigate('/reports', { 
      state: { 
        reportType,
        filters: { 
          year: selectedYear, 
          month: selectedMonth, 
          week: selectedWeek, 
          date: selectedDate 
        }
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-8 sm:p-6 animate-fade-in">
      <div className="relative isolate overflow-hidden rounded-2xl border border-expense/15 bg-gradient-to-br from-card via-card to-expense/10 p-5 shadow-card sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-expense/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 gap-1.5"><ReceiptText className="h-3.5 w-3.5" /> Spending overview</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Transactions</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Review expenses, spot spending patterns, and find any transaction quickly. Showing all years by default.</p>
          </div>
          <Button size="lg" className="shrink-0 bg-gradient-expense shadow-sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Expense overview">
        {[
          { label: "Total spend", value: formatCurrency(totalExpenses), detail: "For the selected filters", icon: CreditCard, color: "text-rose-600 dark:text-rose-400", tint: "bg-rose-500/10" },
          { label: "Transactions", value: filteredExpenses.length.toLocaleString("en-IN"), detail: "Matching expense entries", icon: ReceiptText, color: "text-sky-600 dark:text-sky-400", tint: "bg-sky-500/10" },
          { label: "Average entry", value: formatCurrency(averageTransaction), detail: "Per transaction", icon: Calculator, color: "text-violet-600 dark:text-violet-400", tint: "bg-violet-500/10" },
          { label: "Top category", value: topCategory?.name || "No data yet", detail: topCategory ? `${formatCurrency(topCategory.value)} in this category` : "Add an expense to get started", icon: ShoppingBag, color: "text-amber-600 dark:text-amber-400", tint: "bg-amber-500/10" },
        ].map(({ label, value, detail, icon: Icon, color, tint }) => (
          <Card key={label} className="border-border/80 bg-card shadow-sm">
            <CardContent className="flex min-h-28 items-start justify-between gap-2 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
                <p className="mt-2 truncate text-lg font-bold tabular-nums text-foreground sm:text-xl">{value}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">{detail}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint} ${color}`}><Icon className="h-4 w-4" /></span>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="transaction-search"
            aria-label="Search transactions"
            placeholder="Search category, note, or payment method"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Date Filters */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Filter className="h-4 w-4" aria-hidden />
          Filter by date
        </summary>
      <Card className="mt-3 bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter by Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Year Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Year</label>
              <Select value={selectedYear} onValueChange={(value) => {
                setSelectedYear(value);
                setSelectedMonth('all');
                setSelectedWeek('all');
                setSelectedDate('all');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Month</label>
              <Select value={selectedMonth} onValueChange={(value) => {
                setSelectedMonth(value);
                setSelectedWeek('all');
                setSelectedDate('all');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Week Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Week</label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All weeks</SelectItem>
                  {availableWeeks.map(week => (
                    <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Specific Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  {availableDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      </details>

      {/* Charts Section */}
      <details className="group">
      <summary className="cursor-pointer list-none border-b border-border py-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Spending breakdown
      </summary>
      <div className="mt-4 space-y-6">
        {/* Expense by Category Donut Chart - Trade Style */}
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-expense/5 via-transparent to-transparent pointer-events-none" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <div className="p-2 rounded-lg bg-expense/10">
                  <ShoppingBag className="w-4 h-4 text-expense" />
                </div>
                Expense by Category
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {categoryExpenses.length} categories • ₹{totalExpenses.toLocaleString()} total
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => handleViewReport('category')}>
              <BarChart3 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="relative pt-0">
            {categoryExpenses.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="h-64 w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {categoryExpenses.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`expenseGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={categoryExpenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {categoryExpenses.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#expenseGradient-${index})`}
                            className="drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend with amounts */}
                <div className="w-full lg:w-1/2 space-y-2">
                  {categoryExpenses.slice(0, 6).map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shadow-sm" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-foreground font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground">₹{item.value.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-2">({item.percentage?.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                  {categoryExpenses.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{categoryExpenses.length - 6} more categories
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">No expense data available</p>
                  <p className="text-sm mt-1">Add your first expense to see the breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Spending Pattern - Trade Style */}
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-expense/5 via-transparent to-transparent pointer-events-none" />
          
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <div className="p-2 rounded-lg bg-expense/10">
                  <TrendingDown className="w-4 h-4 text-expense" />
                </div>
                Daily Spending Pattern
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: ₹{avgDailySpending.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => handleViewReport('daily')}>
              <BarChart3 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="relative pt-0">
            {weeklySpending.some(item => item.amount > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklySpending} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="expenseSpendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="hsl(0 84% 60%)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="hsl(var(--border))" 
                      opacity={0.3}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="day" 
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
                    <Tooltip content={<SpendingTooltip />} />
                    {avgDailySpending > 0 && (
                      <ReferenceLine 
                        y={avgDailySpending} 
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
                      stroke="hsl(0 84% 60%)"
                      strokeWidth={2.5}
                      fill="url(#expenseSpendingGradient)"
                      dot={{ fill: 'hsl(0 84% 60%)', strokeWidth: 0, r: 4 }}
                      activeDot={{ 
                        r: 6, 
                        fill: 'hsl(0 84% 60%)', 
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
                    <TrendingDown className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">No spending pattern available</p>
                  <p className="text-sm mt-1">Add expenses to see daily spending trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </details>

      {/* Expense Entries List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {hasActiveFilters ? `${filteredExpenses.length} matching transactions` : `All transactions (${filteredExpenses.length})`}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => handleViewReport('recent')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length > 0 ? (
            <div className="max-h-[1000px] space-y-3 overflow-y-auto overscroll-contain pr-2" aria-label="Transaction list; scroll to view more">
              {filteredExpenses.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex min-h-[76px] items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/50 p-3 transition-all duration-200 hover:shadow-card sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex min-w-0 items-center gap-2 overflow-hidden">
                      <Badge variant="outline" className="max-w-[40%] truncate text-xs">
                        {entry.category}
                      </Badge>
                      {entry.subcategory && (
                        <Badge variant="secondary" className="max-w-[35%] truncate text-xs">
                          {entry.subcategory}
                        </Badge>
                      )}
                      <Badge variant="default" className="max-w-[30%] truncate text-xs">
                        {entry.paymentMode}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground">₹{entry.amount.toLocaleString()}</p>
                    {entry.notes && <p className="truncate text-sm text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <EditDeleteMenu
                      onEdit={() => handleEdit(entry.id)}
                      onDelete={() => handleDelete(entry.id)}
                      itemName="expense entry"
                      deleteTitle="Delete Expense Entry"
                      deleteDescription="Are you sure you want to delete this expense entry? This action cannot be undone."
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : data.expenses.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="mx-auto mb-4 h-8 w-8" aria-hidden />
              <h3 className="font-medium text-foreground">No matching transactions</h3>
              <p className="mt-1 text-sm">Try another search or clear a filter.</p>
              <Button variant="ghost" className="mt-2" onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setSelectedDate('all');
                setSelectedWeek('all');
                setSelectedMonth('all');
                setSelectedYear('all');
              }}>Clear filters</Button>
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

      <AIInsightsCard title="AI tips to reduce expenses" autoGenerate showLanguageSelector refreshKey={data.expenses} />
      
      <ExpenseForm 
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
