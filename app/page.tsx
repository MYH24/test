'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  Eye,
  Brain,
  Lock,
  Monitor,
  FileCheck,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Proctoring',
    description: 'Advanced facial recognition and behavior analysis running entirely client-side for maximum privacy.',
  },
  {
    icon: Eye,
    title: 'Real-Time Monitoring',
    description: 'Live monitoring dashboard for proctors with instant alerts and intervention capabilities.',
  },
  {
    icon: Lock,
    title: 'Full Lockdown Mode',
    description: 'Browser lockdown, device fingerprinting, and input restrictions to ensure exam integrity.',
  },
  {
    icon: Monitor,
    title: 'Multi-Device Support',
    description: 'Responsive design works on desktop, tablet, and mobile devices with consistent experience.',
  },
  {
    icon: FileCheck,
    title: 'Comprehensive Reports',
    description: 'Detailed proctoring reports with trust scores, incident timelines, and actionable insights.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Rich analytics for instructors and administrators to track exam performance and trends.',
  },
];

const roles = [
  {
    title: 'Administrators',
    description: 'Full system control with user management, global settings, and audit logs.',
    features: ['User Management', 'System Configuration', 'Audit Logs', 'Compliance Reports'],
  },
  {
    title: 'Instructors',
    description: 'Create and manage exams with flexible question types and scheduling.',
    features: ['Exam Builder', 'Question Bank', 'Student Roster', 'Results Analytics'],
  },
  {
    title: 'Proctors',
    description: 'Monitor exams in real-time with intervention tools and incident reporting.',
    features: ['Live Monitoring', 'Alert Management', 'Session Recording', 'Incident Reports'],
  },
  {
    title: 'Students',
    description: 'Take secure exams with identity verification and proctoring support.',
    features: ['Exam Dashboard', 'System Check', 'Secure Testing', 'Results Access'],
  },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.push(`/${user.role}`);
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">ExamGuard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              <span>AI-Powered Online Proctoring</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6 text-balance">
              Secure Online Exams with
              <span className="text-primary"> Intelligent Proctoring</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
              Comprehensive examination platform featuring facial recognition, behavior analysis, browser lockdown, 
              and real-time monitoring. All AI processing runs client-side for maximum privacy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Comprehensive Security Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to conduct secure remote examinations with confidence
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border bg-card hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-card-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Access */}
      <section className="py-20 border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Built for Every Role</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Dedicated dashboards and features tailored for administrators, instructors, proctors, and students
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => (
              <Card key={role.title} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg text-card-foreground">{role.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {role.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-foreground mb-4">Privacy-First AI Processing</h2>
                <p className="text-muted-foreground mb-6">
                  Unlike traditional proctoring solutions that stream video to external servers, ExamGuard processes 
                  all AI analysis directly in the browser using TensorFlow.js and MediaPipe.
                </p>
                <ul className="space-y-3">
                  {[
                    'Video never leaves the student device',
                    'Face embeddings stored, not actual images',
                    'GDPR and FERPA compliant by design',
                    'Full audit trail for compliance',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-border bg-card p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">100%</div>
                    <div className="text-sm text-muted-foreground">Client-Side Processing</div>
                  </Card>
                  <Card className="border-border bg-card p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">0</div>
                    <div className="text-sm text-muted-foreground">Video Data Sent</div>
                  </Card>
                  <Card className="border-border bg-card p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">4</div>
                    <div className="text-sm text-muted-foreground">User Roles</div>
                  </Card>
                  <Card className="border-border bg-card p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">Monitoring Support</div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your free account and experience secure online proctoring with our demo credentials.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Try Demo Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">ExamGuard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-Powered Online Proctoring System - Demo Version
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
