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
import { Exam } from '@/types';
import { FileText, Search, Loader2, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminExamsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'admin') {
      try {
        const db = getDb();
        const exams = db.getAllExams();
        setAllExams(exams);
        setFilteredExams(exams);
      } catch {
        // Database not available
      }
    }
  }, [user]);

  useEffect(() => {
    let filtered = allExams;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredExams(filtered);
  }, [searchQuery, statusFilter, allExams]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const examStats = {
    total: allExams.length,
    draft: allExams.filter(e => e.status === 'draft').length,
    scheduled: allExams.filter(e => e.status === 'scheduled').length,
    active: allExams.filter(e => e.status === 'active').length,
    completed: allExams.filter(e => e.status === 'completed').length,
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      scheduled: { variant: 'outline', label: 'Scheduled' },
      active: { variant: 'default', label: 'Active' },
      completed: { variant: 'outline', label: 'Completed' },
    };
    const badge = badges[status] || { variant: 'outline', label: status };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Exams</h1>
          <p className="text-muted-foreground">Manage and monitor all system exams</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: 'Total Exams', value: examStats.total },
            { label: 'Drafts', value: examStats.draft },
            { label: 'Scheduled', value: examStats.scheduled },
            { label: 'Active', value: examStats.active },
            { label: 'Completed', value: examStats.completed },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Exams List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exams..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Exams Grid */}
            <div className="grid gap-4">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-foreground">{exam.title}</h3>
                          <p className="text-sm text-muted-foreground">{exam.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(exam.startWindow), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {exam.questions.length} Questions
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(exam.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredExams.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No exams found matching your criteria
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Showing {filteredExams.length} of {allExams.length} exams
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
