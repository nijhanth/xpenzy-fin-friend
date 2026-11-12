import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  app_lock: boolean;
  biometric_auth: boolean;
  auto_lock: boolean;
  auto_lock_timeout: number;
  two_factor_enabled: boolean;
  security_alerts: boolean;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  app_lock: true,
  biometric_auth: false,
  auto_lock: true,
  auto_lock_timeout: 300,
  two_factor_enabled: false,
  security_alerts: true,
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
        const storedSettings = JSON.parse(stored) as Partial<SecuritySettings> & {
          cloud_sync?: boolean;
          last_backup_cloud?: string | null;
          last_backup_local?: string | null;
        };
        delete storedSettings.cloud_sync;
        delete storedSettings.last_backup_cloud;
        delete storedSettings.last_backup_local;
        const nextSettings = { ...DEFAULT_SETTINGS, ...storedSettings };
        setSettings(nextSettings);
        localStorage.setItem(storageKey, JSON.stringify(nextSettings));
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

  return {
    settings,
    loading: loading || authLoading,
    updateSetting,
  };
};
