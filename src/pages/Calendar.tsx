import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, TrendingDown, TrendingUp, IndianRupee, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';

export const Calendar = () => {
  const { data } = useFinancial();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  // Go to today
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Get all days in the current month view (including padding days from previous/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start on Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Filter transactions for the current month and group by exact date
  const transactionsByDate = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const grouped: Record<string, any[]> = {};
    
    // Filter and group income by exact date
    data.income
      .filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate >= monthStart && incomeDate <= monthEnd;
      })
      .forEach(income => {
        const dateKey = income.date; // Use the exact date string as key
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          type: 'income',
          category: income.customCategory || income.category,
          amount: income.amount,
          time: new Date(income.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
          notes: income.notes
        });
      });

    // Filter and group expenses by exact date
    data.expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .forEach(expense => {
        const dateKey = expense.date; // Use the exact date string as key
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          type: 'expense',
          category: expense.customCategory || expense.category,
          amount: expense.amount,
          time: new Date(expense.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
          notes: expense.notes
        });
      });

    return grouped;
  }, [data.income, data.expenses, currentDate]);

  // Calculate daily totals for the current month
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { income: number; expenses: number }> = {};
    
    Object.keys(transactionsByDate).forEach(dateKey => {
      const transactions = transactionsByDate[dateKey];
      totals[dateKey] = {
        income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      };
    });

    return totals;
  }, [transactionsByDate]);

  // Get day information for calendar rendering
  const getDayInfo = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const hasTransactions = !!transactionsByDate[dateKey];
    const totals = dailyTotals[dateKey] || { income: 0, expenses: 0 };
    const isToday = isSameDay(day, new Date());
    const isSelected = isSameDay(day, selectedDate);
    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
    
    return {
      day,
      dateKey,
      hasTransactions,
      income: totals.income,
      expenses: totals.expenses,
      isToday,
      isSelected,
      isCurrentMonth
    };
  };

  const getDayStyle = (dayInfo: ReturnType<typeof getDayInfo>) => {
    let baseStyle = "w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all relative text-sm ";
    
    if (!dayInfo.isCurrentMonth) {
      baseStyle += "text-muted-foreground/40 ";
    } else if (dayInfo.isToday) {
      baseStyle += "bg-primary text-primary-foreground shadow-glow font-bold ";
    } else if (dayInfo.isSelected) {
      baseStyle += "bg-secondary text-secondary-foreground font-semibold ";
    } else if (dayInfo.hasTransactions) {
      baseStyle += "bg-accent/20 text-accent-foreground hover:bg-accent/30 font-medium ";
    } else {
      baseStyle += "text-foreground hover:bg-secondary/50 ";
    }
    
    return baseStyle;
  };

  // Get transactions for the selected date
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateTransactions = transactionsByDate[selectedDateKey] || [];
  const selectedDateTotals = dailyTotals[selectedDateKey] || { income: 0, expenses: 0 };

  // Calculate month totals
  const monthTotals = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const monthIncome = data.income
      .filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate >= monthStart && incomeDate <= monthEnd;
      })
      .reduce((sum, income) => sum + income.amount, 0);

    const monthExpenses = data.expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    return { income: monthIncome, expenses: monthExpenses };
  }, [data.income, data.expenses, currentDate]);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">{format(currentDate, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>{monthTotals.income.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Month Income</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-red-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>{monthTotals.expenses.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Month Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayInfo = getDayInfo(day);
              
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={getDayStyle(dayInfo)}
                >
                  <span>{format(day, 'd')}</span>
                  {dayInfo.hasTransactions && dayInfo.isCurrentMonth && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {dayInfo.income > 0 && <div className="w-1 h-1 bg-emerald-500 rounded-full" />}
                      {dayInfo.expenses > 0 && <div className="w-1 h-1 bg-red-500 rounded-full" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')} Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-4xl mb-2">📅</div>
              <p>No transactions on this date</p>
              <p className="text-sm">Select a date with indicators to view transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{transaction.category}</h3>
                      <p className="text-sm text-muted-foreground">{transaction.time}</p>
                      {transaction.notes && (
                        <p className="text-xs text-muted-foreground">{transaction.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold ${
                    transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    <IndianRupee className="w-4 h-4" />
                    {transaction.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>{selectedDateTotals.income.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Day Income</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-red-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>{selectedDateTotals.expenses.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Day Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Help */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">💡 <strong>Navigation Tips:</strong></p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <p>• Use ← → arrows to navigate months</p>
              <p>• Click "Today" to return to current date</p>
              <p>• Dots indicate days with transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};