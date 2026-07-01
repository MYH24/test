"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  Mic,
  Monitor,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Eye,
  Volume2,
  Wifi,
  RefreshCw,
  ChevronRight,
  User,
  Fingerprint,
} from "lucide-react";
import { Exam, User as UserType, FaceDetectionResult } from "@/types";
import { getFaceDetector, FaceDetector } from "@/lib/ai/face-detection";

interface PreExamSetupProps {
  exam: Exam;
  user: UserType;
  onComplete: (faceEmbedding: number[], deviceFingerprint: string) => void;
  onCancel: () => void;
}

type SetupStep =
  | "instructions"
  | "environment"
  | "camera"
  | "microphone"
  | "identity"
  | "rules"
  | "ready";

interface CheckResult {
  status: "pending" | "checking" | "passed" | "failed" | "warning";
  message: string;
}

export function PreExamSetup({ exam, user, onComplete, onCancel }: PreExamSetupProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>("instructions");
  const [checks, setChecks] = useState<Record<string, CheckResult>>({
    browser: { status: "pending", message: "Browser compatibility" },
    connection: { status: "pending", message: "Internet connection" },
    camera: { status: "pending", message: "Camera access" },
    microphone: { status: "pending", message: "Microphone access" },
    screenShare: { status: "pending", message: "Screen sharing" },
  });
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [identityVerified, setIdentityVerified] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const [faceDetectionResult, setFaceDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const steps: { key: SetupStep; label: string; icon: React.ReactNode }[] = [
    { key: "instructions", label: "Instructions", icon: <Shield className="h-4 w-4" /> },
    { key: "environment", label: "Environment", icon: <Monitor className="h-4 w-4" /> },
    { key: "camera", label: "Camera", icon: <Camera className="h-4 w-4" /> },
    { key: "microphone", label: "Microphone", icon: <Mic className="h-4 w-4" /> },
    { key: "identity", label: "Identity", icon: <Fingerprint className="h-4 w-4" /> },
    { key: "rules", label: "Rules", icon: <Eye className="h-4 w-4" /> },
    { key: "ready", label: "Ready", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateCheck = (key: string, status: CheckResult["status"], message?: string) => {
    setChecks((prev) => ({
      ...prev,
      [key]: { ...prev[key], status, message: message || prev[key].message },
    }));
  };

  const runEnvironmentChecks = useCallback(async () => {
    // Browser check
    updateCheck("browser", "checking");
    await new Promise((r) => setTimeout(r, 500));
    const isModernBrowser = "mediaDevices" in navigator && "getDisplayMedia" in navigator.mediaDevices;
    updateCheck("browser", isModernBrowser ? "passed" : "failed", 
      isModernBrowser ? "Browser supported" : "Browser not supported");

    // Connection check
    updateCheck("connection", "checking");
    await new Promise((r) => setTimeout(r, 500));
    const isOnline = navigator.onLine;
    updateCheck("connection", isOnline ? "passed" : "failed",
      isOnline ? "Connection stable" : "No internet connection");

    // Generate device fingerprint
    const fp = await generateFingerprint();
    setDeviceFingerprint(fp);
  }, []);

  const generateFingerprint = async (): Promise<string> => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency,
    ];
    const data = components.join("|");
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const requestCameraAccess = async () => {
    updateCheck("camera", "checking");
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      updateCheck("camera", "failed", "HTTPS required for camera access");
      return;
    }
    
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateCheck("camera", "failed", "Camera API not supported");
      return;
    }
    
    try {
      // Request camera permission with constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 }
        },
      });
      
      setCameraStream(stream);
      
      // Initialize face detector
      const detector = getFaceDetector();
      const initialized = await detector.initialize();
      if (!initialized) {
        console.warn("Face detector initialization failed, using fallback");
      }
      setFaceDetector(detector);
      
      // Set up video element with proper event handling
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Clear any existing stream
        if (video.srcObject) {
          const oldStream = video.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => track.stop());
        }
        
        video.srcObject = stream;
        
        // Wait for video to be ready
        const playVideo = async () => {
          try {
            // Wait for loadeddata event which means video is ready to play
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000);
              
              video.onloadeddata = () => {
                clearTimeout(timeout);
                resolve();
              };
              
              video.onerror = () => {
                clearTimeout(timeout);
                reject(new Error("Video load error"));
              };
            });
            
            // Play the video
            await video.play();
            setIsCameraReady(true);
            
            // Start face detection with a slight delay to ensure video is streaming
            setTimeout(() => {
              if (detector && video.readyState >= 2) {
                detector.startContinuousDetection(video, (result) => {
                  setFaceDetectionResult(result);
                }, 750); // Detect every 750ms for smoother updates
              }
            }, 500);
            
          } catch (playError) {
            console.error("Error playing video:", playError);
            // Try playing muted (some browsers require this)
            video.muted = true;
            await video.play();
            setIsCameraReady(true);
          }
        };
        
        playVideo();
      }
      
      updateCheck("camera", "passed", "Camera connected");
    } catch (error) {
      console.error("Camera access error:", error);
      
      // Provide more specific error messages
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          updateCheck("camera", "failed", "Camera permission denied. Please allow access.");
        } else if (error.name === "NotFoundError") {
          updateCheck("camera", "failed", "No camera found on this device");
        } else if (error.name === "NotReadableError") {
          updateCheck("camera", "failed", "Camera is in use by another application");
        } else if (error.name === "OverconstrainedError") {
          updateCheck("camera", "failed", "Camera does not meet requirements");
        } else {
          updateCheck("camera", "failed", `Camera error: ${error.message}`);
        }
      } else {
        updateCheck("camera", "failed", "Camera access denied");
      }
    }
  };

  const requestMicrophoneAccess = async () => {
    updateCheck("microphone", "checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      updateCheck("microphone", "passed", "Microphone connected");
    } catch {
      updateCheck("microphone", "failed", "Microphone access denied");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      alert("Camera not initialized. Please refresh the page.");
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Verify video is ready
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Camera not ready. Please wait a moment and try again.");
      return;
    }
    
    // Check if face is detected before capturing (with more lenient check)
    // Allow capture if confidence is above 0.3 or if face was recently detected
    const hasRecentFaceDetection = faceDetectionResult?.detected || 
      (faceDetectionResult?.confidence && faceDetectionResult.confidence > 0.3);
    
    if (!hasRecentFaceDetection) {
      alert("Please position your face within the oval frame. Make sure you are well-lit and facing the camera directly.");
      return;
    }
    
    setIsCapturing(true);
    
    try {
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Set canvas to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedPhoto(dataUrl);
        
        // Generate face embedding based on detection result
        // In production, this would use actual face recognition
        const embedding = generateFaceEmbedding(faceDetectionResult);
        setFaceEmbedding(embedding);
        setIdentityVerified(true);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      alert("Failed to capture photo. Please try again.");
    }
    
    setTimeout(() => setIsCapturing(false), 500);
  };
  
  // Generate a mock face embedding based on detection result
  const generateFaceEmbedding = (detection: FaceDetectionResult | null): number[] => {
    // In production, this would use actual face recognition model
    // For now, generate a deterministic embedding based on detection data
    const seed = detection?.boundingBox 
      ? detection.boundingBox.x + detection.boundingBox.y + detection.boundingBox.width
      : Math.random() * 1000;
    
    const embedding = [];
    for (let i = 0; i < 128; i++) {
      // Generate pseudo-random values based on seed
      const value = Math.sin(seed * (i + 1)) * 2;
      embedding.push(value);
    }
    return embedding;
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setFaceEmbedding(null);
    setIdentityVerified(false);
  };

  useEffect(() => {
    if (currentStep === "environment") {
      runEnvironmentChecks();
    } else if (currentStep === "camera") {
      requestCameraAccess();
    } else if (currentStep === "microphone") {
      requestMicrophoneAccess();
    }
  }, [currentStep, runEnvironmentChecks]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (faceDetector) {
        faceDetector.stopContinuousDetection();
      }
    };
  }, [cameraStream, faceDetector]);
  
  // Re-attach camera when moving to identity step
  useEffect(() => {
    if (currentStep === "identity" && cameraStream && videoRef.current && !capturedPhoto) {
      const video = videoRef.current;
      
      // Only set srcObject if not already set
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
      }
      
      // Play video and restart face detection
      video.play().then(() => {
        if (faceDetector && video.readyState >= 2) {
          faceDetector.startContinuousDetection(video, (result) => {
            setFaceDetectionResult(result);
          }, 750);
        }
      }).catch(console.error);
    }
  }, [currentStep, cameraStream, capturedPhoto, faceDetector]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "instructions":
        return true;
      case "environment":
        return checks.browser.status === "passed" && checks.connection.status === "passed";
      case "camera":
        return checks.camera.status === "passed";
      case "microphone":
        return checks.microphone.status === "passed" || checks.microphone.status === "warning";
      case "identity":
        return identityVerified;
      case "rules":
        return rulesAccepted;
      case "ready":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1].key);
    }
  };

  const handleStartExam = () => {
    if (faceEmbedding && deviceFingerprint) {
      onComplete(faceEmbedding, deviceFingerprint);
    }
  };

  const renderStatusIcon = (status: CheckResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "checking":
        return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{exam.title}</h1>
            <p className="text-sm text-muted-foreground">Pre-exam system check</p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Shield className="h-3 w-3" />
            Secure Setup
          </Badge>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b bg-card/50 px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    idx < currentStepIndex
                      ? "bg-success/10 text-success"
                      : idx === currentStepIndex
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < currentStepIndex ? <CheckCircle2 className="h-3 w-3" /> : step.icon}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {currentStep === "instructions" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Exam Instructions
                </CardTitle>
                <CardDescription>
                  Please read the following instructions carefully before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This exam uses AI-powered proctoring. Your camera, microphone, and screen will be monitored throughout the exam.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">1</div>
                    <div>
                      <p className="font-medium">Ensure you are in a quiet, well-lit room</p>
                      <p className="text-sm text-muted-foreground">Remove any unauthorized materials from your workspace</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">2</div>
                    <div>
                      <p className="font-medium">Close all other applications</p>
                      <p className="text-sm text-muted-foreground">Only this browser tab should be active during the exam</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">3</div>
                    <div>
                      <p className="font-medium">Stay visible on camera at all times</p>
                      <p className="text-sm text-muted-foreground">Your face must remain in frame throughout the exam</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">4</div>
                    <div>
                      <p className="font-medium">Do not navigate away from this page</p>
                      <p className="text-sm text-muted-foreground">Leaving the exam page will be flagged and reported</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{exam.duration} minutes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="font-medium">{exam.questions.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Passing Score:</span>
                    <span className="font-medium">{exam.passingScore}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "environment" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Environment Check
                </CardTitle>
                <CardDescription>
                  Checking your system compatibility and connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                      <span>{checks.browser.message}</span>
                    </div>
                    {renderStatusIcon(checks.browser.status)}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-5 w-5 text-muted-foreground" />
                      <span>{checks.connection.message}</span>
                    </div>
                    {renderStatusIcon(checks.connection.status)}
                  </div>
                </div>

                {deviceFingerprint && (
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="flex items-center gap-2 text-success text-sm font-medium mb-1">
                      <Fingerprint className="h-4 w-4" />
                      Device Registered
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      ID: {deviceFingerprint.substring(0, 32)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === "camera" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Camera Setup
                </CardTitle>
                <CardDescription>
                  Position yourself so your face is clearly visible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {checks.camera.status === "checking" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <RefreshCw className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                  {checks.camera.status === "failed" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                      <XCircle className="h-12 w-12 mb-2 text-destructive" />
                      <p className="font-medium">Camera access denied</p>
                      <p className="text-sm text-white/70">Please allow camera access and try again</p>
                    </div>
                  )}
                  
                  {/* Face overlay guide */}
                  {checks.camera.status === "passed" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-48 h-64 border-2 border-dashed rounded-full transition-colors ${
                        faceDetectionResult?.detected ? "border-green-500" : "border-white/50"
                      }`} />
                    </div>
                  )}
                  
                  {/* Face detection status */}
                  {checks.camera.status === "passed" && (
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${
                      faceDetectionResult?.detected 
                        ? "bg-green-500/80 text-white" 
                        : "bg-yellow-500/80 text-white"
                    }`}>
                      {faceDetectionResult?.detected 
                        ? `Face Detected (${Math.round((faceDetectionResult.confidence || 0) * 100)}%)` 
                        : "No Face Detected"}
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span>{checks.camera.message}</span>
                  </div>
                  {renderStatusIcon(checks.camera.status)}
                </div>

                {checks.camera.status === "failed" && (
                  <Button onClick={requestCameraAccess} variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Camera Access
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === "microphone" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Microphone Setup
                </CardTitle>
                <CardDescription>
                  Your microphone will be used for audio monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Volume2 className={`h-16 w-16 mx-auto mb-4 ${
                      checks.microphone.status === "passed" ? "text-success" : "text-muted-foreground"
                    }`} />
                    <p className="font-medium">
                      {checks.microphone.status === "passed" 
                        ? "Microphone is ready" 
                        : checks.microphone.status === "failed"
                        ? "Microphone access denied"
                        : "Checking microphone..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-muted-foreground" />
                    <span>{checks.microphone.message}</span>
                  </div>
                  {renderStatusIcon(checks.microphone.status)}
                </div>

                {checks.microphone.status === "failed" && (
                  <Button onClick={requestMicrophoneAccess} variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Microphone Access
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === "identity" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Identity Verification
                </CardTitle>
                <CardDescription>
                  Take a photo to verify your identity. This will be compared throughout the exam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {!capturedPhoto ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`w-48 h-64 border-2 border-dashed rounded-full transition-colors ${
                          faceDetectionResult?.detected ? "border-green-500" : "border-white/50"
                        }`} />
                      </div>
                      {/* Face detection status for identity */}
                      <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${
                        faceDetectionResult?.detected 
                          ? "bg-green-500/80 text-white" 
                          : "bg-yellow-500/80 text-white"
                      }`}>
                        {faceDetectionResult?.detected 
                          ? `Face Detected (${Math.round((faceDetectionResult.confidence || 0) * 100)}%)` 
                          : "Position face in frame"}
                      </div>
                    </>
                  ) : (
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                  )}
                  
                  {isCapturing && (
                    <div className="absolute inset-0 bg-white animate-pulse" />
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex gap-3">
                  {!capturedPhoto ? (
                    <Button 
                      onClick={capturePhoto} 
                      className="flex-1" 
                      disabled={!cameraStream || !faceDetectionResult?.detected}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {faceDetectionResult?.detected ? "Capture Photo" : "Position Face First"}
                    </Button>
                  ) : (
                    <>
                      <Button onClick={retakePhoto} variant="outline" className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retake
                      </Button>
                      <Button className="flex-1" disabled={!identityVerified}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Verified
                      </Button>
                    </>
                  )}
                </div>

                {identityVerified && (
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="flex items-center gap-2 text-success text-sm font-medium">
                      <User className="h-4 w-4" />
                      Identity verified as {user.firstName} {user.lastName}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === "rules" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Exam Rules Agreement
                </CardTitle>
                <CardDescription>
                  Please read and accept the exam rules to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-3 p-4 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">By proceeding with this exam, you agree to:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Allow continuous camera and microphone monitoring</li>
                    <li>Allow screen recording for the duration of the exam</li>
                    <li>Not use any unauthorized materials or devices</li>
                    <li>Not communicate with anyone during the exam</li>
                    <li>Not leave the exam window or navigate to other pages</li>
                    <li>Not attempt to copy, screenshot, or record exam content</li>
                    <li>Accept that suspicious activity will be flagged and reviewed</li>
                    <li>Accept that violations may result in exam termination</li>
                  </ul>
                  <p className="font-medium pt-2">Privacy Notice:</p>
                  <p className="text-muted-foreground">
                    Your proctoring data will be stored securely and only accessed by authorized personnel for exam integrity verification. Data will be retained according to institutional policy.
                  </p>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    I have read, understood, and agree to the exam rules and proctoring terms. I understand that any violations may result in disciplinary action.
                  </span>
                </label>
              </CardContent>
            </Card>
          )}

          {currentStep === "ready" && (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <CardTitle>Ready to Start</CardTitle>
                <CardDescription>
                  All checks have passed. You can now begin your exam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <span className="text-sm">Environment Check</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <span className="text-sm">Camera Setup</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <span className="text-sm">Microphone Setup</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <span className="text-sm">Identity Verified</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <span className="text-sm">Rules Accepted</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Once you start, the timer will begin. Make sure you are ready before proceeding.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          {currentStep === "ready" ? (
            <Button onClick={handleStartExam} size="lg">
              <Shield className="h-4 w-4 mr-2" />
              Start Exam
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
