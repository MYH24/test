'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExamSession } from '@/types';
import { Video, Loader2 } from 'lucide-react';

export default function ProctorRecordingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<ExamSession[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'proctor')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'proctor') {
      try {
        const db = getDb();
        const completedSessions = db.sessions.filter(s => s.status === 'completed');
        setSessions(completedSessions);
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
          <h1 className="text-2xl font-bold text-foreground">Session Recordings</h1>
          <p className="text-muted-foreground">Review recorded exam sessions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Completed Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No recorded sessions available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-foreground">Session {session.id.slice(0, 8)}</h4>
                        <p className="text-sm text-muted-foreground">Duration: ~{session.duration} minutes</p>
                      </div>
                      <Badge variant="outline">Recorded</Badge>
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
