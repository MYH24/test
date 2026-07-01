"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { getDb } from "@/lib/db/mock-db";
import { Exam, ExamSession, ProctoringAlert, ExamResult } from "@/types";
import { PreExamSetup } from "@/components/exam/pre-exam-setup";
import { ExamInterface } from "@/components/exam/exam-interface";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Home, FileText, AlertTriangle } from "lucide-react";

type ExamState = "loading" | "setup" | "exam" | "submitted" | "error";

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [examState, setExamState] = useState<ExamState>("loading");
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<number[]>([]);
  const [alerts, setAlerts] = useState<ProctoringAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "student") {
      setError("Only students can take exams");
      setExamState("error");
      return;
    }

    try {
      const db = getDb();
      const foundExam = db.getExamById(id);
      if (!foundExam) {
        setError("Exam not found");
        setExamState("error");
        return;
      }

      // Check if exam is in draft mode
      if (foundExam.status === 'draft') {
        setError("This exam is not yet published");
        setExamState("error");
        return;
      }

      // Check if exam is available
      const now = new Date();
      const startTime = new Date(foundExam.startWindow);
      const endTime = new Date(foundExam.endWindow);

      if (now < startTime) {
        setError(`This exam will be available on ${startTime.toLocaleString()}`);
        setExamState("error");
        return;
      }

      if (now > endTime) {
        setError("This exam has ended");
        setExamState("error");
        return;
      }

      // Check if student already took this exam
      const existingSession = db.getSessionsByStudent(user.id).find(
        (s) => s.examId === id && s.status === "completed"
      );
      
      if (existingSession) {
        const existingResults = db.getResultsByStudent(user.id);
        const existingResult = existingResults.find((r) => r.sessionId === existingSession.id);
        if (existingResult) {
          setResult(existingResult);
          setExamState("submitted");
          return;
        }
      }

      setExam(foundExam);
      setExamState("setup");
    } catch {
      setError("Database not available");
      setExamState("error");
    }
  }, [id, user, authLoading, router]);

  const handleSetupComplete = (embedding: number[], deviceFingerprint: string) => {
    if (!exam || !user) return;

    // Create exam session
    const newSession: ExamSession = {
      id: `session-${Date.now()}`,
      examId: exam.id,
      studentId: user.id,
      startTime: new Date(),
      status: "in_progress",
      deviceFingerprint,
      ipAddress: "127.0.0.1", // Would be captured server-side
      browserInfo: navigator.userAgent,
      answers: {},
      alerts: [],
      trustScore: 100,
    };

    try {
      const db = getDb();
      const createdSession = db.createSession(newSession);
      setSession(createdSession);
    } catch {
      setSession(newSession);
    }
    setFaceEmbedding(embedding);
    setExamState("exam");
  };

  const handleSetupCancel = () => {
    router.push("/student");
  };

  const handleAlert = (alert: ProctoringAlert) => {
    setAlerts((prev) => [...prev, alert]);
    
    if (session) {
      // Update session with alert
      const updatedSession = {
        ...session,
        alerts: [...(session.alerts || []), alert],
        trustScore: Math.max(0, session.trustScore - getSeverityPenalty(alert.severity)),
      };
      setSession(updatedSession);
      try {
        const db = getDb();
        db.updateSession(updatedSession.id, updatedSession);
      } catch {
        // Ignore if db unavailable
      }
    }
  };

  const getSeverityPenalty = (severity: ProctoringAlert["severity"]): number => {
    switch (severity) {
      case "critical": return 25;
      case "high": return 15;
      case "medium": return 10;
      case "low": return 5;
      default: return 0;
    }
  };

  const handleSubmit = (
    answers: Record<string, string | string[]>,
    finalAlerts: ProctoringAlert[]
  ) => {
    if (!exam || !session || !user) return;

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    const questionScores: Record<string, { earned: number; possible: number }> = {};

    exam.questions.forEach((question) => {
      const answer = answers[question.id];
      const isCorrect = checkAnswer(question, answer);
      const earned = isCorrect ? question.points : 0;
      
      questionScores[question.id] = {
        earned,
        possible: question.points,
      };
      
      if (isCorrect) correctAnswers++;
      totalPoints += earned;
    });

    const maxPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = Math.round((totalPoints / maxPoints) * 100);
    const passed = percentage >= (exam.settings?.passingScore || 60);

    // Finalize session
    const finalSession: ExamSession = {
      ...session,
      endTime: new Date(),
      status: "completed",
      answers,
      alerts: finalAlerts,
      trustScore: Math.max(0, session.trustScore),
    };
    
    try {
      const db = getDb();
      db.updateSession(finalSession.id, finalSession);
    } catch {
      // Ignore if db unavailable
    }

    // Create result
    const newResult: ExamResult = {
      id: `result-${Date.now()}`,
      sessionId: session.id,
      examId: exam.id,
      studentId: user.id,
      score: totalPoints,
      maxScore: maxPoints,
      percentage,
      passed,
      questionScores,
      submittedAt: new Date(),
      gradedAt: new Date(),
      trustScore: finalSession.trustScore,
      flaggedForReview: finalSession.trustScore < 70 || finalAlerts.some((a) => a.severity === "critical"),
    };

    try {
      const db = getDb();
      db.createResult(newResult);
    } catch {
      // Ignore if db unavailable
    }
    setResult(newResult);
    setExamState("submitted");
  };

  const checkAnswer = (
    question: Exam["questions"][0],
    answer: string | string[] | undefined
  ): boolean => {
    if (!answer || !question.correctAnswer) return false;

    if (question.type === "multiple-answer") {
      const correctSet = new Set(question.correctAnswer as string[]);
      const answerSet = new Set(answer as string[]);
      return (
        correctSet.size === answerSet.size &&
        [...correctSet].every((a) => answerSet.has(a))
      );
    }

    return answer === question.correctAnswer;
  };

  if (examState === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (examState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Unable to Access Exam</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/student")} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examState === "setup" && exam && user) {
    return (
      <PreExamSetup
        exam={exam}
        user={user}
        onComplete={handleSetupComplete}
        onCancel={handleSetupCancel}
      />
    );
  }

  if (examState === "exam" && exam && session) {
    return (
      <ExamInterface
        exam={exam}
        session={session}
        faceEmbedding={faceEmbedding}
        onSubmit={handleSubmit}
        onAlert={handleAlert}
      />
    );
  }

  if (examState === "submitted" && result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div
              className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                result.passed ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {result.passed ? (
                <CheckCircle2 className="h-10 w-10 text-success" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {result.passed ? "Congratulations!" : "Exam Completed"}
            </CardTitle>
            <CardDescription>
              {result.passed
                ? "You have successfully passed the exam."
                : "Unfortunately, you did not meet the passing score."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold text-foreground">{result.percentage}%</p>
                <p className="text-sm text-muted-foreground">Your Score</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold text-foreground">
                  {result.score}/{result.maxScore}
                </p>
                <p className="text-sm text-muted-foreground">Points Earned</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <span className="text-sm">Trust Score</span>
              <Badge
                variant={
                  result.trustScore >= 80
                    ? "default"
                    : result.trustScore >= 50
                    ? "secondary"
                    : "destructive"
                }
              >
                {result.trustScore}%
              </Badge>
            </div>

            {result.flaggedForReview && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Flagged for Review</p>
                  <p className="text-sm text-muted-foreground">
                    Your exam session has been flagged for manual review by a proctor.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/student")} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                onClick={() => router.push("/student")}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
