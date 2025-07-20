import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { PiggyBank, Target, Plus, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Sample savings data
const savingsGoals = [
  { id: 1, name: 'Emergency Fund', target: 100000, current: 75000, color: 'hsl(var(--success))' },
  { id: 2, name: 'Vacation Trip', target: 50000, current: 32000, color: 'hsl(var(--accent))' },
  { id: 3, name: 'New Laptop', target: 80000, current: 45000, color: 'hsl(var(--warning))' },
  { id: 4, name: 'Investment Fund', target: 200000, current: 120000, color: 'hsl(var(--investment))' },
];

const savingsTrend = [
  { month: 'Jul', amount: 45000 },
  { month: 'Aug', amount: 52000 },
  { month: 'Sep', amount: 48000 },
  { month: 'Oct', amount: 65000 },
  { month: 'Nov', amount: 78000 },
  { month: 'Dec', amount: 85000 },
];

const savingsTips = [
  "Set up automatic transfers to your savings account",
  "Use the 50/30/20 budgeting rule",
  "Cut down on subscription services you don't use",
  "Cook more meals at home instead of ordering out",
  "Compare prices before making big purchases"
];

export const Savings = () => {
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.current, 0);
  const totalTargets = savingsGoals.reduce((sum, goal) => sum + goal.target, 0);
  const overallProgress = (totalSavings / totalTargets) * 100;

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Savings Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalSavings.toLocaleString()}</p>
        </div>
        <Button className="bg-savings text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Overall Progress */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              {/* Circular Progress */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="hsl(var(--savings))"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - overallProgress / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{Math.round(overallProgress)}%</p>
                  <p className="text-xs text-muted-foreground">Overall</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">₹{totalSavings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">of ₹{totalTargets.toLocaleString()} goal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Goals */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Savings Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {savingsGoals.map((goal) => {
              const progress = (goal.current / goal.target) * 100;
              const isCompleted = progress >= 100;
              
              return (
                <div key={goal.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{goal.name}</h3>
                      {isCompleted && (
                        <Badge variant="outline" className="text-success border-success">
                          <Award className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()}
                    </p>
                  </div>
                  <Progress 
                    value={Math.min(progress, 100)} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
                    <span className="text-muted-foreground">
                      ₹{(goal.target - goal.current).toLocaleString()} remaining
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Savings Trend */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Monthly Savings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsTrend}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  className="text-xs text-muted-foreground"
                />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--savings))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--savings))', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: 'hsl(var(--savings))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Savings Tips */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Savings Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savingsTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <div className="w-6 h-6 rounded-full bg-savings/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-savings">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};