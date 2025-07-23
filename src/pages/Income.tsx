import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Plus, TrendingUp, Calendar, DollarSign, Tag, BarChart3, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { useToast } from '@/hooks/use-toast';

export const Income = () => {
  const { data } = useFinancial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const totalIncome = data.income.reduce((sum, entry) => sum + entry.amount, 0);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const { deleteIncome } = useFinancial();
  const { toast } = useToast();

  // Generate category data from actual income entries
  const categoryData = useMemo(() => {
    const categories = data.income.reduce((acc, entry) => {
      const category = entry.category;
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      color: 'hsl(var(--income))'
    }));
  }, [data.income]);

  // Generate growth data based on monthly income
  const growthData = useMemo(() => {
    const monthlyData = data.income.reduce((acc, entry) => {
      const month = new Date(entry.date).toLocaleDateString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));
  }, [data.income]);

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    await deleteIncome(entryId);
    toast({
      title: "Income Deleted",
      description: "Income entry has been successfully deleted."
    });
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Income Tracker</h1>
          <p className="text-sm text-muted-foreground">Total: ₹{totalIncome.toLocaleString()}</p>
        </div>
        <Button className="bg-gradient-income" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Income
        </Button>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Income by Category Bar Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Income by Category
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <XAxis 
                      dataKey="category" 
                      axisLine={false} 
                      tickLine={false}
                      className="text-xs text-muted-foreground"
                    />
                    <YAxis hide />
                    <Bar 
                      dataKey="amount" 
                      radius={[8, 8, 0, 0]}
                      fill="hsl(var(--income))"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No income data available</p>
                  <p className="text-sm">Add your first income entry to see the chart</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Growth Line Chart */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Income Growth Trend
            </CardTitle>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
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
                      dataKey="amount" 
                      stroke="hsl(var(--income))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--income))', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: 'hsl(var(--income))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No trend data available</p>
                  <p className="text-sm">Add income entries to see growth trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Entries List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Recent Income Entries
          </CardTitle>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </CardHeader>
        <CardContent>
          {data.income.length > 0 ? (
            <div className="space-y-4">
              {data.income.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {entry.paymentMode}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground">₹{entry.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <EditDeleteMenu
                      onEdit={() => handleEdit(entry.id)}
                      onDelete={() => handleDelete(entry.id)}
                      itemName="income entry"
                      deleteTitle="Delete Income Entry"
                      deleteDescription="Are you sure you want to delete this income entry? This action cannot be undone."
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Income Entries</h3>
              <p className="text-sm mb-4">Start tracking your income by adding your first entry</p>
              <Button onClick={() => setIsFormOpen(true)} className="bg-gradient-income">
                <Plus className="w-4 h-4 mr-2" />
                Add First Income
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <IncomeForm 
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