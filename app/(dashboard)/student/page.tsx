'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Exam, ExamSession, ExamResult } from '@/types';
import {
  FileText,
  Clock,
  Calendar,
  Play,
  CheckCircle2,
  AlertCircle,
  Settings,
  BarChart3,
  Loader2,
  Shield,
  Monitor,
  Camera,
  Mic,
} from 'lucide-react';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'student')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'student') {
      try {
        const db = getDb();
        const activeExams = db.getActiveExams();
        const studentSessions = db.getSessionsByStudent(user.id);
        const studentResults = db.getResultsByStudent(user.id);
        
        setExams(activeExams);
        setSessions(studentSessions);
        setResults(studentResults);
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

  const upcomingExams = exams.filter(exam => {
    const completedSession = sessions.find(
      s => s.examId === exam.id && (s.status === 'completed' || s.status === 'terminated')
    );
    return !completedSession && isFuture(new Date(exam.endWindow));
  });

  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const averageScore = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length)
    : 0;

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startWindow);
    const end = new Date(exam.endWindow);
    
    if (now < start) {
      return { status: 'scheduled', label: 'Scheduled', color: 'bg-warning/20 text-warning' };
    }
    if (now > end) {
      return { status: 'ended', label: 'Ended', color: 'bg-muted text-muted-foreground' };
    }
    return { status: 'active', label: 'Available', color: 'bg-primary/20 text-primary' };
  };

  const getProctoringBadge = (level: string) => {
    switch (level) {
      case 'full-lockdown':
        return <Badge className="bg-destructive/20 text-destructive">Full Lockdown</Badge>;
      case 'strict':
        return <Badge className="bg-warning/20 text-warning">Strict</Badge>;
      case 'standard':
        return <Badge className="bg-primary/20 text-primary">Standard</Badge>;
      default:
        return <Badge variant="secondary">Basic</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user.firstName}!
            </h1>
            <p className="text-muted-foreground">Ready for your exams? Check your upcoming assessments below.</p>
          </div>
          <Button variant="outline" onClick={() => alert('System Check: Camera, microphone, and browser are ready!')}>
            <Settings className="mr-2 h-4 w-4" />
            System Check
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Exams</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{upcomingExams.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Available to take</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Exams finished</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{averageScore}%</div>
              <Progress value={averageScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* System Requirements Notice */}
        <Card className="border-border bg-card border-l-4 border-l-primary">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Before Taking an Exam</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ensure your system meets all requirements. You will need a working camera, microphone, 
                  and a stable internet connection. Run a system check before starting any exam.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Camera className="h-4 w-4" />
                    <span>Webcam</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mic className="h-4 w-4" />
                    <span>Microphone</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    <span>Screen Share</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Available Exams</CardTitle>
            <CardDescription>Exams you can take right now</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingExams.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No exams available</p>
                <p className="text-sm text-muted-foreground">Check back later for new assignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingExams.map((exam) => {
                  const { status, label, color } = getExamStatus(exam);
                  const canStart = status === 'active';
                  
                  return (
                    <div
                      key={exam.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground">{exam.title}</h4>
                          <Badge className={color}>{label}</Badge>
                          {getProctoringBadge(exam.settings.proctoring)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {exam.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exam.duration} minutes
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {exam.questions.length} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {status === 'active' 
                              ? `Ends ${formatDistanceToNow(new Date(exam.endWindow), { addSuffix: true })}`
                              : `Starts ${format(new Date(exam.startWindow), 'MMM d, h:mm a')}`
                            }
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canStart ? (
                          <Button onClick={() => router.push(`/exam/${exam.id}`)}>
                            <Play className="mr-2 h-4 w-4" />
                            Start Exam
                          </Button>
                        ) : (
                          <Button disabled variant="outline">
                            <Clock className="mr-2 h-4 w-4" />
                            Not Available
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        {results.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">Recent Results</CardTitle>
                <CardDescription>Your latest exam scores</CardDescription>
              </div>
              <Button variant="ghost" size="sm" disabled>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.slice(0, 3).map((result) => {
                  const exam = exams.find(e => e.id === result.examId);
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <div>
                        <p className="font-medium text-foreground">{exam?.title || 'Unknown Exam'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(result.gradedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${result.passed ? 'text-primary' : 'text-destructive'}`}>
                          {result.percentage}%
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {result.passed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              <span className="text-primary">Passed</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-destructive" />
                              <span className="text-destructive">Failed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
