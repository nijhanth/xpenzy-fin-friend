import { toast } from 'sonner';
import { database } from '@/lib/database';

export const offerReminderCompletion = async (reminderId: string) => {
  if (!reminderId) return;
  try {
    const reminder = (await database.notes.getAll()).find((item) => item.id === reminderId && !item.is_completed);
    if (!reminder) return;

    toast(`Transaction saved for ${reminder.title}`, {
      description: 'Would you like to mark this reminder complete?',
      duration: 3000,
      action: {
        label: 'Mark complete',
        onClick: () => {
          void database.notes.markComplete(reminder.id, true).then(() => {
            toast.success('Reminder marked complete');
          }).catch((error) => {
            toast.error('Could not complete reminder', { description: error instanceof Error ? error.message : 'Please try again.' });
          });
        },
      },
    });
  } catch (error) {
    console.error('Could not offer reminder completion:', error);
  }
};

export const completeLinkedReminder = async (reminderId: string) => {
  if (!reminderId) return;
  try {
    const reminder = (await database.notes.getAll()).find((item) => item.id === reminderId);
    if (reminder?.is_completed) {
      toast.success('Expense saved; linked reminder is already complete');
      return;
    }
    await database.notes.markComplete(reminderId, true);
    toast.success('Expense saved and reminder marked complete');
  } catch (error) {
    toast.error('Expense saved, but the reminder could not be completed', {
      description: error instanceof Error ? error.message : 'Please mark it complete from Notes & Reminders.',
    });
  }
};
