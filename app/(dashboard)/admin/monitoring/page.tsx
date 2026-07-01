'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExamSession, ProctorAlert, User } from '@/types';
import { Eye, AlertTriangle, Users, Activity, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminMonitoringPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ExamSession[]>([]);
  const [alerts, setAlerts] = useState<ProctorAlert[]>([]);
  const [students, setStudents] = useState<Record<string, User>>({});
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    averageTrustScore: 0,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'admin') {
      try {
        const db = getDb();
        const sessions = db.getActiveSessions();
        const allAlerts = db.alerts;
        const studentList = db.getUsersByRole('student');

        const studentMap: Record<string, User> = {};
        studentList.forEach(s => {
          studentMap[s.id] = s;
        });

        setActiveSessions(sessions);
        setAlerts(allAlerts.slice(0, 20));
        setStudents(studentMap);

        setStats({
          activeSessions: sessions.length,
          totalAlerts: allAlerts.length,
          criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
          averageTrustScore: sessions.length > 0
            ? Math.round(sessions.reduce((acc, s) => acc + s.trustScore, 0) / sessions.length)
            : 100,
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
          <h1 className="text-2xl font-bold text-foreground">Live Monitoring</h1>
          <p className="text-muted-foreground">System-wide exam session monitoring and alerts</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Total Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.criticalAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Avg Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageTrustScore}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Active Exam Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions at this time
                </div>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {students[session.studentId]?.firstName} {students[session.studentId]?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">Session: {session.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Trust: {Math.round(session.trustScore)}%</Badge>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge 
                      variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="flex-shrink-0"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
