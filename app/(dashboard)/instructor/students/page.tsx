'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User } from '@/types';
import { Users, Search, Loader2 } from 'lucide-react';

export default function InstructorStudentsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'instructor')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'instructor') {
      try {
        const db = getDb();
        const allStudents = db.getUsersByRole('student');
        setStudents(allStudents);
        setFilteredStudents(allStudents);
      } catch {
        // Database not available
      }
    }
  }, [user]);

  useEffect(() => {
    let filtered = students;

    if (searchQuery) {
      filtered = filtered.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }, [searchQuery, students]);

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
          <h1 className="text-2xl font-bold text-foreground">Student Roster</h1>
          <p className="text-muted-foreground">Manage your enrolled students</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{student.firstName} {student.lastName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{student.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-green-500/20 text-green-700">
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No students found
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
