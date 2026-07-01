'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProctorAlert } from '@/types';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProctorAlertsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<ProctorAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

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

  const filteredAlerts = filterSeverity === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filterSeverity);

  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-destructive/20 text-destructive',
      warning: 'bg-yellow-500/20 text-yellow-700',
      info: 'bg-blue-500/20 text-blue-700',
    };
    return colors[severity] || 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-muted-foreground">Review exam session alerts and suspicious activities</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Alerts', value: alertStats.total },
            { label: 'Critical', value: alertStats.critical, color: 'text-destructive' },
            { label: 'Warnings', value: alertStats.warning, color: 'text-yellow-700' },
            { label: 'Info', value: alertStats.info, color: 'text-blue-700' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alerts Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              {['all', 'critical', 'warning', 'info'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setFilterSeverity(severity)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterSeverity === severity
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No alerts found
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-medium text-foreground">{alert.type}</h4>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </div>
                      <span>Session: {alert.sessionId?.slice(0, 8)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
