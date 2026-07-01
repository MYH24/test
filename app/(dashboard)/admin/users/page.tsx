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
import { User } from '@/types';
import { Users, Search, Loader2, Trash2, Lock } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role === 'admin') {
      try {
        const db = getDb();
        const users = db.getAllUsers();
        setAllUsers(users);
        setFilteredUsers(users);
      } catch {
        // Database not available
      }
    }
  }, [user]);

  useEffect(() => {
    let filtered = allUsers;

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, allUsers]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userStats = {
    total: allUsers.length,
    admins: allUsers.filter(u => u.role === 'admin').length,
    instructors: allUsers.filter(u => u.role === 'instructor').length,
    proctors: allUsers.filter(u => u.role === 'proctor').length,
    students: allUsers.filter(u => u.role === 'student').length,
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-destructive/20 text-destructive',
      instructor: 'bg-primary/20 text-primary',
      proctor: 'bg-warning/20 text-warning',
      student: 'bg-accent/20 text-accent',
    };
    return colors[role] || 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage all system users and their roles</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: 'Total Users', value: userStats.total },
            { label: 'Admins', value: userStats.admins },
            { label: 'Instructors', value: userStats.instructors },
            { label: 'Proctors', value: userStats.proctors },
            { label: 'Students', value: userStats.students },
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
            <CardTitle>Users List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="instructor">Instructors</option>
                <option value="proctor">Proctors</option>
                <option value="student">Students</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{u.firstName} {u.lastName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge className={getRoleColor(u.role)}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-green-500/20 text-green-700">
                          Active
                        </Badge>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <Button variant="ghost" size="icon" disabled>
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filteredUsers.length} of {allUsers.length} users
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
