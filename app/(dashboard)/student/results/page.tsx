'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExamResult } from '@/types';
import { BarChart3, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentResultsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    passed: 0,
    failed: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'student')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'student') {
      try {
        const db = getDb();
        const studentResults = db.getResultsByStudent(user.id);
        setResults(studentResults);

        const avgScore = studentResults.length > 0
          ? Math.round(studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length)
          : 0;

        const passedCount = studentResults.filter(r => r.passed).length;

        setStats({
          totalExams: studentResults.length,
          passed: passedCount,
          failed: studentResults.length - passedCount,
          averageScore: avgScore,
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
          <h1 className="text-2xl font-bold text-foreground">My Results</h1>
          <p className="text-muted-foreground">View your exam scores and performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExams}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Exam Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No exam results yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-foreground">Exam {result.examId.slice(0, 8)}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(result.gradedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={result.passed ? 'default' : 'destructive'}
                          className="flex items-center gap-1"
                        >
                          {result.passed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Passed
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Failed
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <span className="text-sm font-medium">
                          {result.score} / {result.maxScore}
                        </span>
                      </div>
                      <Progress value={result.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{result.percentage}%</p>
                    </div>

                    {result.flaggedForReview && (
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 text-xs">
                        Flagged for Review
                      </Badge>
                    )}
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
