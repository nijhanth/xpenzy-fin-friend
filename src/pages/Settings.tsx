import { useState, useEffect } from 'react';
import { 
  User, 
  Moon, 
  Sun, 
  Bell, 
  Download, 
  Languages, 
  Trash2, 
  Shield,
  ChevronRight,
  Edit,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/ui/user-menu';
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

export const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [displayName, setDisplayName] = useState('');

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await database.userPreferences.get();
        if (prefs) {
          const isDark = prefs.theme === 'dark';
          setIsDarkMode(isDark);
          if (isDark) {
            document.documentElement.classList.add('dark');
          }
          setPushNotifications(prefs.push_notifications);
          setWeeklyReports(prefs.weekly_reports);
          setBudgetAlerts(prefs.budget_alerts);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, []);

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
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark');
    await updatePreference('theme', newTheme ? 'dark' : 'light');
  };

  const handlePushNotificationsChange = async (value: boolean) => {
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
    try {
      await database.dataExport.resetAllData();
      setShowResetDialog(false);
      toast({
        title: "Success",
        description: "All data has been reset",
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Failed to reset data",
        variant: "destructive",
      });
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

      {/* Profile Section */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {user?.user_metadata?.display_name || 'User'}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
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

      {/* Appearance */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <Switch 
              checked={isDarkMode} 
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
            Reset All Data
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="pt-6 text-center space-y-2">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/e88aa1f4-0c35-4871-9992-7efea8c237ed.png" 
              alt="Xpenzy Logo" 
              className="w-8 h-8 object-contain"
            />
            <p className="text-2xl font-bold text-primary font-poppins font-semibold tracking-tight">Xpenzy</p>
          </div>
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground">Personal Finance Manager</p>
        </CardContent>
      </Card>

      {/* Privacy & Security Settings */}
      <PrivacySettings />

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
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your
              expenses, income, investments, savings, budgets, and notes data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, reset all data
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
              Last updated: {new Date().toLocaleDateString()}
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
                We do not sell, share, or distribute your financial information to third parties.
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
                feature. You can also delete all your data using the Reset All Data feature.
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