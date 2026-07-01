'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  Eye,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  Activity,
  Loader2,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalExams: number;
  activeExams: number;
  activeSessions: number;
  totalSessions: number;
  unresolvedAlerts: number;
  totalAlerts: number;
  usersByRole: {
    admin: number;
    instructor: number;
    proctor: number;
    student: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'admin') {
      try {
        const db = getDb();
        setStats(db.getStats());
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
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            System Status
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats?.totalUsers || 0}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {stats?.usersByRole.student || 0} Students
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats?.usersByRole.instructor || 0} Instructors
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats?.totalExams || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-primary">{stats?.activeExams || 0} active</span> right now
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats?.activeSessions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Being monitored in real-time
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unresolved Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats?.unresolvedAlerts || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="justify-start" disabled>
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <FileText className="mr-2 h-4 w-4" />
                View All Exams
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Eye className="mr-2 h-4 w-4" />
                Live Monitoring
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Clock className="mr-2 h-4 w-4" />
                Audit Logs
              </Button>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">System Health</CardTitle>
              <CardDescription>Current system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-foreground">AI Proctoring Service</span>
                </div>
                <Badge className="bg-primary/20 text-primary">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-foreground">Database</span>
                </div>
                <Badge className="bg-primary/20 text-primary">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-foreground">Authentication</span>
                </div>
                <Badge className="bg-primary/20 text-primary">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                  <span className="text-sm text-foreground">Alert System</span>
                </div>
                <Badge className="bg-warning/20 text-warning">
                  {stats?.unresolvedAlerts || 0} Pending
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Distribution */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">User Distribution</CardTitle>
            <CardDescription>Breakdown by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <div className="text-3xl font-bold text-destructive">{stats?.usersByRole.admin || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">Admins</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <div className="text-3xl font-bold text-primary">{stats?.usersByRole.instructor || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">Instructors</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <div className="text-3xl font-bold text-warning">{stats?.usersByRole.proctor || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">Proctors</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <div className="text-3xl font-bold text-accent">{stats?.usersByRole.student || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">Students</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
