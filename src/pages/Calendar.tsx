import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, TrendingDown, TrendingUp, IndianRupee } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';

export const Calendar = () => {
  const { data } = useFinancial();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    // Group income by date
    data.income.forEach(income => {
      const date = new Date(income.date).getDate().toString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        type: 'income',
        category: income.customCategory || income.category,
        amount: income.amount,
        time: new Date(income.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        notes: income.notes
      });
    });

    // Group expenses by date
    data.expenses.forEach(expense => {
      const date = new Date(expense.date).getDate().toString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        type: 'expense',
        category: expense.customCategory || expense.category,
        amount: expense.amount,
        time: new Date(expense.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        notes: expense.notes
      });
    });

    return grouped;
  }, [data.income, data.expenses]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { income: number; expenses: number }> = {};
    
    Object.keys(transactionsByDate).forEach(date => {
      const transactions = transactionsByDate[date];
      totals[date] = {
        income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      };
    });

    return totals;
  }, [transactionsByDate]);

  // Generate calendar days for current month
  const calendarData = useMemo(() => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return {
      currentMonth: currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
      days: Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayStr = day.toString();
        const hasTransactions = !!transactionsByDate[dayStr];
        const totals = dailyTotals[dayStr] || { income: 0, expenses: 0 };
        
        return {
          day,
          hasTransactions,
          income: totals.income,
          expenses: totals.expenses,
          isToday: day === currentDate.getDate()
        };
      })
    };
  }, [transactionsByDate, dailyTotals]);
  
  const getDayStyle = (day: any) => {
    let baseStyle = "w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all relative ";
    
    if (day.isToday) {
      baseStyle += "bg-primary text-primary-foreground shadow-glow ";
    } else if (selectedDay === day.day) {
      baseStyle += "bg-secondary text-secondary-foreground ";
    } else if (day.hasTransactions) {
      baseStyle += "bg-accent/20 text-accent-foreground hover:bg-accent/30 ";
    } else {
      baseStyle += "text-muted-foreground hover:bg-secondary/50 ";
    }
    
    return baseStyle;
  };

  const selectedDayTransactions = transactionsByDate[selectedDay.toString()] || [];
  const selectedDayTotals = dailyTotals[selectedDay.toString()] || { income: 0, expenses: 0 };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">{calendarData.currentMonth}</p>
        </div>
        <CalendarIcon className="w-6 h-6 text-primary" />
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarData.days.map((day) => (
              <div
                key={day.day}
                onClick={() => setSelectedDay(day.day)}
                className={getDayStyle(day)}
              >
                <span className="text-sm font-medium">{day.day}</span>
                {day.hasTransactions && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {day.income > 0 && <div className="w-1 h-1 bg-emerald-500 rounded-full" />}
                    {day.expenses > 0 && <div className="w-1 h-1 bg-red-500 rounded-full" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{calendarData.currentMonth.split(' ')[0]} {selectedDay} Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDayTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-4xl mb-2">📅</div>
              <p>No transactions on this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayTransactions.map((transaction, index) => (
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

      {/* Day Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>{selectedDayTotals.income.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Income</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-red-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>{selectedDayTotals.expenses.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Expenses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};