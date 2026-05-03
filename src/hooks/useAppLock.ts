import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'xpenzy_app_lock';
const LOCK_STATE_KEY = 'xpenzy_lock_state';
const LAST_ACTIVITY_KEY = 'xpenzy_last_activity';
const ATTEMPTS_KEY = 'xpenzy_lock_attempts';
const LOCKOUT_KEY = 'xpenzy_lock_lockout';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const PBKDF2_ITERATIONS = 100_000;

interface AppLockSettings {
  pin_hash: string | null;
  salt: string | null;
  is_locked: boolean;
  auto_lock_timeout: number; // seconds
}

const bytesToHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
};

const generateSalt = (): string => {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bytesToHex(arr.buffer);
};

const hashPin = async (pin: string, saltHex: string): Promise<string> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(bits);
};

export const useAppLock = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const getUserStorageKey = useCallback(() => (user ? `${STORAGE_KEY}_${user.id}` : null), [user]);
  const getLockStateKey = useCallback(() => (user ? `${LOCK_STATE_KEY}_${user.id}` : null), [user]);
  const getLastActivityKey = useCallback(() => (user ? `${LAST_ACTIVITY_KEY}_${user.id}` : null), [user]);
  const getAttemptsKey = useCallback(() => (user ? `${ATTEMPTS_KEY}_${user.id}` : null), [user]);
  const getLockoutKey = useCallback(() => (user ? `${LOCKOUT_KEY}_${user.id}` : null), [user]);

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
    const timeout = settings.auto_lock_timeout || 300;

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

    updateActivity();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity));
    const interval = setInterval(checkInactivity, 30000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [user, hasPin, getUserStorageKey, getLastActivityKey, getLockStateKey]);

  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    const storageKey = getUserStorageKey();
    const lockStateKey = getLockStateKey();

    if (!storageKey || !lockStateKey || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({
        title: 'Error',
        description: 'PIN must be 4 digits',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const salt = generateSalt();
      const pinHash = await hashPin(pin, salt);
      const settings: AppLockSettings = {
        pin_hash: pinHash,
        salt,
        is_locked: false,
        auto_lock_timeout: 300,
      };

      localStorage.setItem(storageKey, JSON.stringify(settings));
      localStorage.setItem(lockStateKey, 'unlocked');
      setHasPin(true);

      toast({
        title: 'PIN Set',
        description:
          'App Lock enabled. Note: this is convenience protection only and can be bypassed by someone with technical access to your device.',
      });

      return true;
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to set PIN',
        variant: 'destructive',
      });
      return false;
    }
  }, [getUserStorageKey, getLockStateKey, toast]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const storageKey = getUserStorageKey();
    const lockStateKey = getLockStateKey();
    const lastActivityKey = getLastActivityKey();
    const attemptsKey = getAttemptsKey();
    const lockoutKey = getLockoutKey();

    if (!storageKey || !lockStateKey || !lastActivityKey || !attemptsKey || !lockoutKey) return false;

    // Check lockout
    const lockoutUntil = localStorage.getItem(lockoutKey);
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      const mins = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
      toast({
        title: 'Locked Out',
        description: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        variant: 'destructive',
      });
      return false;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return false;

      const settings: AppLockSettings = JSON.parse(stored);
      if (!settings.salt || !settings.pin_hash) return false;

      const inputHash = await hashPin(pin, settings.salt);

      if (inputHash === settings.pin_hash) {
        localStorage.removeItem(attemptsKey);
        localStorage.removeItem(lockoutKey);
        setIsLocked(false);
        localStorage.setItem(lockStateKey, 'unlocked');
        localStorage.setItem(lastActivityKey, Date.now().toString());
        return true;
      }

      const attempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10) + 1;
      localStorage.setItem(attemptsKey, attempts.toString());

      if (attempts >= MAX_ATTEMPTS) {
        localStorage.setItem(lockoutKey, (Date.now() + LOCKOUT_DURATION_MS).toString());
        localStorage.removeItem(attemptsKey);
        toast({
          title: 'Too Many Attempts',
          description: 'Locked for 5 minutes.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Incorrect PIN',
          description: `${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining.`,
          variant: 'destructive',
        });
      }

      return false;
    } catch {
      return false;
    }
  }, [getUserStorageKey, getLockStateKey, getLastActivityKey, getAttemptsKey, getLockoutKey, toast]);

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
    const attemptsKey = getAttemptsKey();
    const lockoutKey = getLockoutKey();

    if (storageKey && lockStateKey) {
      localStorage.removeItem(storageKey);
      localStorage.setItem(lockStateKey, 'unlocked');
      if (attemptsKey) localStorage.removeItem(attemptsKey);
      if (lockoutKey) localStorage.removeItem(lockoutKey);
      setHasPin(false);
      setIsLocked(false);

      toast({
        title: 'PIN Removed',
        description: 'App lock has been disabled',
      });
    }
  }, [getUserStorageKey, getLockStateKey, getAttemptsKey, getLockoutKey, toast]);

  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    const ok = await verifyPin(oldPin);
    if (!ok) {
      toast({
        title: 'Error',
        description: 'Current PIN is incorrect',
        variant: 'destructive',
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
