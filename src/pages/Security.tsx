import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Lock, 
  Fingerprint, 
  Smartphone, 
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useAppLock } from '@/hooks/useAppLock';
import { PinSetupDialog } from '@/components/ui/pin-setup-dialog';

export const Security = () => {
  const { settings, loading, updateSetting } = useSecuritySettings();
  const { hasPin, lockApp } = useAppLock();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'change' | 'remove'>('setup');

  const getSecurityScore = () => {
    if (!settings) return 0;
    let score = 0;
    if (hasPin) score += 50;
    if (settings.auto_lock && hasPin) score += 50;
    return score;
  };

  const securityScore = getSecurityScore();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const getScoreColor = () => {
    if (securityScore >= 80) return "text-emerald-600";
    if (securityScore >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const handleAppLockToggle = (checked: boolean) => {
    if (checked && !hasPin) {
      setPinMode('setup');
      setShowPinSetup(true);
    } else if (!checked && hasPin) {
      setPinMode('remove');
      setShowPinSetup(true);
    }
    updateSetting('app_lock', checked);
  };

  const handleChangePinClick = () => {
    if (hasPin) {
      setPinMode('change');
    } else {
      setPinMode('setup');
    }
    setShowPinSetup(true);
  };

  const handleLockNow = () => {
    if (hasPin) {
      lockApp();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="text-muted-foreground">Protect your financial data</p>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor()}`}>{securityScore}%</div>
          <p className="text-xs text-muted-foreground">Security Score</p>
        </div>
      </div>

      {/* Security Score Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                securityScore >= 80 ? 'bg-emerald-100 text-emerald-600' : 
                securityScore >= 60 ? 'bg-yellow-100 text-yellow-600' : 
                'bg-red-100 text-red-600'
              }`}>
                {securityScore >= 80 ? <CheckCircle className="w-6 h-6" /> : 
                 <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-semibold">Security Status</h3>
                <p className="text-sm text-muted-foreground">
                  {securityScore >= 80 ? 'Excellent protection' : 
                   securityScore >= 60 ? 'Good protection' : 
                   'Needs improvement'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                securityScore >= 80 ? 'bg-emerald-500' : 
                securityScore >= 60 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${securityScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* App Lock */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium">App Lock</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasPin ? 'PIN protection enabled' : 'Secure app with PIN'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={hasPin}
                onCheckedChange={handleAppLockToggle}
              />
            </div>

            {/* Biometric Auth */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium">Biometric Authentication</h3>
                  <p className="text-sm text-muted-foreground">Use fingerprint or face recognition</p>
                </div>
              </div>
              <Switch 
                checked={settings?.biometric_auth ?? false}
                onCheckedChange={(checked) => updateSetting('biometric_auth', checked)}
                disabled={!settings}
              />
            </div>

            {/* Auto Lock */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium">Auto Lock</h3>
                  <p className="text-sm text-muted-foreground">Lock app when inactive for 5 minutes</p>
                </div>
              </div>
              <Switch 
                checked={settings?.auto_lock ?? false}
                onCheckedChange={(checked) => updateSetting('auto_lock', checked)}
                disabled={!settings || !hasPin}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* PIN Setup */}
      <Card>
        <CardHeader>
          <CardTitle>App Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={handleChangePinClick}
          >
            <Lock className="w-5 h-5 mr-3" />
            {hasPin ? 'Change PIN' : 'Setup PIN'}
            {hasPin && <Badge className="ml-auto" variant="secondary">Active</Badge>}
          </Button>
          
          {hasPin && (
            <Button 
              variant="outline" 
              className="w-full justify-start h-12"
              onClick={handleLockNow}
            >
              <Lock className="w-5 h-5 mr-3" />
              Lock App Now
            </Button>
          )}
          
          <Button variant="outline" className="w-full justify-start h-12" disabled>
            <Fingerprint className="w-5 h-5 mr-3" />
            Setup Biometric Lock
            <Badge className="ml-auto">Coming Soon</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* PIN Setup Dialog */}
      <PinSetupDialog 
        open={showPinSetup} 
        onOpenChange={setShowPinSetup}
        mode={pinMode}
      />
    </div>
  );
};