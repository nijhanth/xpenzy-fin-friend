import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle, Plus, IndianRupee } from 'lucide-react';

const mockGroupData = {
  groupName: "Family Expenses",
  members: [
    { name: "You", avatar: "👤", spending: 15000, color: "hsl(var(--primary))" },
    { name: "Partner", avatar: "👥", spending: 12000, color: "hsl(var(--secondary))" },
    { name: "Roommate", avatar: "🏠", spending: 8000, color: "hsl(var(--accent))" }
  ],
  recentExpenses: [
    { category: "Groceries", amount: 2500, paidBy: "You", date: "Today" },
    { category: "Electricity", amount: 1800, paidBy: "Partner", date: "Yesterday" },
    { category: "Internet", amount: 999, paidBy: "Roommate", date: "2 days ago" }
  ]
};

export const Group = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Group</h1>
          <p className="text-muted-foreground">{mockGroupData.groupName}</p>
        </div>
        <Button className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Members Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Members ({mockGroupData.members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {mockGroupData.members.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg">
                    {member.avatar}
                  </div>
                  <span className="font-medium">{member.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" />
                  <span className="font-semibold">{member.spending.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Group Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Group Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockGroupData.recentExpenses.map((expense, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <h3 className="font-medium">{expense.category}</h3>
                  <p className="text-sm text-muted-foreground">Paid by {expense.paidBy} • {expense.date}</p>
                </div>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" />
                  <span className="font-semibold">{expense.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Group Chat Quick Access */}
      <Card>
        <CardContent className="p-4">
          <Button className="w-full bg-gradient-primary" size="lg">
            <MessageCircle className="w-5 h-5 mr-2" />
            Open Group Chat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};