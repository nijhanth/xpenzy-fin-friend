import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  app_lock: boolean;
  biometric_auth: boolean;
  auto_lock: boolean;
  auto_lock_timeout: number;
  cloud_sync: boolean;
  two_factor_enabled: boolean;
  security_alerts: boolean;
  last_backup_local: string | null;
  last_backup_cloud: string | null;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  app_lock: true,
  biometric_auth: false,
  auto_lock: true,
  auto_lock_timeout: 300,
  cloud_sync: true,
  two_factor_enabled: false,
  security_alerts: true,
  last_backup_local: null,
  last_backup_cloud: null,
};

const STORAGE_KEY = 'xpenzy_security_settings';

export const useSecuritySettings = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const storageKey = `${STORAGE_KEY}_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem(storageKey, JSON.stringify(DEFAULT_SETTINGS));
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_SETTINGS));
    }
    
    setLoading(false);
  }, [user, authLoading]);

  const updateSetting = <K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    if (!user || !settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newSettings));
    
    toast({
      title: "Settings updated",
      description: "Your security settings have been saved.",
    });
  };

  const updateBackupTimestamp = (type: 'local' | 'cloud') => {
    if (!user || !settings) return;

    const field = type === 'local' ? 'last_backup_local' : 'last_backup_cloud';
    updateSetting(field, new Date().toISOString());
  };

  return {
    settings,
    loading: loading || authLoading,
    updateSetting,
    updateBackupTimestamp,
  };
};
