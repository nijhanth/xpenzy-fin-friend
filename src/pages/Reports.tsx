import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, TrendingUp, TrendingDown, IndianRupee, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DateRange = 'thisMonth' | 'lastMonth' | 'last30Days' | 'last90Days' | 'thisYear' | 'custom';

export const Reports = () => {
  const { data } = useFinancial();
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      case 'last30Days':
        return { startDate: subDays(now, 30), endDate: now };
      case 'last90Days':
        return { startDate: subDays(now, 90), endDate: now };
      case 'thisYear':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
      case 'custom':
        return { 
          startDate: customStartDate || startOfMonth(now), 
          endDate: customEndDate || endOfMonth(now) 
        };
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Filter data by date range
  const filteredData = useMemo(() => {
    const filterByDate = (items: any[]) => 
      items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });

    return {
      income: filterByDate(data.income),
      expenses: filterByDate(data.expenses),
      savings: filterByDate(data.savings),
      investments: filterByDate(data.investments),
    };
  }, [data, startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalIncome = filteredData.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = filteredData.expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalSavings = filteredData.savings.reduce((sum, item) => sum + item.current, 0);
    const totalInvestments = filteredData.investments.reduce((sum, item) => sum + item.current, 0);
    const netBalance = totalIncome - totalExpenses;

    return {
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalSavings,
      investments: totalInvestments,
      netBalance,
      totalWealth: totalSavings + totalInvestments,
    };
  }, [filteredData]);

  // Expense breakdown by category
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    filteredData.expenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData.expenses]);

  // Income breakdown by category
  const incomeByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    filteredData.income.forEach(income => {
      const category = income.customCategory || income.category;
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + income.amount);
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData.income]);

  // Payment mode distribution
  const paymentModeData = useMemo(() => {
    const modeMap = new Map<string, number>();
    [...filteredData.income, ...filteredData.expenses].forEach(item => {
      const current = modeMap.get(item.paymentMode) || 0;
      modeMap.set(item.paymentMode, current + 1);
    });
    return Array.from(modeMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--savings))', 'hsl(var(--expense))', 'hsl(var(--warning))', 'hsl(var(--investment))'];

  const hasData = filteredData.income.length > 0 || filteredData.expenses.length > 0 || 
                   filteredData.savings.length > 0 || filteredData.investments.length > 0;

  // Top expenses
  const topExpenses = useMemo(() => 
    [...filteredData.expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    [filteredData.expenses]
  );

  // Export function (prepare data)
  const exportData = (exportFormat: 'csv' | 'json') => {
    const periodString = `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
    const reportData = {
      period: periodString,
      summary: totals,
      income: filteredData.income,
      expenses: filteredData.expenses,
      savings: filteredData.savings,
      investments: filteredData.investments,
      expensesByCategory,
      incomeByCategory,
    };

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xpenzy-report-${format(startDate, 'yyyy-MM-dd')}.json`;
      a.click();
    } else {
      // CSV format
      const periodRow = `Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
      const csvRows = [
        ['Xpenzy Financial Report'],
        [periodRow],
        [],
        ['Summary'],
        ['Total Income', totals.income.toString()],
        ['Total Expenses', totals.expenses.toString()],
        ['Net Balance', totals.netBalance.toString()],
        ['Total Savings', totals.savings.toString()],
        ['Total Investments', totals.investments.toString()],
        [],
        ['Expenses by Category'],
        ['Category', 'Amount'],
        ...expensesByCategory.map(cat => [cat.name, cat.value.toString()]),
      ];
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xpenzy-report-${format(startDate, 'yyyy-MM-dd')}.csv`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 pb-24 md:pb-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Financial Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'This Month', value: 'thisMonth' as DateRange },
              { label: 'Last Month', value: 'lastMonth' as DateRange },
              { label: 'Last 30 Days', value: 'last30Days' as DateRange },
              { label: 'Last 90 Days', value: 'last90Days' as DateRange },
              { label: 'This Year', value: 'thisYear' as DateRange },
            ].map(option => (
              <Button
                key={option.value}
                variant={dateRange === option.value ? 'default' : 'outline'}
                onClick={() => setDateRange(option.value)}
                size="sm"
              >
                {option.label}
              </Button>
            ))}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={dateRange === 'custom' ? 'default' : 'outline'} size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Custom Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => {
                        setCustomStartDate(date);
                        setDateRange('custom');
                      }}
                      className="pointer-events-auto"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => {
                        setCustomEndDate(date);
                        setDateRange('custom');
                      }}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl font-medium mb-2">No data for this period</p>
              <p className="text-sm">Try selecting a different date range or add some transactions</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Income"
              value={`₹${totals.income.toLocaleString()}`}
              icon={TrendingUp}
              variant="income"
              subtitle={`${filteredData.income.length} transactions`}
            />
            <StatCard
              title="Total Expenses"
              value={`₹${totals.expenses.toLocaleString()}`}
              icon={TrendingDown}
              variant="expense"
              subtitle={`${filteredData.expenses.length} transactions`}
            />
            <StatCard
              title="Net Balance"
              value={`₹${totals.netBalance.toLocaleString()}`}
              icon={totals.netBalance >= 0 ? ArrowUpRight : ArrowDownRight}
              variant={totals.netBalance >= 0 ? 'income' : 'expense'}
              subtitle={totals.netBalance >= 0 ? 'Surplus' : 'Deficit'}
            />
            <StatCard
              title="Total Savings"
              value={`₹${totals.savings.toLocaleString()}`}
              icon={IndianRupee}
              variant="savings"
              subtitle={`${filteredData.savings.length} goals`}
            />
            <StatCard
              title="Total Investments"
              value={`₹${totals.investments.toLocaleString()}`}
              icon={TrendingUp}
              variant="default"
              subtitle={`${filteredData.investments.length} investments`}
            />
            <StatCard
              title="Total Wealth"
              value={`₹${totals.totalWealth.toLocaleString()}`}
              icon={TrendingUp}
              variant="income"
              subtitle="Savings + Investments"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expenses by Category */}
            {expensesByCategory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Income by Category */}
            {incomeByCategory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Income by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--income))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Payment Modes */}
            {paymentModeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentModeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentModeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Category Breakdown */}
            {expensesByCategory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Expense Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expensesByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--expense))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Expenses Table */}
          {topExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{expense.category}</div>
                            {expense.subcategory && (
                              <div className="text-sm text-muted-foreground">{expense.subcategory}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.paymentMode}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{expense.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => exportData('csv')}
                >
                  <Download className="w-4 h-4" />
                  Export as CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => exportData('json')}
                >
                  <Download className="w-4 h-4" />
                  Export as JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
