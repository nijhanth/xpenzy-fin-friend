import { useCallback, useEffect, useRef, useState } from 'react';

type UpdateStatus = 'checking' | 'current' | 'available' | 'updating' | 'error' | 'unsupported';
const UPDATE_HISTORY_KEY = 'xpenzy-app-update-history-v1';
const MAX_UPDATE_HISTORY = 10;
const UPDATE_CHECK_TIMEOUT_MS = 15000;

const withTimeout = <T,>(promise: Promise<T>, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), UPDATE_CHECK_TIMEOUT_MS);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

export interface AppUpdateHistoryEntry {
  version: string;
  buildId: string;
  buildDate: string;
  installedAt: string;
}

const isValidDate = (value: string) => !Number.isNaN(Date.parse(value));

const isUpdateHistoryEntry = (entry: unknown): entry is AppUpdateHistoryEntry =>
  typeof entry === 'object'
  && entry !== null
  && 'version' in entry && typeof entry.version === 'string'
  && 'buildId' in entry && typeof entry.buildId === 'string'
  && 'buildDate' in entry && typeof entry.buildDate === 'string' && isValidDate(entry.buildDate)
  && 'installedAt' in entry && typeof entry.installedAt === 'string' && isValidDate(entry.installedAt);

export const useAppUpdate = () => {
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [history, setHistory] = useState<AppUpdateHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(UPDATE_HISTORY_KEY);
      const parsedHistory: unknown = savedHistory ? JSON.parse(savedHistory) : [];
      if (!Array.isArray(parsedHistory)) throw new Error('Stored app update history is invalid.');

      const validHistory = parsedHistory.filter(isUpdateHistoryEntry);
      const currentVersion = {
        version: __APP_VERSION__,
        buildId: __APP_BUILD_ID__,
        buildDate: __APP_BUILD_DATE__,
      };
      const currentEntry = validHistory.find((entry) => entry.buildId === currentVersion.buildId);
      const nextHistory = [
        currentEntry
          ? { ...currentEntry, ...currentVersion }
          : { ...currentVersion, installedAt: new Date().toISOString() },
        ...validHistory.filter((entry) => entry.buildId !== currentVersion.buildId),
      ].slice(0, MAX_UPDATE_HISTORY);

      localStorage.setItem(UPDATE_HISTORY_KEY, JSON.stringify(nextHistory));
      setHistory(nextHistory);
    } catch (error) {
      console.error('Failed to load or save app update history:', error);
      setHistoryError(error instanceof Error ? error.message : 'App update history could not be saved.');
    }
  }, []);

  const checkForUpdates = useCallback(async (showChecking = true) => {
    if (showChecking) setStatus('checking');
    let registration = registrationRef.current;
    if (!registration) {
      try {
        registration = await withTimeout(
          navigator.serviceWorker.getRegistration('/'),
          'Service worker registration lookup timed out.',
        ) ?? null;
      } catch (error) {
        console.error('Failed to find service worker registration:', error);
        setStatus('error');
        return;
      }
    }
    if (!registration) {
      setStatus('unsupported');
      return;
    }
    registrationRef.current = registration;
    try {
      await withTimeout(registration.update(), 'The app update check timed out.');
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
    let activeRegistration: ServiceWorkerRegistration | null = null;
    const handleWorkerStateChange = () => {
      if (!installingWorker || cancelled) return;
      if (installingWorker.state === 'installed') {
        setStatus(activeRegistration?.waiting ? 'available' : 'current');
      } else if (installingWorker.state === 'activated') {
        setStatus('current');
      } else if (installingWorker.state === 'redundant') {
        setStatus(activeRegistration?.waiting ? 'available' : 'current');
      }
    };

    const watchInstallingWorker = (worker: ServiceWorker | null) => {
      installingWorker?.removeEventListener('statechange', handleWorkerStateChange);
      installingWorker = worker;
      installingWorker?.addEventListener('statechange', handleWorkerStateChange);
      handleWorkerStateChange();
    };

    const handleUpdateFound = () => {
      watchInstallingWorker(activeRegistration?.installing ?? null);
    };

    const initialize = async () => {
      const registration = await withTimeout(
        navigator.serviceWorker.getRegistration('/'),
        'Service worker registration lookup timed out.',
      );
      if (cancelled) return;
      if (!registration) {
        setStatus('unsupported');
        return;
      }

      registrationRef.current = registration;
      activeRegistration = registration;
      registration.addEventListener('updatefound', handleUpdateFound);
      if (registration.waiting) {
        setStatus('available');
      } else if (registration.installing) {
        watchInstallingWorker(registration.installing);
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
    let finished = false;
    let activationReloadTimeout: number | undefined;
    const cleanup = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', reloadApp);
      waitingWorker.removeEventListener('statechange', handleWorkerStateChange);
      window.clearTimeout(timeoutId);
      if (activationReloadTimeout !== undefined) window.clearTimeout(activationReloadTimeout);
    };
    const reloadApp = () => {
      if (finished) return;
      finished = true;
      cleanup();
      window.location.reload();
    };
    const handleWorkerStateChange = () => {
      if (waitingWorker.state === 'activated') {
        activationReloadTimeout = window.setTimeout(reloadApp, 1000);
      } else if (waitingWorker.state === 'redundant') {
        finished = true;
        cleanup();
        console.error('The waiting service worker became redundant before activating.');
        setStatus('error');
      }
    };
    const timeoutId = window.setTimeout(() => {
      if (waitingWorker.state === 'activated') {
        reloadApp();
      } else {
        finished = true;
        cleanup();
        console.error('The waiting service worker did not activate within 20 seconds.');
        setStatus('error');
      }
    }, 20000);

    navigator.serviceWorker.addEventListener('controllerchange', reloadApp, { once: true });
    waitingWorker.addEventListener('statechange', handleWorkerStateChange);
    try {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      handleWorkerStateChange();
    } catch (error) {
      finished = true;
      cleanup();
      console.error('Failed to request service worker activation:', error);
      setStatus('error');
    }
  }, [checkForUpdates]);

  return { status, history, historyError, checkForUpdates, applyUpdate };
};
