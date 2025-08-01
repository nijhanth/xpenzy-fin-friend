
import { useState, useMemo } from 'react';
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
import { useFinancial } from '@/contexts/FinancialContext';
import { BudgetCategory } from '@/types/financial';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';

export const Budget = () => {
  const { toast } = useToast();
  const { data, addBudget, updateBudget, deleteBudget } = useFinancial();

  const [newBudget, setNewBudget] = useState<{
    name: string;
    limit: string;
    icon: string;
    period: 'monthly' | 'weekly' | 'yearly';
  }>({
    name: '',
    limit: '',
    icon: '💰',
    period: 'monthly'
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetCategory | null>(null);

  // Calculate spent amounts from real expense data automatically
  const budgetsWithRealSpent = useMemo(() => {
    return data.budgets.map(budget => {
      // Calculate spent from actual expenses matching this budget category
      const spent = data.expenses
        .filter(expense => expense.category === budget.name)
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      return {
        ...budget,
        spent
      };
    });
  }, [data.budgets, data.expenses]);

  // Calculate expenses that don't have budgets (Others/Unbudgeted)
  const unbudgetedExpenses = useMemo(() => {
    const budgetCategoryNames = data.budgets.map(b => b.name);
    return data.expenses
      .filter(expense => !budgetCategoryNames.includes(expense.category))
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [data.budgets, data.expenses]);

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

    // Calculate current spending for this category
    const currentSpent = data.expenses
      .filter(expense => expense.category === newBudget.name)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const budgetData: Omit<BudgetCategory, 'id'> = {
      name: newBudget.name,
      limit: parseFloat(newBudget.limit),
      spent: currentSpent, // Set actual spent amount
      icon: newBudget.icon,
      period: newBudget.period
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
      toast({
        title: "Budget Updated",
        description: `Budget for ${newBudget.name} has been updated`,
      });
      setEditingBudget(null);
    } else {
      addBudget(budgetData);
      toast({
        title: "Budget Added",
        description: `Budget for ${newBudget.name} has been created with current spending of ₹${currentSpent.toLocaleString()}`,
      });
    }
    
    setNewBudget({ name: '', limit: '', icon: '💰', period: 'monthly' });
    setIsDialogOpen(false);
  };

  const handleEditBudget = (budget: BudgetCategory) => {
    setEditingBudget(budget);
    setNewBudget({
      name: budget.name,
      limit: budget.limit.toString(),
      icon: budget.icon,
      period: budget.period
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

  const totalBudget = budgetsWithRealSpent.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgetsWithRealSpent.reduce((sum, budget) => sum + budget.spent, 0);
  const remainingBudget = totalBudget - totalSpent;

  return (
    <div className="p-4 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unbudgeted</p>
                <p className="text-2xl font-bold text-orange-500">₹{unbudgetedExpenses.toLocaleString()}</p>
              </div>
              <div className="text-3xl">📊</div>
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
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add New Budget'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category Name</Label>
                <Input
                  id="category"
                  value={newBudget.name}
                  onChange={(e) => setNewBudget({...newBudget, name: e.target.value})}
                  placeholder="e.g., Petrol, Groceries, Entertainment"
                />
              </div>
              <div>
                <Label htmlFor="limit">Budget Limit (₹)</Label>
                <Input
                  id="limit"
                  type="number"
                  value={newBudget.limit}
                  onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                  placeholder="5000"
                />
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
              <Button onClick={handleAddBudget} className="w-full">
                {editingBudget ? 'Update Budget' : 'Add Budget'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Categories */}
      <div className="space-y-4">
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
                          <Badge variant="outline" className="text-xs mt-1">
                            {budget.period}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(budget.spent, budget.limit)}
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
                      <span className={getStatusColor(budget.spent, budget.limit)}>
                        {remaining >= 0 ? `₹${remaining.toLocaleString()} remaining` : `₹${Math.abs(remaining).toLocaleString()} over budget`}
                      </span>
                      <span className="text-muted-foreground">
                        Auto-updated from expenses
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

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔄 Budget Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Budget categories automatically appear in expense forms
            </p>
            <p className="text-sm text-muted-foreground">
              • Spent amounts are calculated from your actual expenses
            </p>
            <p className="text-sm text-muted-foreground">
              • Expenses without matching budgets are classified as "Others"
            </p>
            <p className="text-sm text-muted-foreground">
              • Budget status updates in real-time when you add expenses
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
