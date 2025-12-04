import { useState, useEffect } from 'react';
import { Lock, Delete, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppLock } from '@/hooks/useAppLock';
import { cn } from '@/lib/utils';

interface AppLockScreenProps {
  onUnlock: () => void;
}

export const AppLockScreen = ({ onUnlock }: AppLockScreenProps) => {
  const { verifyPin } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      const isValid = verifyPin(pin);
      if (isValid) {
        onUnlock();
      } else {
        setError(true);
        setAttempts(prev => prev + 1);
        setTimeout(() => {
          setPin('');
        }, 500);
      }
    }
  }, [pin, verifyPin, onUnlock]);

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Logo and title */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Xpenzy</h1>
        <p className="text-muted-foreground mt-2">Enter your PIN to unlock</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all duration-200",
              pin.length > index
                ? error
                  ? "bg-destructive border-destructive"
                  : "bg-primary border-primary"
                : "border-muted-foreground"
            )}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-destructive text-sm mb-4 animate-pulse">
          Incorrect PIN. {attempts >= 3 ? `${5 - attempts} attempts remaining` : 'Try again.'}
        </p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-4 max-w-xs">
        {numbers.map((num, index) => {
          if (num === '') {
            return <div key={index} />;
          }
          
          if (num === 'del') {
            return (
              <Button
                key={index}
                variant="ghost"
                size="lg"
                className="w-16 h-16 rounded-full text-xl"
                onClick={handleDelete}
                disabled={pin.length === 0}
              >
                <Delete className="w-6 h-6" />
              </Button>
            );
          }

          return (
            <Button
              key={index}
              variant="outline"
              size="lg"
              className="w-16 h-16 rounded-full text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handleNumberClick(num)}
              disabled={pin.length >= 4}
            >
              {num}
            </Button>
          );
        })}
      </div>

      {/* Lock icon */}
      <div className="mt-8 flex items-center gap-2 text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span className="text-sm">Protected by App Lock</span>
      </div>
    </div>
  );
};
