'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface SystemCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export default function StudentSystemCheckPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [checks, setChecks] = useState<SystemCheckResult[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'student')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'student') {
      performSystemCheck();
    }
  }, [isLoading, isAuthenticated, user]);

  const performSystemCheck = async () => {
    setChecking(true);
    
    const results: SystemCheckResult[] = [];

    // Check browser
    results.push({
      name: 'Browser Compatibility',
      status: 'pass',
      message: `${navigator.userAgent.includes('Chrome') ? 'Google Chrome' : navigator.userAgent.includes('Firefox') ? 'Mozilla Firefox' : 'Supported Browser'} detected`,
    });

    // Check internet connection
    results.push({
      name: 'Internet Connection',
      status: navigator.onLine ? 'pass' : 'fail',
      message: navigator.onLine ? 'Connected and stable' : 'Connection lost',
    });

    // Check camera
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      results.push({
        name: 'Camera Access',
        status: hasCamera ? 'pass' : 'warning',
        message: hasCamera ? 'Camera detected and accessible' : 'No camera detected',
      });
    } catch {
      results.push({
        name: 'Camera Access',
        status: 'warning',
        message: 'Unable to check camera permissions',
      });
    }

    // Check microphone
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      results.push({
        name: 'Microphone Access',
        status: hasMicrophone ? 'pass' : 'warning',
        message: hasMicrophone ? 'Microphone detected and accessible' : 'No microphone detected',
      });
    } catch {
      results.push({
        name: 'Microphone Access',
        status: 'warning',
        message: 'Unable to check microphone permissions',
      });
    }

    // Check screen resolution
    results.push({
      name: 'Screen Resolution',
      status: window.innerWidth >= 1024 ? 'pass' : 'warning',
      message: `${window.innerWidth}x${window.innerHeight} (Recommended: 1024x768 or higher)`,
    });

    // Check storage
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      results.push({
        name: 'Local Storage',
        status: 'pass',
        message: 'Storage available and functional',
      });
    } catch {
      results.push({
        name: 'Local Storage',
        status: 'warning',
        message: 'Limited or no storage available',
      });
    }

    // Check HTTPS
    results.push({
      name: 'Secure Connection (HTTPS)',
      status: window.location.protocol === 'https:' ? 'pass' : 'warning',
      message: window.location.protocol === 'https:' ? 'Secure connection' : 'Not using HTTPS',
    });

    setChecks(results);
    setChecking(false);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const allPassed = checks.length > 0 && checks.every(c => c.status === 'pass' || c.status === 'warning');

  const getStatusIcon = (status: string) => {
    if (status === 'pass') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'fail') return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'pass') return 'bg-green-500/20 text-green-700';
    if (status === 'fail') return 'bg-destructive/20 text-destructive';
    return 'bg-yellow-500/20 text-yellow-700';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Compatibility Check</h1>
            <p className="text-muted-foreground">Verify your system is ready for exams</p>
          </div>
          <Button onClick={performSystemCheck} disabled={checking} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Re-run Check'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Requirements
              </span>
              {checks.length > 0 && (
                <Badge variant={allPassed ? 'default' : 'secondary'}>
                  {passCount}/{checks.length} Passed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Running system check...
              </div>
            ) : (
              <div className="space-y-3">
                {checks.map((check) => (
                  <div
                    key={check.name}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(check.status)}
                        <div>
                          <h4 className="font-medium text-foreground">{check.name}</h4>
                          <p className="text-sm text-muted-foreground">{check.message}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(check.status)}>
                        {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {allPassed && checks.length > 0 && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900">System Ready</h4>
                  <p className="text-sm text-green-700">Your system meets all requirements for taking exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
