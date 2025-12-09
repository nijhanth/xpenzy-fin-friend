import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, TrendingUp, TrendingDown, IndianRupee, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, PieChartIcon, BarChart3 } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DateRange = 'thisMonth' | 'lastMonth' | 'last30Days' | 'last90Days' | 'thisYear' | 'custom';

// Modern color palette for charts
const EXPENSE_COLORS = [
  'hsl(0, 84%, 60%)',      // Red
  'hsl(25, 95%, 53%)',     // Orange
  'hsl(45, 93%, 47%)',     // Yellow
  'hsl(262, 83%, 58%)',    // Purple
  'hsl(340, 82%, 52%)',    // Pink
  'hsl(199, 89%, 48%)',    // Blue
];

const INCOME_COLORS = [
  'hsl(142, 76%, 36%)',    // Green
  'hsl(173, 80%, 40%)',    // Teal
  'hsl(199, 89%, 48%)',    // Blue
  'hsl(221, 83%, 53%)',    // Indigo
  'hsl(262, 83%, 58%)',    // Purple
  'hsl(142, 71%, 45%)',    // Light Green
];

const PAYMENT_COLORS = [
  'hsl(221, 83%, 53%)',    // Blue
  'hsl(142, 76%, 36%)',    // Green
  'hsl(262, 83%, 58%)',    // Purple
  'hsl(25, 95%, 53%)',     // Orange
  'hsl(340, 82%, 52%)',    // Pink
  'hsl(45, 93%, 47%)',     // Yellow
];

