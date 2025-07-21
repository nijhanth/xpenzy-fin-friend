import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, TrendingDown, TrendingUp, IndianRupee } from 'lucide-react';
import { useState } from 'react';

const mockCalendarData = {
  currentMonth: "December 2024",
  days: Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    hasTransactions: Math.random() > 0.6,
    income: Math.random() > 0.8 ? Math.floor(Math.random() * 5000) + 1000 : 0,
    expenses: Math.random() > 0.4 ? Math.floor(Math.random() * 3000) + 500 : 0,
    isToday: i + 1 === new Date().getDate()
  })),
  selectedDayTransactions: [
    { type: 'expense', category: 'Food', amount: 450, time: '12:30 PM' },
    { type: 'expense', category: 'Transport', amount: 80, time: '6:45 PM' },
    { type: 'income', category: 'Freelance', amount: 2000, time: '2:15 PM' }
  ]
};

export const Calendar = () => {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  const getDayStyle = (day: any) => {
    let baseStyle = "w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all ";
    
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

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">{mockCalendarData.currentMonth}</p>
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
            {mockCalendarData.days.map((day) => (
              <div
                key={day.day}
                onClick={() => setSelectedDay(day.day)}
                className={getDayStyle(day)}
              >
                <span className="text-sm font-medium">{day.day}</span>
                {day.hasTransactions && (
                  <div className="absolute mt-6 flex gap-1">
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
          <CardTitle>December {selectedDay} Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockCalendarData.selectedDayTransactions.map((transaction, index) => (
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
        </CardContent>
      </Card>

      {/* Day Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>2,000</span>
            </div>
            <p className="text-sm text-muted-foreground">Income</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="flex items-center justify-center gap-1 text-red-600 font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>530</span>
            </div>
            <p className="text-sm text-muted-foreground">Expenses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};