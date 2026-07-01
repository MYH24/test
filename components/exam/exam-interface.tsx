"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Camera,
  AlertTriangle,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Exam, Question, ExamSession, ProctoringAlert, FaceDetectionResult } from "@/types";
import { useBrowserLockdown } from "@/hooks/use-browser-lockdown";
import { getFaceDetector, FaceDetector } from "@/lib/ai/face-detection";

interface ExamInterfaceProps {
  exam: Exam;
  session: ExamSession;
  faceEmbedding: number[];
  onSubmit: (answers: Record<string, string | string[]>, alerts: ProctoringAlert[]) => void;
  onAlert: (alert: ProctoringAlert) => void;
}

export function ExamInterface({
  exam,
  session,
  faceEmbedding,
  onSubmit,
  onAlert,
}: ExamInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(exam.duration * 60);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [alerts, setAlerts] = useState<ProctoringAlert[]>([]);
  
  // Camera and face detection state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceDetectionResult, setFaceDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [proctoringStatus, setProctoringStatus] = useState({
    faceDetected: false,
    faceMatch: false,
    gazeOnScreen: true,
    isRecording: false,
  });

  const currentQuestion = exam.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / exam.questions.length) * 100;

  // Handle proctoring alerts
  const handleProctoringAlert = useCallback((alert: ProctoringAlert) => {
    setAlerts((prev) => [...prev, alert]);
    onAlert(alert);
    
    if (alert.severity === "high" || alert.severity === "critical") {
      setWarningMessage(alert.description);
      setShowWarningDialog(true);
    }
  }, [onAlert]);

  // Initialize browser lockdown
  const { violations } = useBrowserLockdown({
    enabled: exam.settings?.browserLockdown ?? true,
    onViolation: (type) => {
      const alert: ProctoringAlert = {
        id: `violation-${Date.now()}`,
        sessionId: session.id,
        type: type as ProctoringAlert["type"],
        severity: type === "tab_switch" ? "medium" : "high",
        description: `Browser violation: ${type}`,
        timestamp: new Date(),
      };
      handleProctoringAlert(alert);
    },
  });

  // Initialize camera and face detection
  useEffect(() => {
    let mounted = true;
    
    const initializeCamera = async () => {
      // Check for secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        console.error("Camera requires HTTPS");
        return;
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported");
        return;
      }
      
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            facingMode: "user",
            frameRate: { ideal: 30, min: 15 }
          },
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        // Initialize face detector
        const detector = getFaceDetector();
        await detector.initialize();
        faceDetectorRef.current = detector;
        
        // Set up video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          videoRef.current.onloadeddata = async () => {
            if (videoRef.current && mounted) {
              try {
                await videoRef.current.play();
                setIsCameraReady(true);
                setProctoringStatus(prev => ({ ...prev, isRecording: true }));
                
                // Start continuous face detection
                startFaceDetection();
              } catch (playError) {
                videoRef.current.muted = true;
                await videoRef.current.play();
                setIsCameraReady(true);
              }
            }
          };
        }
      } catch (error) {
        console.error("Failed to access camera:", error);
      }
    };
    
    const startFaceDetection = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      detectionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !faceDetectorRef.current || !mounted) return;
        
        const video = videoRef.current;
        if (video.readyState < 2) return;
        
        try {
          const result = await faceDetectorRef.current.detectFaces(video);
          setFaceDetectionResult(result);
          
          // Update proctoring status
          setProctoringStatus(prev => ({
            ...prev,
            faceDetected: result.detected,
            faceMatch: result.detected && result.confidence > 0.5,
            gazeOnScreen: result.detected, // Simplified gaze check
          }));
          
          // Generate alerts for face issues
          if (!result.detected) {
            // Only alert every 10 seconds for no face
            const lastNoFaceAlert = alerts.find(
              a => a.type === "face_not_detected" && 
              Date.now() - new Date(a.timestamp).getTime() < 10000
            );
            
            if (!lastNoFaceAlert) {
              const alert: ProctoringAlert = {
                id: `face-${Date.now()}`,
                sessionId: session.id,
                type: "face_not_detected",
                severity: "medium",
                description: "Face not detected. Please ensure you are visible to the camera.",
                timestamp: new Date(),
              };
              handleProctoringAlert(alert);
            }
          }
          
          // Check for multiple faces
          if (result.faceCount > 1) {
            const lastMultiFaceAlert = alerts.find(
              a => a.type === "multiple_faces" && 
              Date.now() - new Date(a.timestamp).getTime() < 30000
            );
            
            if (!lastMultiFaceAlert) {
              const alert: ProctoringAlert = {
                id: `multiface-${Date.now()}`,
                sessionId: session.id,
                type: "multiple_faces",
                severity: "high",
                description: `${result.faceCount} faces detected. Only the exam taker should be visible.`,
                timestamp: new Date(),
              };
              handleProctoringAlert(alert);
            }
          }
        } catch (error) {
          console.error("Face detection error:", error);
        }
      }, 1000); // Check every second
    };
    
    initializeCamera();
    
    return () => {
      mounted = false;
      
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (faceDetectorRef.current) {
        faceDetectorRef.current.stopContinuousDetection();
      }
    };
  }, [session.id, handleProctoringAlert, alerts]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (): string => {
    if (timeRemaining <= 60) return "text-destructive";
    if (timeRemaining <= 300) return "text-yellow-600";
    return "text-foreground";
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleAnswerChange = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, optionId] };
      }
      return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
    });
  };

  const toggleFlagged = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < exam.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleSubmit = () => {
    // Stop face detection
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    onSubmit(answers, alerts);
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];
    const questionText = question.text || question.content;

    switch (question.type) {
      case "multiple-choice":
        return (
          <RadioGroup
            value={answer as string}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  answer === option ? "border-primary bg-primary/5" : ""
                }`}
              >
                <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                <Label htmlFor={`${question.id}-${idx}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </label>
            ))}
          </RadioGroup>
        );

      case "multi-select":
      case "multiple-answer":
        return (
          <div className="space-y-3">
            {question.options?.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  (answer as string[])?.includes(option) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Checkbox
                  checked={(answer as string[])?.includes(option) || false}
                  onCheckedChange={(checked) =>
                    handleMultipleAnswerChange(question.id, option, checked as boolean)
                  }
                />
                <span className="flex-1">{option}</span>
              </label>
            ))}
          </div>
        );

      case "true-false":
        return (
          <RadioGroup
            value={answer as string}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-3"
          >
            {(question.options || ["True", "False"]).map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  answer === option ? "border-primary bg-primary/5" : ""
                }`}
              >
                <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                <Label htmlFor={`${question.id}-${idx}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </label>
            ))}
          </RadioGroup>
        );

      case "short-answer":
      case "essay":
        return (
          <Textarea
            value={(answer as string) || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            className={question.type === "essay" ? "min-h-48" : "min-h-24"}
          />
        );

      default:
        return (
          <div className="text-muted-foreground p-4 border rounded-lg">
            Question type not supported: {question.type}
          </div>
        );
    }
  };

  // Ensure we have a valid question to display
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
          <p className="text-muted-foreground">This exam has no questions to display.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <Shield className="h-3 w-3" />
              Proctored
            </Badge>
            <h1 className="font-semibold text-lg">{exam.title}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${getTimeColor()}`}>
              <Clock className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
            
            <Button onClick={() => setShowSubmitDialog(true)} variant="default">
              <Send className="h-4 w-4 mr-2" />
              Submit Exam
            </Button>
          </div>
        </header>

        {/* Progress */}
        <div className="border-b bg-card/50 px-6 py-2">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Progress: {answeredCount} / {exam.questions.length} answered
            </span>
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Question Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      Question {currentQuestionIndex + 1} of {exam.questions.length}
                    </Badge>
                    <Badge variant="outline">{currentQuestion.points} pts</Badge>
                    {flaggedQuestions.has(currentQuestion.id) && (
                      <Badge variant="destructive" className="gap-1">
                        <Flag className="h-3 w-3" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">
                    {currentQuestion.text || currentQuestion.content}
                  </CardTitle>
                </div>
                <Button
                  variant={flaggedQuestions.has(currentQuestion.id) ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => toggleFlagged(currentQuestion.id)}
                >
                  <Flag className="h-4 w-4 mr-1" />
                  {flaggedQuestions.has(currentQuestion.id) ? "Unflag" : "Flag"}
                </Button>
              </CardHeader>
              <CardContent>
                {renderQuestion(currentQuestion)}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {exam.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      idx === currentQuestionIndex
                        ? "bg-primary text-primary-foreground"
                        : answers[q.id]
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : flaggedQuestions.has(q.id)
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => goToQuestion(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === exam.questions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar - Proctoring */}
      <aside className="w-80 border-l bg-card flex flex-col">
        {/* Camera Feed */}
        <div className="p-4 border-b">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Status overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                proctoringStatus.faceDetected ? "bg-green-500" : "bg-red-500"
              } animate-pulse`} />
              <span className="text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">
                {proctoringStatus.faceDetected ? "Face detected" : "No face"}
              </span>
            </div>
            
            {/* Confidence indicator */}
            {faceDetectionResult?.detected && (
              <div className="absolute top-2 right-2">
                <span className="text-xs text-white bg-green-500/80 px-1.5 py-0.5 rounded">
                  {Math.round((faceDetectionResult.confidence || 0) * 100)}%
                </span>
              </div>
            )}
            
            <div className="absolute bottom-2 right-2">
              <Camera className="h-4 w-4 text-white/70" />
            </div>
          </div>
        </div>

        {/* Proctoring Status */}
        <div className="p-4 border-b space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Proctoring Status
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Camera</span>
              <Badge variant={isCameraReady ? "default" : "destructive"} className="text-xs">
                {isCameraReady ? "Active" : "Not ready"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Face Detection</span>
              <Badge variant={proctoringStatus.faceDetected ? "default" : "destructive"} className="text-xs">
                {proctoringStatus.faceDetected ? "Detected" : "Not detected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Identity</span>
              <Badge variant={proctoringStatus.faceMatch ? "default" : "secondary"} className="text-xs">
                {proctoringStatus.faceMatch ? "Verified" : "Checking..."}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Browser</span>
              <Badge variant={violations.length === 0 ? "default" : "destructive"} className="text-xs">
                {violations.length === 0 ? "Secure" : `${violations.length} violations`}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="flex-1 p-4 overflow-auto">
          <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Alerts ({alerts.length})
          </h3>
          
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No alerts recorded
                </p>
              </div>
            ) : (
              alerts.slice(-5).reverse().map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg text-sm ${
                    alert.severity === "critical"
                      ? "bg-red-50 border border-red-200"
                      : alert.severity === "high"
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium capitalize">{alert.type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{alert.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="p-4 border-t">
          <h3 className="font-medium text-sm mb-3">Question Navigator</h3>
          <div className="grid grid-cols-5 gap-2">
            {exam.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => goToQuestion(idx)}
                className={`w-full aspect-square rounded text-xs font-medium transition-colors ${
                  idx === currentQuestionIndex
                    ? "bg-primary text-primary-foreground"
                    : answers[q.id]
                    ? "bg-green-100 text-green-700"
                    : flaggedQuestions.has(q.id)
                    ? "bg-red-100 text-red-700"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {exam.questions.length} questions.
              {answeredCount < exam.questions.length && (
                <span className="block mt-2 text-yellow-600">
                  Warning: You still have {exam.questions.length - answeredCount} unanswered questions.
                </span>
              )}
              {flaggedQuestions.size > 0 && (
                <span className="block mt-2 text-yellow-600">
                  You have {flaggedQuestions.size} flagged questions to review.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Proctoring Alert
            </AlertDialogTitle>
            <AlertDialogDescription>{warningMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningDialog(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
