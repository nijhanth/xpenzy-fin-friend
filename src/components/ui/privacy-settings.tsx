import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, EyeOff, Lock, UserRound, Mail, RotateCcw } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type DisplayPreference = 'showFullName' | 'showFullEmail';

export const PrivacySettings = () => {
  const { preferences, updatePreferences, requestConsent } = usePrivacy();
  const { toast } = useToast();

  const handleToggle = async (key: DisplayPreference, value: boolean) => {
    if (value && !preferences[key]) {
      const consent = await requestConsent(key);
      if (!consent) return;
    } else {
      updatePreferences({ [key]: value });
    }
    toast({
      title: 'Display preference updated',
      description: value ? 'This information will appear in full.' : 'This information will be masked in the app.',
    });
  };

  const handleSecurityModeChange = (mode: 'strict' | 'balanced' | 'minimal') => {
    const visibility = {
      strict: { showFullName: false, showFullEmail: false },
      balanced: { showFullName: true, showFullEmail: false },
      minimal: { showFullName: true, showFullEmail: true },
    }[mode];
    updatePreferences({ securityMode: mode, ...visibility });
    toast({
      title: 'Privacy preset updated',
      description: mode === 'strict'
        ? 'Your name and email are now masked.'
        : mode === 'balanced'
          ? 'Your name is visible and your email is masked.'
          : 'Your name and email are visible in full.',
    });
  };

  const resetPrivacyPreferences = () => {
    const confirmed = window.confirm(
      'Reset your privacy and display preferences to their defaults? This does not delete financial records, accounts, or your profile.'
    );
    
    if (confirmed) {
      updatePreferences({
        showFullEmail: false,
        showFullPhone: false,
        showFullName: false,
        allowDataCollection: false,
        securityMode: 'strict'
      });
      toast({
        title: 'Privacy preferences reset',
        description: 'Your name and email are masked. Financial data was not changed.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border shadow-card">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Privacy &amp; display</CardTitle>
              <CardDescription className="mt-1">
                Choose how personal details appear in Xpenzy. Your financial records are unchanged.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <section className="space-y-3" aria-labelledby="privacy-display-heading">
            <div className="flex items-center justify-between gap-3">
              <h4 id="privacy-display-heading" className="text-sm font-semibold">Personal details</h4>
              <Badge variant="secondary">
                {preferences.showFullName
                  ? preferences.showFullEmail ? 'Name and email visible' : 'Name visible'
                  : preferences.showFullEmail ? 'Email visible' : 'Fully masked'}
              </Badge>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border">
              <div className="flex min-h-16 items-center justify-between gap-4 p-3 sm:p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <Label htmlFor="show-full-name" className="text-sm font-medium">Show full name</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Otherwise, your name is masked on the home screen and account menu.</p>
                  </div>
                </div>
                <Switch
                  id="show-full-name"
                  checked={preferences.showFullName}
                  onCheckedChange={(checked) => { void handleToggle('showFullName', checked); }}
                  aria-label="Show full name"
                />
              </div>

              <div className="flex min-h-16 items-center justify-between gap-4 p-3 sm:p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <Label htmlFor="show-full-email" className="text-sm font-medium">Show full email address</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Otherwise, your email is masked in account menus and settings.</p>
                  </div>
                </div>
                <Switch
                  id="show-full-email"
                  checked={preferences.showFullEmail}
                  onCheckedChange={(checked) => { void handleToggle('showFullEmail', checked); }}
                  aria-label="Show full email address"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="privacy-mode-heading">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h4 id="privacy-mode-heading" className="text-sm font-semibold">Visibility preset</h4>
            </div>
            <Select value={preferences.securityMode} onValueChange={handleSecurityModeChange}>
              <SelectTrigger aria-label="Visibility preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict — mask name and email</SelectItem>
                <SelectItem value="balanced">Balanced — show name, mask email</SelectItem>
                <SelectItem value="minimal">Minimal — show name and email</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Presets update both switches. You can then adjust either detail separately.
            </p>
          </section>

          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Xpenzy currently has no phone number profile field and does not collect usage analytics, so those controls are not shown.
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-medium">Reset privacy preferences</h4>
              <p className="text-xs text-muted-foreground">Restore strict masking without deleting financial data.</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetPrivacyPreferences}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
              Reset preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};