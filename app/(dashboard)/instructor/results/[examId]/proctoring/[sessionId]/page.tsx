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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Eye,
  Camera,
  Monitor,
  Clock,
  User,
  Globe,
  Fingerprint,
  CheckCircle2,
  XCircle,
  Download,
  Flag,
  Activity,
  Volume2,
  MousePointer,
} from "lucide-react";
import { Exam, ExamSession, ExamResult, User as UserType, ProctoringAlert } from "@/types";

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: "alert" | "answer" | "action";
  severity?: ProctoringAlert["severity"];
  title: string;
  description: string;
  screenshot?: string;
}

export default function ProctoringReportPage({
  params,
}: {
  params: Promise<{ examId: string; sessionId: string }>;
}) {
  const { examId, sessionId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [student, setStudent] = useState<UserType | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "instructor" && user.role !== "admin" && user.role !== "proctor")) {
      router.push("/login");
      return;
    }

    try {
      const db = getDb();
      const foundExam = db.getExamById(examId);
      const foundSession = db.getSessionById(sessionId);
      
      if (foundExam && foundSession) {
        setExam(foundExam);
        setSession(foundSession);
        
        const allStudents = db.getAllUsers();
        const foundStudent = allStudents.find((u) => u.id === foundSession.studentId);
        if (foundStudent) setStudent(foundStudent);
        
        const sessionResults = db.getResultsByStudent(foundSession.studentId);
        const foundResult = sessionResults.find((r) => r.sessionId === sessionId);
      if (foundResult) setResult(foundResult);
      
      // Build timeline
      const events: TimelineEvent[] = [];
      
      // Add session start
      events.push({
        id: "start",
        timestamp: new Date(foundSession.startTime),
        type: "action",
        title: "Exam Started",
        description: "Student began the examination",
      });
      
      // Add alerts
      if (foundSession.alerts) {
        foundSession.alerts.forEach((alert) => {
          events.push({
            id: alert.id,
            timestamp: new Date(alert.timestamp),
            type: "alert",
            severity: alert.severity,
            title: alert.type.replace(/_/g, " "),
            description: alert.description,
            screenshot: alert.screenshot,
          });
        });
      }
      
      // Add session end
      if (foundSession.endTime) {
        events.push({
          id: "end",
          timestamp: new Date(foundSession.endTime),
          type: "action",
          title: "Exam Submitted",
          description: "Student completed and submitted the examination",
        });
      }
      
      // Sort by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setTimeline(events);
      }
    } catch {
      // DB not available
    }
  }, [examId, sessionId, user, isLoading, router]);

  const getSeverityColor = (severity: ProctoringAlert["severity"]): string => {
    switch (severity) {
      case "critical": return "text-destructive bg-destructive/10 border-destructive/20";
      case "high": return "text-warning bg-warning/10 border-warning/20";
      case "medium": return "text-primary bg-primary/10 border-primary/20";
      case "low": return "text-muted-foreground bg-muted";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const alertStats = session?.alerts?.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  if (isLoading || !exam || !session || !student) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  const duration = session.endTime
    ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/instructor/results/${examId}`)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Results
            </Button>
            <h1 className="text-2xl font-semibold">Proctoring Report</h1>
            <p className="text-muted-foreground">{exam.title} - {student.firstName} {student.lastName}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {result?.flaggedForReview && (
              <Badge variant="outline" className="gap-1 border-warning text-warning">
                <Flag className="h-3 w-3" />
                Flagged for Review
              </Badge>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>

        {/* Trust Score Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  session.trustScore >= 80 ? "bg-success/10" :
                  session.trustScore >= 50 ? "bg-warning/10" : "bg-destructive/10"
                }`}>
                  <Shield className={`h-10 w-10 ${
                    session.trustScore >= 80 ? "text-success" :
                    session.trustScore >= 50 ? "text-warning" : "text-destructive"
                  }`} />
                </div>
                <div>
                  <p className={`text-4xl font-bold ${
                    session.trustScore >= 80 ? "text-success" :
                    session.trustScore >= 50 ? "text-warning" : "text-destructive"
                  }`}>
                    {session.trustScore}%
                  </p>
                  <p className="text-sm text-muted-foreground">Trust Score</p>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-4 gap-6">
                <div>
                  <p className="text-2xl font-bold">{session.alerts?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{alertStats.critical || 0}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{alertStats.high || 0}</p>
                  <p className="text-sm text-muted-foreground">High</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{(alertStats.medium || 0) + (alertStats.low || 0)}</p>
                  <p className="text-sm text-muted-foreground">Medium/Low</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Exam Result</p>
                {result?.passed ? (
                  <Badge className="gap-1 bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Passed ({result.percentage}%)
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Failed ({result?.percentage || 0}%)
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-6">
          {/* Session Details */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{duration} minutes</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium truncate max-w-48" title={session.ipAddress}>
                    {session.ipAddress || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium truncate max-w-48" title={session.browserInfo}>
                    {session.browserInfo?.split(" ")[0] || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">Browser</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium font-mono truncate max-w-48">
                    {session.deviceFingerprint?.substring(0, 16)}...
                  </p>
                  <p className="text-xs text-muted-foreground">Device ID</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">Monitoring Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <Camera className="h-3 w-3" />
                    Camera Active
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <Volume2 className="h-3 w-3" />
                    Audio Active
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <Monitor className="h-3 w-3" />
                    Screen Shared
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <MousePointer className="h-3 w-3" />
                    Input Tracked
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Event Timeline
              </CardTitle>
              <CardDescription>
                Chronological log of all events during the exam session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                        event.type === "alert"
                          ? event.severity === "critical" || event.severity === "high"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning text-warning-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}>
                        {event.type === "alert" ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                      </div>
                      
                      <div className={`flex-1 p-3 rounded-lg border ${
                        event.type === "alert" ? getSeverityColor(event.severity!) : "bg-muted"
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm capitalize">{event.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        
                        {event.screenshot && (
                          <div className="mt-2">
                            <img
                              src={event.screenshot}
                              alt="Screenshot"
                              className="w-32 h-20 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alert Analysis</CardTitle>
            <CardDescription>
              Breakdown of all proctoring alerts by type and severity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="by-type">
              <TabsList>
                <TabsTrigger value="by-type">By Type</TabsTrigger>
                <TabsTrigger value="by-severity">By Severity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="by-type" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: "face_not_visible", icon: Eye, label: "Face Not Visible" },
                    { type: "multiple_faces", icon: User, label: "Multiple Faces" },
                    { type: "gaze_away", icon: Eye, label: "Gaze Away" },
                    { type: "tab_switch", icon: Monitor, label: "Tab Switch" },
                    { type: "copy_paste", icon: MousePointer, label: "Copy/Paste" },
                    { type: "suspicious_behavior", icon: AlertTriangle, label: "Suspicious Behavior" },
                  ].map((alertType) => {
                    const count = session.alerts?.filter((a) => a.type === alertType.type).length || 0;
                    const Icon = alertType.icon;
                    
                    return (
                      <div key={alertType.type} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{alertType.label}</span>
                        </div>
                        <Badge variant={count > 0 ? "default" : "secondary"}>
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="by-severity" className="mt-4">
                <div className="space-y-4">
                  {["critical", "high", "medium", "low"].map((severity) => {
                    const count = alertStats[severity] || 0;
                    const total = session.alerts?.length || 1;
                    const percentage = (count / total) * 100;
                    
                    return (
                      <div key={severity} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{severity}</span>
                          <span className="text-sm text-muted-foreground">{count} alerts</span>
                        </div>
                        <Progress
                          value={percentage}
                          className={`h-2 ${
                            severity === "critical" ? "[&>div]:bg-destructive" :
                            severity === "high" ? "[&>div]:bg-warning" :
                            severity === "medium" ? "[&>div]:bg-primary" : "[&>div]:bg-muted-foreground"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {session.trustScore < 50 && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Critical: Very Low Trust Score</p>
                    <p className="text-sm text-muted-foreground">
                      The trust score is below 50%. Manual review of the session recording is strongly recommended
                      before accepting this result.
                    </p>
                  </div>
                </div>
              )}
              
              {(alertStats.critical || 0) > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">Critical Alerts Detected</p>
                    <p className="text-sm text-muted-foreground">
                      This session contains {alertStats.critical} critical alert(s). Review the timeline
                      for potential academic integrity violations.
                    </p>
                  </div>
                </div>
              )}
              
              {session.trustScore >= 80 && (alertStats.critical || 0) === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-success">Session Appears Clean</p>
                    <p className="text-sm text-muted-foreground">
                      The trust score is high and no critical alerts were detected. This session
                      appears to have been conducted with integrity.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
