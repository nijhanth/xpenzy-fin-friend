import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  id?: string;
  user_id: string;
  app_lock: boolean;
  biometric_auth: boolean;
  auto_lock: boolean;
  auto_lock_timeout: number;
  cloud_sync: boolean;
  pin_hash: string | null;
  pin_salt: string | null;
  two_factor_enabled: boolean;
  security_alerts: boolean;
  last_backup_local: string | null;
  last_backup_cloud: string | null;
}

const DEFAULT_SETTINGS: Omit<SecuritySettings, 'id' | 'user_id'> = {
  app_lock: true,
  biometric_auth: false,
  auto_lock: true,
  auto_lock_timeout: 300,
  cloud_sync: true,
  pin_hash: null,
  pin_salt: null,
  two_factor_enabled: false,
  security_alerts: true,
  last_backup_local: null,
  last_backup_cloud: null,
};

export const useSecuritySettings = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch settings only when user is authenticated
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    fetchSettings();
  }, [user, authLoading]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default settings for new user
        const newSettings = {
          ...DEFAULT_SETTINGS,
          user_id: user.id,
        };
        
        const { data: created, error: createError } = await supabase
          .from('security_settings')
          .insert(newSettings)
          .select()
          .single();

        if (createError) throw createError;
        setSettings(created);
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
      // Only show error if it's not a "table doesn't exist" error
      if (!error?.message?.includes('does not exist')) {
        toast({
          variant: "destructive",
          title: "Error loading settings",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof Omit<SecuritySettings, 'id' | 'user_id'>>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from('security_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      
      toast({
        title: "Settings updated",
        description: "Your security settings have been saved.",
      });
    } catch (error: any) {
      console.error('Error updating security settings:', error);
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: error.message,
      });
    }
  };

  const updateBackupTimestamp = async (type: 'local' | 'cloud') => {
    if (!user || !settings) return;

    const field = type === 'local' ? 'last_backup_local' : 'last_backup_cloud';
    const timestamp = new Date().toISOString();

    await updateSetting(field, timestamp);
  };

  return {
    settings,
    loading: loading || authLoading,
    updateSetting,
    updateBackupTimestamp,
    refetch: fetchSettings,
  };
};
