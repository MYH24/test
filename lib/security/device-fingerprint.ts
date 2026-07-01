import { DeviceFingerprint } from '@/types';

// Generate a unique device fingerprint for authentication and tracking

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas-not-supported';

    canvas.width = 200;
    canvas.height = 50;

    // Draw text with various styles
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('ExamGuard Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas Test', 4, 17);

    // Get data URL
    const dataUrl = canvas.toDataURL();
    
    // Hash it
    return await hashString(dataUrl);
  } catch {
    return 'canvas-error';
  }
}

async function getWebGLFingerprint(): Promise<{ vendor: string; renderer: string }> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) {
      return { vendor: 'not-supported', renderer: 'not-supported' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { vendor: 'unknown', renderer: 'unknown' };
    }

    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown',
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown',
    };
  } catch {
    return { vendor: 'error', renderer: 'error' };
  }
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    gainNode.gain.value = 0; // Mute
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return new Promise((resolve) => {
      scriptProcessor.onaudioprocess = (event) => {
        const data = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += Math.abs(data[i]);
        }
        
        oscillator.disconnect();
        scriptProcessor.disconnect();
        gainNode.disconnect();
        audioContext.close();

        resolve(sum.toString(36).substring(0, 16));
      };

      oscillator.start(0);
      setTimeout(() => {
        oscillator.stop();
      }, 100);
    });
  } catch {
    return 'audio-not-supported';
  }
}

async function hashString(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const [canvas, webgl, audio] = await Promise.all([
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getAudioFingerprint(),
  ]);

  const components = {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    canvas,
    audio,
  };

  // Generate overall hash
  const fingerprintString = Object.values(components).join('|');
  const hash = await hashString(fingerprintString);

  return {
    hash,
    screenResolution: components.screenResolution,
    colorDepth: components.colorDepth,
    timezone: components.timezone,
    language: components.language,
    platform: components.platform,
    hardwareConcurrency: components.hardwareConcurrency,
    deviceMemory: components.deviceMemory,
    webglVendor: components.webglVendor,
    webglRenderer: components.webglRenderer,
    canvas: components.canvas,
    audio: components.audio,
  };
}

export async function compareFingerprints(
  stored: DeviceFingerprint,
  current: DeviceFingerprint
): Promise<{ match: boolean; confidence: number; differences: string[] }> {
  const differences: string[] = [];
  let matchedComponents = 0;
  const totalComponents = 10;

  // Compare each component
  if (stored.screenResolution === current.screenResolution) matchedComponents++;
  else differences.push('screen_resolution');

  if (stored.colorDepth === current.colorDepth) matchedComponents++;
  else differences.push('color_depth');

  if (stored.timezone === current.timezone) matchedComponents++;
  else differences.push('timezone');

  if (stored.language === current.language) matchedComponents++;
  else differences.push('language');

  if (stored.platform === current.platform) matchedComponents++;
  else differences.push('platform');

  if (stored.hardwareConcurrency === current.hardwareConcurrency) matchedComponents++;
  else differences.push('cpu_cores');

  if (stored.webglVendor === current.webglVendor) matchedComponents++;
  else differences.push('gpu_vendor');

  if (stored.webglRenderer === current.webglRenderer) matchedComponents++;
  else differences.push('gpu_renderer');

  if (stored.canvas === current.canvas) matchedComponents++;
  else differences.push('canvas');

  if (stored.audio === current.audio) matchedComponents++;
  else differences.push('audio');

  const confidence = matchedComponents / totalComponents;

  // Consider it a match if confidence is above 70%
  const match = confidence >= 0.7;

  return { match, confidence, differences };
}

// Simple storage for fingerprint (in real app, this would be server-side)
export function storeFingerprint(userId: string, fingerprint: DeviceFingerprint): void {
  try {
    const stored = localStorage.getItem('device_fingerprints') || '{}';
    const fingerprints = JSON.parse(stored);
    
    if (!fingerprints[userId]) {
      fingerprints[userId] = [];
    }

    // Keep only last 5 fingerprints per user
    fingerprints[userId].push(fingerprint);
    if (fingerprints[userId].length > 5) {
      fingerprints[userId] = fingerprints[userId].slice(-5);
    }

    localStorage.setItem('device_fingerprints', JSON.stringify(fingerprints));
  } catch {
    console.error('Failed to store fingerprint');
  }
}

export function getStoredFingerprints(userId: string): DeviceFingerprint[] {
  try {
    const stored = localStorage.getItem('device_fingerprints') || '{}';
    const fingerprints = JSON.parse(stored);
    return fingerprints[userId] || [];
  } catch {
    return [];
  }
}
