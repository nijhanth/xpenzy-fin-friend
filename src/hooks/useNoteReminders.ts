import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { database } from '@/lib/database';
import { useNotifications } from './useNotifications';

export const useNoteReminders = () => {
  const { showNotification } = useNotifications();

  useEffect(() => {
    // Check for note reminders every minute
    const checkReminders = async () => {
      try {
        // Check if user is authenticated first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Skip if not authenticated
        
        const notes = await database.notes.getAll();
        const now = new Date();
        
        notes.forEach((note) => {
          if (note.is_completed || !note.reminder) {
            return;
          }

          const dueDate = new Date(note.due_date);
          const reminderDate = new Date(dueDate);

          // Calculate reminder time based on reminder type
          switch (note.reminder) {
            case '1day':
              reminderDate.setDate(reminderDate.getDate() - 1);
              break;
            case '3days':
              reminderDate.setDate(reminderDate.getDate() - 3);
              break;
            case '1week':
              reminderDate.setDate(reminderDate.getDate() - 7);
              break;
            case 'sameday':
            default:
              // Same day, set to 9 AM
              reminderDate.setHours(9, 0, 0, 0);
              break;
          }

          // Check if reminder time is within the current minute
          const timeDiff = reminderDate.getTime() - now.getTime();
          const isWithinCurrentMinute = timeDiff > 0 && timeDiff < 60000; // 60 seconds

          if (isWithinCurrentMinute) {
            showNotification('Note Reminder', {
              body: `${note.title} - Due on ${dueDate.toLocaleDateString()}`,
              tag: `note-${note.id}`,
            });
          }
        });
      } catch (error) {
        console.error('Error checking note reminders:', error);
      }
    };

    // Check immediately
    checkReminders();

    // Check every minute
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [showNotification]);
};
