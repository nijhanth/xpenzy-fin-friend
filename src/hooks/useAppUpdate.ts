import { useCallback, useEffect, useRef, useState } from 'react';

type UpdateStatus = 'checking' | 'current' | 'available' | 'updating' | 'error' | 'unsupported';

export const useAppUpdate = () => {
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const checkForUpdates = useCallback(async (showChecking = true) => {
    const registration = registrationRef.current;
    if (!registration) {
      setStatus('unsupported');
      return;
    }

    if (showChecking) setStatus('checking');
    try {
      await registration.update();
      if (registration.waiting) {
        setStatus('available');
      } else if (!registration.installing) {
        setStatus('current');
      }
    } catch (error) {
      console.error('Failed to check for app updates:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    let installingWorker: ServiceWorker | null = null;
    const handleWorkerStateChange = () => {
      if (!installingWorker || cancelled) return;
      if (installingWorker.state === 'installed') {
        setStatus(registrationRef.current?.waiting ? 'available' : 'current');
      } else if (installingWorker.state === 'activated') {
        setStatus('current');
      }
    };

    const handleUpdateFound = () => {
      installingWorker = registrationRef.current?.installing ?? null;
      installingWorker?.addEventListener('statechange', handleWorkerStateChange);
    };

    const initialize = async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (cancelled) return;
      if (!registration) {
        setStatus('unsupported');
        return;
      }

      registrationRef.current = registration;
      registration.addEventListener('updatefound', handleUpdateFound);
      if (registration.waiting) {
        setStatus('available');
      } else if (registration.installing) {
        handleUpdateFound();
      } else {
        setStatus('current');
      }
      await checkForUpdates(false);
    };

    void initialize().catch((error: unknown) => {
      console.error('Failed to initialize app update checks:', error);
      if (!cancelled) setStatus('error');
    });

    const handleFocus = () => { void checkForUpdates(false); };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleFocus();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(handleFocus, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
      registrationRef.current?.removeEventListener('updatefound', handleUpdateFound);
      installingWorker?.removeEventListener('statechange', handleWorkerStateChange);
    };
  }, [checkForUpdates]);

  const applyUpdate = useCallback(() => {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) {
      void checkForUpdates();
      return;
    }

    setStatus('updating');
    const reloadOnControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnControllerChange, { once: true });
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', reloadOnControllerChange);
      setStatus((current) => current === 'updating' ? 'available' : current);
    }, 15000);
  }, [checkForUpdates]);

  return { status, checkForUpdates, applyUpdate };
};
