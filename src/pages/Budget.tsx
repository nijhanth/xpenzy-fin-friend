import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  spent: number;
  icon: string;
}

export const Budget = () => {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<BudgetCategory[]>([
    { id: '1', name: 'Food & Dining', limit: 5000, spent: 3200, icon: '🍽️' },
    { id: '2', name: 'Transportation', limit: 3000, spent: 2800, icon: '🚗' },
    { id: '3', name: 'Shopping', limit: 2000, spent: 800, icon: '🛍️' },
    { id: '4', name: 'Entertainment', limit: 1500, spent: 1200, icon: '🎬' },
    { id: '5', name: 'Bills & Utilities', limit: 4000, spent: 3500, icon: '⚡' },
  ]);

  const [newBudget, setNewBudget] = useState({
    name: '',
    limit: '',
    icon: '💰'
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleAddBudget = () => {
    if (!newBudget.name || !newBudget.limit) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const budget: BudgetCategory = {
      id: Date.now().toString(),
      name: newBudget.name,
      limit: parseFloat(newBudget.limit),
      spent: 0,
      icon: newBudget.icon
    };

    setBudgets([...budgets, budget]);
    setNewBudget({ name: '', limit: '', icon: '💰' });
    setIsDialogOpen(false);
    
    toast({
      title: "Budget Added",
      description: `Budget for ${newBudget.name} has been created`,
    });
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const remainingBudget = totalBudget - totalSpent;

  return (
    <div className="p-4 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Add Budget Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Category Budgets</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle>Add New Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category Name</Label>
                <Input
                  id="category"
                  value={newBudget.name}
                  onChange={(e) => setNewBudget({...newBudget, name: e.target.value})}
                  placeholder="e.g., Food & Dining"
                />
              </div>
              <div>
                <Label htmlFor="limit">Monthly Limit (₹)</Label>
                <Input
                  id="limit"
                  type="number"
                  value={newBudget.limit}
                  onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select value={newBudget.icon} onValueChange={(value) => setNewBudget({...newBudget, icon: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="🍽️">🍽️ Food</SelectItem>
                    <SelectItem value="🚗">🚗 Transport</SelectItem>
                    <SelectItem value="🛍️">🛍️ Shopping</SelectItem>
                    <SelectItem value="🎬">🎬 Entertainment</SelectItem>
                    <SelectItem value="⚡">⚡ Bills</SelectItem>
                    <SelectItem value="🏥">🏥 Healthcare</SelectItem>
                    <SelectItem value="🎓">🎓 Education</SelectItem>
                    <SelectItem value="💰">💰 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddBudget} className="w-full">
                Add Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Categories */}
      <div className="space-y-4">
        {budgets.map((budget) => {
          const progressPercentage = getProgressPercentage(budget.spent, budget.limit);
          const remaining = budget.limit - budget.spent;
          
          return (
            <Card key={budget.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{budget.icon}</span>
                      <div>
                        <h3 className="font-medium">{budget.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ₹{budget.spent.toLocaleString()} of ₹{budget.limit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(budget.spent, budget.limit)}
                      <Badge 
                        variant={progressPercentage >= 100 ? "destructive" : progressPercentage >= 80 ? "secondary" : "default"}
                      >
                        {progressPercentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <Progress 
                    value={progressPercentage} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-sm">
                    <span className={getStatusColor(budget.spent, budget.limit)}>
                      {remaining >= 0 ? `₹${remaining.toLocaleString()} remaining` : `₹${Math.abs(remaining).toLocaleString()} over budget`}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100)}% of month passed
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧠 AI Budget Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • You're spending 15% more on Food this month compared to last month
            </p>
            <p className="text-sm text-muted-foreground">
              • Transportation budget is almost exhausted. Consider using public transport
            </p>
            <p className="text-sm text-muted-foreground">
              • Great job! You're under budget for Shopping and Entertainment
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};