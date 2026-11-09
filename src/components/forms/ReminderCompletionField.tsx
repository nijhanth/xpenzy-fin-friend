import { useEffect, useState } from 'react';
import { database } from '@/lib/database';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ReminderOption = { id: string; title: string; amount: number | string; is_completed: boolean };

const formatAmount = (amount: number | string) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);

export const ReminderCompletionField = ({
  value,
  onChange,
  disabled = false,
  refreshKey,
  completionMode = 'offer',
  excludedReminderIds,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  refreshKey?: string | boolean;
  completionMode?: 'complete' | 'offer';
  excludedReminderIds?: ReadonlySet<string>;
}) => {
  const [reminders, setReminders] = useState<ReminderOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void database.notes.getAll().then((items) => {
      if (!cancelled) {
        setReminders(items.filter((item) => item.id === value || !excludedReminderIds?.has(item.id)));
      }
    }).catch((error) => console.error('Could not load reminders for transaction:', error));
    return () => { cancelled = true; };
  }, [refreshKey, value, excludedReminderIds]);

  if (!reminders.length) return null;

  return (
    <div className="space-y-2">
      <Label>Related reminder (optional)</Label>
      <Select value={value || 'none'} onValueChange={(next) => onChange(next === 'none' ? '' : next)} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder="Choose a reminder" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No related reminder</SelectItem>
          {reminders.map((reminder) => (
            <SelectItem key={reminder.id} value={reminder.id}>
              {reminder.title} · {formatAmount(reminder.amount)} · {reminder.is_completed ? 'Completed' : 'Active'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {completionMode === 'complete'
          ? 'Saving this expense will mark the selected reminder complete.'
          : 'After saving, you can mark the selected reminder complete.'}
      </p>
    </div>
  );
};
