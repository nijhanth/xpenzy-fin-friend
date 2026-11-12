import { useState, useEffect, useRef } from 'react';
import { formatDisplayDate } from '@/lib/dateFormat';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  User, 
  Moon, 
  Sun, 
  Bell, 
  Download, 
  Languages, 
  Trash2, 
  Shield,
  LockKeyhole,
  ChevronRight,
  Edit,
  FileText,
  Sparkles,
  Check,
  RefreshCw,
  Loader2,
  ImagePlus,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserMenu } from '@/components/ui/user-menu';
import { FinanceLogo } from '@/components/ui/finance-logo';
import { PrivacySettings } from '@/components/ui/privacy-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { database } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import type { useAppUpdate } from '@/hooks/useAppUpdate';
import { AccountManagement } from '@/components/settings/AccountManagement';
import { useFinancial } from '@/contexts/FinancialContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { maskEmail, maskName } from '@/lib/security';
import { useTheme } from 'next-themes';

interface SettingsProps {
  appUpdate: ReturnType<typeof useAppUpdate>;
}

export const Settings = ({ appUpdate }: SettingsProps) => {
  const { user } = useAuth();
  const { preferences } = usePrivacy();
  const { theme, setTheme } = useTheme();
  const { resetFinancialData } = useFinancial();
  const userId = user?.id;
  const { toast } = useToast();
  const { requestPermission } = useNotifications();
  
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [aiMemoryEnabled, setAiMemoryEnabled] = useState(true);
  const [aiMemories, setAiMemories] = useState<Array<{ id: string; memory: string }>>([]);
  const [isUpdatingAIMemory, setIsUpdatingAIMemory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { status: updateStatus, history, historyError, checkForUpdates, applyUpdate } = appUpdate;

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await database.userPreferences.get();
        if (prefs) {
          const isDark = prefs.theme === 'dark';
          setTheme(isDark ? 'dark' : 'light');
          setPushNotifications(prefs.push_notifications);
          setWeeklyReports(prefs.weekly_reports);
          setBudgetAlerts(prefs.budget_alerts);
          setAiMemoryEnabled(prefs.ai_memory_enabled ?? true);
        }

        const { data: memories, error: memoriesError } = await supabase
          .from('ai_user_memories')
          .select('id, memory')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false });
        if (memoriesError) throw memoriesError;
        setAiMemories(memories || []);
      } catch (error) {
        console.error('Error loading preferences and AI memories:', error);
        toast({
          title: 'Settings could not be fully loaded',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) void loadPreferences();
  }, [setTheme, toast, userId]);

  const updatePreference = async (key: string, value: any) => {
    try {
      await database.userPreferences.upsert({ [key]: value });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive",
      });
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme !== 'dark' ? 'dark' : 'light';
    setTheme(newTheme);
    await updatePreference('theme', newTheme);
  };

  const handlePushNotificationsChange = async (value: boolean) => {
    if (value) {
      // Request browser notification permission
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Permission Required",
          description: "Please allow notifications in your browser settings",
          variant: "destructive",
        });
        return;
      }
    }
    setPushNotifications(value);
    await updatePreference('push_notifications', value);
  };

  const handleWeeklyReportsChange = async (value: boolean) => {
    setWeeklyReports(value);
    await updatePreference('weekly_reports', value);
  };

  const handleBudgetAlertsChange = async (value: boolean) => {
    setBudgetAlerts(value);
    await updatePreference('budget_alerts', value);
  };

  const handleAIMemoryChange = async (value: boolean) => {
    setIsUpdatingAIMemory(true);
    try {
      await database.userPreferences.upsert({ ai_memory_enabled: value });
      setAiMemoryEnabled(value);
      toast({
        title: value ? 'AI memory enabled' : 'AI memory disabled',
        description: value
          ? 'Xpenzy AI can remember stable, non-sensitive preferences.'
          : 'Xpenzy AI will stop saving and using personal memories.',
      });
    } catch (error) {
      console.error('Error updating AI memory preference:', error);
      toast({
        title: 'Could not update AI memory setting',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingAIMemory(false);
    }
  };

  const handleClearAIMemories = async () => {
    if (!user?.id || aiMemories.length === 0) return;
    if (!window.confirm('Delete all saved AI memories? This will not delete your chat history or financial records.')) return;

    setIsUpdatingAIMemory(true);
    const { error } = await supabase.from('ai_user_memories').delete().eq('user_id', user.id);
    setIsUpdatingAIMemory(false);
    if (error) {
      toast({
        title: 'Could not delete AI memories',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAiMemories([]);
      toast({ title: 'AI memories deleted' });
    }
  };

  const handleEditProfile = async () => {
    try {
      await database.profile.update(displayName);
      setShowEditProfile(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Unsupported image format',
        description: 'Choose a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Image is too large',
        description: 'Choose an image smaller than 2 MB.',
        variant: 'destructive',
      });
      input.value = '';
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Could not upload profile photo',
        description: 'Sign in again and try once more.',
        variant: 'destructive',
      });
      input.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const avatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const storage = supabase.storage.from('avatars');
      const { error: uploadError } = await storage.upload(avatarPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const avatarUrl = storage.getPublicUrl(avatarPath).data.publicUrl;
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl, avatar_path: avatarPath },
      });
      if (updateError) {
        const { error: cleanupError } = await storage.remove([avatarPath]);
        if (cleanupError) console.error('Could not remove unlinked profile photo:', cleanupError);
        throw updateError;
      }

      const previousAvatarPath = user.user_metadata?.avatar_path;
      if (typeof previousAvatarPath === 'string'
        && previousAvatarPath.startsWith(`${user.id}/`)
        && previousAvatarPath !== avatarPath) {
        const { error: cleanupError } = await storage.remove([previousAvatarPath]);
        if (cleanupError) {
          toast({
            title: 'Profile photo updated',
            description: 'The previous photo could not be removed from storage.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({ title: 'Profile photo updated' });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast({
        title: 'Could not update profile photo',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
      input.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    setIsUploadingAvatar(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null, avatar_path: null },
      });
      if (updateError) throw updateError;

      const avatarPath = user.user_metadata?.avatar_path;
      if (typeof avatarPath === 'string' && avatarPath.startsWith(`${user.id}/`)) {
        const { error: removeError } = await supabase.storage.from('avatars').remove([avatarPath]);
        if (removeError) {
          toast({
            title: 'Profile photo removed',
            description: 'The image could not be removed from storage.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({ title: 'Profile photo removed' });
    } catch (error) {
      console.error('Error removing profile photo:', error);
      toast({
        title: 'Could not remove profile photo',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.email) {
      toast({
        title: 'Unable to change password',
        description: 'Your account does not have an email address.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      toast({
        title: 'Invalid new password',
        description: 'Use a password between 8 and 128 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Enter the same new password in both fields.',
        variant: 'destructive',
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: 'Choose a different password',
        description: 'Your new password must be different from your current password.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: verificationError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verificationError) {
        toast({
          title: 'Current password could not be verified',
          description: 'Check your current password and try again.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePassword(false);
      toast({ title: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Could not change password',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await database.dataExport.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xpenzy-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleResetAllData = async () => {
    if (!user?.email) {
      toast({
        title: 'Unable to verify your account',
        description: 'Your signed-in account does not have an email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!resetPassword) {
      toast({
        title: 'Password required',
        description: 'Enter your account password to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingData(true);
    try {
      const { error: verificationError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: resetPassword,
      });
      if (verificationError) {
        toast({
          title: 'Password verification failed',
          description: 'Check your account password and try again. No data was deleted.',
          variant: 'destructive',
        });
        return;
      }

      await database.dataExport.resetAllData();
      resetFinancialData();
      setShowResetDialog(false);
      setResetPassword('');
      toast({
        title: "Financial data reset",
        description: "Your accounts, transactions, savings, investments, budgets, notes, and AI history have been deleted.",
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Could not finish resetting financial data",
        description: error instanceof Error ? error.message : "Some data may already have been deleted. Retry to remove the remaining data.",
        variant: "destructive",
      });
    } finally {
      setIsResettingData(false);
    }
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize your Xpenzy experience</p>
        </div>
        <UserMenu />
      </div>

      <AccountManagement />

      {/* Profile Section */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user?.user_metadata?.avatar_url}
                  alt={user?.user_metadata?.display_name || 'Profile photo'}
                />
                <AvatarFallback>
                  {(user?.user_metadata?.display_name || 'U').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-card shadow-sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                {isUploadingAvatar
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  : <Camera className="h-4 w-4" aria-hidden />}
              </Button>
            </div>
            <Input
              ref={avatarInputRef}
              id="profile-photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={isUploadingAvatar}
              aria-label="Upload profile photo"
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {preferences.showFullName
                  ? user?.user_metadata?.display_name || 'User'
                  : maskName(user?.user_metadata?.display_name || 'User')}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.email
                  ? preferences.showFullEmail ? user.email : maskEmail(user.email)
                  : ''}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setDisplayName(user?.user_metadata?.display_name || '');
                setShowEditProfile(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <LockKeyhole className="w-5 h-5" />
            Password & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Change password</p>
              <p className="text-sm text-muted-foreground">
                Verify your current password before setting a new one.
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowChangePassword(true)}>
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <Switch 
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5" />
              <div>
                <p className="font-medium">Language</p>
                <p className="text-sm text-muted-foreground">English</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Get alerts for transactions</p>
            </div>
            <Switch 
              checked={pushNotifications} 
              onCheckedChange={handlePushNotificationsChange}
              disabled={isLoading}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Reports</p>
              <p className="text-sm text-muted-foreground">Receive weekly summaries</p>
            </div>
            <Switch 
              checked={weeklyReports} 
              onCheckedChange={handleWeeklyReportsChange}
              disabled={isLoading}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Budget Alerts</p>
              <p className="text-sm text-muted-foreground">Alert when budget exceeds</p>
            </div>
            <Switch 
              checked={budgetAlerts} 
              onCheckedChange={handleBudgetAlertsChange}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Personalization */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Personalization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Remember my preferences</p>
              <p className="text-sm text-muted-foreground">
                Save stable, non-sensitive details for future chats. This does not train Gemini.
              </p>
            </div>
            <Switch
              checked={aiMemoryEnabled}
              onCheckedChange={handleAIMemoryChange}
              disabled={isLoading || isUpdatingAIMemory}
              aria-label="Remember my preferences"
            />
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Saved memories ({aiMemories.length})</p>
              {aiMemories.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {aiMemories.map(({ id, memory }) => (
                    <li key={id} className="rounded-md bg-muted px-3 py-2">{memory}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No saved memories.</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void handleClearAIMemories(); }}
              disabled={isLoading || isUpdatingAIMemory || aiMemories.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-3" />
            Export Data
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => setShowPrivacyPolicy(true)}
          >
            <FileText className="w-4 h-4 mr-3" />
            Privacy Policy
          </Button>
          
          <Button 
            variant="destructive" 
            className="w-full justify-start h-12"
            onClick={() => setShowResetDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Reset Financial Data
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            App updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {updateStatus === 'checking' || updateStatus === 'updating'
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  : updateStatus === 'available'
                    ? <Download className="h-4 w-4" aria-hidden />
                    : <Check className="h-4 w-4" aria-hidden />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {updateStatus === 'available'
                    ? 'A new Xpenzy update is ready'
                    : updateStatus === 'updating'
                      ? 'Updating Xpenzy…'
                      : updateStatus === 'checking'
                        ? 'Checking for app updates…'
                        : updateStatus === 'error'
                          ? 'Could not check for updates'
                          : updateStatus === 'unsupported'
                            ? 'App updates are unavailable in this browser'
                            : 'Xpenzy is up to date'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {updateStatus === 'available'
                    ? 'Install the latest version now.'
                    : updateStatus === 'error'
                      ? 'The update could not finish. Check your connection and try again.'
                      : updateStatus === 'current'
                        ? 'You’re using the latest version available.'
                        : updateStatus === 'updating'
                          ? 'Activating the update. The app will restart automatically.'
                          : 'Updates are checked automatically when the app is opened.'}
                </p>
              </div>
            </div>
            {updateStatus === 'available' ? (
              <Button onClick={applyUpdate} className="shrink-0">
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Update now
              </Button>
            ) : updateStatus === 'updating' ? (
              <Button disabled className="shrink-0">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Restarting…
              </Button>
            ) : updateStatus === 'current' || updateStatus === 'error' ? (
              <Button variant="outline" onClick={() => { void checkForUpdates(); }} className="shrink-0">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                {updateStatus === 'error' ? 'Try again' : 'Check for updates'}
              </Button>
            ) : null}
          </div>

          <Separator />
          <div>
            <p className="text-sm font-medium text-foreground">Update history</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Last update recorded on this device: {history[0] ? new Date(history[0].installedAt).toLocaleString() : 'Not recorded yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This device keeps the 10 most recent installed builds. History starts with this release.
            </p>
          </div>
          {historyError && (
            <p className="text-sm text-destructive" role="alert">
              Could not save update history: {historyError}
            </p>
          )}
          {history.length > 0 && (
            <ul className="space-y-2" aria-label="Recent app update history">
              {history.map((entry) => (
                <li key={entry.buildId} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">Version {entry.version}</span>
                  <span className="text-xs text-muted-foreground">
                    Installed {new Date(entry.installedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="pt-6 text-center space-y-2">
          <div className="flex items-center gap-3">
            <FinanceLogo className="w-8 h-8 shrink-0" />
            <p className="text-2xl font-bold text-primary font-poppins font-semibold tracking-tight">Xpenzy</p>
          </div>
          <p className="text-sm text-muted-foreground">Version {__APP_VERSION__}</p>
          <p className="text-xs text-muted-foreground">
            Built {new Date(__APP_BUILD_DATE__).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Personal Finance Manager</p>
        </CardContent>
      </Card>

      {/* Privacy & Security Settings */}
      <PrivacySettings />

      <Dialog
        open={showChangePassword}
        onOpenChange={(open) => {
          setShowChangePassword(open);
          if (!open && !isChangingPassword) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new password with 8 to 128 characters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                maxLength={128}
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
                disabled={isChangingPassword}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangePassword(false)}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Update password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user?.user_metadata?.avatar_url}
                  alt={displayName || 'Profile photo'}
                />
                <AvatarFallback>
                  {(displayName || 'U').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    : <ImagePlus className="mr-2 h-4 w-4" aria-hidden />}
                  {isUploadingAvatar ? 'Updating…' : 'Upload photo'}
                </Button>
                {user?.user_metadata?.avatar_path && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { void handleRemoveAvatar(); }}
                    disabled={isUploadingAvatar}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Remove photo
                  </Button>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Maximum file size: 2 MB.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProfile}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Data Confirmation Dialog */}
      <AlertDialog
        open={showResetDialog}
        onOpenChange={(open) => {
          setShowResetDialog(open);
          if (!open && !isResettingData) setResetPassword('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your financial data?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. It permanently deletes your accounts and opening balances, transactions, savings goals, investments, budgets, notes, account transfers, and AI chat history and memories. Your login, profile, and app preferences will remain. To reset privacy display preferences instead, use Privacy &amp; Security below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-account-password">Account password</Label>
            <Input
              id="reset-account-password"
              type="password"
              autoComplete="current-password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              placeholder="Enter your password to confirm"
              maxLength={128}
              disabled={isResettingData}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isResettingData}
              onClick={() => setResetPassword('')}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(event) => {
                event.preventDefault();
                if (!isResettingData && resetPassword) void handleResetAllData();
              }}
              disabled={isResettingData || !resetPassword}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResettingData ? 'Resetting…' : 'Yes, reset financial data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Last updated: {formatDisplayDate(new Date())}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Data Collection</h3>
              <p className="text-muted-foreground">
                Xpenzy collects and stores your financial data including expenses, income, 
                investments, savings goals, and budgets. All data is stored securely and 
                encrypted.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold mb-2">2. Data Usage</h3>
              <p className="text-muted-foreground">
                Your data is used solely for providing personal finance management services. 
                We do not sell your financial information. When you use AI features, the relevant
                chat context and financial summaries are sent to the configured Gemini API to
                generate a response.
              </p>
              <p className="mt-2 text-muted-foreground">
                If AI personalization is enabled, Xpenzy stores a limited number of stable,
                non-sensitive preferences in your account for future chats. This does not train
                Gemini. You can turn memory off or clear saved memories in Settings.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold mb-2">3. Data Security</h3>
              <p className="text-muted-foreground">
                We implement industry-standard security measures including encryption, secure 
                authentication, and row-level security policies to protect your data.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold mb-2">4. Data Export & Deletion</h3>
              <p className="text-muted-foreground">
                You have the right to export all your data at any time using the Export Data 
                feature. You can also delete your financial data using the Reset Financial Data feature.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold mb-2">5. Contact</h3>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us through 
                the app's support channels.
              </p>
            </section>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPrivacyPolicy(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