// Custom Tooltip for Expense Pie Chart
const ExpensePieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload[0].payload.total || 0;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
          <span className="font-semibold text-foreground">{data.name}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium text-expense">₹{data.value.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Share:</span>
            <span className="font-medium text-foreground">{percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Income Bar Chart
const IncomeBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Amount:</span>
          <span className="font-medium text-income">₹{payload[0].value.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Payment Mode Chart
const PaymentTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
          <span className="font-semibold text-foreground">{data.name}</span>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Transactions:</span>
          <span className="font-medium text-primary">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Legend Component
const CustomLegend = ({ payload, colors }: any) => {
  if (!payload || payload.length === 0) return null;
  
  return (
    <div className="grid grid-cols-2 gap-2 mt-4 px-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color || colors[index % colors.length] }}
          />
          <span className="text-xs font-medium text-foreground truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

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
      savings: data.savings,
      investments: data.investments,
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

  // Expense breakdown by category with total for percentage
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    filteredData.expenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });
    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
    return Array.from(categoryMap.entries())
      .map(([name, value], index) => ({ 
        name, 
        value, 
        total,
        fill: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
      }))
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
      .map(([name, value], index) => ({ 
        name, 
        value,
        fill: INCOME_COLORS[index % INCOME_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData.income]);

  // Payment mode distribution
  const paymentModeData = useMemo(() => {
    const modeMap = new Map<string, number>();
    [...filteredData.income, ...filteredData.expenses].forEach(item => {
      const current = modeMap.get(item.paymentMode) || 0;
      modeMap.set(item.paymentMode, current + 1);
    });
    return Array.from(modeMap.entries()).map(([name, value], index) => ({ 
      name, 
      value,
      fill: PAYMENT_COLORS[index % PAYMENT_COLORS.length]
    }));
  }, [filteredData]);

  const hasData = filteredData.income.length > 0 || filteredData.expenses.length > 0 || 
                   filteredData.savings.length > 0 || filteredData.investments.length > 0;

  // Top expenses
  const topExpenses = useMemo(() => 
    [...filteredData.expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    [filteredData.expenses]
  );

  // Export function
  const exportData = (exportFormat: 'csv' | 'json' | 'pdf') => {
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
    } else if (exportFormat === 'csv') {
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
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Xpenzy Financial Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(periodString, pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Summary', 14, 45);
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Amount (₹)']],
        body: [
          ['Total Income', totals.income.toLocaleString()],
          ['Total Expenses', totals.expenses.toLocaleString()],
          ['Net Balance', totals.netBalance.toLocaleString()],
          ['Total Savings', totals.savings.toLocaleString()],
          ['Total Investments', totals.investments.toLocaleString()],
          ['Total Wealth', totals.totalWealth.toLocaleString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
      });
      
      if (expensesByCategory.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 50;
        doc.setFontSize(14);
        doc.text('Expenses by Category', 14, finalY + 15);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Category', 'Amount (₹)']],
          body: expensesByCategory.map(cat => [cat.name, cat.value.toLocaleString()]),
          theme: 'striped',
          headStyles: { fillColor: [231, 76, 60] },
        });
      }
      
      if (incomeByCategory.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 50;
        doc.setFontSize(14);
        doc.text('Income by Category', 14, finalY + 15);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Category', 'Amount (₹)']],
          body: incomeByCategory.map(cat => [cat.name, cat.value.toLocaleString()]),
          theme: 'striped',
          headStyles: { fillColor: [46, 204, 113] },
        });
      }
      
      if (topExpenses.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 50;
        doc.setFontSize(14);
        doc.text('Top 5 Expenses', 14, finalY + 15);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Date', 'Category', 'Payment Mode', 'Amount (₹)']],
          body: topExpenses.map(expense => [
            format(new Date(expense.date), 'MMM dd, yyyy'),
            expense.category,
            expense.paymentMode,
            expense.amount.toLocaleString(),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [155, 89, 182] },
        });
      }
      
      doc.save(`xpenzy-report-${format(startDate, 'yyyy-MM-dd')}.pdf`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 p-4 pb-24 md:pb-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            Financial Reports
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Select Period
          </CardTitle>
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
                className={dateRange === option.value ? 'shadow-md' : 'hover:bg-secondary/50'}
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
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-12 h-12 text-primary/50" />
              </div>
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
            {/* Expenses by Category - Modern Donut Chart */}
            {expensesByCategory.length > 0 && (
              <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-expense" />
                      Expenses by Category
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {expensesByCategory.length} categories
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <defs>
                          {expensesByCategory.map((entry, index) => (
                            <linearGradient key={`expGrad-${index}`} id={`expenseGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                              <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                            </linearGradient>
                          ))}
                          <filter id="expenseShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25"/>
                          </filter>
                        </defs>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                          filter="url(#expenseShadow)"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#expenseGradient-${index})`}
                              className="transition-all duration-300 hover:opacity-80"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ExpensePieTooltip />} />
                        <Legend content={<CustomLegend colors={EXPENSE_COLORS} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" style={{ marginTop: '-50px' }}>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-expense">₹{totals.expenses.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Income by Category - Modern Bar Chart */}
            {incomeByCategory.length > 0 && (
              <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-income" />
                      Income by Category
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {incomeByCategory.length} sources
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeByCategory} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <defs>
                        <linearGradient id="incomeBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(var(--income))" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(142, 76%, 46%)" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        type="number" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip content={<IncomeBarTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.3 }} />
                      <Bar 
                        dataKey="value" 
                        fill="url(#incomeBarGradient)" 
                        radius={[0, 6, 6, 0]}
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Payment Methods - Modern Donut Chart */}
            {paymentModeData.length > 0 && (
              <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-primary" />
                      Payment Methods
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {paymentModeData.reduce((sum, d) => sum + d.value, 0)} transactions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <defs>
                          {paymentModeData.map((entry, index) => (
                            <linearGradient key={`payGrad-${index}`} id={`paymentGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                              <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                            </linearGradient>
                          ))}
                          <filter id="paymentShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25"/>
                          </filter>
                        </defs>
                        <Pie
                          data={paymentModeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                          filter="url(#paymentShadow)"
                        >
                          {paymentModeData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#paymentGradient-${index})`}
                              className="transition-all duration-300 hover:opacity-80"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PaymentTooltip />} />
                        <Legend content={<CustomLegend colors={PAYMENT_COLORS} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" style={{ marginTop: '-50px' }}>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">{paymentModeData.reduce((sum, d) => sum + d.value, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expense Category Breakdown - Modern Bar Chart */}
            {expensesByCategory.length > 0 && (
              <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-expense" />
                      Expense Breakdown
                    </CardTitle>
                    <Badge variant="outline" className="text-xs text-expense">
                      ₹{totals.expenses.toLocaleString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expensesByCategory} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <defs>
                        <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(var(--expense))" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(0, 84%, 50%)" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        type="number" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip content={<ExpensePieTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.3 }} />
                      <Bar 
                        dataKey="value" 
                        fill="url(#expenseBarGradient)" 
                        radius={[0, 6, 6, 0]}
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Expenses Table - Modern Design */}
          {topExpenses.length > 0 && (
            <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-expense" />
                    Top 5 Expenses
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Highest spending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead className="text-foreground font-semibold">Date</TableHead>
                        <TableHead className="text-foreground font-semibold">Category</TableHead>
                        <TableHead className="text-foreground font-semibold">Payment Mode</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topExpenses.map((expense, index) => (
                        <TableRow 
                          key={expense.id}
                          className="hover:bg-secondary/20 transition-colors border-b border-border/30"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-expense/10 flex items-center justify-center text-xs font-bold text-expense">
                                {index + 1}
                              </div>
                              {format(new Date(expense.date), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{expense.category}</div>
                              {expense.subcategory && (
                                <div className="text-xs text-muted-foreground mt-0.5">{expense.subcategory}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {expense.paymentMode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-expense text-lg">
                              ₹{expense.amount.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Section - Modern Design */}
          <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
                  onClick={() => exportData('csv')}
                >
                  <Download className="w-4 h-4" />
                  Export as CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
                  onClick={() => exportData('json')}
                >
                  <Download className="w-4 h-4" />
                  Export as JSON
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
                  onClick={() => exportData('pdf')}
                >
                  <Download className="w-4 h-4" />
                  Export as PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
