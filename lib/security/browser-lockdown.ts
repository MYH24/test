// Browser lockdown utilities for secure exam environment

interface LockdownConfig {
  preventRightClick: boolean;
  preventCopyPaste: boolean;
  preventKeyboardShortcuts: boolean;
  preventDevTools: boolean;
  enforceFullscreen: boolean;
  detectMultipleScreens: boolean;
}

const DEFAULT_CONFIG: LockdownConfig = {
  preventRightClick: true,
  preventCopyPaste: true,
  preventKeyboardShortcuts: true,
  preventDevTools: true,
  enforceFullscreen: true,
  detectMultipleScreens: true,
};

type ViolationCallback = (type: string, message: string) => void;

class BrowserLockdown {
  private config: LockdownConfig;
  private isActive: boolean = false;
  private onViolation: ViolationCallback | null = null;
  private eventListeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];
  private devToolsCheckInterval: number | null = null;

  constructor(config: Partial<LockdownConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  activate(onViolation?: ViolationCallback): void {
    if (this.isActive) return;
    this.isActive = true;
    this.onViolation = onViolation || null;

    if (this.config.preventRightClick) {
      this.preventRightClick();
    }

    if (this.config.preventCopyPaste) {
      this.preventCopyPaste();
    }

    if (this.config.preventKeyboardShortcuts) {
      this.preventKeyboardShortcuts();
    }

    if (this.config.preventDevTools) {
      this.preventDevTools();
    }

    if (this.config.enforceFullscreen) {
      this.enforceFullscreen();
    }
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    // Remove all event listeners
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    // Clear devtools check interval
    if (this.devToolsCheckInterval) {
      clearInterval(this.devToolsCheckInterval);
      this.devToolsCheckInterval = null;
    }

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    this.onViolation = null;
  }

  private addListener(target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(type, handler, options);
    this.eventListeners.push({ target, type, handler });
  }

  private reportViolation(type: string, message: string): void {
    this.onViolation?.(type, message);
  }

  private preventRightClick(): void {
    const handler = (e: Event) => {
      e.preventDefault();
      this.reportViolation('right-click', 'Right-click is disabled during exam');
      return false;
    };
    this.addListener(document, 'contextmenu', handler as EventListener);
  }

  private preventCopyPaste(): void {
    const copyHandler = (e: Event) => {
      e.preventDefault();
      this.reportViolation('copy-paste', 'Copy operation blocked');
      return false;
    };

    const pasteHandler = (e: Event) => {
      e.preventDefault();
      this.reportViolation('copy-paste', 'Paste operation blocked');
      return false;
    };

    const cutHandler = (e: Event) => {
      e.preventDefault();
      this.reportViolation('copy-paste', 'Cut operation blocked');
      return false;
    };

    this.addListener(document, 'copy', copyHandler as EventListener);
    this.addListener(document, 'paste', pasteHandler as EventListener);
    this.addListener(document, 'cut', cutHandler as EventListener);
  }

  private preventKeyboardShortcuts(): void {
    const blockedKeys: Record<string, string[]> = {
      // Copy/Paste/Cut
      'c': ['ctrl', 'meta'],
      'v': ['ctrl', 'meta'],
      'x': ['ctrl', 'meta'],
      // Select all
      'a': ['ctrl', 'meta'],
      // Find
      'f': ['ctrl', 'meta'],
      // Print
      'p': ['ctrl', 'meta'],
      // Save
      's': ['ctrl', 'meta'],
      // Open file
      'o': ['ctrl', 'meta'],
      // New window
      'n': ['ctrl', 'meta'],
      // New tab
      't': ['ctrl', 'meta'],
      // Close tab
      'w': ['ctrl', 'meta'],
      // Refresh
      'r': ['ctrl', 'meta'],
      // Developer tools
      'i': ['ctrl+shift', 'meta+option'],
      'j': ['ctrl+shift', 'meta+option'],
      'u': ['ctrl'],
      // Task manager
      'Escape': ['meta'],
    };

    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const modifiers = blockedKeys[key];

      if (!modifiers) {
        // Check F keys for DevTools
        if (e.key === 'F12' || e.key === 'F11') {
          e.preventDefault();
          this.reportViolation('keyboard-shortcut', `${e.key} key is disabled`);
          return false;
        }
        return true;
      }

      const ctrlPressed = e.ctrlKey;
      const metaPressed = e.metaKey;
      const shiftPressed = e.shiftKey;
      const altPressed = e.altKey;

      for (const mod of modifiers) {
        let blocked = false;

        if (mod === 'ctrl' && ctrlPressed && !shiftPressed && !altPressed) blocked = true;
        if (mod === 'meta' && metaPressed && !shiftPressed && !altPressed) blocked = true;
        if (mod === 'ctrl+shift' && ctrlPressed && shiftPressed) blocked = true;
        if (mod === 'meta+option' && metaPressed && altPressed) blocked = true;

        if (blocked) {
          e.preventDefault();
          this.reportViolation('keyboard-shortcut', `Keyboard shortcut blocked: ${e.key}`);
          return false;
        }
      }

      return true;
    };

    this.addListener(document, 'keydown', handler as EventListener);
  }

  private preventDevTools(): void {
    // Detect DevTools by size difference
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        this.reportViolation('devtools', 'Developer tools detected');
      }
    };

    this.devToolsCheckInterval = window.setInterval(checkDevTools, 1000);

    // Detect debugger
    const debuggerCheck = () => {
      const startTime = performance.now();
      // This will pause if debugger is open
      // eslint-disable-next-line no-debugger
      (() => {})();
      const endTime = performance.now();
      
      if (endTime - startTime > 100) {
        this.reportViolation('devtools', 'Debugger detected');
      }
    };

    this.addListener(window, 'resize', checkDevTools as EventListener);
    
    // Periodic debugger check
    const debugInterval = window.setInterval(debuggerCheck, 5000);
    this.eventListeners.push({
      target: window,
      type: 'interval',
      handler: (() => clearInterval(debugInterval)) as unknown as EventListener,
    });
  }

  private enforceFullscreen(): void {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        this.reportViolation('fullscreen', 'Failed to enter fullscreen mode');
      }
    };

    const fullscreenChangeHandler = () => {
      if (!document.fullscreenElement && this.isActive) {
        this.reportViolation('fullscreen', 'Exited fullscreen mode');
        // Try to re-enter fullscreen
        setTimeout(enterFullscreen, 500);
      }
    };

    this.addListener(document, 'fullscreenchange', fullscreenChangeHandler as EventListener);
    this.addListener(document, 'webkitfullscreenchange', fullscreenChangeHandler as EventListener);
    this.addListener(document, 'mozfullscreenchange', fullscreenChangeHandler as EventListener);
    this.addListener(document, 'MSFullscreenChange', fullscreenChangeHandler as EventListener);
  }

  async requestFullscreen(): Promise<boolean> {
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  async detectMultipleScreens(): Promise<{ detected: boolean; count: number }> {
    try {
      // Check if Screen API is available
      if ('getScreenDetails' in window) {
        // @ts-ignore - Experimental API
        const screenDetails = await window.getScreenDetails();
        return {
          detected: screenDetails.screens.length > 1,
          count: screenDetails.screens.length,
        };
      }

      // Fallback: check screen size vs available size
      const suspiciousWidth = window.screen.width > window.screen.availWidth * 1.5;
      return {
        detected: suspiciousWidth,
        count: suspiciousWidth ? 2 : 1,
      };
    } catch {
      return { detected: false, count: 1 };
    }
  }

  getStatus(): { isActive: boolean; isFullscreen: boolean } {
    return {
      isActive: this.isActive,
      isFullscreen: this.isFullscreen(),
    };
  }
}

// Singleton instance
let lockdownInstance: BrowserLockdown | null = null;

export function getBrowserLockdown(config?: Partial<LockdownConfig>): BrowserLockdown {
  if (!lockdownInstance) {
    lockdownInstance = new BrowserLockdown(config);
  }
  return lockdownInstance;
}

export function disposeBrowserLockdown(): void {
  if (lockdownInstance) {
    lockdownInstance.deactivate();
    lockdownInstance = null;
  }
}

export { BrowserLockdown };
export type { LockdownConfig };
