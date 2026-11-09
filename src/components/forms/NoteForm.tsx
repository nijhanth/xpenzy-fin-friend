import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteFormProps {
  onSubmit: (note: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const categories = ['Bills', 'EMI', 'Subscription', 'Insurance', 'Tax', 'Other'];
const priorities = ['low', 'medium', 'high'];
const reminders = ['1 day before', '3 days before', '1 week before', '2 weeks before'];

export const NoteForm = ({ onSubmit, onCancel, initialData }: NoteFormProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount || '',
    due_date: initialData?.due_date ? new Date(initialData.due_date) : new Date(),
    category: initialData?.category || 'Other',
    priority: initialData?.priority || 'medium',
    reminder: initialData?.reminder || '3 days before',
    notes: initialData?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!formData.category) return;

    setSaving(true);
    try {
      await onSubmit({
      ...formData,
      amount,
      due_date: format(formData.due_date, 'yyyy-MM-dd'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 max-h-[calc(100dvh-6rem)] flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          className="min-h-11"
          placeholder="e.g., Pay Electricity Bill"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          className="min-h-11"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'min-h-11 w-full justify-start text-left font-normal',
                !formData.due_date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.due_date ? formatDisplayDate(formData.due_date) : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-[320px] p-0 sm:w-auto">
            <Calendar
              mode="single"
              selected={formData.due_date}
              onSelect={(date) => date && setFormData({ ...formData, due_date: date })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminder">Reminder</Label>
        <Select value={formData.reminder} onValueChange={(value) => setFormData({ ...formData, reminder: value })}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reminders.map((reminder) => (
              <SelectItem key={reminder} value={reminder}>
                {reminder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          className="min-h-24"
          placeholder="Add any additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
      </div>

      <div className="sticky bottom-0 flex shrink-0 gap-2 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:gap-3 sm:px-5">
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-11 flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !formData.category || !formData.amount || Number(formData.amount) <= 0} className="min-h-11 flex-1 bg-gradient-primary">
          {saving ? 'Saving…' : initialData ? 'Save changes' : 'Save reminder'}
        </Button>
      </div>
    </form>
  );
};
