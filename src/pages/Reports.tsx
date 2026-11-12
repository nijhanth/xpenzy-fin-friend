import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, TrendingUp, TrendingDown, IndianRupee, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Wallet, Layers3, ReceiptText, CreditCard, type LucideIcon } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, endOfDay, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DateRange = 'thisMonth' | 'lastMonth' | 'last7Days' | 'last30Days' | 'last90Days' | 'thisYear' | 'custom';
type ReportType = 'overview' | 'expenses' | 'income' | 'savings' | 'investments' | 'payments';
const reportTypes: { id: ReportType; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', description: 'Your complete financial snapshot', icon: FileText },
  { id: 'expenses', label: 'Expenses', description: 'Spending totals by category and all transactions', icon: TrendingDown },
  { id: 'income', label: 'Income', description: 'Income totals by source and all transactions', icon: TrendingUp },
  { id: 'savings', label: 'Savings', description: 'Current savings goals and balances', icon: IndianRupee },
  { id: 'investments', label: 'Investments', description: 'Current investment balances', icon: Wallet },
  { id: 'payments', label: 'Payment methods', description: 'Transactions grouped by payment method', icon: CreditCard },
];

const currency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount);

const ReportKpi = ({ title, value, detail, icon: Icon, tone }: {
  title: string; value: string; detail: string; icon: LucideIcon; tone: 'green' | 'red' | 'blue' | 'violet' | 'amber';
}) => {
  const tones = {
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return (
    <Card className="overflow-hidden rounded-xl border-border/60 bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-xs">{title}</p>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
        </div>
        <p className="mt-3 truncate text-[clamp(1rem,4vw,1.5rem)] font-bold leading-tight tracking-tight text-foreground">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">{detail}</p>
      </CardContent>
    </Card>
  );
};

const ReportTable = ({ title, headers, rows, mobileTitleIndex = 0, mobileSubtitleIndices = [], mobileValueIndex }: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  mobileTitleIndex?: number;
  mobileSubtitleIndices?: number[];
  mobileValueIndex?: number;
}) => {
  const valueIndex = mobileValueIndex ?? headers.length - 1;
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="shrink-0 text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="border-t border-border/60 px-4 py-6 text-sm text-muted-foreground">No records in this report.</p>
        ) : (
          <>
            <div className="divide-y divide-border/60 md:hidden">
              {rows.map((row, rowIndex) => {
                const details = mobileSubtitleIndices
                  .map(index => {
                    const value = String(row[index] ?? '');
                    return value ? `${headers[index]}: ${value}` : '';
                  })
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div key={`${String(row[0])}-${rowIndex}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{String(row[mobileTitleIndex] ?? '')}</p>
                      {details && <p className="mt-0.5 truncate text-xs text-muted-foreground">{details}</p>}
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold">{String(row[valueIndex] ?? '')}</p>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table aria-label={title}>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    {headers.map((header, index) => (
                      <TableHead key={header} className={`font-semibold text-foreground ${index === valueIndex ? 'text-right' : ''}`}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow key={`${String(row[0])}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={`${headers[cellIndex]}-${cellIndex}`} className={cellIndex === valueIndex ? 'text-right font-semibold' : ''}>
                          {String(cell)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const downloadFile = (fileName: string, content: BlobPart, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const escapeCsvCell = (value: string | number) => {
  const text = String(value);
  const safeText = typeof value === 'string' && /^\s*[=+\-@]/.test(text)
    ? `'${text}`
    : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

function filterByDate<T extends { date: string }>(items: T[], startDate: Date, endDate: Date): T[] {
  return items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export const Reports = () => {
  const { data } = useFinancial();
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [dateRanges, setDateRanges] = useState<Record<ReportType, DateRange>>({ overview: 'thisMonth', expenses: 'thisMonth', income: 'thisMonth', savings: 'thisMonth', investments: 'thisMonth', payments: 'thisMonth' });
  const [draftDateRanges, setDraftDateRanges] = useState<Record<ReportType, DateRange>>({ overview: 'thisMonth', expenses: 'thisMonth', income: 'thisMonth', savings: 'thisMonth', investments: 'thisMonth', payments: 'thisMonth' });
  const [customDates, setCustomDates] = useState<Partial<Record<ReportType, { start?: Date; end?: Date }>>>({});
  const [draftCustomDates, setDraftCustomDates] = useState<Partial<Record<ReportType, { start?: Date; end?: Date }>>>({});
  const dateRange = dateRanges[reportType];
  const draftDateRange = draftDateRanges[reportType];
  const isSnapshotReport = reportType === 'savings' || reportType === 'investments';
  const customStartDate = customDates[reportType]?.start;
  const customEndDate = customDates[reportType]?.end;
  const draftStartDate = draftCustomDates[reportType]?.start;
  const draftEndDate = draftCustomDates[reportType]?.end;
  const invalidDraftRange = draftDateRange === 'custom' && (!draftStartDate || !draftEndDate || draftStartDate > draftEndDate);
  const setDateRange = (value: DateRange) => setDraftDateRanges(current => ({ ...current, [reportType]: value }));
  const applyDateFilters = () => {
    setDateRanges(current => ({ ...current, [reportType]: draftDateRange }));
    setCustomDates(current => ({ ...current, [reportType]: draftCustomDates[reportType] }));
  };

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return { startDate: startOfMonth(now), endDate: endOfDay(endOfMonth(now)) };
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfDay(endOfMonth(lastMonth)) };
      }
      case 'last7Days':
        return { startDate: subDays(now, 7), endDate: now };
      case 'last30Days':
        return { startDate: subDays(now, 30), endDate: now };
      case 'last90Days':
        return { startDate: subDays(now, 90), endDate: now };
      case 'thisYear':
        return { startDate: startOfYear(now), endDate: endOfDay(endOfYear(now)) };
      case 'custom':
        return { 
          startDate: customStartDate || startOfMonth(now), 
          endDate: endOfDay(customEndDate || endOfMonth(now))
        };
      default:
        return { startDate: startOfMonth(now), endDate: endOfDay(endOfMonth(now)) };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Filter data by date range
  const filteredData = useMemo(() => {
    return {
      income: filterByDate(data.income, startDate, endDate),
      expenses: filterByDate(data.expenses, startDate, endDate),
      savings: data.savings,
      investments: data.investments,
    };
  }, [data, startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalIncome = filteredData.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = filteredData.expenses.reduce((sum, item) => sum + item.amount, 0);
    const lifetimeSavings = filteredData.savings.reduce((sum, item) => sum + (item.current || 0), 0);
    const totalUsedFromGoals = filteredData.savings.reduce((sum, item) => sum + (item.used_amount || 0), 0);
    const totalSavings = Math.max(0, lifetimeSavings - totalUsedFromGoals);
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

  // Expense totals by category
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
    return Array.from(modeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);
  const savingsTarget = filteredData.savings.reduce((sum, goal) => sum + goal.target, 0);
  const savingsGoalProgress = savingsTarget > 0 ? Math.min(100, Math.round((totals.savings / savingsTarget) * 100)) : 0;
  const investmentNetChange = filteredData.investments.reduce((sum, item) => sum + item.current - item.invested, 0);
  const mostUsedPaymentMode = paymentModeData[0];

  const kpis = useMemo(() => {
    const overview = [
      { title: 'Income', value: currency(totals.income), detail: `${filteredData.income.length} transactions`, icon: TrendingUp, tone: 'green' as const },
      { title: 'Expenses', value: currency(totals.expenses), detail: `${filteredData.expenses.length} transactions`, icon: TrendingDown, tone: 'red' as const },
      { title: 'Net cash flow', value: currency(totals.netBalance), detail: totals.netBalance >= 0 ? 'Positive for this period' : 'Below zero this period', icon: totals.netBalance >= 0 ? ArrowUpRight : ArrowDownRight, tone: totals.netBalance >= 0 ? 'blue' as const : 'red' as const },
    ];
    switch (reportType) {
      case 'expenses': return [overview[1], { title: 'Largest category', value: expensesByCategory[0]?.name || '—', detail: expensesByCategory[0] ? currency(expensesByCategory[0].value) : 'No spending recorded', icon: Layers3, tone: 'amber' as const }];
      case 'income': return [overview[0], { title: 'Income sources', value: String(incomeByCategory.length), detail: 'Categories in this period', icon: Layers3, tone: 'blue' as const }];
      case 'savings':
        return [
          { title: 'Current savings', value: currency(totals.savings), detail: `${filteredData.savings.length} goals`, icon: IndianRupee, tone: 'green' as const },
          { title: 'Goal progress', value: `${savingsGoalProgress}%`, detail: `Of ${currency(savingsTarget)} total target`, icon: Layers3, tone: 'blue' as const },
        ];
      case 'investments':
        return [
          { title: 'Portfolio value', value: currency(totals.investments), detail: `${filteredData.investments.length} investments`, icon: TrendingUp, tone: 'violet' as const },
          { title: 'Net change', value: `${investmentNetChange >= 0 ? '+' : '−'}${currency(Math.abs(investmentNetChange))}`, detail: 'Current value compared with invested', icon: investmentNetChange >= 0 ? ArrowUpRight : ArrowDownRight, tone: investmentNetChange >= 0 ? 'green' as const : 'red' as const },
        ];
      case 'payments': {
        return [
          { title: 'Transactions', value: String(paymentModeData.reduce((sum, item) => sum + item.value, 0)), detail: `${paymentModeData.length} payment methods`, icon: ReceiptText, tone: 'blue' as const },
          { title: 'Most used', value: mostUsedPaymentMode?.name || '—', detail: mostUsedPaymentMode ? `${mostUsedPaymentMode.value} transactions` : 'No payments recorded', icon: Wallet, tone: 'violet' as const },
        ];
      }
      default: return overview;
    }
  }, [reportType, totals, filteredData, expensesByCategory, incomeByCategory, paymentModeData, savingsTarget, savingsGoalProgress, investmentNetChange, mostUsedPaymentMode]);

  const hasData = reportType === 'overview'
    ? filteredData.income.length > 0 || filteredData.expenses.length > 0 || filteredData.savings.length > 0 || filteredData.investments.length > 0
    : reportType === 'expenses' ? filteredData.expenses.length > 0
    : reportType === 'income' ? filteredData.income.length > 0
    : reportType === 'savings' ? filteredData.savings.length > 0
    : reportType === 'investments' ? filteredData.investments.length > 0
    : paymentModeData.length > 0;

  const sortedExpenses = useMemo(
    () => [...filteredData.expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredData.expenses]
  );
  const sortedIncome = useMemo(
    () => [...filteredData.income].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredData.income]
  );
  const expenseRows = useMemo(
    () => sortedExpenses.map(expense => [
      formatDisplayDate(expense.date),
      expense.category,
      expense.subcategory || '',
      expense.paymentMode,
      currency(expense.amount),
      expense.notes || '',
    ]),
    [sortedExpenses]
  );
  const incomeRows = useMemo(
    () => sortedIncome.map(income => [
      formatDisplayDate(income.date),
      income.customCategory || income.category,
      income.paymentMode,
      currency(income.amount),
      income.notes || '',
    ]),
    [sortedIncome]
  );
  const savingsRows = filteredData.savings.map(goal => [goal.name, currency(goal.current), currency(goal.target)]);
  const investmentRows = filteredData.investments.map(item => [
    item.name,
    item.customType || item.type,
    currency(item.invested),
    currency(item.current),
  ]);
  const paymentRows = paymentModeData.map(item => [item.name, String(item.value)]);

  // Export function
  const exportData = (exportFormat: 'csv' | 'json' | 'pdf') => {
    const reportDate = new Date();
    const asOfDate = format(reportDate, 'yyyy-MM-dd');
    const periodString = isSnapshotReport
      ? `Current balance snapshot as of ${formatDisplayDate(reportDate)}`
      : `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    const fileName = isSnapshotReport
      ? `xpenzy-${reportType}-report-as-of-${asOfDate}`
      : `xpenzy-${reportType}-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
    const summary = reportType === 'overview'
      ? {
          income: totals.income,
          expenses: totals.expenses,
          netBalance: totals.netBalance,
          currentSavings: totals.savings,
          currentInvestments: totals.investments,
          currentWealth: totals.totalWealth,
        }
      : reportType === 'expenses'
          ? {
              totalExpenses: totals.expenses,
              transactionCount: sortedExpenses.length,
              largestCategory: expensesByCategory[0]?.name || null,
              largestCategoryAmount: expensesByCategory[0]?.value || 0,
            }
        : reportType === 'income'
            ? { totalIncome: totals.income, transactionCount: sortedIncome.length, incomeSources: incomeByCategory.length }
          : reportType === 'savings'
              ? {
                  currentSavings: totals.savings,
                  goalCount: filteredData.savings.length,
                  goalTarget: savingsTarget,
                  goalProgressPercent: savingsGoalProgress,
                }
            : reportType === 'investments'
                ? { currentInvestments: totals.investments, investmentCount: filteredData.investments.length, netChange: investmentNetChange }
                : {
                    transactionCount: paymentModeData.reduce((sum, item) => sum + item.value, 0),
                    paymentMethodCount: paymentModeData.length,
                    mostUsedPaymentMode: mostUsedPaymentMode?.name || null,
                  };
    const reportData = {
      reportType,
      generatedAt: new Date().toISOString(),
      ...(isSnapshotReport ? { asOfDate } : {
        period: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      }),
      summary,
      ...(reportType === 'overview' || reportType === 'income' ? { incomeTransactions: sortedIncome, incomeByCategory } : {}),
      ...(reportType === 'overview' || reportType === 'expenses' ? { expenseTransactions: sortedExpenses, expensesByCategory } : {}),
      ...(reportType === 'savings' ? { currentSavingsGoals: filteredData.savings } : {}),
      ...(reportType === 'investments' ? { currentInvestments: filteredData.investments } : {}),
      ...(reportType === 'overview' || reportType === 'payments' ? { paymentMethods: paymentModeData } : {}),
    };

    if (exportFormat === 'json') {
      downloadFile(`${fileName}.json`, JSON.stringify(reportData, null, 2), 'application/json;charset=utf-8');
    } else if (exportFormat === 'csv') {
      const csvRows: (string | number)[][] = [
        ['Xpenzy Financial Report'],
        [isSnapshotReport ? 'Snapshot' : 'Period', periodString],
        [],
        ['Summary'],
        ['Metric', 'Value'],
        ...(reportType === 'overview' ? [
          ['Total Income', totals.income], ['Total Expenses', totals.expenses], ['Net Cash Flow', totals.netBalance],
          ['Current Savings', totals.savings], ['Current Investments', totals.investments], ['Current Wealth', totals.totalWealth],
        ] : reportType === 'expenses' ? [
          ['Total Expenses', totals.expenses], ['Transactions', sortedExpenses.length],
          ['Largest Category', expensesByCategory[0]?.name || '—'],
          ['Largest Category Amount', expensesByCategory[0]?.value || 0],
        ] : reportType === 'income' ? [
          ['Total Income', totals.income], ['Transactions', sortedIncome.length], ['Income Sources', incomeByCategory.length],
        ] : reportType === 'savings' ? [
          ['Current Savings', totals.savings], ['Goals', filteredData.savings.length],
          ['Goal Target', savingsTarget], ['Goal Progress', `${savingsGoalProgress}%`],
        ] : reportType === 'investments' ? [
          ['Current Investments', totals.investments], ['Investments', filteredData.investments.length], ['Net Change', investmentNetChange],
        ] : [
          ['Transactions', paymentModeData.reduce((sum, item) => sum + item.value, 0)],
          ['Payment Methods', paymentModeData.length], ['Most Used Method', mostUsedPaymentMode?.name || '—'],
        ]),
      ];

      if (reportType === 'overview' || reportType === 'expenses') {
        csvRows.push(
          [],
          ['Expenses by Category'],
          ['Category', 'Amount (INR)'],
          ...expensesByCategory.map(category => [category.name, category.value]),
          [],
          ['Expense Transactions'],
          ['Date', 'Category', 'Subcategory', 'Payment Mode', 'Amount (INR)', 'Notes'],
          ...sortedExpenses.map(expense => [
            formatDisplayDate(expense.date),
            expense.category,
            expense.subcategory || '',
            expense.paymentMode,
            expense.amount,
            expense.notes || '',
          ])
        );
      }

      if (reportType === 'overview' || reportType === 'income') {
        csvRows.push(
          [],
          ['Income by Category'],
          ['Category', 'Amount (INR)'],
          ...incomeByCategory.map(category => [category.name, category.value]),
          [],
          ['Income Transactions'],
          ['Date', 'Category', 'Payment Mode', 'Amount (INR)', 'Notes'],
          ...sortedIncome.map(income => [
            formatDisplayDate(income.date),
            income.customCategory || income.category,
            income.paymentMode,
            income.amount,
            income.notes || '',
          ])
        );
      }

      if (reportType === 'savings') {
        csvRows.push([], ['Savings Goals'], ['Goal', 'Current (INR)', 'Target (INR)'],
          ...filteredData.savings.map(goal => [goal.name, goal.current, goal.target]));
      }
      if (reportType === 'investments') {
        csvRows.push([], ['Investments'], ['Investment', 'Type', 'Invested (INR)', 'Current (INR)'],
          ...filteredData.investments.map(item => [item.name, item.customType || item.type, item.invested, item.current]));
      }
      if (reportType === 'overview' || reportType === 'payments') {
        csvRows.push([], ['Payment Methods'], ['Method', 'Transactions'],
          ...paymentModeData.map(item => [item.name, item.value]));
      }

      const csvContent = `\uFEFF${csvRows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
      downloadFile(`${fileName}.csv`, csvContent, 'text/csv;charset=utf-8');
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF({ orientation: reportType === 'overview' || reportType === 'expenses' || reportType === 'income' ? 'landscape' : 'portrait' });
      const pageWidth = doc.internal.pageSize.width;
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(`Xpenzy ${reportTypes.find(type => type.id === reportType)?.label} Report`, pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(periodString, pageWidth / 2, 30, { align: 'center' });

      const pdfSummaryRows: string[][] = reportType === 'overview'
        ? [
            ['Total Income', currency(totals.income)],
            ['Total Expenses', currency(totals.expenses)],
            ['Net Cash Flow', currency(totals.netBalance)],
            ['Current Savings', currency(totals.savings)],
            ['Current Investments', currency(totals.investments)],
            ['Current Wealth', currency(totals.totalWealth)],
          ]
        : reportType === 'expenses'
            ? [
                ['Total Expenses', currency(totals.expenses)],
                ['Transactions', String(sortedExpenses.length)],
                ['Largest Category', expensesByCategory[0]?.name || '—'],
                ['Largest Category Amount', currency(expensesByCategory[0]?.value || 0)],
              ]
          : reportType === 'income'
              ? [['Total Income', currency(totals.income)], ['Transactions', String(sortedIncome.length)], ['Income Sources', String(incomeByCategory.length)]]
            : reportType === 'savings'
                ? [
                    ['Current Savings', currency(totals.savings)],
                    ['Goals', String(filteredData.savings.length)],
                    ['Goal Target', currency(savingsTarget)],
                    ['Goal Progress', `${savingsGoalProgress}%`],
                  ]
              : reportType === 'investments'
                  ? [
                      ['Current Investments', currency(totals.investments)],
                      ['Investments', String(filteredData.investments.length)],
                      ['Net Change', currency(investmentNetChange)],
                    ]
                : [
                    ['Transactions', String(paymentModeData.reduce((sum, item) => sum + item.value, 0))],
                    ['Payment Methods', String(paymentModeData.length)],
                      ['Most Used Method', mostUsedPaymentMode?.name || '—'],
                  ];

      let cursorY = 42;
      const addPdfTable = (title: string, headers: string[], rows: string[][]) => {
        if (rows.length === 0) return;
        if (cursorY > doc.internal.pageSize.height - 38) {
          doc.addPage();
          cursorY = 20;
        }
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text(title, 14, cursorY);
        const tableStartY = cursorY + 5;
        autoTable(doc, {
          startY: tableStartY,
          head: [headers],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          margin: { left: 14, right: 14 },
        });
        const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
        cursorY = (finalY ?? tableStartY) + 12;
      };

      addPdfTable('Summary', ['Metric', 'Value'], pdfSummaryRows);
      if (reportType === 'overview' || reportType === 'expenses') {
        addPdfTable('Expenses by Category', ['Category', 'Amount (INR)'],
          expensesByCategory.map(category => [category.name, currency(category.value)]));
        addPdfTable('Expense Transactions',
          ['Date', 'Category', 'Subcategory', 'Payment Mode', 'Amount (INR)', 'Notes'],
          expenseRows);
      }
      if (reportType === 'overview' || reportType === 'income') {
        addPdfTable('Income by Category', ['Category', 'Amount (INR)'],
          incomeByCategory.map(category => [category.name, currency(category.value)]));
        addPdfTable('Income Transactions',
          ['Date', 'Category', 'Payment Mode', 'Amount (INR)', 'Notes'],
          incomeRows);
      }
      if (reportType === 'savings') {
        addPdfTable('Savings Goals', ['Goal', 'Current (INR)', 'Target (INR)'], savingsRows);
      }
      if (reportType === 'investments') {
        addPdfTable('Investments', ['Investment', 'Type', 'Invested (INR)', 'Current (INR)'], investmentRows);
      }
      if (reportType === 'overview' || reportType === 'payments') {
        addPdfTable('Payment Methods', ['Method', 'Transactions'], paymentRows);
      }

      doc.save(`${fileName}.pdf`);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-5 bg-background px-3 pb-28 pt-4 sm:space-y-6 sm:px-6 md:pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <div className="rounded-2xl bg-primary p-2.5 shadow-lg shadow-primary/20">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            Reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {reportTypes.find(type => type.id === reportType)?.description}. {isSnapshotReport ? 'This is a current balance snapshot; date filters do not apply.' : 'Activity is filtered to the selected period; savings and investments are shown as current balances.'}
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 rounded-full border-border/70 bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
          <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
          {isSnapshotReport ? 'Current balance snapshot' : `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`}
        </Badge>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Report type">
            {reportTypes.map(type => {
              const TypeIcon = type.icon;
              const selected = reportType === type.id;
              return <Button key={type.id} type="button" aria-pressed={selected} variant="ghost" size="sm" className={'h-10 shrink-0 gap-2 rounded-xl px-3 ' + (selected ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} onClick={() => setReportType(type.id)}><TypeIcon className="h-4 w-4" />{type.label}</Button>;
            })}
          </div>
          {isSnapshotReport ? (
            <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">
              Showing live {reportType} balances. Choose Overview, Expenses, Income, or Payment methods to filter activity by date.
            </p>
          ) : (
          <div className="flex flex-col gap-4 border-t border-border/60 pt-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Date range</h2><span className="text-xs text-muted-foreground">Choose a period, then apply</span></div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'This month', value: 'thisMonth' as DateRange },
                  { label: 'Last month', value: 'lastMonth' as DateRange },
                  { label: '7 days', value: 'last7Days' as DateRange },
                  { label: '30 days', value: 'last30Days' as DateRange },
                  { label: '90 days', value: 'last90Days' as DateRange },
                  { label: 'This year', value: 'thisYear' as DateRange },
                ].map(option => <Button key={option.value} type="button" aria-pressed={draftDateRange === option.value} variant="outline" onClick={() => setDateRange(option.value)} size="sm" className={'h-8 rounded-lg px-3 text-xs ' + (draftDateRange === option.value ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15' : 'border-border/70 bg-background')}>{option.label}</Button>)}
                <Button type="button" aria-pressed={draftDateRange === 'custom'} variant="outline" onClick={() => setDateRange('custom')} size="sm" className={'h-8 rounded-lg px-3 text-xs ' + (draftDateRange === 'custom' ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 bg-background')}>Custom</Button>
              </div>
              {draftDateRange === 'custom' && <div className="grid max-w-lg grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-medium text-muted-foreground">From<input type="date" value={draftStartDate ? format(draftStartDate, 'yyyy-MM-dd') : ''} onChange={event => { const date = event.target.value ? new Date(event.target.value + 'T00:00:00') : undefined; setDraftCustomDates(current => ({ ...current, [reportType]: { ...current[reportType], start: date } })); }} className="block h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
                <label className="space-y-1 text-xs font-medium text-muted-foreground">To<input type="date" value={draftEndDate ? format(draftEndDate, 'yyyy-MM-dd') : ''} onChange={event => { const date = event.target.value ? new Date(event.target.value + 'T00:00:00') : undefined; setDraftCustomDates(current => ({ ...current, [reportType]: { ...current[reportType], end: date } })); }} className="block h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
              </div>}
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              <p className="mr-auto text-xs text-muted-foreground lg:mr-2">Applied: <span className="font-medium text-foreground">{formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}</span></p>
              <Button variant="outline" size="sm" className="h-10 rounded-xl px-4" onClick={() => { setDateRange('thisMonth'); setDraftCustomDates(current => ({ ...current, [reportType]: undefined })); setDateRanges(current => ({ ...current, [reportType]: 'thisMonth' })); setCustomDates(current => ({ ...current, [reportType]: undefined })); }}>Reset</Button>
              <Button size="sm" className="h-10 rounded-xl px-5 shadow-sm" disabled={invalidDraftRange} onClick={applyDateFilters}>Apply filters</Button>
            </div>
          </div>
          )}
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
          {/* Report-specific KPIs */}
          <section aria-label={`${reportType} key metrics`} className={`grid grid-cols-2 gap-3 ${kpis.length === 3 ? 'sm:grid-cols-3' : ''}`}>
            {kpis.map(kpi => <ReportKpi key={kpi.title} {...kpi} />)}
          </section>
          {reportType === 'overview' && (
            <section aria-label="Current balances" className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:grid-cols-3">
              {[
                ['Current savings', currency(totals.savings)],
                ['Current investments', currency(totals.investments)],
                ['Current wealth', currency(totals.totalWealth)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 truncate text-sm font-bold tracking-tight">{value}</p>
                </div>
              ))}
            </section>
          )}
          <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Download {reportTypes.find(type => type.id === reportType)?.label.toLowerCase()} report</h2>
                <p className="text-xs text-muted-foreground">
                  {isSnapshotReport ? `Current balances as of ${formatDisplayDate(new Date())}.` : `For ${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}.`} Screen details match the PDF and CSV; CSV opens in Excel.
                </p>
              </div>
              <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                <Button variant="outline" size="sm" className="w-full px-2" onClick={() => exportData('csv')}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  CSV
                </Button>
                <Button variant="outline" size="sm" className="w-full px-2" onClick={() => exportData('json')}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  JSON
                </Button>
                <Button variant="outline" size="sm" className="w-full px-2" onClick={() => exportData('pdf')}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Charts Row */}
          <div className="space-y-4">
            {(reportType === 'overview' || reportType === 'expenses') && (
              <>
                <ReportTable
                  title="Expenses by category"
                  headers={['Category', 'Amount']}
                  rows={expensesByCategory.map(category => [category.name, currency(category.value)])}
                  mobileValueIndex={1}
                />
                <ReportTable
                  title="Expense transactions"
                  headers={['Date', 'Category', 'Subcategory', 'Payment mode', 'Amount', 'Notes']}
                  rows={expenseRows}
                  mobileTitleIndex={1}
                  mobileSubtitleIndices={[0, 2, 3, 5]}
                  mobileValueIndex={4}
                />
              </>
            )}

            {(reportType === 'overview' || reportType === 'income') && (
              <>
                <ReportTable
                  title="Income by category"
                  headers={['Category', 'Amount']}
                  rows={incomeByCategory.map(category => [category.name, currency(category.value)])}
                  mobileValueIndex={1}
                />
                <ReportTable
                  title="Income transactions"
                  headers={['Date', 'Category', 'Payment mode', 'Amount', 'Notes']}
                  rows={incomeRows}
                  mobileTitleIndex={1}
                  mobileSubtitleIndices={[0, 2, 4]}
                  mobileValueIndex={3}
                />
              </>
            )}

            {(reportType === 'overview' || reportType === 'payments') && (
              <ReportTable
                title="Payment methods"
                headers={['Method', 'Transactions']}
                rows={paymentRows}
                mobileValueIndex={1}
              />
            )}

          </div>

          {reportType === 'savings' && (
            <ReportTable
              title="Savings goals"
              headers={['Goal', 'Current', 'Target']}
              rows={savingsRows}
              mobileSubtitleIndices={[2]}
              mobileValueIndex={1}
            />
          )}
          {reportType === 'investments' && (
            <ReportTable
              title="Investments"
              headers={['Investment', 'Type', 'Invested', 'Current']}
              rows={investmentRows}
              mobileSubtitleIndices={[1, 2]}
              mobileValueIndex={3}
            />
          )}

        </>
      )}
    </div>
  );
};
