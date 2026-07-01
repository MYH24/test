"use client";

import { FaceDetectionResult } from '@/types';

// Face detection using multiple strategies for cross-browser compatibility
// Strategy 1: Native FaceDetector API (Chrome 70+)
// Strategy 2: Canvas-based skin tone analysis (fallback)

interface FaceDetectionConfig {
  minConfidence: number;
  maxFaces: number;
  detectionInterval: number;
}

const DEFAULT_CONFIG: FaceDetectionConfig = {
  minConfidence: 0.5,
  maxFaces: 5,
  detectionInterval: 500,
};

// Check if browser supports native FaceDetector API
const hasFaceDetectorAPI = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'FaceDetector' in window;
};

class FaceDetector {
  private config: FaceDetectionConfig;
  private isInitialized: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private lastDetection: FaceDetectionResult | null = null;
  private detectionInterval: ReturnType<typeof setInterval> | null = null;
  private nativeFaceDetector: unknown | null = null;
  private useNativeAPI: boolean = false;
  private frameCount: number = 0;
  private lastFaceTime: number = 0;
  private faceHistory: boolean[] = [];

  constructor(config: Partial<FaceDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<boolean> {
    try {
      // Create canvas for image processing
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      
      if (!this.ctx) {
        throw new Error('Could not get canvas context');
      }

      // Try to use native FaceDetector API if available
      if (hasFaceDetectorAPI()) {
        try {
          // @ts-expect-error - FaceDetector is not in TypeScript types yet
          this.nativeFaceDetector = new window.FaceDetector({
            fastMode: true,
            maxDetectedFaces: this.config.maxFaces,
          });
          this.useNativeAPI = true;
        } catch {
          this.useNativeAPI = false;
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      return false;
    }
  }

  async detectFaces(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!this.isInitialized || !this.ctx || !this.canvas) {
      return this.createEmptyResult();
    }

    // Check if video is ready
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return this.createEmptyResult();
    }

    try {
      this.frameCount++;
      
      // Try native API first
      if (this.useNativeAPI && this.nativeFaceDetector) {
        try {
          const result = await this.detectWithNativeAPI(video);
          this.lastDetection = result;
          this.updateFaceHistory(result.detected);
          return result;
        } catch {
          // Fall back to canvas analysis
          this.useNativeAPI = false;
        }
      }

      // Canvas-based detection (fallback)
      const result = await this.detectWithCanvas(video);
      this.lastDetection = result;
      this.updateFaceHistory(result.detected);
      return result;
    } catch (error) {
      console.error('Face detection error:', error);
      return this.createEmptyResult();
    }
  }

  private async detectWithNativeAPI(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    try {
      // @ts-expect-error - FaceDetector API
      const faces = await this.nativeFaceDetector.detect(video);
      
      if (faces.length === 0) {
        return {
          detected: false,
          faceCount: 0,
          confidence: 0,
        };
      }

      const primaryFace = faces[0];
      const boundingBox = {
        x: primaryFace.boundingBox.x,
        y: primaryFace.boundingBox.y,
        width: primaryFace.boundingBox.width,
        height: primaryFace.boundingBox.height,
      };

      // Extract landmarks if available
      let landmarks;
      if (primaryFace.landmarks && primaryFace.landmarks.length >= 5) {
        landmarks = {
          leftEye: primaryFace.landmarks.find((l: {type: string}) => l.type === 'eye')?.locations[0] || { x: 0, y: 0 },
          rightEye: { x: boundingBox.x + boundingBox.width * 0.7, y: boundingBox.y + boundingBox.height * 0.35 },
          nose: primaryFace.landmarks.find((l: {type: string}) => l.type === 'nose')?.locations[0] || { x: 0, y: 0 },
          leftMouth: { x: boundingBox.x + boundingBox.width * 0.35, y: boundingBox.y + boundingBox.height * 0.75 },
          rightMouth: primaryFace.landmarks.find((l: {type: string}) => l.type === 'mouth')?.locations[0] || { x: 0, y: 0 },
        };
      }

      // Calculate confidence based on face size relative to frame
      const faceArea = boundingBox.width * boundingBox.height;
      const frameArea = video.videoWidth * video.videoHeight;
      const sizeRatio = faceArea / frameArea;
      // Face should be 5-40% of frame for good detection
      const confidence = Math.min(0.99, Math.max(0.6, 0.7 + (sizeRatio > 0.05 && sizeRatio < 0.4 ? 0.25 : 0)));

      return {
        detected: true,
        faceCount: faces.length,
        boundingBox,
        landmarks,
        confidence,
      };
    } catch {
      return this.createEmptyResult();
    }
  }

  private async detectWithCanvas(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!this.ctx || !this.canvas) return this.createEmptyResult();

    // Use smaller canvas for faster processing
    const scale = 0.25;
    const width = Math.floor(video.videoWidth * scale);
    const height = Math.floor(video.videoHeight * scale);
    
    this.canvas.width = width;
    this.canvas.height = height;

    // Draw current video frame
    this.ctx.drawImage(video, 0, 0, width, height);

    // Get image data for analysis
    const imageData = this.ctx.getImageData(0, 0, width, height);
    
    // Analyze frame for face-like features
    const result = this.analyzeFrameAdvanced(imageData, video.videoWidth, video.videoHeight);
    
    return result;
  }

