'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Question } from '@/types';
import { BookOpen, Plus, Loader2, Trash2, Edit } from 'lucide-react';

export default function InstructorQuestionsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'instructor')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'instructor') {
      // In production, this would fetch from database
      setQuestions([]);
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'multiple-choice': 'bg-blue-500/20 text-blue-700',
      'true-false': 'bg-green-500/20 text-green-700',
      'multi-select': 'bg-purple-500/20 text-purple-700',
      'short-answer': 'bg-orange-500/20 text-orange-700',
      'essay': 'bg-red-500/20 text-red-700',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
            <p className="text-muted-foreground">Manage your reusable questions</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Create Question
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No questions in your question bank yet</p>
                <Button disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => (
                  <div key={question.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground">{question.content}</h4>
                          <Badge className={getTypeColor(question.type)}>
                            {question.type}
                          </Badge>
                          <Badge variant="outline">{question.points} pts</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" disabled>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
