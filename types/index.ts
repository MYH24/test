// User Types
export type UserRole = 'admin' | 'instructor' | 'proctor' | 'student';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  profilePhoto: string;
  faceEmbedding: number[];
  deviceFingerprints: string[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  lastLogin: Date;
  isVerified: boolean;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: Date;
  deviceFingerprint: string;
  ipAddress: string;
}

// Exam Types
export type QuestionType = 
  | 'multiple-choice' 
  | 'multi-select' 
  | 'true-false' 
  | 'short-answer' 
  | 'essay' 
  | 'fill-blank' 
  | 'code';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  text?: string; // Alias for content for backward compatibility
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  timeLimit?: number;
  explanation?: string;
  codeLanguage?: string;
}

export interface ExamSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  allowReview: boolean;
  proctoring: ProctoringLevel;
  allowedResources: string[];
  maxAttempts: number;
  passingScore: number;
  lateSubmissionPolicy: 'allow' | 'penalize' | 'reject';
  latePenaltyPercent?: number;
  browserLockdown?: boolean;
}

export type ProctoringLevel = 'none' | 'basic' | 'standard' | 'strict' | 'full-lockdown';

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';

export interface Exam {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  duration: number;
  startWindow: Date;
  endWindow: Date;
  questions: Question[];
  settings: ExamSettings;
  assignedProctors: string[];
  status: ExamStatus;
  createdAt: Date;
  updatedAt: Date;
  totalPoints: number;
  passingScore?: number;
}

// Exam Session Types
export type SessionStatus = 
  | 'setup' 
  | 'identity-verification' 
  | 'environment-check' 
  | 'in-progress'
  | 'in_progress'
  | 'paused' 
  | 'completed' 
  | 'terminated';

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  answers: Record<string, string | string[]>;
  currentQuestionIndex?: number;
  status: SessionStatus;
  trustScore: number;
  alerts: ProctorAlert[];
  screenshots?: string[];
  timeRemaining?: number;
  submittedAt?: Date;
  deviceFingerprint?: string;
  ipAddress?: string;
  browserInfo?: string;
}

// Proctoring Types
export type AlertType = 
  | 'face-not-detected'
  | 'multiple-faces'
  | 'face-mismatch'
  | 'gaze-away'
  | 'tab-switch'
  | 'window-blur'
  | 'fullscreen-exit'
  | 'suspicious-movement'
  | 'audio-detected'
  | 'screen-share-stopped'
  | 'browser-devtools'
  | 'copy-paste-attempt'
  | 'phone-detected'
  | 'secondary-screen'
  | 'environment-change';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ProctorAlert {
  id: string;
  sessionId: string;
  studentId: string;
  examId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  screenshot?: string;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface ProctoringState {
  isRecording: boolean;
  isFaceDetected: boolean;
  faceCount: number;
  faceMatchScore: number;
  gazeDirection: { x: number; y: number };
  isGazeOnScreen: boolean;
  isFullscreen: boolean;
  tabSwitchCount: number;
  lastAlertTime?: Date;
  environmentVerified: boolean;
  audioLevel: number;
}

export interface ProctoringReport {
  sessionId: string;
  studentId: string;
  examId: string;
  duration: number;
  trustScore: number;
  alerts: ProctorAlert[];
  timeline: TimelineEvent[];
  screenshots: string[];
  recommendation: 'pass' | 'review' | 'flag' | 'reject';
  summary: string;
  generatedAt: Date;
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'start' | 'alert' | 'answer' | 'pause' | 'resume' | 'submit' | 'intervention';
  description: string;
  metadata?: Record<string, unknown>;
}

// Device Fingerprint
export interface DeviceFingerprint {
  hash: string;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  webglVendor: string;
  webglRenderer: string;
  canvas: string;
  audio: string;
}

// Results Types
export interface ExamResult {
  id: string;
  examId: string;
  sessionId: string;
  studentId: string;
  score: number;
  maxScore: number;
  totalPoints?: number;
  percentage: number;
  passed: boolean;
  questionScores?: Record<string, { earned: number; possible: number }>;
  answers?: Record<string, { answer: string | string[]; correct: boolean; points: number }>;
  proctoringReport?: ProctoringReport;
  submittedAt?: Date;
  gradedAt: Date;
  gradedBy?: string;
  feedback?: string;
  trustScore?: number;
  flaggedForReview?: boolean;
}

// System Types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  deviceFingerprint: string;
  timestamp: Date;
}

export interface SystemSettings {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  requireMfa: boolean;
  defaultProctoringLevel: ProctoringLevel;
  maxConcurrentExams: number;
  sessionTimeout: number;
  alertThresholds: {
    tabSwitches: number;
    gazeAwayDuration: number;
    faceAbsenceDuration: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Face Detection Types
export interface FaceDetectionResult {
  detected: boolean;
  faceCount: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  confidence: number;
}

export interface GazeEstimation {
  direction: 'center' | 'left' | 'right' | 'up' | 'down' | 'away';
  confidence: number;
  pitch: number;
  yaw: number;
}
