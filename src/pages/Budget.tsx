import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, CheckCircle, TrendingUp, Calendar, WalletCards, PiggyBank, Target, Sparkles, CircleDollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFinancial } from '@/contexts/FinancialContext';
import { BudgetCategory } from '@/types/financial';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { AIInsightsCard } from '@/components/ai/AIInsights';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, getWeeksInMonth, getYear, getMonth } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';

export const Budget = () => {
  const { toast } = useToast();
  const { data, isLoading: isFinancialLoading, addBudget, updateBudget, deleteBudget } = useFinancial();

  const [newBudget, setNewBudget] = useState<{
    name: string;
    limit: string;
    icon: string;
    period: 'monthly' | 'weekly' | 'yearly';
    type: 'expenses' | 'savings' | 'investment';
    linkedId?: string;
  }>({
    name: '',
    limit: '',
    icon: '💰',
    period: 'monthly',
    type: 'expenses'
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetCategory | null>(null);
  const [isUnbudgetedSheetOpen, setIsUnbudgetedSheetOpen] = useState(false);

  // Date selection state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(getYear(currentDate));
  const [selectedMonth, setSelectedMonth] = useState(getMonth(currentDate));
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Generate options for date selectors
  const yearOptions = Array.from({ length: 5 }, (_, i) => getYear(currentDate) - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i);
  const weeksInSelectedMonth = getWeeksInMonth(new Date(selectedYear, selectedMonth));
  const weekOptions = Array.from({ length: weeksInSelectedMonth }, (_, i) => i + 1);

  // Helper function to filter expenses by selected period
  const getFilteredExpenses = (period: 'yearly' | 'monthly' | 'weekly') => {
    const year = selectedYear;
    const month = selectedMonth;
    const week = selectedWeek;

    let startDate: Date;
    let endDate: Date;

    if (period === 'yearly') {
      startDate = startOfYear(new Date(year, 0));
      endDate = endOfYear(new Date(year, 0));
    } else if (period === 'monthly') {
      startDate = startOfMonth(new Date(year, month));
      endDate = endOfMonth(new Date(year, month));
    } else {
      // weekly
      const firstDayOfMonth = startOfMonth(new Date(year, month));
      const startOfTargetWeek = startOfWeek(new Date(firstDayOfMonth.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000));
      startDate = startOfTargetWeek;
      endDate = endOfWeek(startOfTargetWeek);
    }

    return data.expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start: startDate, end: endDate });
    });
  };

  const isInSelectedPeriod = (date: string, period: 'yearly' | 'monthly' | 'weekly') => {
    const entryDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(entryDate.getTime())) return false;
    if (period === 'yearly') {
      return isWithinInterval(entryDate, { start: startOfYear(new Date(selectedYear, 0)), end: endOfYear(new Date(selectedYear, 0)) });
    }
    if (period === 'monthly') {
      return isWithinInterval(entryDate, { start: startOfMonth(new Date(selectedYear, selectedMonth)), end: endOfMonth(new Date(selectedYear, selectedMonth)) });
    }
    const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
    const targetWeekStart = startOfWeek(new Date(firstDayOfMonth.getTime() + (selectedWeek - 1) * 7 * 24 * 60 * 60 * 1000));
    return isWithinInterval(entryDate, { start: targetWeekStart, end: endOfWeek(targetWeekStart) });
  };

  // Filter budgets to show only those relevant to the selected period
  const filteredBudgets = useMemo(() => {
    return data.budgets.filter(budget => {
      // If budget doesn't have date fields, show it (legacy budgets)
      if (!budget.year && !budget.month && !budget.week) {
        return true;
      }

      // Check if budget matches the selected period
      if (budget.period === 'yearly' && budget.year === selectedYear) {
        return true;
      }
      if (budget.period === 'monthly' && budget.year === selectedYear && budget.month === selectedMonth) {
        return true;
      }
      if (budget.period === 'weekly' && budget.year === selectedYear && budget.month === selectedMonth && budget.week === selectedWeek) {
        return true;
      }
      
      return false;
    });
  }, [data.budgets, selectedYear, selectedMonth, selectedWeek]);

  // Calculate spent amounts from real data automatically
  const budgetsWithRealSpent = useMemo(() => {
    return filteredBudgets.map(budget => {
      let spent = 0;
      
      if (budget.linked_type === 'investment' && budget.linked_id) {
        spent = data.investmentTransactions
          .filter(transaction => transaction.investment_id === budget.linked_id &&
            transaction.amount > 0 &&
            !transaction.notes?.startsWith('Statement snapshot:') &&
            isInSelectedPeriod(transaction.date, budget.period))
          .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      } else if (budget.linked_type === 'savings') {
        // Read savings activity directly so progress stays accurate even when
        // the database's cached budget.current value has not been refreshed.
        const goalTransactions = data.savingsTransactions
          .filter(transaction => transaction.savings_goal_id === budget.linked_id);
        spent = goalTransactions.length > 0
          ? goalTransactions
            .filter(transaction => isInSelectedPeriod(transaction.date, budget.period))
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
          : budget.current || 0;
      } else {
        // For expense budgets, calculate from actual expenses matching this budget category
        const filteredExpenses = getFilteredExpenses(budget.period);
        spent = filteredExpenses
          .filter(expense => expense.category === budget.category)
          .reduce((sum, expense) => sum + expense.amount, 0);
      }
      
      return {
        ...budget,
        spent
      };
    });
  }, [filteredBudgets, data.expenses, data.investmentTransactions, data.savingsTransactions, selectedYear, selectedMonth, selectedWeek]);

  // Calculate expenses that don't have budgets (Others/Unbudgeted)
  const unbudgetedExpensesList = useMemo(() => {
    const budgetCategoryNames = filteredBudgets.map(b => b.category);
    const allFilteredExpenses = [...getFilteredExpenses('yearly'), ...getFilteredExpenses('monthly'), ...getFilteredExpenses('weekly')];
    const uniqueExpenses = allFilteredExpenses.filter((expense, index, self) =>
      index === self.findIndex(e => e.id === expense.id)
    );

    return uniqueExpenses
      .filter(expense => !budgetCategoryNames.includes(expense.category))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredBudgets, data.expenses, selectedYear, selectedMonth, selectedWeek]);

  const unbudgetedExpenses = useMemo(
    () => unbudgetedExpensesList.reduce((sum, e) => sum + e.amount, 0),
    [unbudgetedExpensesList]
  );

  const getProgressPercentage = (spent: number, limit: number) => {
    return Math.min((spent / limit) * 100, 100);
  };

  const getStatusColor = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 80) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (percentage >= 80) return <TrendingUp className="w-4 h-4 text-orange-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const selectedSavingsGoal = newBudget.type === 'savings'
    ? data.savings.find(goal => goal.id === newBudget.linkedId)
    : undefined;
  const selectedGoalUsedAmount = selectedSavingsGoal
    ? data.expenses
      .filter(expense => expense.goalId === selectedSavingsGoal.id)
      .reduce((total, expense) => total + Number(expense.amount || 0), 0)
    : 0;
  const savingsGoalRemainingTarget = selectedSavingsGoal
    ? Math.max(0, Number(selectedSavingsGoal.target || 0) - Math.max(0, Number(selectedSavingsGoal.current || 0) - selectedGoalUsedAmount))
    : undefined;
  const enteredBudgetLimit = newBudget.limit.trim() ? Number(newBudget.limit) : 0;
  const savingsLimitExceedsGoal = savingsGoalRemainingTarget !== undefined
    && enteredBudgetLimit > savingsGoalRemainingTarget;

  const handleAddBudget = async () => {
    if (!newBudget.name || !newBudget.limit) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (!Number.isFinite(enteredBudgetLimit) || enteredBudgetLimit <= 0) {
      toast({
        title: "Invalid budget limit",
        description: "Enter a budget amount greater than zero.",
        variant: "destructive"
      });
      return;
    }

    if (savingsLimitExceedsGoal && savingsGoalRemainingTarget !== undefined) {
      toast({
        title: "Budget exceeds the goal target",
        description: `This goal has ${formatCurrency(savingsGoalRemainingTarget)} left to reach its target. Set the period limit to that amount or less.`,
        variant: "destructive"
      });
      return;
    }

    // Additional validation for savings/investment budgets
    if ((newBudget.type === 'savings' || newBudget.type === 'investment') && !newBudget.linkedId) {
      toast({
        title: "Error",
        description: `Please select a ${newBudget.type === 'savings' ? 'savings goal' : 'investment'}`,
        variant: "destructive"
      });
      return;
    }

    // Calculate current spending for this category (expenses only)
    const currentSpent = newBudget.type === 'expenses' ? 
      data.expenses
        .filter(expense => expense.category === newBudget.name)
        .reduce((sum, expense) => sum + expense.amount, 0) : 0;

    // Add date-specific fields based on the selected period
    const budgetData: Omit<BudgetCategory, 'id'> = {
      category: newBudget.name,
      limit_amount: enteredBudgetLimit,
      period: newBudget.period,
      icon: newBudget.type === 'expenses' ? newBudget.icon : (newBudget.type === 'savings' ? '🎯' : '📈'),
      year: selectedYear,
      month: newBudget.period === 'monthly' || newBudget.period === 'weekly' ? selectedMonth : undefined,
      week: newBudget.period === 'weekly' ? selectedWeek : undefined,
      linked_type: newBudget.type,
      linked_id: newBudget.linkedId
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
      toast({
        title: "Budget Updated",
        description: `Budget for ${newBudget.name} has been updated`,
      });
      setEditingBudget(null);
    } else {
      const savedBudget = await addBudget(budgetData);
      if (!savedBudget) return;
      toast({
        title: "Budget Added",
        description: `Budget for ${newBudget.name} has been created with current spending of ₹${currentSpent.toLocaleString()}`,
      });
    }
    
    setNewBudget({ name: '', limit: '', icon: '💰', period: 'monthly', type: 'expenses' });
    setIsDialogOpen(false);
  };

  const handleEditBudget = (budget: BudgetCategory) => {
    setEditingBudget(budget);
    setNewBudget({
      name: budget.category,
      limit: budget.limit_amount.toString(),
      icon: budget.icon || "💰",
      period: budget.period,
      type: budget.linked_type || 'expenses',
      linkedId: budget.linked_id || undefined
    });
    setIsDialogOpen(true);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    await deleteBudget(budgetId);
    toast({
      title: "Budget Deleted",
      description: "Budget has been successfully deleted."
    });
  };

  const totalBudget = budgetsWithRealSpent.reduce((sum, budget) => sum + budget.limit_amount, 0);
  const totalSpent = budgetsWithRealSpent.reduce((sum, budget) => sum + budget.spent, 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetUsage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const overBudgetCount = budgetsWithRealSpent.filter(budget => budget.spent > budget.limit_amount).length;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
  const getBudgetPeriodGuidance = (amount: number, period: BudgetCategory['period']) => {
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (period === 'yearly') {
      return `About ${formatCurrency(amount / 12)} per month or ${formatCurrency(amount / 52)} per week.`;
    }
    if (period === 'monthly') {
      return `About ${formatCurrency((amount * 12) / 52)} per week (${formatCurrency(amount * 12)} per year).`;
    }
    return `About ${formatCurrency((amount * 52) / 12)} per month (${formatCurrency(amount * 52)} per year).`;
  };
  const selectedPeriodLabel = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-8 sm:p-6 animate-fade-in">
      <section className="relative isolate overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-card sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Budget planner</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Make every rupee count</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Track category limits, see what’s left to spend, and stay ahead of your financial goals.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur-sm">
            <Calendar className="h-5 w-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Current view</p><p className="font-semibold text-foreground">{selectedPeriodLabel}</p></div>
          </div>
        </div>
      </section>
      {/* Date Selection */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Choose a period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {monthOptions.map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {format(new Date(2024, month), 'MMMM')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="week">Week</Label>
              <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {weekOptions.map(week => (
                    <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Budget progress updates from expenses, savings, and investments for the selected period.
          </p>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-primary">₹{totalBudget.toLocaleString()}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-destructive">₹{totalSpent.toLocaleString()}</p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  ₹{remainingBudget.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">{remainingBudget >= 0 ? '✅' : '⚠️'}</div>
            </div>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setIsUnbudgetedSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsUnbudgetedSheetOpen(true);
            }
          }}
          className="cursor-pointer transition-all hover:shadow-elevated hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unbudgeted</p>
                <p className="text-2xl font-bold text-orange-500">₹{unbudgetedExpenses.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unbudgetedExpensesList.length} {unbudgetedExpensesList.length === 1 ? 'expense' : 'expenses'} • Tap to view
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign className="h-4 w-4" /></span>
              <div><p className="font-semibold">Budget pace</p><p className="text-xs text-muted-foreground">{selectedPeriodLabel}</p></div>
            </div>
            <Badge variant={overBudgetCount > 0 ? 'destructive' : 'secondary'}>
              {overBudgetCount > 0 ? `${overBudgetCount} over limit` : `${budgetUsage.toFixed(0)}% used`}
            </Badge>
          </div>
          <Progress value={budgetUsage} className="h-2.5" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><WalletCards className="h-3.5 w-3.5" />{budgetsWithRealSpent.length} tracked {budgetsWithRealSpent.length === 1 ? 'budget' : 'budgets'}</span>
            <span className="inline-flex items-center gap-1.5"><PiggyBank className="h-3.5 w-3.5" />{remainingBudget >= 0 ? `${formatCurrency(remainingBudget)} available` : `${formatCurrency(Math.abs(remainingBudget))} over planned`}</span>
          </div>
        </CardContent>
      </Card>

      {/* Unbudgeted Expenses Bottom Sheet */}
      <Sheet open={isUnbudgetedSheetOpen} onOpenChange={setIsUnbudgetedSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Unbudgeted Expenses
            </SheetTitle>
            <SheetDescription>
              Expenses without an assigned budget category for the selected period.
              Total: <span className="font-semibold text-orange-500">₹{unbudgetedExpenses.toLocaleString()}</span>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
            {unbudgetedExpensesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No unbudgeted expenses for this period.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pb-6">
                {unbudgetedExpensesList.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{expense.category}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDisplayDate(expense.date)}</span>
                        {expense.subcategory && (
                          <>
                            <span>•</span>
                            <span className="truncate">{expense.subcategory}</span>
                          </>
                        )}
                      </div>
                      {expense.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{expense.notes}</p>
                      )}
                    </div>
                    <p className="ml-3 font-semibold text-destructive whitespace-nowrap">
                      ₹{expense.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Add Budget Button */}
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Target className="h-5 w-5 text-primary" />Category budgets</h2><p className="text-sm text-muted-foreground">Limits and progress for {selectedPeriodLabel}</p></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add New Budget'}</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Creating budget for: {newBudget.period === 'yearly' ? `Year ${selectedYear}` : 
                newBudget.period === 'monthly' ? `${format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}` : 
                `Week ${selectedWeek} of ${format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}`}
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budget-type">Budget Type</Label>
                <Select value={newBudget.type} onValueChange={(value: 'expenses' | 'savings' | 'investment') => 
                  setNewBudget({...newBudget, type: value, name: '', linkedId: undefined})
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="expenses">Expenses</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newBudget.type === 'expenses' ? (
                <div>
                  <Label htmlFor="category">Category Name</Label>
                  <Input
                    id="category"
                    value={newBudget.name}
                    onChange={(e) => setNewBudget({...newBudget, name: e.target.value})}
                    placeholder="e.g., Petrol, Groceries, Entertainment"
                  />
                </div>
              ) : newBudget.type === 'savings' ? (
                <div>
                  <Label htmlFor="savings-goal">Savings Goal</Label>
                  <Select value={newBudget.linkedId || ''} onValueChange={(value) => {
                    const selectedGoal = data.savings.find(s => s.id === value);
                    setNewBudget({
                      ...newBudget, 
                      linkedId: value,
                      name: selectedGoal ? selectedGoal.name : ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a savings goal" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {data.savings.length === 0 ? (
                        <SelectItem value="" disabled>No savings goals available</SelectItem>
                      ) : (
                        data.savings.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.name} (₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="investment">Investment</Label>
                  <Select value={newBudget.linkedId || ''} onValueChange={(value) => {
                    const selectedInvestment = data.investments.find(i => i.id === value);
                    setNewBudget({
                      ...newBudget, 
                      linkedId: value,
                      name: selectedInvestment ? selectedInvestment.name : ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an investment" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {data.investments.length === 0 ? (
                        <SelectItem value="" disabled>No investments available</SelectItem>
                      ) : (
                        data.investments.map((investment) => (
                          <SelectItem key={investment.id} value={investment.id}>
                            {investment.name} ({investment.type}) - ₹{investment.current.toLocaleString()}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="limit">Budget Limit (₹)</Label>
                <Input
                  id="limit"
                  type="number"
                  value={newBudget.limit}
                  onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                  placeholder="5000"
                  min="1"
                  max={savingsGoalRemainingTarget}
                />
                {savingsGoalRemainingTarget !== undefined && (
                  <p className={`mt-1 text-xs ${savingsLimitExceedsGoal ? 'text-destructive' : 'text-muted-foreground'}`}>
                    This goal has {formatCurrency(savingsGoalRemainingTarget)} left to reach its target. The budget limit for this period cannot exceed that amount.
                  </p>
                )}
                {newBudget.type === 'investment' && (
                  <p className="mt-1 text-xs text-muted-foreground">Only contributions added during this period count. Imported statement snapshots do not use this budget.</p>
                )}
              </div>
              <div>
                <Label htmlFor="period">Period</Label>
                <Select value={newBudget.period} onValueChange={(value: 'monthly' | 'weekly' | 'yearly') => setNewBudget({...newBudget, period: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {getBudgetPeriodGuidance(Number(newBudget.limit), newBudget.period) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Planning estimate: {getBudgetPeriodGuidance(Number(newBudget.limit), newBudget.period)} This is a reference only; the budget limit still applies to the selected period and is not automatically divided or transferred.
                  </p>
                )}
              </div>
              {newBudget.type === 'expenses' && (
                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={newBudget.icon} onValueChange={(value) => setNewBudget({...newBudget, icon: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="🍽️">🍽️ Food</SelectItem>
                      <SelectItem value="🚗">🚗 Transport</SelectItem>
                      <SelectItem value="⛽">⛽ Petrol</SelectItem>
                      <SelectItem value="🛍️">🛍️ Shopping</SelectItem>
                      <SelectItem value="🎬">🎬 Entertainment</SelectItem>
                      <SelectItem value="⚡">⚡ Bills</SelectItem>
                      <SelectItem value="🏥">🏥 Healthcare</SelectItem>
                      <SelectItem value="🎓">🎓 Education</SelectItem>
                      <SelectItem value="💰">💰 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleAddBudget} className="w-full">
                {editingBudget ? 'Update Budget' : 'Add Budget'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Categories */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {budgetsWithRealSpent.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-lg font-medium mb-1">No budgets set yet</p>
                <p className="text-sm">Create your first budget to start tracking your spending</p>
                <p className="text-xs mt-2 text-orange-500">
                  Categories from your budgets will appear in expense forms automatically
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          budgetsWithRealSpent.map((budget) => {
            const progressPercentage = getProgressPercentage(budget.spent, budget.limit_amount);
            const remaining = budget.limit_amount - budget.spent;
            
            return (
              <Card key={budget.id} className="border-border/80 bg-gradient-card shadow-sm transition-shadow hover:shadow-card">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{budget.icon || '💰'}</span>
                        <div>
                          <h3 className="font-medium">{budget.category}</h3>
                          <p className="text-sm text-muted-foreground">
                            ₹{budget.spent.toLocaleString()} of ₹{budget.limit_amount.toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {budget.period}
                          </Badge>
                          {getBudgetPeriodGuidance(budget.limit_amount, budget.period) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {getBudgetPeriodGuidance(budget.limit_amount, budget.period)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(budget.spent, budget.limit_amount)}
                        <Badge 
                          variant={progressPercentage >= 100 ? "destructive" : progressPercentage >= 80 ? "secondary" : "default"}
                        >
                          {progressPercentage.toFixed(0)}%
                        </Badge>
                        <EditDeleteMenu
                          onEdit={() => handleEditBudget(budget)}
                          onDelete={() => handleDeleteBudget(budget.id)}
                          itemName="budget"
                          deleteTitle="Delete Budget"
                          deleteDescription="Are you sure you want to delete this budget? This action cannot be undone."
                        />
                      </div>
                    </div>
                    
                    <Progress 
                      value={progressPercentage} 
                      className="h-2"
                    />
                    
                    <div className="flex justify-between text-sm">
                      <span className={getStatusColor(budget.spent, budget.limit_amount)}>
                        {remaining >= 0 ? `₹${remaining.toLocaleString()} remaining` : `₹${Math.abs(remaining).toLocaleString()} over budget`}
                      </span>
                      <span className="text-muted-foreground">
                        {budget.linked_type === 'savings' ? 'Auto-updated from savings' :
                         budget.linked_type === 'investment' ? 'Auto-updated from investments' :
                         'Auto-updated from expenses'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Unbudgeted Expenses Warning */}
      {unbudgetedExpenses > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              📊 Unbudgeted Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You have ₹{unbudgetedExpenses.toLocaleString()} in expenses that don't match any budget category.
              </p>
              <p className="text-xs text-muted-foreground">
                Consider creating budgets for these expense categories or they will be classified as "Others".
              </p>
            </div>
          </CardContent>
        </Card>
      )}


      <AIInsightsCard title="AI budget tips" focus="budget" autoGenerate isDataLoading={isFinancialLoading} showLanguageSelector refreshKey={data.budgets} />
    </div>
  );
};
