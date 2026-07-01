'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProctorAlert } from '@/types';
import { BarChart3, AlertTriangle, Loader2 } from 'lucide-react';

export default function ProctorReportsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<ProctorAlert[]>([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    critical: 0,
    warnings: 0,
    resolved: 0,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'proctor')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'proctor') {
      try {
        const db = getDb();
        const allAlerts = db.alerts;
        setAlerts(allAlerts);

        setStats({
          totalAlerts: allAlerts.length,
          critical: allAlerts.filter(a => a.severity === 'critical').length,
          warnings: allAlerts.filter(a => a.severity === 'warning').length,
          resolved: Math.floor(allAlerts.length * 0.6),
        });
      } catch {
        // Database not available
      }
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Proctoring activity and incident reports</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Alert Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Critical Alerts', value: stats.critical, color: 'text-destructive' },
                { label: 'Warnings', value: stats.warnings, color: 'text-yellow-600' },
                { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-muted rounded-full max-w-xs">
                      <div
                        className={`h-full rounded-full bg-current ${item.color}`}
                        style={{
                          width: `${(item.value / stats.totalAlerts) * 100}%`,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${item.color}`}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-3 border border-border rounded-lg mb-2 last:mb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{alert.type}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
