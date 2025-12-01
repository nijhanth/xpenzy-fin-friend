import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Lock, 
  Fingerprint, 
  Smartphone, 
  Cloud, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useState } from 'react';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';

const securitySettingsConfig = [
  {
    title: "App Lock",
    description: "Secure app with PIN or pattern",
    icon: Lock,
    key: 'app_lock' as const,
  },
  {
    title: "Biometric Authentication",
    description: "Use fingerprint or face recognition",
    icon: Fingerprint,
    key: 'biometric_auth' as const,
  },
  {
    title: "Auto Lock",
    description: "Lock app when inactive for 5 minutes",
    icon: Smartphone,
    key: 'auto_lock' as const,
  },
  {
    title: "Cloud Sync",
    description: "Encrypt and sync data to cloud",
    icon: Cloud,
    key: 'cloud_sync' as const,
  }
];

const backupOptions = [
  {
    title: "Local Backup",
    description: "Save encrypted backup to device",
    icon: Download,
    type: 'local' as const,
  },
  {
    title: "Cloud Backup",
    description: "Auto backup to secure cloud storage",
    icon: Upload,
    type: 'cloud' as const,
  }
];

export const Security = () => {
  const { settings, loading, updateSetting, updateBackupTimestamp } = useSecuritySettings();
  const [showPinSetup, setShowPinSetup] = useState(false);

  const getSecurityScore = () => {
    if (!settings) return 0;
    const enabledCount = securitySettingsConfig.filter(
      config => settings[config.key]
    ).length;
    return Math.round((enabledCount / securitySettingsConfig.length) * 100);
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
            {securitySettingsConfig.map((config) => (
              <div key={config.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <config.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{config.title}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <Switch 
                  checked={settings?.[config.key] ?? false}
                  onCheckedChange={(checked) => updateSetting(config.key, checked)}
                  disabled={!settings}
                />
              </div>
            ))}
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
            onClick={() => setShowPinSetup(!showPinSetup)}
          >
            <Lock className="w-5 h-5 mr-3" />
            Change PIN
            {showPinSetup ? <EyeOff className="w-4 h-4 ml-auto" /> : <Eye className="w-4 h-4 ml-auto" />}
          </Button>
          
          <Button variant="outline" className="w-full justify-start h-12">
            <Fingerprint className="w-5 h-5 mr-3" />
            Setup Biometric Lock
            <Badge className="ml-auto">New</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backupOptions.map((option) => {
              const lastBackupField = option.type === 'local' ? 'last_backup_local' : 'last_backup_cloud';
              const lastBackup = settings?.[lastBackupField];
              const backupDate = lastBackup ? new Date(lastBackup) : null;
              const backupText = backupDate 
                ? `${Math.floor((Date.now() - backupDate.getTime()) / (1000 * 60 * 60))} hours ago`
                : 'Never';
              
              return (
                <div key={option.type} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                        <option.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{option.title}</h3>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateBackupTimestamp(option.type)}
                      disabled={!settings}
                    >
                      {option.type === 'local' ? 'Backup Now' : 'Configure'}
                    </Button>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Last backup: {backupText}</span>
                    <span>Size: N/A</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Emergency Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" className="w-full justify-start">
            <AlertTriangle className="w-5 h-5 mr-3" />
            Reset All Data
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            This action cannot be undone. Make sure you have a backup before proceeding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};