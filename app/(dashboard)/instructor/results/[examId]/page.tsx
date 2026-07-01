"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { getDb } from "@/lib/db/mock-db";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Search,
  MoreVertical,
  Eye,
  FileText,
  Shield,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Flag,
} from "lucide-react";
import { Exam, ExamResult, ExamSession, User } from "@/types";

interface ResultWithDetails extends ExamResult {
  student: User;
  session: ExamSession;
}

export default function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ResultWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "passed" | "failed" | "flagged">("all");
  const [sortBy, setSortBy] = useState<"score" | "name" | "trust">("score");

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      router.push("/login");
      return;
    }

    try {
      const db = getDb();
      const foundExam = db.getExamById(examId);
      if (foundExam) {
        setExam(foundExam);
        loadResults();
      }
    } catch {
      // DB not available
    }
  }, [examId, user, isLoading, router]);

  const loadResults = () => {
    try {
      const db = getDb();
      const examResults = db.getResultsByExam(examId);
      const allStudents = db.getUsersByRole('student');
      const detailedResults: ResultWithDetails[] = examResults.map((result) => {
        const student = allStudents.find((u) => u.id === result.studentId)!;
        const session = db.getSessionById(result.sessionId)!;
        return { ...result, student, session };
      });
      setResults(detailedResults);
    } catch {
      // DB not available
    }
  };

  const filteredResults = results
    .filter((r) => {
      const matchesSearch =
        `${r.student.firstName} ${r.student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.student.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "passed" && r.passed) ||
        (filterStatus === "failed" && !r.passed) ||
        (filterStatus === "flagged" && r.flaggedForReview);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.percentage - a.percentage;
        case "name":
          return `${a.student.firstName} ${a.student.lastName}`.localeCompare(`${b.student.firstName} ${b.student.lastName}`);
        case "trust":
          return (b.trustScore || 0) - (a.trustScore || 0);
        default:
          return 0;
      }
    });

  const stats = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    flagged: results.filter((r) => r.flaggedForReview).length,
    avgScore: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
      : 0,
    avgTrust: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.trustScore || 100), 0) / results.length)
      : 0,
    highestScore: results.length > 0 ? Math.max(...results.map((r) => r.percentage)) : 0,
    lowestScore: results.length > 0 ? Math.min(...results.map((r) => r.percentage)) : 0,
  };

  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  const handleExportResults = () => {
    const csvContent = [
      ["Student Name", "Email", "Score", "Percentage", "Passed", "Trust Score", "Flagged", "Submitted At"].join(","),
      ...results.map((r) =>
        [
          `${r.student.firstName} ${r.student.lastName}`,
          r.student.email,
          `${r.score}/${r.maxScore}`,
          `${r.percentage}%`,
          r.passed ? "Yes" : "No",
          `${r.trustScore}%`,
          r.flaggedForReview ? "Yes" : "No",
          new Date(r.submittedAt).toISOString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam?.title || "exam"}-results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading || !exam) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/instructor/exams")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Exams
            </Button>
            <h1 className="text-2xl font-semibold">{exam.title}</h1>
            <p className="text-muted-foreground">Exam Results and Proctoring Reports</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportResults}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-success">{passRate}%</p>
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success/50" />
              </div>
              <Progress value={passRate} className="mt-3 h-1.5" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.avgScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/50" />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1 text-success">
                  <TrendingUp className="h-3 w-3" />
                  High: {stats.highestScore}%
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <TrendingDown className="h-3 w-3" />
                  Low: {stats.lowestScore}%
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${
                    stats.flagged > 0 ? "text-warning" : "text-foreground"
                  }`}>
                    {stats.flagged}
                  </p>
                  <p className="text-sm text-muted-foreground">Flagged for Review</p>
                </div>
                <Flag className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Results</CardTitle>
                <CardDescription>
                  View individual scores and proctoring information
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Tabs
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
                >
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="passed">Passed</TabsTrigger>
                    <TabsTrigger value="failed">Failed</TabsTrigger>
                    <TabsTrigger value="flagged">Flagged</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => setSortBy("score")}
                  >
                    Score {sortBy === "score" && "↓"}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => setSortBy("trust")}
                  >
                    Trust Score {sortBy === "trust" && "↓"}
                  </TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{result.student.firstName} {result.student.lastName}</p>
                          <p className="text-sm text-muted-foreground">{result.student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.percentage}%</span>
                          <span className="text-sm text-muted-foreground">
                            ({result.score}/{result.maxScore})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <Badge className="gap-1 bg-success/10 text-success border-success/20">
                              <CheckCircle2 className="h-3 w-3" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                          {result.flaggedForReview && (
                            <Badge variant="outline" className="gap-1 border-warning text-warning">
                              <Flag className="h-3 w-3" />
                              Review
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className={`h-4 w-4 ${
                            (result.trustScore || 100) >= 80 ? "text-success" :
                            (result.trustScore || 100) >= 50 ? "text-warning" : "text-destructive"
                          }`} />
                          <span className={`font-medium ${
                            (result.trustScore || 100) >= 80 ? "text-success" :
                            (result.trustScore || 100) >= 50 ? "text-warning" : "text-destructive"
                          }`}>
                            {result.trustScore || 100}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.session.alerts && result.session.alerts.length > 0 ? (
                          <Badge variant="secondary">
                            {result.session.alerts.length} alerts
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(result.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/instructor/results/${examId}/student/${result.studentId}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/instructor/results/${examId}/proctoring/${result.sessionId}`)}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Proctoring Report
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Download Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "90-100%", min: 90, color: "bg-success" },
                  { label: "80-89%", min: 80, color: "bg-success/70" },
                  { label: "70-79%", min: 70, color: "bg-primary" },
                  { label: "60-69%", min: 60, color: "bg-warning" },
                  { label: "Below 60%", min: 0, color: "bg-destructive" },
                ].map((range) => {
                  const count = results.filter((r) => {
                    if (range.min === 0) return r.percentage < 60;
                    if (range.min === 90) return r.percentage >= 90;
                    return r.percentage >= range.min && r.percentage < range.min + 10;
                  }).length;
                  const percentage = results.length > 0 ? (count / results.length) * 100 : 0;
                  
                  return (
                    <div key={range.label} className="flex items-center gap-3">
                      <span className="text-sm w-20">{range.label}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${range.color} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trust Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Excellent (90+)", min: 90, color: "bg-success" },
                  { label: "Good (80-89)", min: 80, color: "bg-success/70" },
                  { label: "Fair (70-79)", min: 70, color: "bg-warning" },
                  { label: "Poor (50-69)", min: 50, color: "bg-warning/70" },
                  { label: "Critical (<50)", min: 0, color: "bg-destructive" },
                ].map((range) => {
                  const count = results.filter((r) => {
                    const trust = r.trustScore || 100;
                    if (range.min === 0) return trust < 50;
                    if (range.min === 90) return trust >= 90;
                    return trust >= range.min && trust < range.min + 10;
                  }).length;
                  const percentage = results.length > 0 ? (count / results.length) * 100 : 0;
                  
                  return (
                    <div key={range.label} className="flex items-center gap-3">
                      <span className="text-sm w-28">{range.label}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${range.color} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
