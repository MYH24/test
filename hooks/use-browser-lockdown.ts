'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBrowserLockdown, disposeBrowserLockdown } from '@/lib/security/browser-lockdown';

interface LockdownViolation {
  type: string;
  message: string;
  timestamp: Date;
}

interface UseBrowserLockdownOptions {
  enabled: boolean;
  onViolation?: (type: string, message: string) => void;
}

interface UseBrowserLockdownReturn {
  isActive: boolean;
  isFullscreen: boolean;
  violations: LockdownViolation[];
  activateLockdown: () => void;
  deactivateLockdown: () => void;
  requestFullscreen: () => Promise<boolean>;
  violationCount: number;
}

export function useBrowserLockdown(options: UseBrowserLockdownOptions): UseBrowserLockdownReturn {
  const { enabled, onViolation } = options;
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState<LockdownViolation[]>([]);

  // Handle violation
  const handleViolation = useCallback((type: string, message: string) => {
    const violation: LockdownViolation = {
      type,
      message,
      timestamp: new Date(),
    };
    
    setViolations((prev) => [...prev, violation]);
    onViolation?.(type, message);
  }, [onViolation]);

  // Activate lockdown
  const activateLockdown = useCallback(() => {
    if (!enabled) return;
    
    const lockdown = getBrowserLockdown();
    lockdown.activate(handleViolation);
    setIsActive(true);
  }, [enabled, handleViolation]);

  // Deactivate lockdown
  const deactivateLockdown = useCallback(() => {
    const lockdown = getBrowserLockdown();
    lockdown.deactivate();
    setIsActive(false);
    disposeBrowserLockdown();
  }, []);

  // Request fullscreen
  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    const lockdown = getBrowserLockdown();
    const success = await lockdown.requestFullscreen();
    setIsFullscreen(success);
    return success;
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-activate when enabled
  useEffect(() => {
    if (enabled && !isActive) {
      activateLockdown();
    }
    
    return () => {
      if (isActive) {
        deactivateLockdown();
      }
    };
  }, [enabled, isActive, activateLockdown, deactivateLockdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeBrowserLockdown();
    };
  }, []);

  return {
    isActive,
    isFullscreen,
    violations,
    activateLockdown,
    deactivateLockdown,
    requestFullscreen,
    violationCount: violations.length,
  };
}
