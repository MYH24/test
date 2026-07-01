'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Exam } from '@/types';
import { FileText, Clock, Calendar, Play, Loader2 } from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';

export default function StudentExamsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'student')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'student') {
      try {
        const db = getDb();
        const exams = db.getActiveExams();
        const upcoming = exams.filter(e => isFuture(new Date(e.endWindow)));
        setUpcomingExams(upcoming);
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
          <h1 className="text-2xl font-bold text-foreground">Available Exams</h1>
          <p className="text-muted-foreground">Take your assigned exams</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upcoming Exams ({upcomingExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingExams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No upcoming exams available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg text-foreground">{exam.title}</h3>
                        <p className="text-sm text-muted-foreground">{exam.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-500/20 text-green-700">
                        Available
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Duration</span>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exam.duration} min
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Questions</span>
                        <p className="font-medium">{exam.questions.length}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Points</span>
                        <p className="font-medium">{exam.totalPoints}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deadline</span>
                        <p className="font-medium text-xs">{format(new Date(exam.endWindow), 'MMM d')}</p>
                      </div>
                    </div>

                    <Link href={`/exam/${exam.id}`}>
                      <Button className="w-full">
                        <Play className="mr-2 h-4 w-4" />
                        Start Exam
                      </Button>
                    </Link>
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
