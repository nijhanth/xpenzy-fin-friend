import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleDriveBackup } from '@/hooks/useGoogleDriveBackup';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useToast } from '@/hooks/use-toast';

const LAST_SYNC_KEY = 'xpenzy_last_cloud_sync';
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

export const useCloudSync = () => {
  const { user } = useAuth();
  const { settings, updateSetting, updateBackupTimestamp } = useSecuritySettings();
  const { status, uploadBackup, syncing, hasProviderToken } = useGoogleDriveBackup();
  const { toast } = useToast();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getLastSyncKey = useCallback(() => {
    return user ? `${LAST_SYNC_KEY}_${user.id}` : null;
  }, [user]);

  // Load last sync time
  useEffect(() => {
    const key = getLastSyncKey();
    if (key) {
      const stored = localStorage.getItem(key);
      if (stored) {
        setLastSyncTime(new Date(stored));
      }
    }
  }, [getLastSyncKey]);

  const performSync = useCallback(async (silent = false) => {
    if (!status.connected || !hasProviderToken || syncing) {
      if (!silent) {
        toast({
          title: "Sync Not Available",
          description: "Please connect Google Drive first",
          variant: "destructive",
        });
      }
      return false;
    }

    try {
      await uploadBackup();
      const now = new Date();
      setLastSyncTime(now);
      
      const key = getLastSyncKey();
      if (key) {
        localStorage.setItem(key, now.toISOString());
      }
      
      updateBackupTimestamp('cloud');
      
      if (!silent) {
        toast({
          title: "Sync Complete",
          description: "Your data has been synced to Google Drive",
        });
      }
      
      return true;
    } catch (error) {
      if (!silent) {
        toast({
          title: "Sync Failed",
          description: "Could not sync data to cloud",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [status.connected, hasProviderToken, syncing, uploadBackup, getLastSyncKey, updateBackupTimestamp, toast]);

  // Auto-sync when cloud_sync is enabled
  useEffect(() => {
    if (!settings?.cloud_sync || !status.connected || !hasProviderToken) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Check if we should sync (hasn't synced in the last interval)
    const shouldSync = () => {
      if (!lastSyncTime) return true;
      return Date.now() - lastSyncTime.getTime() > SYNC_INTERVAL;
    };

    // Initial sync check
    if (shouldSync()) {
      performSync(true);
    }

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      if (shouldSync()) {
        performSync(true);
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [settings?.cloud_sync, status.connected, hasProviderToken, lastSyncTime, performSync]);

  const enableCloudSync = useCallback(async () => {
    if (!status.connected) {
      toast({
        title: "Connect Google Drive",
        description: "Please connect Google Drive first to enable cloud sync",
        variant: "destructive",
      });
      return false;
    }

    updateSetting('cloud_sync', true);
    
    // Perform initial sync
    const success = await performSync(false);
    
    if (!success) {
      updateSetting('cloud_sync', false);
    }
    
    return success;
  }, [status.connected, updateSetting, performSync, toast]);

  const disableCloudSync = useCallback(() => {
    updateSetting('cloud_sync', false);
    
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    toast({
      title: "Cloud Sync Disabled",
      description: "Automatic syncing has been turned off",
    });
  }, [updateSetting, toast]);

  const getTimeSinceLastSync = useCallback(() => {
    if (!lastSyncTime) return 'Never';
    
    const diff = Date.now() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }, [lastSyncTime]);

  return {
    isEnabled: settings?.cloud_sync ?? false,
    isConnected: status.connected,
    isSyncing: syncing,
    lastSyncTime,
    enableCloudSync,
    disableCloudSync,
    performSync,
    getTimeSinceLastSync,
  };
};
