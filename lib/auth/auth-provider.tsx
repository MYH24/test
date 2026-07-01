'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, UserRole, AuthSession } from '@/types';
import { getDb } from '@/lib/db/mock-db';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  verifyMfa: (code: string) => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'examguard_session';
const USER_KEY = 'examguard_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedSession && savedUser) {
          const parsedSession: AuthSession = JSON.parse(savedSession);
          const parsedUser: User = JSON.parse(savedUser);

          // Check if session is expired
          if (new Date(parsedSession.expiresAt) > new Date()) {
            setSession(parsedSession);
            setUser({
              ...parsedUser,
              createdAt: new Date(parsedUser.createdAt),
              lastLogin: new Date(parsedUser.lastLogin),
            });
          } else {
            // Session expired, clear storage
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } catch {
        console.warn('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = getDb();
      const foundUser = db.getUserByEmail(email);

      if (!foundUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      // In a real app, we'd use bcrypt.compare here
      if (foundUser.passwordHash !== password) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Create session
      const newSession: AuthSession = {
        userId: foundUser.id,
        token: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        deviceFingerprint: '',
        ipAddress: '127.0.0.1',
      };

      // Update last login
      db.updateUser(foundUser.id, { lastLogin: new Date() });

      // Save to localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      localStorage.setItem(USER_KEY, JSON.stringify(foundUser));

      setSession(newSession);
      setUser(foundUser);

      // Add audit log
      db.addAuditLog({
        userId: foundUser.id,
        action: 'login',
        resource: 'auth',
        resourceId: foundUser.id,
        metadata: {},
        ipAddress: '127.0.0.1',
        deviceFingerprint: '',
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = getDb();

      // Check if email already exists
      const existingUser = db.getUserByEmail(data.email);
      if (existingUser) {
        return { success: false, error: 'Email already registered' };
      }

      // Create new user
      const newUser = db.createUser({
        email: data.email,
        passwordHash: data.password, // In a real app, we'd hash this
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        profilePhoto: '',
        faceEmbedding: [],
        deviceFingerprints: [],
        mfaEnabled: false,
        isVerified: false,
      });

      // Create session
      const newSession: AuthSession = {
        userId: newUser.id,
        token: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        deviceFingerprint: '',
        ipAddress: '127.0.0.1',
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      setSession(newSession);
      setUser(newUser);

      db.addAuditLog({
        userId: newUser.id,
        action: 'register',
        resource: 'auth',
        resourceId: newUser.id,
        metadata: { role: data.role },
        ipAddress: '127.0.0.1',
        deviceFingerprint: '',
      });

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An error occurred during registration' };
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      try {
        const db = getDb();
        db.addAuditLog({
          userId: user.id,
          action: 'logout',
          resource: 'auth',
          resourceId: user.id,
          metadata: {},
          ipAddress: '127.0.0.1',
          deviceFingerprint: '',
        });
      } catch {
        // Ignore errors during logout
      }
    }

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    setSession(null);
    setUser(null);
  }, [user]);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user) return;

    try {
      const db = getDb();
      const updatedUser = db.updateUser(user.id, updates);
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }
    } catch {
      console.error('Failed to update user');
    }
  }, [user]);

  const verifyMfa = useCallback(async (code: string): Promise<boolean> => {
    // Mock MFA verification - in a real app, this would verify against TOTP
    return code === '123456';
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    login,
    register,
    logout,
    updateUser,
    verifyMfa,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based access control hook
export function useRequireRole(allowedRoles: UserRole[]): { isAllowed: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return { isAllowed: false, isLoading: true };
  }

  const isAllowed = user ? allowedRoles.includes(user.role) : false;
  return { isAllowed, isLoading: false };
}

// Hook to get role-specific permissions
export function usePermissions() {
  const { user } = useAuth();

  return {
    canManageUsers: user?.role === 'admin',
    canCreateExams: user?.role === 'admin' || user?.role === 'instructor',
    canEditExams: user?.role === 'admin' || user?.role === 'instructor',
    canDeleteExams: user?.role === 'admin',
    canViewAllExams: user?.role === 'admin',
    canMonitorExams: user?.role === 'admin' || user?.role === 'proctor',
    canTakeExams: user?.role === 'student',
    canViewReports: user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'proctor',
    canResolveAlerts: user?.role === 'admin' || user?.role === 'proctor',
    canTerminateExams: user?.role === 'admin' || user?.role === 'proctor',
    canViewAuditLogs: user?.role === 'admin',
    canManageSettings: user?.role === 'admin',
  };
}
