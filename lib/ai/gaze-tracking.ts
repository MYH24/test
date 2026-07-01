import { GazeEstimation, FaceDetectionResult } from '@/types';

interface GazeTrackingConfig {
  sensitivityX: number;
  sensitivityY: number;
  smoothingFactor: number;
  awayThresholdMs: number;
}

const DEFAULT_CONFIG: GazeTrackingConfig = {
  sensitivityX: 0.3,
  sensitivityY: 0.25,
  smoothingFactor: 0.7,
  awayThresholdMs: 3000,
};

class GazeTracker {
  private config: GazeTrackingConfig;
  private lastEstimation: GazeEstimation | null = null;
  private smoothedPitch: number = 0;
  private smoothedYaw: number = 0;
  private gazeAwayStartTime: number | null = null;
  private totalGazeAwayTime: number = 0;
  private isInitialized: boolean = false;

  constructor(config: Partial<GazeTrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(): boolean {
    this.isInitialized = true;
    this.reset();
    return true;
  }

  estimateGaze(faceResult: FaceDetectionResult, frameWidth: number, frameHeight: number): GazeEstimation {
    if (!this.isInitialized || !faceResult.detected || !faceResult.landmarks || !faceResult.boundingBox) {
      return this.createAwayResult();
    }

    const { landmarks, boundingBox } = faceResult;
    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2;

    // Calculate face center
    const faceX = boundingBox.x + boundingBox.width / 2;
    const faceY = boundingBox.y + boundingBox.height / 2;

    // Estimate head rotation based on face position relative to frame center
    const rawYaw = ((faceX - centerX) / centerX) * 45; // -45 to +45 degrees
    const rawPitch = ((faceY - centerY) / centerY) * 30; // -30 to +30 degrees

    // Apply smoothing
    this.smoothedYaw = this.smoothedYaw * this.config.smoothingFactor + rawYaw * (1 - this.config.smoothingFactor);
    this.smoothedPitch = this.smoothedPitch * this.config.smoothingFactor + rawPitch * (1 - this.config.smoothingFactor);

    // Estimate eye direction based on eye landmark positions
    const eyeCenter = {
      x: (landmarks.leftEye.x + landmarks.rightEye.x) / 2,
      y: (landmarks.leftEye.y + landmarks.rightEye.y) / 2,
    };

    const eyeOffsetX = (eyeCenter.x - faceX) / (boundingBox.width / 2);
    const eyeOffsetY = (eyeCenter.y - (faceY - boundingBox.height * 0.15)) / (boundingBox.height / 2);

    // Determine gaze direction
    const direction = this.calculateDirection(this.smoothedYaw, this.smoothedPitch, eyeOffsetX, eyeOffsetY);
    
    // Calculate confidence based on face detection confidence
    const confidence = faceResult.confidence * 0.9;

    const estimation: GazeEstimation = {
      direction,
      confidence,
      pitch: this.smoothedPitch,
      yaw: this.smoothedYaw,
    };

    // Track gaze away time
    this.updateGazeAwayTracking(direction);

    this.lastEstimation = estimation;
    return estimation;
  }

  private calculateDirection(
    yaw: number,
    pitch: number,
    eyeOffsetX: number,
    eyeOffsetY: number
  ): GazeEstimation['direction'] {
    const combinedYaw = yaw + eyeOffsetX * 15;
    const combinedPitch = pitch + eyeOffsetY * 15;

    // Thresholds for direction detection
    const horizontalThreshold = 15;
    const verticalThreshold = 12;

    // Check if looking significantly away
    if (Math.abs(combinedYaw) > 35 || Math.abs(combinedPitch) > 25) {
      return 'away';
    }

    if (combinedYaw < -horizontalThreshold) {
      return 'left';
    }
    if (combinedYaw > horizontalThreshold) {
      return 'right';
    }
    if (combinedPitch < -verticalThreshold) {
      return 'up';
    }
    if (combinedPitch > verticalThreshold) {
      return 'down';
    }

    return 'center';
  }

  private updateGazeAwayTracking(direction: GazeEstimation['direction']): void {
    const isLookingAway = direction !== 'center';
    const now = Date.now();

    if (isLookingAway) {
      if (this.gazeAwayStartTime === null) {
        this.gazeAwayStartTime = now;
      }
    } else {
      if (this.gazeAwayStartTime !== null) {
        this.totalGazeAwayTime += now - this.gazeAwayStartTime;
        this.gazeAwayStartTime = null;
      }
    }
  }

  private createAwayResult(): GazeEstimation {
    return {
      direction: 'away',
      confidence: 0,
      pitch: 0,
      yaw: 0,
    };
  }

  isGazeOnScreen(): boolean {
    return this.lastEstimation?.direction === 'center';
  }

  getCurrentGazeAwayDuration(): number {
    if (this.gazeAwayStartTime === null) {
      return 0;
    }
    return Date.now() - this.gazeAwayStartTime;
  }

  getTotalGazeAwayTime(): number {
    let total = this.totalGazeAwayTime;
    if (this.gazeAwayStartTime !== null) {
      total += Date.now() - this.gazeAwayStartTime;
    }
    return total;
  }

  isGazeAwayTooLong(): boolean {
    return this.getCurrentGazeAwayDuration() > this.config.awayThresholdMs;
  }

  getLastEstimation(): GazeEstimation | null {
    return this.lastEstimation;
  }

  reset(): void {
    this.lastEstimation = null;
    this.smoothedPitch = 0;
    this.smoothedYaw = 0;
    this.gazeAwayStartTime = null;
    this.totalGazeAwayTime = 0;
  }

  dispose(): void {
    this.reset();
    this.isInitialized = false;
  }
}

// Singleton instance
let trackerInstance: GazeTracker | null = null;

export function getGazeTracker(config?: Partial<GazeTrackingConfig>): GazeTracker {
  if (!trackerInstance) {
    trackerInstance = new GazeTracker(config);
  }
  return trackerInstance;
}

export function disposeGazeTracker(): void {
  if (trackerInstance) {
    trackerInstance.dispose();
    trackerInstance = null;
  }
}

export { GazeTracker };
export type { GazeTrackingConfig };
