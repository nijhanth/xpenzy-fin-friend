import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp, Plus, DollarSign, Calendar, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Sample investment data
const investments = [
  { 
    id: 1, 
    type: 'Mutual Fund', 
    name: 'HDFC Equity Fund', 
    invested: 50000, 
    current: 58000, 
    date: '2024-01-15',
    profitLoss: 8000,
    profitPercent: 16
  },
  { 
    id: 2, 
    type: 'Stocks', 
    name: 'Tech Portfolio', 
    invested: 75000, 
    current: 82000, 
    date: '2024-03-10',
    profitLoss: 7000,
    profitPercent: 9.3
  },
  { 
    id: 3, 
    type: 'FD', 
    name: 'SBI Fixed Deposit', 
    invested: 100000, 
    current: 106000, 
    date: '2024-02-01',
    profitLoss: 6000,
    profitPercent: 6
  },
  { 
    id: 4, 
    type: 'Crypto', 
    name: 'Bitcoin', 
    invested: 25000, 
    current: 28500, 
    date: '2024-06-20',
    profitLoss: 3500,
    profitPercent: 14
  },
  { 
    id: 5, 
    type: 'Gold', 
    name: 'Digital Gold', 
    invested: 30000, 
    current: 31200, 
    date: '2024-05-15',
    profitLoss: 1200,
    profitPercent: 4
  },
];

const allocationData = [
  { name: 'FD', value: 106000, color: '#10b981' },
  { name: 'Stocks', value: 82000, color: '#3b82f6' },
  { name: 'Mutual Fund', value: 58000, color: '#8b5cf6' },
  { name: 'Gold', value: 31200, color: '#f59e0b' },
  { name: 'Crypto', value: 28500, color: '#ef4444' },
];

const growthData = [
  { month: 'Jan', value: 250000 },
  { month: 'Feb', value: 265000 },
  { month: 'Mar', value: 280000 },
  { month: 'Apr', value: 275000 },
  { month: 'May', value: 290000 },
  { month: 'Jun', value: 305700 },
];

export const Investments = () => {
  const totalInvested = investments.reduce((sum, inv) => sum + inv.invested, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.current, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPercent = ((totalProfit / totalInvested) * 100).toFixed(1);

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investment Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Current Value: ₹{totalCurrent.toLocaleString()}
          </p>
        </div>
        <Button className="bg-investment text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Investment
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
              <p className="text-2xl font-bold text-foreground">₹{totalInvested.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Profit/Loss</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalProfit >= 0 ? '+' : ''}₹{totalProfit.toLocaleString()}
              </p>
              <p className={`text-sm ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                ({totalProfit >= 0 ? '+' : ''}{totalProfitPercent}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Investment Allocation Pie Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Investment Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {allocationData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Growth Line Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Portfolio Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--investment))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--investment))', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: 'hsl(var(--investment))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Holdings */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Investment Holdings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {investments.map((investment) => (
              <div 
                key={investment.id} 
                className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:shadow-card transition-all duration-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {investment.type}
                    </Badge>
                    <Badge 
                      variant={investment.profitLoss >= 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {investment.profitLoss >= 0 ? '+' : ''}{investment.profitPercent}%
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground mb-1">{investment.name}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Invested: ₹{investment.invested.toLocaleString()}
                    </span>
                    <span className={investment.profitLoss >= 0 ? 'text-success' : 'text-destructive'}>
                      Current: ₹{investment.current.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(investment.date).toLocaleDateString()}
                  </div>
                  <p className={`text-sm font-medium ${investment.profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {investment.profitLoss >= 0 ? '+' : ''}₹{investment.profitLoss.toLocaleString()}
                  </p>
                  <Button variant="ghost" size="sm" className="h-8 mt-1">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};