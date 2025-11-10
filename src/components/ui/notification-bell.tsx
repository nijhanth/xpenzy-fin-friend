import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useNoteReminders } from '@/hooks/useNoteReminders';
import { toast } from 'sonner';

export const NotificationBell = () => {
  const { permission, requestPermission, showNotification, preferences } = useNotifications();
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Initialize note reminders hook
  useNoteReminders();

  useEffect(() => {
    setIsEnabled(permission === 'granted' && preferences.push_notifications);
  }, [permission, preferences.push_notifications]);

  const handleClick = async () => {
    if (permission === 'granted') {
      // Show a test notification
      await showNotification('Xpenzy Notifications', {
        body: 'Notifications are enabled! You will receive alerts for reminders and important updates.',
        tag: 'test-notification',
        requireInteraction: false
      });
      toast.success('Notifications are enabled');
    } else if (permission === 'denied') {
      toast.error('Notifications are blocked. Please enable them in your browser settings.');
    } else {
      // Request permission
      const granted = await requestPermission();
      if (granted) {
        // Show welcome notification
        await showNotification('Xpenzy Notifications Enabled', {
          body: 'You will now receive notifications for reminders and important updates.',
          tag: 'welcome-notification',
          requireInteraction: false
        });
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Notification permission denied');
      }
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="rounded-full glass-card relative"
      onClick={handleClick}
      title={isEnabled ? 'Notifications enabled' : 'Enable notifications'}
    >
      {isEnabled ? (
        <Bell className="w-5 h-5 text-primary" />
      ) : (
        <BellOff className="w-5 h-5 text-muted-foreground" />
      )}
      {isEnabled && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </Button>
  );
};
