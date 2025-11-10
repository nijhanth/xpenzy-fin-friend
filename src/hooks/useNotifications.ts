import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { database } from '@/lib/database';
import { showPushNotification, requestNotificationPermission } from '@/lib/pwa';

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
    const loadPrefs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
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
    
    loadPrefs();
  }, []);


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

    // Use PWA push notifications
    try {
      await showPushNotification(title, {
        body: options?.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: options?.tag,
        requireInteraction: options?.requireInteraction,
        ...options,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  return {
    permission,
    preferences,
    requestPermission,
    showNotification,
  };
};
