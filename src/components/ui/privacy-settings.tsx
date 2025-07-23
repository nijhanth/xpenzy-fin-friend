import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const PrivacySettings = () => {
  const { preferences, updatePreferences, requestConsent } = usePrivacy();
  const { toast } = useToast();

  const handleToggle = async (key: keyof typeof preferences, value: boolean) => {
    if (value && !preferences[key]) {
      const consent = await requestConsent(key);
      if (!consent) return;
    }
    
    updatePreferences({ [key]: value });
    toast({
      title: "Privacy Setting Updated",
      description: `Your ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} preference has been saved.`,
    });
  };

  const handleSecurityModeChange = (mode: 'strict' | 'balanced' | 'minimal') => {
    updatePreferences({ securityMode: mode });
    toast({
      title: "Security Mode Updated",
      description: `Security mode changed to ${mode}.`,
    });
  };

  const clearAllData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all privacy preferences? This action cannot be undone.'
    );
    
    if (confirmed) {
      localStorage.removeItem('privacy-preferences');
      updatePreferences({
        showFullEmail: false,
        showFullPhone: false,
        showFullName: true,
        allowDataCollection: false,
        securityMode: 'strict'
      });
      toast({
        title: "Privacy Data Cleared",
        description: "All privacy preferences have been reset to defaults.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Security Settings
          </CardTitle>
          <CardDescription>
            Control how your personal information is displayed and stored in the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Data Display Preferences</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="show-full-name" className="text-sm">Show full name</Label>
              </div>
              <Switch
                id="show-full-name"
                checked={preferences.showFullName}
                onCheckedChange={(checked) => handleToggle('showFullName', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="show-full-email" className="text-sm">Show full email address</Label>
              </div>
              <Switch
                id="show-full-email"
                checked={preferences.showFullEmail}
                onCheckedChange={(checked) => handleToggle('showFullEmail', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="show-full-phone" className="text-sm">Show full phone number</Label>
              </div>
              <Switch
                id="show-full-phone"
                checked={preferences.showFullPhone}
                onCheckedChange={(checked) => handleToggle('showFullPhone', checked)}
              />
            </div>
          </div>

          {/* Security Mode */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Security Mode</h4>
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Select
                value={preferences.securityMode}
                onValueChange={handleSecurityModeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">
                    Strict - Maximum data protection and masking
                  </SelectItem>
                  <SelectItem value="balanced">
                    Balanced - Moderate protection with usability
                  </SelectItem>
                  <SelectItem value="minimal">
                    Minimal - Basic protection, full data visibility
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Collection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Data Collection</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-data-collection" className="text-sm">
                Allow anonymous usage analytics
              </Label>
              <Switch
                id="allow-data-collection"
                checked={preferences.allowDataCollection}
                onCheckedChange={(checked) => handleToggle('allowDataCollection', checked)}
              />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-destructive mb-4">Danger Zone</h4>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={clearAllData}
            >
              Clear All Privacy Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};