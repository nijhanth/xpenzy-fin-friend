import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Plus, Bell, Calendar, CreditCard, IndianRupee, Clock } from 'lucide-react';

const mockNotes = [
  {
    title: "Pay Electricity Bill",
    amount: 1850,
    dueDate: "Dec 25, 2024",
    category: "Bills",
    priority: "high",
    isCompleted: false,
    reminder: "3 days before"
  },
  {
    title: "EMI - Home Loan",
    amount: 25000,
    dueDate: "Dec 30, 2024",
    category: "EMI",
    priority: "high",
    isCompleted: false,
    reminder: "1 week before"
  },
  {
    title: "Netflix Subscription",
    amount: 799,
    dueDate: "Jan 5, 2025",
    category: "Subscription",
    priority: "low",
    isCompleted: false,
    reminder: "1 day before"
  },
  {
    title: "Credit Card Payment",
    amount: 8500,
    dueDate: "Dec 20, 2024",
    category: "Bills",
    priority: "medium",
    isCompleted: true,
    reminder: "3 days before"
  }
];

const categories = [
  { name: "Bills", count: 3, color: "bg-red-500" },
  { name: "EMI", count: 1, color: "bg-blue-500" },
  { name: "Subscription", count: 2, color: "bg-purple-500" },
  { name: "Insurance", count: 1, color: "bg-green-500" }
];

export const Notes = () => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const upcomingNotes = mockNotes.filter(note => !note.isCompleted);
  const completedNotes = mockNotes.filter(note => note.isCompleted);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes & Reminders</h1>
          <p className="text-muted-foreground">Keep track of bills and payments</p>
        </div>
        <Button className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${category.color}`} />
                  <span className="font-medium">{category.name}</span>
                </div>
                <Badge variant="secondary">{category.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Upcoming ({upcomingNotes.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              This Week
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingNotes.map((note, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{note.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getPriorityColor(note.priority)}>
                        {note.priority}
                      </Badge>
                      <Badge variant="outline">{note.category}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <IndianRupee className="w-4 h-4" />
                      <span>{note.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {note.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Remind: {note.reminder}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Mark Complete</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completed */}
      {completedNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <StickyNote className="w-5 h-5" />
              Completed ({completedNotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedNotes.map((note, index) => (
                <div key={index} className="border border-border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium line-through">{note.title}</h3>
                      <Badge variant="outline" className="mt-1">{note.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <IndianRupee className="w-4 h-4" />
                      <span>{note.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};