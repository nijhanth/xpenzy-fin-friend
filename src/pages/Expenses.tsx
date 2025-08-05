import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Plus, CreditCard, Calendar, TrendingDown, ShoppingBag, BarChart3, Edit, Filter, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFinancial } from '@/contexts/FinancialContext';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

export const Expenses = () => {
  const { data } = useFinancial();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const { deleteExpense } = useFinancial();
  const { toast } = useToast();

  // Date filter states
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

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
    for (let i = 1; i <= 12; i++) {
      months.push({
        value: i.toString(),
        label: new Date(parseInt(selectedYear), i - 1).toLocaleDateString('en-US', { month: 'long' })
      });
    }
    return months;
  }, [selectedYear]);

  // Generate weeks for selected month
  const availableWeeks = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    
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
    if (selectedDate) {
      return filtered.filter(expense => expense.date === selectedDate);
    }

    // Filter by week
    if (selectedWeek && selectedYear && selectedMonth) {
      const week = availableWeeks.find(w => w.value === selectedWeek);
      if (week) {
        filtered = filtered.filter(expense => {
          const expenseDate = parseISO(expense.date);
          return isWithinInterval(expenseDate, { start: week.start, end: week.end });
        });
      }
    } else if (selectedYear && selectedMonth) {
      // Filter by month
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth) - 1;
      const monthStart = startOfMonth(new Date(year, month));
      const monthEnd = endOfMonth(new Date(year, month));
      
      filtered = filtered.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      });
    } else if (selectedYear) {
      // Filter by year
      const year = parseInt(selectedYear);
      const yearStart = startOfYear(new Date(year, 0));
      const yearEnd = endOfYear(new Date(year, 0));
      
      filtered = filtered.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start: yearStart, end: yearEnd });
      });
    }

    return filtered;
  }, [data.expenses, selectedYear, selectedMonth, selectedWeek, selectedDate, availableWeeks]);

  const totalExpenses = filteredExpenses.reduce((sum, entry) => sum + entry.amount, 0);

  // Generate category data from filtered expense entries
  const categoryExpenses = useMemo(() => {
    const categories = filteredExpenses.reduce((acc, entry) => {
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
  }, [filteredExpenses]);

  // Generate daily spending data
  const weeklySpending = useMemo(() => {
    const dailyData = filteredExpenses.reduce((acc, entry) => {
      const day = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      amount: dailyData[day] || 0
    }));
  }, [filteredExpenses]);

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

      {/* Date Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
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
                setSelectedMonth('');
                setSelectedWeek('');
                setSelectedDate('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
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
                setSelectedWeek('');
                setSelectedDate('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All months</SelectItem>
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
                  <SelectItem value="">All weeks</SelectItem>
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
                  <SelectItem value="">All dates</SelectItem>
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

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Expense by Category Donut Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Expense by Category
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleViewReport('category')}>
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
            <Button variant="outline" size="sm" onClick={() => handleViewReport('daily')}>
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
          <Button variant="outline" size="sm" onClick={() => handleViewReport('recent')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length > 0 ? (
            <div className="space-y-4">
              {filteredExpenses.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                      {entry.subcategory && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.subcategory}
                        </Badge>
                      )}
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