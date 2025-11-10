import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from './button';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Show prompt after 3 seconds if installable
    if (isInstallable && !isDismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isDismissed, isInstalled]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!isVisible || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50",
        "bg-card border border-border rounded-lg shadow-lg p-4",
        "animate-in slide-in-from-bottom-5 duration-500"
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Xpenzy</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Install our app for quick access and offline functionality
          </p>
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full"
          >
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
};
