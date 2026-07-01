import { FaceDetectionResult, GazeEstimation, AlertType, AlertSeverity, ProctoringState } from '@/types';

interface BehaviorEvent {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
}

interface BehaviorConfig {
  faceAbsenceThresholdMs: number;
  multipleFaceThreshold: number;
  gazeAwayThresholdMs: number;
  tabSwitchWarningCount: number;
  suspiciousMovementThreshold: number;
  audioLevelThreshold: number;
}

const DEFAULT_CONFIG: BehaviorConfig = {
  faceAbsenceThresholdMs: 10000,
  multipleFaceThreshold: 1,
  gazeAwayThresholdMs: 3000,
  tabSwitchWarningCount: 3,
  suspiciousMovementThreshold: 0.4,
  audioLevelThreshold: 0.3,
};

class BehaviorAnalyzer {
  private config: BehaviorConfig;
  private events: BehaviorEvent[] = [];
  private lastFaceDetectedTime: number = Date.now();
  private lastFacePosition: { x: number; y: number } | null = null;
  private movementHistory: number[] = [];
  private tabSwitchCount: number = 0;
  private windowBlurCount: number = 0;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioStream: MediaStream | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<BehaviorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(): boolean {
    this.isInitialized = true;
    this.reset();
    return true;
  }

  async initializeAudio(stream: MediaStream): Promise<boolean> {
    try {
      this.audioContext = new AudioContext();
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.audioAnalyser);
      this.audioStream = stream;

      return true;
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
      return false;
    }
  }

  analyzeBehavior(
    faceResult: FaceDetectionResult,
    gazeResult: GazeEstimation,
    state: Partial<ProctoringState>
  ): BehaviorEvent[] {
    const newEvents: BehaviorEvent[] = [];
    const now = Date.now();

    // Check face detection issues
    if (!faceResult.detected) {
      const absenceDuration = now - this.lastFaceDetectedTime;
      if (absenceDuration > this.config.faceAbsenceThresholdMs) {
        newEvents.push({
          type: 'face-not-detected',
          severity: 'high',
          message: `Face not detected for ${Math.round(absenceDuration / 1000)} seconds`,
          timestamp: new Date(),
        });
      }
    } else {
      this.lastFaceDetectedTime = now;
    }

    // Check for multiple faces
    if (faceResult.faceCount > this.config.multipleFaceThreshold) {
      newEvents.push({
        type: 'multiple-faces',
        severity: 'critical',
        message: `${faceResult.faceCount} faces detected in frame`,
        timestamp: new Date(),
      });
    }

    // Check gaze direction
    if (gazeResult.direction !== 'center') {
      const gazeAwayDuration = state.isGazeOnScreen === false ? this.config.gazeAwayThresholdMs : 0;
      if (gazeAwayDuration >= this.config.gazeAwayThresholdMs) {
        newEvents.push({
          type: 'gaze-away',
          severity: 'medium',
          message: `Looking ${gazeResult.direction} for extended period`,
          timestamp: new Date(),
        });
      }
    }

    // Analyze movement patterns
    if (faceResult.detected && faceResult.boundingBox) {
      const currentPos = {
        x: faceResult.boundingBox.x + faceResult.boundingBox.width / 2,
        y: faceResult.boundingBox.y + faceResult.boundingBox.height / 2,
      };

      if (this.lastFacePosition) {
        const movement = Math.sqrt(
          Math.pow(currentPos.x - this.lastFacePosition.x, 2) +
          Math.pow(currentPos.y - this.lastFacePosition.y, 2)
        );
        
        this.movementHistory.push(movement);
        if (this.movementHistory.length > 30) {
          this.movementHistory.shift();
        }

        // Check for suspicious rapid movement
        const avgMovement = this.movementHistory.reduce((a, b) => a + b, 0) / this.movementHistory.length;
        if (avgMovement > this.config.suspiciousMovementThreshold * 100) {
          newEvents.push({
            type: 'suspicious-movement',
            severity: 'medium',
            message: 'Excessive movement detected',
            timestamp: new Date(),
          });
        }
      }

      this.lastFacePosition = currentPos;
    }

    // Check tab switches
    if (state.tabSwitchCount !== undefined && state.tabSwitchCount > this.tabSwitchCount) {
      this.tabSwitchCount = state.tabSwitchCount;
      const severity: AlertSeverity = this.tabSwitchCount >= this.config.tabSwitchWarningCount ? 'high' : 'medium';
      newEvents.push({
        type: 'tab-switch',
        severity,
        message: `Tab switch detected (${this.tabSwitchCount} total)`,
        timestamp: new Date(),
      });
    }

    // Check fullscreen status
    if (state.isFullscreen === false) {
      newEvents.push({
        type: 'fullscreen-exit',
        severity: 'high',
        message: 'Exited fullscreen mode',
        timestamp: new Date(),
      });
    }

    // Add new events to history
    this.events.push(...newEvents);

    return newEvents;
  }

  getAudioLevel(): number {
    if (!this.audioAnalyser) return 0;

    const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioAnalyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length / 255;
  }

  checkAudioActivity(): BehaviorEvent | null {
    const audioLevel = this.getAudioLevel();
    
    if (audioLevel > this.config.audioLevelThreshold) {
      return {
        type: 'audio-detected',
        severity: 'low',
        message: 'Audio/speech detected',
        timestamp: new Date(),
      };
    }

    return null;
  }

  recordTabSwitch(): void {
    this.tabSwitchCount++;
  }

  recordWindowBlur(): void {
    this.windowBlurCount++;
  }

  getTabSwitchCount(): number {
    return this.tabSwitchCount;
  }

  getWindowBlurCount(): number {
    return this.windowBlurCount;
  }

  getEvents(): BehaviorEvent[] {
    return [...this.events];
  }

  getEventsSince(timestamp: Date): BehaviorEvent[] {
    return this.events.filter(e => e.timestamp > timestamp);
  }

  calculateTrustScore(): number {
    // Start with perfect score
    let score = 100;

    // Deduct for various issues
    const criticalEvents = this.events.filter(e => e.severity === 'critical').length;
    const highEvents = this.events.filter(e => e.severity === 'high').length;
    const mediumEvents = this.events.filter(e => e.severity === 'medium').length;
    const lowEvents = this.events.filter(e => e.severity === 'low').length;

    score -= criticalEvents * 15;
    score -= highEvents * 8;
    score -= mediumEvents * 3;
    score -= lowEvents * 1;

    // Deduct for tab switches
    score -= this.tabSwitchCount * 5;

    // Deduct for window blur
    score -= this.windowBlurCount * 3;

    return Math.max(0, Math.min(100, score));
  }

  reset(): void {
    this.events = [];
    this.lastFaceDetectedTime = Date.now();
    this.lastFacePosition = null;
    this.movementHistory = [];
    this.tabSwitchCount = 0;
    this.windowBlurCount = 0;
  }

  dispose(): void {
    this.reset();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioAnalyser = null;
    this.audioStream = null;
    this.isInitialized = false;
  }
}

// Singleton instance
let analyzerInstance: BehaviorAnalyzer | null = null;

export function getBehaviorAnalyzer(config?: Partial<BehaviorConfig>): BehaviorAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new BehaviorAnalyzer(config);
  }
  return analyzerInstance;
}

export function disposeBehaviorAnalyzer(): void {
  if (analyzerInstance) {
    analyzerInstance.dispose();
    analyzerInstance = null;
  }
}

export { BehaviorAnalyzer };
export type { BehaviorConfig, BehaviorEvent };
