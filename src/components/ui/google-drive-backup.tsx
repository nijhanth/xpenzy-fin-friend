import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  RefreshCw, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useGoogleDriveBackup } from '@/hooks/useGoogleDriveBackup';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export const GoogleDriveBackup = () => {
  const {
    status,
    backups,
    loading,
    syncing,
    hasProviderToken,
    connectGoogleDrive,
    listBackups,
    uploadBackup,
    downloadBackup,
  } = useGoogleDriveBackup();
  
  const [showBackups, setShowBackups] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const handleViewBackups = async () => {
    setShowBackups(true);
    await listBackups();
  };

  const handleRestore = async (fileId: string) => {
    setRestoring(fileId);
    const data = await downloadBackup(fileId);
    if (data) {
      // For now, just show the data - actual restore logic would go here
      console.log('Backup data:', data);
    }
    setRestoring(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return 'Unknown';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Google Drive Backup
          {status.connected && (
            <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.connected ? (
          <div className="text-center py-4">
            <div className="p-4 rounded-full bg-muted inline-flex mb-4">
              <Cloud className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Connect Google Drive</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sync your Xpenzy backups securely to your Google Drive
            </p>
            <Button 
              onClick={connectGoogleDrive} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Connect with Google
            </Button>
            {!hasProviderToken && (
              <p className="text-xs text-muted-foreground mt-3">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Sign in with Google to enable Drive backup
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{status.displayName}</p>
                  <p className="text-xs text-muted-foreground">{status.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={connectGoogleDrive}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={uploadBackup} 
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Backup Now
              </Button>
              
              <Dialog open={showBackups} onOpenChange={setShowBackups}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={handleViewBackups}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    View Backups
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Google Drive Backups</DialogTitle>
                    <DialogDescription>
                      Select a backup to restore your data
                    </DialogDescription>
                  </DialogHeader>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="text-center py-8">
                      <Cloud className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No backups found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create your first backup to see it here
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {backups.map((backup) => (
                          <div 
                            key={backup.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-sm">{backup.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDate(backup.createdTime)}</span>
                                <span>•</span>
                                <span>{formatSize(backup.size)}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestore(backup.id)}
                              disabled={restoring === backup.id}
                            >
                              {restoring === backup.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Backups are stored in your Google Drive under "Xpenzy Backups" folder
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
