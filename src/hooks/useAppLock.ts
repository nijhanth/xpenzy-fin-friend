import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'xpenzy_app_lock';
const LOCK_STATE_KEY = 'xpenzy_lock_state';
const LAST_ACTIVITY_KEY = 'xpenzy_last_activity';

interface AppLockSettings {
  pin_hash: string | null;
  is_locked: boolean;
  auto_lock_timeout: number; // in seconds
}

// Simple hash function for PIN (in production, use a proper crypto library)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const useAppLock = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const getUserStorageKey = useCallback(() => {
    return user ? `${STORAGE_KEY}_${user.id}` : null;
  }, [user]);

  const getLockStateKey = useCallback(() => {
    return user ? `${LOCK_STATE_KEY}_${user.id}` : null;
  }, [user]);

  const getLastActivityKey = useCallback(() => {
    return user ? `${LAST_ACTIVITY_KEY}_${user.id}` : null;
  }, [user]);

  // Load lock settings
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLocked(false);
      setHasPin(false);
      setLoading(false);
      return;
    }

    const storageKey = getUserStorageKey();
    const lockStateKey = getLockStateKey();
    
    if (!storageKey || !lockStateKey) {
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem(storageKey);
    const lockState = localStorage.getItem(lockStateKey);
    
    if (stored) {
      try {
        const settings: AppLockSettings = JSON.parse(stored);
        setHasPin(!!settings.pin_hash);
        
        // Check if app should be locked
        if (settings.pin_hash && lockState === 'locked') {
          setIsLocked(true);
        }
      } catch {
        setHasPin(false);
      }
    }
    
    setLoading(false);
  }, [user, authLoading, getUserStorageKey, getLockStateKey]);

  // Auto-lock on inactivity
  useEffect(() => {
    if (!user || !hasPin) return;

    const storageKey = getUserStorageKey();
    const lastActivityKey = getLastActivityKey();
    const lockStateKey = getLockStateKey();
    
    if (!storageKey || !lastActivityKey || !lockStateKey) return;

    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    const settings: AppLockSettings = JSON.parse(stored);
    const timeout = settings.auto_lock_timeout || 300; // Default 5 minutes

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem(lastActivityKey);
      if (lastActivity) {
        const elapsed = (Date.now() - parseInt(lastActivity)) / 1000;
        if (elapsed > timeout && settings.pin_hash) {
          setIsLocked(true);
          localStorage.setItem(lockStateKey, 'locked');
        }
      }
    };

    const updateActivity = () => {
      localStorage.setItem(lastActivityKey, Date.now().toString());
    };

    // Initial activity timestamp
    updateActivity();

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check inactivity periodically
    const interval = setInterval(checkInactivity, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [user, hasPin, getUserStorageKey, getLastActivityKey, getLockStateKey]);

  const setupPin = useCallback((pin: string): boolean => {
    const storageKey = getUserStorageKey();
    const lockStateKey = getLockStateKey();
    
    if (!storageKey || !lockStateKey || pin.length !== 4) {
      toast({
        title: "Error",
        description: "PIN must be 4 digits",
        variant: "destructive",
      });
      return false;
    }

    try {
      const pinHash = hashPin(pin);
      const settings: AppLockSettings = {
        pin_hash: pinHash,
        is_locked: false,
        auto_lock_timeout: 300,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(settings));
      localStorage.setItem(lockStateKey, 'unlocked');
      setHasPin(true);
      
      toast({
        title: "PIN Set",
        description: "Your app lock PIN has been set successfully",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set PIN",
        variant: "destructive",
      });
      return false;
    }
  }, [getUserStorageKey, getLockStateKey, toast]);

  const verifyPin = useCallback((pin: string): boolean => {
    const storageKey = getUserStorageKey();
    const lockStateKey = getLockStateKey();
    const lastActivityKey = getLastActivityKey();
    
    if (!storageKey || !lockStateKey || !lastActivityKey) return false;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return false;

      const settings: AppLockSettings = JSON.parse(stored);
      const inputHash = hashPin(pin);
      
      if (inputHash === settings.pin_hash) {
        setIsLocked(false);
        localStorage.setItem(lockStateKey, 'unlocked');
        localStorage.setItem(lastActivityKey, Date.now().toString());
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }, [getUserStorageKey, getLockStateKey, getLastActivityKey]);

  const lockApp = useCallback(() => {
    const lockStateKey = getLockStateKey();
    if (lockStateKey && hasPin) {
      setIsLocked(true);
      localStorage.setItem(lockStateKey, 'locked');
    }
  }, [getLockStateKey, hasPin]);

  const removePin = useCallback(() => {
    const storageKey = getUserStorageKey();
    const lockStateKey = getLockStateKey();
    
    if (storageKey && lockStateKey) {
      localStorage.removeItem(storageKey);
      localStorage.setItem(lockStateKey, 'unlocked');
      setHasPin(false);
      setIsLocked(false);
      
      toast({
        title: "PIN Removed",
        description: "App lock has been disabled",
      });
    }
  }, [getUserStorageKey, getLockStateKey, toast]);

  const changePin = useCallback((oldPin: string, newPin: string): boolean => {
    if (!verifyPin(oldPin)) {
      toast({
        title: "Error",
        description: "Current PIN is incorrect",
        variant: "destructive",
      });
      return false;
    }
    
    return setupPin(newPin);
  }, [verifyPin, setupPin, toast]);

  return {
    isLocked,
    hasPin,
    loading: loading || authLoading,
    setupPin,
    verifyPin,
    lockApp,
    removePin,
    changePin,
  };
};
