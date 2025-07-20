import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Bell, User } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Sample data for charts
const balanceData = [
  { name: 'Income', value: 45000, color: 'hsl(var(--income))' },
  { name: 'Expenses', value: 32000, color: 'hsl(var(--expense))' },
  { name: 'Savings', value: 13000, color: 'hsl(var(--savings))' },
];

const trendData = [
  { day: 'Mon', balance: 12000 },
  { day: 'Tue', balance: 13500 },
  { day: 'Wed', balance: 11200 },
  { day: 'Thu', balance: 14800 },
  { day: 'Fri', balance: 13000 },
  { day: 'Sat', balance: 15200 },
  { day: 'Sun', balance: 13000 },
];

export const Home = () => {
  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good Morning, Alex! 👋</h1>
          <p className="text-sm text-muted-foreground">December 2024</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Income"
          value="₹45,000"
          subtitle="This month"
          icon={TrendingUp}
          variant="income"
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatCard
          title="Total Expenses"
          value="₹32,000"
          subtitle="This month"
          icon={TrendingDown}
          variant="expense"
          trend={{ value: "+5%", isPositive: false }}
        />
        <StatCard
          title="Remaining Balance"
          value="₹13,000"
          subtitle="Available"
          icon={Wallet}
          variant="default"
          trend={{ value: "+7%", isPositive: true }}
        />
        <StatCard
          title="Total Savings"
          value="₹85,000"
          subtitle="All time"
          icon={PiggyBank}
          variant="savings"
          trend={{ value: "+15%", isPositive: true }}
        />
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Balance Overview Pie Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Balance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={balanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {balanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {balanceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend Line Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daily Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button className="bg-gradient-income h-12" size="lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Income
            </Button>
            <Button className="bg-gradient-expense h-12" size="lg">
              <TrendingDown className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
            <Button variant="outline" className="h-12" size="lg">
              <PiggyBank className="w-4 h-4 mr-2" />
              Add Savings
            </Button>
            <Button variant="outline" className="h-12" size="lg">
              <Wallet className="w-4 h-4 mr-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};