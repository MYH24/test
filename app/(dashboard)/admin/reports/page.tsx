'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExamResult } from '@/types';
import { BarChart3, Download, Loader2, TrendingUp } from 'lucide-react';

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalSessions: 0,
    averageScore: 0,
    passRate: 0,
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
        const allResults = db.results;
        setResults(allResults);

        const avgScore = allResults.length > 0
          ? Math.round(allResults.reduce((acc, r) => acc + r.percentage, 0) / allResults.length)
          : 0;
        
        const passCount = allResults.filter(r => r.passed).length;
        const passRate = allResults.length > 0
          ? Math.round((passCount / allResults.length) * 100)
          : 0;

        setStats({
          totalExams: db.getAllExams().length,
          totalSessions: allResults.length,
          averageScore: avgScore,
          passRate: passRate,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">System-wide exam statistics and insights</p>
          </div>
          <Button disabled>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <TrendingUp className="h-4 w-4 text-green-500 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Exam Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Result ID</th>
                    <th className="text-left py-3 px-4 font-medium">Score</th>
                    <th className="text-left py-3 px-4 font-medium">Percentage</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 20).map((result) => (
                    <tr key={result.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 text-xs font-mono">{result.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">{result.score}/{result.maxScore}</td>
                      <td className="py-3 px-4">{result.percentage}%</td>
                      <td className="py-3 px-4">
                        <Badge variant={result.passed ? 'default' : 'destructive'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {result.flaggedForReview ? (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No exam results available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
