import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StickyNote, Plus, Bell, Calendar, IndianRupee, Clock, Loader2 } from 'lucide-react';
import { database } from '@/lib/database';
import { toast } from 'sonner';
import { NoteForm } from '@/components/forms/NoteForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { format } from 'date-fns';

export const Notes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await database.notes.getAll();
      setNotes(data);
    } catch (error: any) {
      toast.error('Failed to load notes', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (noteData: any) => {
    try {
      await database.notes.create(noteData);
      toast.success('Note added successfully');
      setShowAddDialog(false);
      loadNotes();
    } catch (error: any) {
      toast.error('Failed to add note', { description: error.message });
    }
  };

  const handleUpdateNote = async (noteData: any) => {
    try {
      await database.notes.update(editingNote.id, noteData);
      toast.success('Note updated successfully');
      setEditingNote(null);
      loadNotes();
    } catch (error: any) {
      toast.error('Failed to update note', { description: error.message });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await database.notes.delete(id);
      toast.success('Note deleted successfully');
      loadNotes();
    } catch (error: any) {
      toast.error('Failed to delete note', { description: error.message });
    }
  };

  const handleMarkComplete = async (id: string, isCompleted: boolean) => {
    try {
      await database.notes.markComplete(id, !isCompleted);
      toast.success(isCompleted ? 'Note marked as incomplete' : 'Note marked as complete');
      loadNotes();
    } catch (error: any) {
      toast.error('Failed to update note', { description: error.message });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const upcomingNotes = notes.filter(note => !note.is_completed);
  const completedNotes = notes.filter(note => note.is_completed);

  // Calculate category counts
  const categories = notes.reduce((acc: any[], note) => {
    const existing = acc.find(c => c.name === note.category);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: note.category, count: 1 });
    }
    return acc;
  }, []);

  const categoryColors = ['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes & Reminders</h1>
          <p className="text-muted-foreground">Keep track of bills and payments</p>
        </div>
        <Button className="bg-gradient-primary" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Categories Overview */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${categoryColors[index % categoryColors.length]}`} />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <Badge variant="secondary">{category.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Upcoming ({upcomingNotes.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No upcoming notes</p>
              <p className="text-sm">Add a note to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingNotes.map((note) => (
                <div key={note.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{note.title}</h3>
                        <EditDeleteMenu
                          onEdit={() => setEditingNote(note)}
                          onDelete={() => handleDeleteNote(note.id)}
                          itemName="note"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getPriorityColor(note.priority)}>
                          {note.priority}
                        </Badge>
                        <Badge variant="outline">{note.category}</Badge>
                      </div>
                      {note.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{note.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold">
                        <IndianRupee className="w-4 h-4" />
                        <span>{parseFloat(note.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {format(new Date(note.due_date), 'MMM dd, yyyy')}</span>
                      </div>
                      {note.reminder && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Remind: {note.reminder}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarkComplete(note.id, note.is_completed)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              {completedNotes.map((note) => (
                <div key={note.id} className="border border-border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium line-through">{note.title}</h3>
                        <EditDeleteMenu
                          onEdit={() => setEditingNote(note)}
                          onDelete={() => handleDeleteNote(note.id)}
                          itemName="note"
                        />
                      </div>
                      <Badge variant="outline" className="mt-1">{note.category}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <IndianRupee className="w-4 h-4" />
                        <span>{parseFloat(note.amount).toLocaleString()}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleMarkComplete(note.id, note.is_completed)}
                      >
                        Undo
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
          </DialogHeader>
          <NoteForm
            onSubmit={handleAddNote}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <NoteForm
            onSubmit={handleUpdateNote}
            onCancel={() => setEditingNote(null)}
            initialData={editingNote}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
