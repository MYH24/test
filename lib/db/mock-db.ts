import { 
  User, 
  Exam, 
  ExamSession, 
  ProctorAlert, 
  ExamResult, 
  AuditLog,
  Question
} from '@/types';

// In-memory storage with localStorage persistence
class MockDatabase {
  private users: Map<string, User> = new Map();
  private exams: Map<string, Exam> = new Map();
  private sessions: Map<string, ExamSession> = new Map();
  private alerts: Map<string, ProctorAlert> = new Map();
  private results: Map<string, ExamResult> = new Map();
  private auditLogs: AuditLog[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.seedInitialData();
    }
  }

  private loadFromStorage(): void {
    try {
      const usersData = localStorage.getItem('mockdb_users');
      const examsData = localStorage.getItem('mockdb_exams');
      const sessionsData = localStorage.getItem('mockdb_sessions');
      const alertsData = localStorage.getItem('mockdb_alerts');
      const resultsData = localStorage.getItem('mockdb_results');

      if (usersData) {
        const parsed = JSON.parse(usersData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.users.set(key, this.deserializeUser(value as User));
        });
      }

      if (examsData) {
        const parsed = JSON.parse(examsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.exams.set(key, this.deserializeExam(value as Exam));
        });
      }

      if (sessionsData) {
        const parsed = JSON.parse(sessionsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.sessions.set(key, this.deserializeSession(value as ExamSession));
        });
      }

      if (alertsData) {
        const parsed = JSON.parse(alertsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.alerts.set(key, this.deserializeAlert(value as ProctorAlert));
        });
      }

      if (resultsData) {
        const parsed = JSON.parse(resultsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.results.set(key, value as ExamResult);
        });
      }
    } catch {
      console.warn('Failed to load from storage, starting fresh');
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('mockdb_users', JSON.stringify(Object.fromEntries(this.users)));
      localStorage.setItem('mockdb_exams', JSON.stringify(Object.fromEntries(this.exams)));
      localStorage.setItem('mockdb_sessions', JSON.stringify(Object.fromEntries(this.sessions)));
      localStorage.setItem('mockdb_alerts', JSON.stringify(Object.fromEntries(this.alerts)));
      localStorage.setItem('mockdb_results', JSON.stringify(Object.fromEntries(this.results)));
    } catch {
      console.warn('Failed to save to storage');
    }
  }

  private deserializeUser(user: User): User {
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      lastLogin: new Date(user.lastLogin),
    };
  }

  private deserializeExam(exam: Exam): Exam {
    return {
      ...exam,
      startWindow: new Date(exam.startWindow),
      endWindow: new Date(exam.endWindow),
      createdAt: new Date(exam.createdAt),
      updatedAt: new Date(exam.updatedAt),
    };
  }

  private deserializeSession(session: ExamSession): ExamSession {
    return {
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
      submittedAt: session.submittedAt ? new Date(session.submittedAt) : undefined,
      alerts: session.alerts.map(this.deserializeAlert),
    };
  }

  private deserializeAlert(alert: ProctorAlert): ProctorAlert {
    return {
      ...alert,
      timestamp: new Date(alert.timestamp),
      resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
    };
  }

  private seedInitialData(): void {
    // Only seed if no data exists
    if (this.users.size > 0) return;

    // Create demo users
    const demoUsers: User[] = [
      {
        id: 'admin-1',
        email: 'admin@examguard.io',
        passwordHash: 'demo123',
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        profilePhoto: '',
        faceEmbedding: [],
        deviceFingerprints: [],
        mfaEnabled: false,
        createdAt: new Date(),
        lastLogin: new Date(),
        isVerified: true,
      },
      {
        id: 'instructor-1',
        email: 'instructor@examguard.io',
        passwordHash: 'demo123',
        role: 'instructor',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        profilePhoto: '',
        faceEmbedding: [],
        deviceFingerprints: [],
        mfaEnabled: false,
        createdAt: new Date(),
        lastLogin: new Date(),
        isVerified: true,
      },
      {
        id: 'proctor-1',
        email: 'proctor@examguard.io',
        passwordHash: 'demo123',
        role: 'proctor',
        firstName: 'Michael',
        lastName: 'Chen',
        profilePhoto: '',
        faceEmbedding: [],
        deviceFingerprints: [],
        mfaEnabled: false,
        createdAt: new Date(),
        lastLogin: new Date(),
        isVerified: true,
      },
      {
        id: 'student-1',
        email: 'student@examguard.io',
        passwordHash: 'demo123',
        role: 'student',
        firstName: 'Alex',
        lastName: 'Rivera',
        profilePhoto: '',
        faceEmbedding: [],
        deviceFingerprints: [],
        mfaEnabled: false,
        createdAt: new Date(),
        lastLogin: new Date(),
        isVerified: true,
      },
    ];

    demoUsers.forEach(user => this.users.set(user.id, user));

    // Create demo exams
    const demoQuestions: Question[] = [
      {
        id: 'q1',
        type: 'multiple-choice',
        content: 'What is the time complexity of binary search?',
        text: 'What is the time complexity of binary search?',
        options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
        correctAnswer: 'O(log n)',
        points: 10,
      },
      {
        id: 'q2',
        type: 'true-false',
        content: 'JavaScript is a statically typed language.',
        text: 'JavaScript is a statically typed language.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        points: 5,
      },
      {
        id: 'q3',
        type: 'multi-select',
        content: 'Which of the following are valid HTTP methods?',
        text: 'Which of the following are valid HTTP methods?',
        options: ['GET', 'POST', 'FETCH', 'PUT', 'DELETE', 'SEND'],
        correctAnswer: ['GET', 'POST', 'PUT', 'DELETE'],
        points: 15,
      },
      {
        id: 'q4',
        type: 'short-answer',
        content: 'What does SQL stand for?',
        text: 'What does SQL stand for?',
        correctAnswer: 'Structured Query Language',
        points: 10,
      },
      {
        id: 'q5',
        type: 'essay',
        content: 'Explain the concept of recursion and provide an example of when you would use it.',
        text: 'Explain the concept of recursion and provide an example of when you would use it.',
        correctAnswer: '',
        points: 20,
      },
    ];

    const demoExams: Exam[] = [
      {
        id: 'exam-1',
        title: 'Computer Science Fundamentals',
        description: 'A comprehensive exam covering basic CS concepts including algorithms, data structures, and programming fundamentals.',
        instructorId: 'instructor-1',
        duration: 60,
        startWindow: new Date(),
        endWindow: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: demoQuestions,
        settings: {
          shuffleQuestions: true,
          shuffleOptions: true,
          showResults: true,
          allowReview: true,
          proctoring: 'full-lockdown',
          allowedResources: [],
          maxAttempts: 1,
          passingScore: 60,
          lateSubmissionPolicy: 'reject',
        },
        assignedProctors: ['proctor-1'],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPoints: 60,
      },
      {
        id: 'exam-2',
        title: 'Database Design',
        description: 'Exam on relational database design, normalization, and SQL queries.',
        instructorId: 'instructor-1',
        duration: 90,
        startWindow: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endWindow: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        questions: [
          {
            id: 'q6',
            type: 'multiple-choice',
            content: 'What is a primary key in database design?',
            text: 'What is a primary key in database design?',
            options: ['A field with unique values', 'The first column in a table', 'A foreign key reference', 'An index on multiple columns'],
            correctAnswer: 'A field with unique values',
            points: 10,
          },
          {
            id: 'q7',
            type: 'multi-select',
            content: 'Which of the following are normal forms in database normalization?',
            text: 'Which of the following are normal forms in database normalization?',
            options: ['1NF', '2NF', '3NF', 'BCNF', '4NF', 'ENF'],
            correctAnswer: ['1NF', '2NF', '3NF', 'BCNF', '4NF'],
            points: 20,
          },
          {
            id: 'q8',
            type: 'short-answer',
            content: 'What is a foreign key?',
            text: 'What is a foreign key?',
            correctAnswer: 'A foreign key is a field that references the primary key of another table',
            points: 15,
          },
          {
            id: 'q9',
            type: 'true-false',
            content: 'A table can have multiple primary keys.',
            text: 'A table can have multiple primary keys.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            points: 10,
          },
          {
            id: 'q10',
            type: 'essay',
            content: 'Explain the difference between a one-to-many relationship and a many-to-many relationship in database design.',
            text: 'Explain the difference between a one-to-many relationship and a many-to-many relationship in database design.',
            correctAnswer: '',
            points: 45,
          },
        ],
        settings: {
          shuffleQuestions: false,
          shuffleOptions: true,
          showResults: false,
          allowReview: false,
          proctoring: 'strict',
          allowedResources: [],
          maxAttempts: 1,
          passingScore: 70,
          lateSubmissionPolicy: 'penalize',
          latePenaltyPercent: 10,
        },
        assignedProctors: ['proctor-1'],
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPoints: 100, // 10 + 20 + 15 + 10 + 45 = 100
      },
    ];

    demoExams.forEach(exam => this.exams.set(exam.id, exam));
    this.saveToStorage();
  }

  // User Operations
  createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): User {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastLogin: new Date(),
    };
    this.users.set(newUser.id, newUser);
    this.saveToStorage();
    return newUser;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  deleteUser(id: string): boolean {
    const result = this.users.delete(id);
    this.saveToStorage();
    return result;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUsersByRole(role: User['role']): User[] {
    return Array.from(this.users.values()).filter(u => u.role === role);
  }

  // Exam Operations
  createExam(exam: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Exam {
    const newExam: Exam = {
      ...exam,
      id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.exams.set(newExam.id, newExam);
    this.saveToStorage();
    return newExam;
  }

  getExamById(id: string): Exam | undefined {
    return this.exams.get(id);
  }

  updateExam(id: string, updates: Partial<Exam>): Exam | undefined {
    const exam = this.exams.get(id);
    if (!exam) return undefined;
    const updated = { ...exam, ...updates, updatedAt: new Date() };
    this.exams.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  deleteExam(id: string): boolean {
    const result = this.exams.delete(id);
    this.saveToStorage();
    return result;
  }

  getAllExams(): Exam[] {
    return Array.from(this.exams.values());
  }

  getExamsByInstructor(instructorId: string): Exam[] {
    return Array.from(this.exams.values()).filter(e => e.instructorId === instructorId);
  }

  getActiveExams(): Exam[] {
    const now = new Date();
    // Return exams that are either scheduled or active, and are within the available window
    // Students can see exams that:
    // 1. Are scheduled or active status
    // 2. Have started (now >= startWindow)
    // 3. Have not ended (now <= endWindow)
    return Array.from(this.exams.values()).filter(
      e => (e.status === 'active' || e.status === 'scheduled') && 
           new Date(e.startWindow) <= now && 
           new Date(e.endWindow) >= now
    );
  }

  // Get all available exams for students (upcoming and current)
  getAvailableExamsForStudent(): Exam[] {
    const now = new Date();
    // Return all exams (scheduled, active, or published) that students can see
    // excluding only draft exams
    return Array.from(this.exams.values()).filter(
      e => e.status !== 'draft' && new Date(e.endWindow) >= now
    );
  }

  // Session Operations
  createSession(session: Omit<ExamSession, 'id'>): ExamSession {
    const newSession: ExamSession = {
      ...session,
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.sessions.set(newSession.id, newSession);
    this.saveToStorage();
    return newSession;
  }

  getSessionById(id: string): ExamSession | undefined {
    return this.sessions.get(id);
  }

  updateSession(id: string, updates: Partial<ExamSession>): ExamSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    const updated = { ...session, ...updates };
    this.sessions.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  getSessionsByExam(examId: string): ExamSession[] {
    return Array.from(this.sessions.values()).filter(s => s.examId === examId);
  }

  getSessionsByStudent(studentId: string): ExamSession[] {
    return Array.from(this.sessions.values()).filter(s => s.studentId === studentId);
  }

  getActiveSessions(): ExamSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.status === 'in-progress' || s.status === 'in_progress' || s.status === 'paused'
    );
  }

  // Alert Operations
  createAlert(alert: Omit<ProctorAlert, 'id'>): ProctorAlert {
    const newAlert: ProctorAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.alerts.set(newAlert.id, newAlert);
    
    // Also add to session
    const session = this.sessions.get(alert.sessionId);
    if (session) {
      session.alerts.push(newAlert);
      this.sessions.set(session.id, session);
    }
    
    this.saveToStorage();
    return newAlert;
  }

  getAlertById(id: string): ProctorAlert | undefined {
    return this.alerts.get(id);
  }

  resolveAlert(id: string, resolvedBy: string, resolution: string): ProctorAlert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    const updated = {
      ...alert,
      resolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      resolution,
    };
    this.alerts.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  getAlertsBySession(sessionId: string): ProctorAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.sessionId === sessionId);
  }

  getUnresolvedAlerts(): ProctorAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  // Result Operations
  createResult(result: Omit<ExamResult, 'id'>): ExamResult {
    const newResult: ExamResult = {
      ...result,
      id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.results.set(newResult.id, newResult);
    this.saveToStorage();
    return newResult;
  }

  getResultById(id: string): ExamResult | undefined {
    return this.results.get(id);
  }

  getResultsByExam(examId: string): ExamResult[] {
    return Array.from(this.results.values()).filter(r => r.examId === examId);
  }

  getResultsByStudent(studentId: string): ExamResult[] {
    return Array.from(this.results.values()).filter(r => r.studentId === studentId);
  }

  // Audit Log Operations
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    this.auditLogs.push(newLog);
    return newLog;
  }

  getAuditLogs(filters?: { userId?: string; action?: string; resourceId?: string }): AuditLog[] {
    let logs = [...this.auditLogs];
    if (filters?.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters?.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters?.resourceId) {
      logs = logs.filter(l => l.resourceId === filters.resourceId);
    }
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Statistics
  getStats() {
    const now = new Date();
    const activeExams = Array.from(this.exams.values()).filter(
      e => e.status === 'active' && e.startWindow <= now && e.endWindow >= now
    );
    const activeSessions = Array.from(this.sessions.values()).filter(
      s => s.status === 'in-progress'
    );
    const unresolvedAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);

    return {
      totalUsers: this.users.size,
      totalExams: this.exams.size,
      activeExams: activeExams.length,
      activeSessions: activeSessions.length,
      totalSessions: this.sessions.size,
      unresolvedAlerts: unresolvedAlerts.length,
      totalAlerts: this.alerts.size,
      usersByRole: {
        admin: this.getUsersByRole('admin').length,
        instructor: this.getUsersByRole('instructor').length,
        proctor: this.getUsersByRole('proctor').length,
        student: this.getUsersByRole('student').length,
      },
    };
  }

  // Reset database
  reset(): void {
    this.users.clear();
    this.exams.clear();
    this.sessions.clear();
    this.alerts.clear();
    this.results.clear();
    this.auditLogs = [];
    localStorage.removeItem('mockdb_users');
    localStorage.removeItem('mockdb_exams');
    localStorage.removeItem('mockdb_sessions');
    localStorage.removeItem('mockdb_alerts');
    localStorage.removeItem('mockdb_results');
    this.seedInitialData();
  }
}

// Singleton instance
export const db = typeof window !== 'undefined' ? new MockDatabase() : null;

// Export a function to get the db instance (for SSR safety)
export function getDb(): MockDatabase {
  if (!db) {
    throw new Error('Database is only available on the client side');
  }
  return db;
}
