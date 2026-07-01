'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, Search, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  details: string;
  status: 'success' | 'failed' | 'warning';
}

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'admin') {
      // Generate mock audit logs
      const mockLogs: AuditLog[] = [
        {
          id: 'log-1',
          action: 'User Login',
          user: 'instructor@example.com',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          details: 'Successful login from 192.168.1.100',
          status: 'success',
        },
        {
          id: 'log-2',
          action: 'Exam Created',
          user: 'instructor@example.com',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          details: 'Created new exam: Data Science 101',
          status: 'success',
        },
        {
          id: 'log-3',
          action: 'Failed Login',
          user: 'student@example.com',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          details: 'Invalid password attempt',
          status: 'failed',
        },
        {
          id: 'log-4',
          action: 'Exam Started',
          user: 'student@example.com',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          details: 'Started exam: Database Design',
          status: 'success',
        },
        {
          id: 'log-5',
          action: 'Suspicious Activity',
          user: 'student@example.com',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          details: 'Multiple face detection failures detected',
          status: 'warning',
        },
      ];
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
    }
  }, [user]);

  useEffect(() => {
    let filtered = logs;

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [searchQuery, logs]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-500/20 text-green-700',
      failed: 'bg-destructive/20 text-destructive',
      warning: 'bg-yellow-500/20 text-yellow-700',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">System activity and security events</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{log.action}</h4>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>User: {log.user}</span>
                        <span>{formatDistanceToNow(log.timestamp, { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No logs found matching your search
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} logs
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
