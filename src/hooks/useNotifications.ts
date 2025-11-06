import { useEffect, useState } from 'react';
import { database } from '@/lib/database';

export interface NotificationPreferences {
  push_notifications: boolean;
  weekly_reports: boolean;
  budget_alerts: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_notifications: true,
    weekly_reports: true,
    budget_alerts: true,
  });

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load user preferences
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await database.userPreferences.get();
      if (prefs) {
        setPreferences({
          push_notifications: prefs.push_notifications,
          weekly_reports: prefs.weekly_reports,
          budget_alerts: prefs.budget_alerts,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }

    return false;
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    // Check if user has enabled push notifications
    if (!preferences.push_notifications) {
      return;
    }

    // Request permission if not already granted
    const hasPermission = await requestPermission();
    
    if (hasPermission && 'Notification' in window) {
      try {
        new Notification(title, {
          icon: '/lovable-uploads/e88aa1f4-0c35-4871-9992-7efea8c237ed.png',
          badge: '/lovable-uploads/e88aa1f4-0c35-4871-9992-7efea8c237ed.png',
          ...options,
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  return {
    permission,
    preferences,
    requestPermission,
    showNotification,
    loadPreferences,
  };
};
