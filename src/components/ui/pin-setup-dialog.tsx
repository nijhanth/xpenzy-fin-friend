import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, Check } from 'lucide-react';
import { useAppLock } from '@/hooks/useAppLock';
import { cn } from '@/lib/utils';

interface PinSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'setup' | 'change' | 'remove';
}

export const PinSetupDialog = ({ open, onOpenChange, mode = 'setup' }: PinSetupDialogProps) => {
  const { setupPin, changePin, removePin, verifyPin, hasPin } = useAppLock();
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(
    mode === 'change' || mode === 'remove' ? 'current' : 'new'
  );
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  // Reset step when mode changes
  useEffect(() => {
    setStep(mode === 'change' || mode === 'remove' ? 'current' : 'new');
  }, [mode, open]);

  // Determine initial step based on mode
  const getInitialStep = () => {
    if (mode === 'change' || mode === 'remove') {
      return 'current';
    }
    return 'new';
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setStep(getInitialStep());
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  const handleCurrentPinComplete = (value: string) => {
    setCurrentPin(value);
    if (value.length === 4) {
      if (verifyPin(value)) {
        if (mode === 'remove') {
          removePin();
          handleOpenChange(false);
        } else {
          setStep('new');
          setError('');
        }
      } else {
        setError('Incorrect PIN');
        setCurrentPin('');
      }
    }
  };

  const handleNewPinComplete = (value: string) => {
    setNewPin(value);
    if (value.length === 4) {
      setStep('confirm');
      setError('');
    }
  };

  const handleConfirmPinComplete = (value: string) => {
    setConfirmPin(value);
    if (value.length === 4) {
      if (value === newPin) {
        let success = false;
        if (mode === 'change') {
          success = changePin(currentPin, value);
        } else {
          success = setupPin(value);
        }
        
        if (success) {
          handleOpenChange(false);
        } else {
          setError('Failed to set PIN');
          setConfirmPin('');
        }
      } else {
        setError('PINs do not match');
        setConfirmPin('');
      }
    }
  };

  const getTitle = () => {
    if (mode === 'remove') return 'Remove PIN';
    if (mode === 'change') return 'Change PIN';
    return 'Set Up PIN';
  };

  const getStepTitle = () => {
    if (step === 'current') return 'Enter Current PIN';
    if (step === 'new') return 'Enter New PIN';
    return 'Confirm PIN';
  };

  const getStepDescription = () => {
    if (step === 'current') return 'Enter your current 4-digit PIN';
    if (step === 'new') return 'Create a 4-digit PIN to secure your app';
    return 'Re-enter your PIN to confirm';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {/* Progress indicators */}
          {mode !== 'remove' && (
            <div className="flex items-center gap-2 mb-6">
              <div className={cn(
                "w-2 h-2 rounded-full",
                step === 'current' && mode === 'change' ? "bg-primary" : 
                step !== 'current' ? "bg-primary" : "bg-muted"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full",
                step === 'new' ? "bg-primary" : 
                step === 'confirm' ? "bg-primary" : "bg-muted"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full",
                step === 'confirm' ? "bg-primary" : "bg-muted"
              )} />
            </div>
          )}

          <p className="text-sm font-medium mb-4">{getStepTitle()}</p>

          {/* PIN Input */}
          {step === 'current' && (
            <InputOTP
              maxLength={4}
              value={currentPin}
              onChange={handleCurrentPinComplete}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          )}

          {step === 'new' && (
            <InputOTP
              maxLength={4}
              value={newPin}
              onChange={handleNewPinComplete}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          )}

          {step === 'confirm' && (
            <InputOTP
              maxLength={4}
              value={confirmPin}
              onChange={handleConfirmPinComplete}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          )}

          {/* Error message */}
          {error && (
            <p className="text-destructive text-sm mt-4">{error}</p>
          )}

          {/* Back button for multi-step */}
          {step !== 'current' && step !== 'new' && mode !== 'remove' && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => {
                if (step === 'confirm') {
                  setStep('new');
                  setNewPin('');
                  setConfirmPin('');
                }
              }}
            >
              Go Back
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
