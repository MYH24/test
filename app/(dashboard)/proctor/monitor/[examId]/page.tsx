"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { getDb } from "@/lib/db/mock-db";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Monitor,
  Users,
  AlertTriangle,
  Eye,
  MoreVertical,
  MessageSquare,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Grid3X3,
  List,
  Shield,
  Camera,
  Activity,
  RefreshCw,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Exam, ExamSession, User, ProctoringAlert } from "@/types";

interface StudentMonitorCard {
  session: ExamSession;
  student: User;
  alerts: ProctoringAlert[];
  isSelected: boolean;
}

export default function LiveMonitorPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [sessions, setSessions] = useState<StudentMonitorCard[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "alerts" | "normal">("all");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "proctor" && user.role !== "admin" && user.role !== "instructor")) {
      router.push("/login");
      return;
    }

    try {
      const db = getDb();
      const foundExam = db.getExamById(examId);
      if (foundExam) {
        setExam(foundExam);
        loadSessions();
      }
    } catch {
      // DB not available
    }
  }, [examId, user, isLoading, router]);

  const loadSessions = () => {
    try {
      const db = getDb();
      const examSessions = db.getSessionsByExam(examId);
      const allStudents = db.getAllUsers();
      const monitorCards: StudentMonitorCard[] = examSessions
        .filter((s) => s.status === "in_progress" || s.status === "in-progress")
        .map((session) => {
          const student = allStudents.find((u) => u.id === session.studentId);
          return {
            session,
            student: student!,
            alerts: session.alerts || [],
            isSelected: session.id === selectedSession,
          };
        });
      setSessions(monitorCards);
    } catch {
      // DB not available
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    loadSessions();
    setIsRefreshing(false);
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions();
    }, 10000);
    return () => clearInterval(interval);
  }, [examId]);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      `${s.student.firstName} ${s.student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "alerts" && s.alerts.length > 0) ||
      (filterStatus === "normal" && s.alerts.length === 0);
    
    return matchesSearch && matchesFilter;
  });

  const totalAlerts = sessions.reduce((sum, s) => sum + s.alerts.length, 0);
  const criticalAlerts = sessions.reduce(
    (sum, s) => sum + s.alerts.filter((a) => a.severity === "critical" || a.severity === "high").length,
    0
  );

  const getSessionSelected = () => {
    return sessions.find((s) => s.session.id === selectedSession);
  };

  const handleSendMessage = () => {
    // In a real implementation, this would send a message to the student
    console.log("Sending message to:", selectedSession, messageText);
    setShowMessageDialog(false);
    setMessageText("");
  };

  const handleTerminateSession = () => {
    if (!selectedSession) return;
    
    const session = sessions.find((s) => s.session.id === selectedSession);
    if (session) {
      const updatedSession = { ...session.session, status: "terminated" as const };
      try { getDb().updateSession(updatedSession.id, updatedSession); } catch {}
      loadSessions();
    }
    
    setShowTerminateDialog(false);
    setSelectedSession(null);
  };

  const getTrustScoreColor = (score: number): string => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getTrustScoreBg = (score: number): string => {
    if (score >= 80) return "bg-success/10";
    if (score >= 50) return "bg-warning/10";
    return "bg-destructive/10";
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

  const selected = getSessionSelected();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Monitor className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold">Live Monitoring</h1>
              <Badge variant="secondary" className="gap-1">
                <Activity className="h-3 w-3" />
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground">{exam.title}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Active Students</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalAlerts}</p>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-destructive">{criticalAlerts}</p>
                  <p className="text-sm text-muted-foreground">Critical Alerts</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(sessions.reduce((sum, s) => sum + s.session.trustScore, 0) / (sessions.length || 1))}%
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Trust Score</p>
                </div>
                <Shield className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Student Grid/List */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <TabsList>
                  <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
                  <TabsTrigger value="alerts">
                    With Alerts ({sessions.filter((s) => s.alerts.length > 0).length})
                  </TabsTrigger>
                  <TabsTrigger value="normal">Normal</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Sessions Display */}
            <div className="flex-1 overflow-auto">
              {filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-50" />
                  <p>No active sessions</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-3 gap-4">
                  {filteredSessions.map((card) => (
                    <Card
                      key={card.session.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSession === card.session.id ? "ring-2 ring-primary" : ""
                      } ${card.alerts.some((a) => a.severity === "critical") ? "border-destructive" : ""}`}
                      onClick={() => setSelectedSession(card.session.id)}
                    >
                      <CardContent className="p-4">
                        {/* Simulated camera feed */}
                        <div className="aspect-video bg-muted rounded-lg mb-3 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                          
                          {/* Status indicators */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${
                              card.session.trustScore >= 80 ? "bg-success" : 
                              card.session.trustScore >= 50 ? "bg-warning" : "bg-destructive"
                            } animate-pulse`} />
                          </div>
                          
                          {card.alerts.length > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute top-2 right-2 text-xs"
                            >
                              {card.alerts.length}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{card.student.firstName} {card.student.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              Trust: {card.session.trustScore}%
                            </p>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedSession(card.session.id);
                                setShowMessageDialog(true);
                              }}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSession(card.session.id);
                                  setShowTerminateDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Terminate Session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSessions.map((card) => (
                    <Card
                      key={card.session.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSession === card.session.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedSession(card.session.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Camera className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{card.student.firstName} {card.student.lastName}</p>
                            <p className="text-sm text-muted-foreground">{card.student.email}</p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getTrustScoreBg(card.session.trustScore)} ${getTrustScoreColor(card.session.trustScore)}`}>
                              {card.session.trustScore}%
                            </div>
                            
                            {card.alerts.length > 0 && (
                              <Badge variant="destructive">{card.alerts.length} alerts</Badge>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSession(card.session.id);
                                  setShowMessageDialog(true);
                                }}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedSession(card.session.id);
                                    setShowTerminateDialog(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Terminate Session
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
          </div>

          {/* Details Panel */}
          <Card className="w-96 flex flex-col">
            {selected ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selected.student.firstName} {selected.student.lastName}</CardTitle>
                      <CardDescription>{selected.student.email}</CardDescription>
                    </div>
                    <Badge
                      variant={selected.session.trustScore >= 80 ? "default" : 
                              selected.session.trustScore >= 50 ? "secondary" : "destructive"}
                    >
                      {selected.session.trustScore}%
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                  {/* Session Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Session Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Started</div>
                      <div>{new Date(selected.session.startTime).toLocaleTimeString()}</div>
                      <div className="text-muted-foreground">Device</div>
                      <div className="truncate text-xs">{selected.session.browserInfo?.split(" ")[0]}</div>
                    </div>
                  </div>
                  
                  {/* Live Camera */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Live Feed</h4>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  </div>
                  
                  {/* Alerts */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Alerts ({selected.alerts.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {selected.alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No alerts recorded
                        </p>
                      ) : (
                        selected.alerts.map((alert, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg text-sm ${
                              alert.severity === "critical"
                                ? "bg-destructive/10 border border-destructive/20"
                                : alert.severity === "high"
                                ? "bg-warning/10 border border-warning/20"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant={
                                alert.severity === "critical" || alert.severity === "high"
                                  ? "destructive"
                                  : "secondary"
                              } className="text-xs">
                                {alert.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{alert.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <div className="border-t p-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowMessageDialog(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowTerminateDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Terminate
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                <Eye className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Select a student to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Message Dialog */}
      <AlertDialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Message to Student</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be displayed to the student in their exam interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="min-h-24"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendMessage} disabled={!messageText.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Dialog */}
      <AlertDialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Terminate Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end the student&apos;s exam session. Their progress will be saved,
              but they will not be able to continue. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Ban className="h-4 w-4 mr-2" />
              Terminate Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
