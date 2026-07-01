'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Exam } from '@/types';
import {
  FileText,
  Plus,
  Users,
  BarChart3,
  Clock,
  Calendar,
  Edit,
  Eye,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';

export default function InstructorDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    completedSessions: 0,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'instructor')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'instructor') {
      try {
        const db = getDb();
        const instructorExams = db.getExamsByInstructor(user.id);
        setExams(instructorExams);
        
        const now = new Date();
        const activeCount = instructorExams.filter(
          e => e.status === 'active' && e.startWindow <= now && e.endWindow >= now
        ).length;
        
        setStats({
          totalExams: instructorExams.length,
          activeExams: activeCount,
          totalStudents: db.getUsersByRole('student').length,
          completedSessions: 0,
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

  const getStatusBadge = (exam: Exam) => {
    const now = new Date();
    if (exam.status === 'draft') {
      return <Badge variant="secondary">Draft</Badge>;
    }
    if (exam.status === 'completed') {
      return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
    }
    if (exam.startWindow > now) {
      return <Badge className="bg-warning/20 text-warning">Scheduled</Badge>;
    }
    if (exam.endWindow < now) {
      return <Badge className="bg-muted text-muted-foreground">Ended</Badge>;
    }
    return <Badge className="bg-primary/20 text-primary">Active</Badge>;
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
            <p className="text-muted-foreground">Manage your exams and track student progress</p>
          </div>
          <Button onClick={() => router.push('/instructor/exams/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.totalExams}</div>
              <p className="text-xs text-muted-foreground mt-1">Created by you</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Exams</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeExams}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">In system</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.completedSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Exam sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Exams */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="justify-start" onClick={() => router.push('/instructor/exams/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Exam
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => router.push('/instructor/exams')}>
                <BookOpen className="mr-2 h-4 w-4" />
                My Exams
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Results
              </Button>
            </CardContent>
          </Card>

          {/* Recent Exams */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">Recent Exams</CardTitle>
                <CardDescription>Your latest examinations</CardDescription>
              </div>
              <Link href="/instructor/exams">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No exams created yet</p>
                  <Button onClick={() => router.push('/instructor/exams/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Exam
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {exams.slice(0, 5).map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate">{exam.title}</h4>
                          {getStatusBadge(exam)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exam.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(exam.startWindow), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {exam.questions.length} questions
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push('/instructor/exams')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push('/instructor/exams')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
