'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Exam } from '@/types';
import {
  Plus,
  Search,
  Clock,
  Calendar,
  FileText,
  Edit,
  Eye,
  Trash2,
  MoreVertical,
  Copy,
  Loader2,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';

export default function InstructorExamsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
      } catch {
        // Database not available
      }
    }
  }, [user]);

  const handleDelete = (examId: string) => {
    try {
      const db = getDb();
      db.deleteExam(examId);
      setExams(exams.filter(e => e.id !== examId));
    } catch {
      console.error('Failed to delete exam');
    }
  };

  const handleDuplicate = (exam: Exam) => {
    try {
      const db = getDb();
      db.createExam({
        ...exam,
        title: `${exam.title} (Copy)`,
        status: 'draft',
        startWindow: new Date(),
        endWindow: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const updatedExams = db.getExamsByInstructor(user!.id);
      setExams(updatedExams);
    } catch {
      console.error('Failed to duplicate exam');
    }
  };

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
    if (exam.status === 'completed' || exam.status === 'archived') {
      return <Badge className="bg-muted text-muted-foreground">{exam.status}</Badge>;
    }
    if (new Date(exam.startWindow) > now) {
      return <Badge className="bg-warning/20 text-warning">Scheduled</Badge>;
    }
    if (new Date(exam.endWindow) < now) {
      return <Badge className="bg-muted text-muted-foreground">Ended</Badge>;
    }
    return <Badge className="bg-primary/20 text-primary">Active</Badge>;
  };

  const getProctoringBadge = (level: string) => {
    const colors: Record<string, string> = {
      'full-lockdown': 'bg-destructive/20 text-destructive',
      'strict': 'bg-warning/20 text-warning',
      'standard': 'bg-primary/20 text-primary',
      'basic': 'bg-accent/20 text-accent',
      'none': 'bg-muted text-muted-foreground',
    };
    return (
      <Badge className={colors[level] || 'bg-muted text-muted-foreground'}>
        <Shield className="h-3 w-3 mr-1" />
        {level.replace('-', ' ')}
      </Badge>
    );
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    
    const now = new Date();
    switch (filterStatus) {
      case 'draft':
        return matchesSearch && exam.status === 'draft';
      case 'active':
        return matchesSearch && exam.status !== 'draft' && 
          new Date(exam.startWindow) <= now && new Date(exam.endWindow) >= now;
      case 'scheduled':
        return matchesSearch && exam.status !== 'draft' && new Date(exam.startWindow) > now;
      case 'ended':
        return matchesSearch && new Date(exam.endWindow) < now;
      default:
        return matchesSearch;
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Exams</h1>
            <p className="text-muted-foreground">Create and manage your examinations</p>
          </div>
          <Button onClick={() => router.push('/instructor/exams/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'scheduled', 'draft', 'ended'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Exams List */}
        {filteredExams.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'No exams found' : 'No exams yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first exam to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push('/instructor/exams/create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Exam
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredExams.map((exam) => (
              <Card key={exam.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-foreground truncate">{exam.title}</h3>
                        {getStatusBadge(exam)}
                        {getProctoringBadge(exam.settings.proctoring)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                        {exam.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exam.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {exam.questions.length} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(exam.startWindow), 'MMM d')} - {format(new Date(exam.endWindow), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/instructor/exams/${exam.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/instructor/exams/${exam.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicate(exam)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(exam.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
