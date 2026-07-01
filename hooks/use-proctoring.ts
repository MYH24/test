'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProctoringState, FaceDetectionResult, GazeEstimation, ProctorAlert, AlertType, AlertSeverity } from '@/types';
import { getFaceDetector, disposeFaceDetector } from '@/lib/ai/face-detection';
import { getGazeTracker, disposeGazeTracker } from '@/lib/ai/gaze-tracking';
import { getBehaviorAnalyzer, disposeBehaviorAnalyzer, BehaviorEvent } from '@/lib/ai/behavior-analysis';

interface UseProctoringOptions {
  enabled: boolean;
  sessionId: string;
  examId: string;
  studentId: string;
  onAlert?: (alert: ProctorAlert) => void;
  onStateChange?: (state: ProctoringState) => void;
  detectionIntervalMs?: number;
}

interface UseProctoringReturn {
  state: ProctoringState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitialized: boolean;
  isRecording: boolean;
  error: string | null;
  startProctoring: () => Promise<boolean>;
  stopProctoring: () => void;
  captureScreenshot: () => string | null;
  alerts: ProctorAlert[];
  trustScore: number;
}

const initialState: ProctoringState = {
  isRecording: false,
  isFaceDetected: false,
  faceCount: 0,
  faceMatchScore: 0,
  gazeDirection: { x: 0, y: 0 },
  isGazeOnScreen: true,
  isFullscreen: false,
  tabSwitchCount: 0,
  environmentVerified: false,
  audioLevel: 0,
};

export function useProctoring(options: UseProctoringOptions): UseProctoringReturn {
  const {
    enabled,
    sessionId,
    examId,
    studentId,
    onAlert,
    onStateChange,
    detectionIntervalMs = 500,
  } = options;

  const [state, setState] = useState<ProctoringState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ProctorAlert[]>([]);
  const [trustScore, setTrustScore] = useState(100);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<Record<AlertType, number>>({} as Record<AlertType, number>);

  // Initialize canvas for screenshots
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    return () => {
      canvasRef.current = null;
    };
  }, []);

  // Create alert from behavior event
  const createAlert = useCallback((event: BehaviorEvent, screenshot?: string): ProctorAlert => {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      studentId,
      examId,
      type: event.type,
      severity: event.severity,
      message: event.message,
      timestamp: event.timestamp,
      screenshot,
      metadata: {},
      resolved: false,
    };
  }, [sessionId, studentId, examId]);

  // Rate limit alerts (don't fire same alert type more than once per 10 seconds)
  const shouldFireAlert = useCallback((type: AlertType): boolean => {
    const now = Date.now();
    const lastTime = lastAlertTimeRef.current[type] || 0;
    if (now - lastTime < 10000) {
      return false;
    }
    lastAlertTimeRef.current[type] = now;
    return true;
  }, []);

  // Capture screenshot
  const captureScreenshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  // Start proctoring
  const startProctoring = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    try {
      setError(null);

      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize AI components
      const faceDetector = getFaceDetector();
      const gazeTracker = getGazeTracker();
      const behaviorAnalyzer = getBehaviorAnalyzer();

      await faceDetector.initialize();
      gazeTracker.initialize();
      behaviorAnalyzer.initialize();
      await behaviorAnalyzer.initializeAudio(stream);

      // Start detection loop
      detectionIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        
        // Run face detection
        const faceResult = await faceDetector.detectFaces(video);
        
        // Run gaze tracking
        const gazeResult = gazeTracker.estimateGaze(
          faceResult,
          video.videoWidth || 640,
          video.videoHeight || 480
        );

        // Get current state
        const currentState: Partial<ProctoringState> = {
          isFaceDetected: faceResult.detected,
          faceCount: faceResult.faceCount,
          isGazeOnScreen: gazeResult.direction === 'center',
          isFullscreen: !!document.fullscreenElement,
          tabSwitchCount: behaviorAnalyzer.getTabSwitchCount(),
        };

        // Analyze behavior
        const events = behaviorAnalyzer.analyzeBehavior(faceResult, gazeResult, currentState);

        // Process alerts
        events.forEach((event) => {
          if (shouldFireAlert(event.type)) {
            const screenshot = captureScreenshot();
            const alert = createAlert(event, screenshot || undefined);
            
            setAlerts((prev) => [...prev, alert]);
            onAlert?.(alert);
          }
        });

        // Update trust score
        const newTrustScore = behaviorAnalyzer.calculateTrustScore();
        setTrustScore(newTrustScore);

        // Update state
        const newState: ProctoringState = {
          isRecording: true,
          isFaceDetected: faceResult.detected,
          faceCount: faceResult.faceCount,
          faceMatchScore: faceResult.confidence,
          gazeDirection: { x: gazeResult.yaw, y: gazeResult.pitch },
          isGazeOnScreen: gazeResult.direction === 'center',
          isFullscreen: !!document.fullscreenElement,
          tabSwitchCount: behaviorAnalyzer.getTabSwitchCount(),
          lastAlertTime: events.length > 0 ? new Date() : state.lastAlertTime,
          environmentVerified: true,
          audioLevel: behaviorAnalyzer.getAudioLevel(),
        };

        setState(newState);
        onStateChange?.(newState);
      }, detectionIntervalMs);

      // Set up event listeners for tab switching
      const handleVisibilityChange = () => {
        if (document.hidden) {
          const analyzer = getBehaviorAnalyzer();
          analyzer.recordTabSwitch();
        }
      };

      const handleWindowBlur = () => {
        const analyzer = getBehaviorAnalyzer();
        analyzer.recordWindowBlur();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);

      setIsInitialized(true);
      setIsRecording(true);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start proctoring';
      setError(errorMessage);
      console.error('Proctoring error:', err);
      return false;
    }
  }, [enabled, detectionIntervalMs, state.lastAlertTime, onAlert, onStateChange, captureScreenshot, createAlert, shouldFireAlert]);

  // Stop proctoring
  const stopProctoring = useCallback(() => {
    // Stop detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Dispose AI components
    disposeFaceDetector();
    disposeGazeTracker();
    disposeBehaviorAnalyzer();

    setState(initialState);
    setIsInitialized(false);
    setIsRecording(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, [stopProctoring]);

  return {
    state,
    videoRef,
    isInitialized,
    isRecording,
    error,
    startProctoring,
    stopProctoring,
    captureScreenshot,
    alerts,
    trustScore,
  };
}
