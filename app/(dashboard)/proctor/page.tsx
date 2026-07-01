'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExamSession, ProctorAlert, User } from '@/types';
import {
  Eye,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  Video,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProctorDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ExamSession[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<ProctorAlert[]>([]);
  const [students, setStudents] = useState<Record<string, User>>({});
  const [stats, setStats] = useState({
    activeSessions: 0,
    unresolvedAlerts: 0,
    todaysSessions: 0,
    averageTrustScore: 0,
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
        const sessions = db.getActiveSessions();
        const alerts = db.getUnresolvedAlerts();
        const allStudents = db.getUsersByRole('student');
        
        const studentMap: Record<string, User> = {};
        allStudents.forEach(s => {
          studentMap[s.id] = s;
        });
        
        setActiveSessions(sessions);
        setRecentAlerts(alerts.slice(0, 10));
        setStudents(studentMap);
        
        setStats({
          activeSessions: sessions.length,
          unresolvedAlerts: alerts.length,
          todaysSessions: sessions.length,
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/20 text-destructive';
      case 'high':
        return 'bg-warning/20 text-warning';
      case 'medium':
        return 'bg-accent/20 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Proctor Dashboard</h1>
            <p className="text-muted-foreground">Monitor exam sessions in real-time</p>
          </div>
          <Button disabled>
            <Eye className="mr-2 h-4 w-4" />
            Live Monitoring
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
              <Eye className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently being monitored</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unresolved Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.unresolvedAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{"Today's Sessions"}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.todaysSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Monitored today</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Trust Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTrustScoreColor(stats.averageTrustScore)}`}>
                {stats.averageTrustScore}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across active sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions & Alerts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Sessions */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">Active Sessions</CardTitle>
                <CardDescription>Students currently taking exams</CardDescription>
              </div>
              <Button variant="outline" size="sm" disabled>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active sessions</p>
                  <p className="text-sm text-muted-foreground">Sessions will appear here when students start exams</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.slice(0, 5).map((session) => {
                    const student = students[session.studentId];
                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => alert(`View session ${session.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                              <Video className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-card recording-pulse" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Trust Score: <span className={getTrustScoreColor(session.trustScore)}>{session.trustScore}%</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.alerts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {session.alerts.filter(a => !a.resolved).length} alerts
                            </Badge>
                          )}
                          <Button variant="ghost" size="icon">
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">Recent Alerts</CardTitle>
                <CardDescription>Latest proctoring alerts</CardDescription>
              </div>
              <Button variant="outline" size="sm" disabled>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">No unresolved alerts</p>
                  <p className="text-sm text-muted-foreground">All proctoring alerts have been resolved</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAlerts.map((alert) => {
                    const student = students[alert.studentId];
                    return (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm">{alert.message}</p>
                            <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {student ? `${student.firstName} ${student.lastName}` : 'Unknown'} -{' '}
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Review
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
            <CardDescription>Common proctor tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
              <Eye className="h-5 w-5" />
              <span>Live Monitor</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
              <AlertTriangle className="h-5 w-5" />
              <span>Review Alerts</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
              <Video className="h-5 w-5" />
              <span>Recordings</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
              <Activity className="h-5 w-5" />
              <span>Reports</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