  private analyzeFrameAdvanced(imageData: ImageData, originalWidth: number, originalHeight: number): FaceDetectionResult {
    const { data, width, height } = imageData;
    const scale = originalWidth / width;
    
    // Multi-step analysis for better accuracy
    let skinPixelCount = 0;
    let totalPixels = 0;
    let skinRegions: Array<{x: number, y: number}> = [];
    
    // Step 1: Detect skin-tone pixels with improved algorithm
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (this.isSkinToneAdvanced(r, g, b)) {
          skinPixelCount++;
          skinRegions.push({ x, y });
        }
        totalPixels++;
      }
    }

    const skinRatio = skinPixelCount / totalPixels;
    
    // Step 2: Cluster skin regions to find face candidates
    const faceCandidate = this.findFaceCandidate(skinRegions, width, height);
    
    // Step 3: Validate face candidate
    const isValidFace = this.validateFaceCandidate(faceCandidate, skinRatio, width, height);
    
    if (!isValidFace || !faceCandidate) {
      // Use temporal smoothing - if we detected face recently, give benefit of doubt
      const recentDetection = Date.now() - this.lastFaceTime < 2000;
      const historyDetection = this.faceHistory.filter(Boolean).length > this.faceHistory.length / 2;
      
      if (recentDetection && historyDetection) {
        return {
          detected: true,
          faceCount: 1,
          confidence: 0.5,
        };
      }
      
      return {
        detected: false,
        faceCount: 0,
        confidence: 0,
      };
    }

    this.lastFaceTime = Date.now();

    // Scale bounding box back to original size
    const boundingBox = {
      x: faceCandidate.x * scale,
      y: faceCandidate.y * scale,
      width: faceCandidate.width * scale,
      height: faceCandidate.height * scale,
    };

    // Estimate landmarks based on face proportions
    const landmarks = {
      leftEye: { 
        x: boundingBox.x + boundingBox.width * 0.3, 
        y: boundingBox.y + boundingBox.height * 0.35 
      },
      rightEye: { 
        x: boundingBox.x + boundingBox.width * 0.7, 
        y: boundingBox.y + boundingBox.height * 0.35 
      },
      nose: { 
        x: boundingBox.x + boundingBox.width * 0.5, 
        y: boundingBox.y + boundingBox.height * 0.55 
      },
      leftMouth: { 
        x: boundingBox.x + boundingBox.width * 0.35, 
        y: boundingBox.y + boundingBox.height * 0.75 
      },
      rightMouth: { 
        x: boundingBox.x + boundingBox.width * 0.65, 
        y: boundingBox.y + boundingBox.height * 0.75 
      },
    };

    // Calculate confidence based on multiple factors
    const sizeConfidence = this.calculateSizeConfidence(boundingBox, originalWidth, originalHeight);
    const shapeConfidence = this.calculateShapeConfidence(faceCandidate);
    const skinConfidence = Math.min(1, skinRatio * 8);
    
    const confidence = Math.min(0.95, (sizeConfidence * 0.4 + shapeConfidence * 0.3 + skinConfidence * 0.3));

    return {
      detected: true,
      faceCount: 1,
      boundingBox,
      landmarks,
      confidence,
    };
  }

  private isSkinToneAdvanced(r: number, g: number, b: number): boolean {
    // Convert RGB to YCbCr for better skin detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;

    // YCbCr skin color bounds (works across different skin tones)
    const skinYCbCr = (
      cb >= 77 && cb <= 127 &&
      cr >= 133 && cr <= 173 &&
      y >= 80
    );

    // Also check RGB rules for additional validation
    const skinRGB = (
      r > 60 && r < 255 &&
      g > 40 && g < 230 &&
      b > 20 && b < 220 &&
      r > g && r > b &&
      Math.abs(r - g) > 10
    );

    // HSV check for better lighting invariance
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const value = max / 255;
    
    const skinHSV = (
      saturation >= 0.1 && saturation <= 0.7 &&
      value >= 0.3 && value <= 0.95
    );

    return (skinYCbCr || skinRGB) && skinHSV;
  }

  private findFaceCandidate(skinRegions: Array<{x: number, y: number}>, width: number, height: number): {x: number, y: number, width: number, height: number} | null {
    if (skinRegions.length < 20) return null;

    // Find bounding box of largest skin cluster
    let minX = width, maxX = 0, minY = height, maxY = 0;
    
    // Focus on center region (where face is likely to be)
    const centerX = width / 2;
    const centerY = height / 2;
    const relevantRegions = skinRegions.filter(p => {
      const distX = Math.abs(p.x - centerX) / width;
      const distY = Math.abs(p.y - centerY) / height;
      return distX < 0.4 && distY < 0.45;
    });

    if (relevantRegions.length < 15) {
      // Fall back to all regions
      for (const p of skinRegions) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    } else {
      for (const p of relevantRegions) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    if (boxWidth < 10 || boxHeight < 10) return null;

    return {
      x: minX,
      y: minY,
      width: boxWidth,
      height: boxHeight,
    };
  }

  private validateFaceCandidate(
    candidate: {x: number, y: number, width: number, height: number} | null,
    skinRatio: number,
    frameWidth: number,
    frameHeight: number
  ): boolean {
    if (!candidate) return false;

    // Check aspect ratio (face is typically taller than wide)
    const aspectRatio = candidate.height / candidate.width;
    if (aspectRatio < 0.8 || aspectRatio > 2.0) return false;

    // Check size relative to frame
    const faceArea = candidate.width * candidate.height;
    const frameArea = frameWidth * frameHeight;
    const areaRatio = faceArea / frameArea;
    
    // Face should be at least 3% and no more than 60% of frame
    if (areaRatio < 0.03 || areaRatio > 0.6) return false;

    // Check skin ratio is reasonable
    if (skinRatio < 0.03 || skinRatio > 0.5) return false;

    // Check position - face should be roughly centered
    const centerX = candidate.x + candidate.width / 2;
    const centerY = candidate.y + candidate.height / 2;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    
    const offsetX = Math.abs(centerX - frameCenterX) / frameWidth;
    const offsetY = Math.abs(centerY - frameCenterY) / frameHeight;
    
    if (offsetX > 0.35 || offsetY > 0.4) return false;

    return true;
  }

  private calculateSizeConfidence(
    boundingBox: {width: number, height: number},
    frameWidth: number,
    frameHeight: number
  ): number {
    const faceArea = boundingBox.width * boundingBox.height;
    const frameArea = frameWidth * frameHeight;
    const ratio = faceArea / frameArea;
    
    // Ideal face size is 10-25% of frame
    if (ratio >= 0.1 && ratio <= 0.25) return 1;
    if (ratio >= 0.05 && ratio < 0.1) return 0.7;
    if (ratio > 0.25 && ratio <= 0.4) return 0.8;
    return 0.5;
  }

  private calculateShapeConfidence(candidate: {width: number, height: number}): number {
    const aspectRatio = candidate.height / candidate.width;
    // Ideal face aspect ratio is around 1.3-1.5
    if (aspectRatio >= 1.1 && aspectRatio <= 1.6) return 1;
    if (aspectRatio >= 0.9 && aspectRatio < 1.1) return 0.7;
    if (aspectRatio > 1.6 && aspectRatio <= 1.9) return 0.8;
    return 0.5;
  }

  private updateFaceHistory(detected: boolean): void {
    this.faceHistory.push(detected);
    if (this.faceHistory.length > 10) {
      this.faceHistory.shift();
    }
  }

  private createEmptyResult(): FaceDetectionResult {
    return {
      detected: false,
      faceCount: 0,
      confidence: 0,
    };
  }

  getLastDetection(): FaceDetectionResult | null {
    return this.lastDetection;
  }

  startContinuousDetection(
    video: HTMLVideoElement,
    callback: (result: FaceDetectionResult) => void,
    intervalMs: number = 500
  ): void {
    this.stopContinuousDetection();

    // Initial detection
    this.detectFaces(video).then(callback);

    this.detectionInterval = setInterval(async () => {
      const result = await this.detectFaces(video);
      callback(result);
    }, intervalMs);
  }

  stopContinuousDetection(): void {
    if (this.detectionInterval !== null) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  dispose(): void {
    this.stopContinuousDetection();
    this.canvas = null;
    this.ctx = null;
    this.nativeFaceDetector = null;
    this.isInitialized = false;
    this.faceHistory = [];
  }
}

// Singleton instance
let detectorInstance: FaceDetector | null = null;

export function getFaceDetector(config?: Partial<FaceDetectionConfig>): FaceDetector {
  if (!detectorInstance) {
    detectorInstance = new FaceDetector(config);
  }
  return detectorInstance;
}

export function disposeFaceDetector(): void {
  if (detectorInstance) {
    detectorInstance.dispose();
    detectorInstance = null;
  }
}

export { FaceDetector };
export type { FaceDetectionConfig };
