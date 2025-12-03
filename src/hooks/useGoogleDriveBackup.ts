import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  displayName?: string;
}

interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

export const useGoogleDriveBackup = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<GoogleDriveStatus>({ connected: false });
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [providerToken, setProviderToken] = useState<string | null>(null);

  // Get provider token from session
  useEffect(() => {
    if (session?.provider_token) {
      setProviderToken(session.provider_token);
    }
  }, [session]);

  const connectGoogleDrive = useCallback(async () => {
    try {
      setLoading(true);
      
      // Sign in with Google with additional scopes for Drive
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.file',
          redirectTo: `${window.location.origin}/app`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
      
    } catch (error: any) {
      console.error('Failed to connect Google Drive:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Google Drive",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkConnection = useCallback(async () => {
    if (!user || !providerToken) {
      setStatus({ connected: false });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-drive-backup', {
        body: { action: 'check' },
        headers: {
          'x-provider-token': providerToken,
        },
      });

      if (error) throw error;

      setStatus({
        connected: data.connected,
        email: data.email,
        displayName: data.displayName,
      });
      
    } catch (error: any) {
      console.error('Failed to check Google Drive connection:', error);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, [user, providerToken]);

  const listBackups = useCallback(async () => {
    if (!user || !providerToken) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-drive-backup', {
        body: { action: 'list' },
        headers: {
          'x-provider-token': providerToken,
        },
      });

      if (error) throw error;

      setBackups(data.backups || []);
      
    } catch (error: any) {
      console.error('Failed to list backups:', error);
      toast({
        title: "Error",
        description: "Could not fetch backup list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, providerToken, toast]);

  const uploadBackup = useCallback(async () => {
    if (!user || !providerToken) {
      toast({
        title: "Not Connected",
        description: "Please connect Google Drive first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);
      
      // Gather all user data for backup
      const backupData = await database.dataExport.exportAllData();
      
      const { data, error } = await supabase.functions.invoke('google-drive-backup', {
        body: { 
          action: 'upload',
          backupData,
        },
        headers: {
          'x-provider-token': providerToken,
        },
      });

      if (error) throw error;

      toast({
        title: "Backup Complete",
        description: `Saved to Google Drive: ${data.fileName}`,
      });
      
      // Refresh backup list
      await listBackups();
      
      return data;
      
    } catch (error: any) {
      console.error('Failed to upload backup:', error);
      toast({
        title: "Backup Failed",
        description: error.message || "Could not upload backup to Google Drive",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }, [user, providerToken, toast, listBackups]);

  const downloadBackup = useCallback(async (fileId: string) => {
    if (!user || !providerToken) return null;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-drive-backup', {
        body: { 
          action: 'download',
          fileId,
        },
        headers: {
          'x-provider-token': providerToken,
        },
      });

      if (error) throw error;

      toast({
        title: "Download Complete",
        description: "Backup data retrieved successfully",
      });
      
      return data.data;
      
    } catch (error: any) {
      console.error('Failed to download backup:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Could not download backup",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, providerToken, toast]);

  // Check connection when provider token changes
  useEffect(() => {
    if (providerToken) {
      checkConnection();
    }
  }, [providerToken, checkConnection]);

  return {
    status,
    backups,
    loading,
    syncing,
    hasProviderToken: !!providerToken,
    connectGoogleDrive,
    checkConnection,
    listBackups,
    uploadBackup,
    downloadBackup,
  };
};
