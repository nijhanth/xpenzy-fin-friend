import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { PiggyBank, Target, Plus, TrendingUp, Award, BarChart3, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { SavingsForm } from '@/components/forms/SavingsForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';

const savingsTips = [
  "Set up automatic transfers to your savings account",
  "Use the 50/30/20 budgeting rule",
  "Cut down on subscription services you don't use",
  "Cook more meals at home instead of ordering out",
  "Compare prices before making big purchases"
];

export const Savings = () => {
  const { data } = useFinancial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const { deleteSavings } = useFinancial();
  const { toast } = useToast();
  
  const totalSavings = data.savings.reduce((sum, goal) => sum + goal.current, 0);
  const totalTargets = data.savings.reduce((sum, goal) => sum + goal.target, 0);
  const overallProgress = totalTargets > 0 ? (totalSavings / totalTargets) * 100 : 0;

  // Generate savings trend from monthly data
  const savingsTrend = useMemo(() => {
    const monthlyData = data.savings.reduce((acc, goal) => {
      const month = new Date(goal.date).toLocaleDateString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + goal.current;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));
  }, [data.savings]);

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    await deleteSavings(entryId);
    toast({
      title: "Savings Goal Deleted",
      description: "Savings goal has been successfully deleted."
    });
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Savings Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalSavings.toLocaleString()}</p>
        </div>
        <Button className="bg-savings text-white" onClick={() => setIsFormOpen(true)}>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Savings Goals
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {data.savings.length > 0 ? (
            <div className="space-y-6">
              {data.savings.map((goal) => {
                const progress = (goal.current / goal.target) * 100;
                const isCompleted = progress >= 100;
                
                return (
                  <div key={goal.id} className="space-y-3 p-4 rounded-xl bg-background/50 border border-border/50">
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          ₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()}
                        </p>
                        <EditDeleteMenu
                          onEdit={() => handleEdit(goal.id)}
                          onDelete={() => handleDelete(goal.id)}
                          itemName="savings goal"
                          deleteTitle="Delete Savings Goal"
                          deleteDescription="Are you sure you want to delete this savings goal? This action cannot be undone."
                        />
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
                      <span className="text-muted-foreground">
                        ₹{Math.max(0, goal.target - goal.current).toLocaleString()} remaining
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Savings Goals</h3>
              <p className="text-sm mb-4">Set your first savings goal to start tracking progress</p>
              <Button onClick={() => setIsFormOpen(true)} className="bg-savings text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add First Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Trend */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Savings Goal Trend
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {savingsTrend.length > 0 ? (
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
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No savings trend available</p>
                <p className="text-sm">Add savings goals to see trends</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Tips */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Savings Tips
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
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
      
      <SavingsForm 
        open={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(null);
        }}
        editingId={editingEntry}
      />
    </div>
  );
};