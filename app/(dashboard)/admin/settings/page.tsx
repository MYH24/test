'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Settings, Lock, Bell, Shield, Loader2, Save } from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    systemName: 'ExamGuard',
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    enableMFA: true,
    enableFaceDetection: true,
    enableBrowserLockdown: true,
    requiredProctors: 1,
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    // In production, this would send to an API
    console.log('Saving settings:', settings);
    setUnsavedChanges(false);
    alert('Settings saved successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Configure system-wide preferences and security</p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">System Name</label>
              <Input
                value={settings.systemName}
                onChange={(e) => handleSettingChange('systemName', e.target.value)}
                placeholder="System name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                placeholder="30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Configure security features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Max Login Attempts</label>
              <Input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                placeholder="5"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Multi-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Require MFA for all users</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableMFA}
                    onChange={(e) => handleSettingChange('enableMFA', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <Badge variant={settings.enableMFA ? 'default' : 'secondary'}>
                    {settings.enableMFA ? 'Enabled' : 'Disabled'}
                  </Badge>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Face Detection</p>
                  <p className="text-sm text-muted-foreground">Use AI-powered face detection for identity verification</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableFaceDetection}
                    onChange={(e) => handleSettingChange('enableFaceDetection', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <Badge variant={settings.enableFaceDetection ? 'default' : 'secondary'}>
                    {settings.enableFaceDetection ? 'Enabled' : 'Disabled'}
                  </Badge>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Browser Lockdown</p>
                  <p className="text-sm text-muted-foreground">Prevent tab switching and screen access during exams</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableBrowserLockdown}
                    onChange={(e) => handleSettingChange('enableBrowserLockdown', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <Badge variant={settings.enableBrowserLockdown ? 'default' : 'secondary'}>
                    {settings.enableBrowserLockdown ? 'Enabled' : 'Disabled'}
                  </Badge>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proctoring Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Proctoring Settings
            </CardTitle>
            <CardDescription>Configure proctoring requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Required Proctors per Exam</label>
              <Input
                type="number"
                value={settings.requiredProctors}
                onChange={(e) => handleSettingChange('requiredProctors', parseInt(e.target.value))}
                placeholder="1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button 
            onClick={handleSave}
            disabled={!unsavedChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
          <Button 
            variant="outline"
            onClick={() => setUnsavedChanges(false)}
          >
            Discard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
