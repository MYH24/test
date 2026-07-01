'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExamSession, User } from '@/types';
import { Eye, Users, Loader2 } from 'lucide-react';

export default function ProctorLiveSessionsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [students, setStudents] = useState<Record<string, User>>({});

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'proctor')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'proctor') {
      try {
        const db = getDb();
        const activeSessions = db.getActiveSessions();
        const studentList = db.getUsersByRole('student');

        const studentMap: Record<string, User> = {};
        studentList.forEach(s => {
          studentMap[s.id] = s;
        });

        setSessions(activeSessions);
        setStudents(studentMap);
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
          <h1 className="text-2xl font-bold text-foreground">Live Sessions</h1>
          <p className="text-muted-foreground">Monitor ongoing exam sessions in real-time</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Active Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No active exam sessions at this time</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {students[session.studentId]?.firstName} {students[session.studentId]?.lastName}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">Session: {session.id.slice(0, 8)}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-500/20 text-green-700">
                        Live
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Trust Score:</span>
                        <span className="font-medium">{Math.round(session.trustScore)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alerts:</span>
                        <span className="font-medium">{session.alerts.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
