'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { getDb } from '@/lib/db/mock-db';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Question, QuestionType, ProctoringLevel, ExamSettings } from '@/types';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  ArrowLeft,
  Clock,
  Calendar,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Type,
  List,
  Code,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const questionTypeOptions: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: <List className="h-4 w-4" /> },
  { value: 'multi-select', label: 'Multi-Select', icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: 'true-false', label: 'True/False', icon: <XCircle className="h-4 w-4" /> },
  { value: 'short-answer', label: 'Short Answer', icon: <Type className="h-4 w-4" /> },
  { value: 'essay', label: 'Essay', icon: <FileText className="h-4 w-4" /> },
  { value: 'code', label: 'Code', icon: <Code className="h-4 w-4" /> },
];

const proctoringLevels: { value: ProctoringLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No proctoring, open exam' },
  { value: 'basic', label: 'Basic', description: 'Camera on, periodic screenshots' },
  { value: 'standard', label: 'Standard', description: 'Face detection, tab monitoring' },
  { value: 'strict', label: 'Strict', description: 'Gaze tracking, behavior analysis' },
  { value: 'full-lockdown', label: 'Full Lockdown', description: 'All features, browser lock' },
];

export default function CreateExamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'questions' | 'settings'>('details');

  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60,
    startWindow: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endWindow: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  const [settings, setSettings] = useState<ExamSettings>({
    shuffleQuestions: true,
    shuffleOptions: true,
    showResults: true,
    allowReview: true,
    proctoring: 'full-lockdown',
    allowedResources: [],
    maxAttempts: 1,
    passingScore: 60,
    lateSubmissionPolicy: 'reject',
  });

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: 'multiple-choice',
      content: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
      setQuestions(updated);
    }
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options!.push('');
      setQuestions(updated);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options && updated[questionIndex].options!.length > 2) {
      updated[questionIndex].options!.splice(optionIndex, 1);
      setQuestions(updated);
    }
  };

  const handleSubmit = async (status: 'draft' | 'scheduled') => {
    if (!user) {
      alert('You must be logged in');
      return;
    }

    if (!examData.title.trim()) {
      alert('Please enter an exam title');
      return;
    }
    
    if (status === 'scheduled' && questions.length === 0) {
      alert('Please add at least one question before publishing');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const db = getDb();
      const totalPts = questions.reduce((acc, q) => acc + q.points, 0);
      
      const createdExam = db.createExam({
        title: examData.title.trim(),
        description: examData.description,
        instructorId: user.id,
        duration: examData.duration,
        startWindow: new Date(examData.startWindow),
        endWindow: new Date(examData.endWindow),
        questions: questions.length > 0 ? questions : [],
        settings,
        assignedProctors: [],
        status,
        totalPoints: totalPts,
      });
      
      // Redirect after a small delay to ensure data is persisted
      setTimeout(() => {
        router.push('/instructor/exams');
      }, 300);
    } catch (error) {
      console.error('Failed to create exam:', error);
      alert('Failed to create exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  const totalPoints = questions.reduce((acc, q) => acc + q.points, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create New Exam</h1>
              <p className="text-muted-foreground">Build your exam with questions and settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSubmit('scheduled')} disabled={isSubmitting || !examData.title || questions.length === 0}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Publish Exam
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {(['details', 'questions', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'questions' && questions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {questions.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
              <CardDescription>Basic information about your exam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Exam Title</label>
                <Input
                  placeholder="e.g., Midterm Exam - Computer Science 101"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="Provide instructions and any important information for students..."
                  value={examData.description}
                  onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                  rows={4}
                  className="bg-input border-border"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={examData.duration}
                    onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) || 60 })}
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start Window
                  </label>
                  <Input
                    type="datetime-local"
                    value={examData.startWindow}
                    onChange={(e) => setExamData({ ...examData, startWindow: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End Window
                  </label>
                  <Input
                    type="datetime-local"
                    value={examData.endWindow}
                    onChange={(e) => setExamData({ ...examData, endWindow: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? 's' : ''} | {totalPoints} total points
              </div>
              <Button onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
                  <p className="text-muted-foreground mb-4">Start building your exam by adding questions</p>
                  <Button onClick={addQuestion}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Question
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((question, qIndex) => (
                  <Card key={question.id} className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="cursor-move text-muted-foreground">
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <Badge variant="secondary">Q{qIndex + 1}</Badge>
                          <Select
                            value={question.type}
                            onValueChange={(value: QuestionType) => updateQuestion(qIndex, { type: value })}
                          >
                            <SelectTrigger className="w-40 bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={question.points}
                            onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
                            className="w-20 bg-input border-border text-center"
                          />
                          <span className="text-sm text-muted-foreground">pts</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Enter your question..."
                        value={question.content}
                        onChange={(e) => updateQuestion(qIndex, { content: e.target.value })}
                        rows={2}
                        className="bg-input border-border"
                      />

                      {/* Options for multiple choice, multi-select */}
                      {(question.type === 'multiple-choice' || question.type === 'multi-select') && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Answer Options</label>
                          {question.options?.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <input
                                type={question.type === 'multiple-choice' ? 'radio' : 'checkbox'}
                                name={`correct-${question.id}`}
                                checked={
                                  question.type === 'multiple-choice'
                                    ? question.correctAnswer === option
                                    : Array.isArray(question.correctAnswer) && question.correctAnswer.includes(option)
                                }
                                onChange={() => {
                                  if (question.type === 'multiple-choice') {
                                    updateQuestion(qIndex, { correctAnswer: option });
                                  } else {
                                    const current = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
                                    const updated = current.includes(option)
                                      ? current.filter((a) => a !== option)
                                      : [...current, option];
                                    updateQuestion(qIndex, { correctAnswer: updated });
                                  }
                                }}
                                className="h-4 w-4 text-primary"
                              />
                              <Input
                                placeholder={`Option ${oIndex + 1}`}
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                className="flex-1 bg-input border-border"
                              />
                              {question.options!.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(qIndex, oIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                            <Plus className="mr-2 h-3 w-3" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      {/* True/False options */}
                      {question.type === 'true-false' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Correct Answer</label>
                          <div className="flex gap-4">
                            {['True', 'False'].map((opt) => (
                              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`tf-${question.id}`}
                                  checked={question.correctAnswer === opt}
                                  onChange={() => updateQuestion(qIndex, { correctAnswer: opt })}
                                  className="h-4 w-4 text-primary"
                                />
                                <span className="text-foreground">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Short answer */}
                      {question.type === 'short-answer' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Expected Answer</label>
                          <Input
                            placeholder="Enter the expected answer..."
                            value={question.correctAnswer as string}
                            onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                            className="bg-input border-border"
                          />
                        </div>
                      )}

                      {/* Essay - no correct answer needed */}
                      {question.type === 'essay' && (
                        <p className="text-sm text-muted-foreground">
                          Essay questions require manual grading
                        </p>
                      )}

                      {/* Code question */}
                      {question.type === 'code' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Programming Language</label>
                          <Select
                            value={question.codeLanguage || 'javascript'}
                            onValueChange={(value) => updateQuestion(qIndex, { codeLanguage: value })}
                          >
                            <SelectTrigger className="w-40 bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="javascript">JavaScript</SelectItem>
                              <SelectItem value="python">Python</SelectItem>
                              <SelectItem value="java">Java</SelectItem>
                              <SelectItem value="cpp">C++</SelectItem>
                              <SelectItem value="csharp">C#</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Proctoring Settings */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Proctoring Level
                </CardTitle>
                <CardDescription>Configure security and monitoring features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {proctoringLevels.map((level) => (
                  <label
                    key={level.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      settings.proctoring === level.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="proctoring"
                      value={level.value}
                      checked={settings.proctoring === level.value}
                      onChange={() => setSettings({ ...settings, proctoring: level.value })}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-medium text-foreground">{level.label}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>

            {/* Exam Behavior */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Exam Behavior</CardTitle>
                <CardDescription>Configure how the exam functions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Shuffle Questions</div>
                    <div className="text-sm text-muted-foreground">Randomize question order</div>
                  </div>
                  <Switch
                    checked={settings.shuffleQuestions}
                    onCheckedChange={(checked) => setSettings({ ...settings, shuffleQuestions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Shuffle Options</div>
                    <div className="text-sm text-muted-foreground">Randomize answer options</div>
                  </div>
                  <Switch
                    checked={settings.shuffleOptions}
                    onCheckedChange={(checked) => setSettings({ ...settings, shuffleOptions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Show Results</div>
                    <div className="text-sm text-muted-foreground">Allow students to see scores</div>
                  </div>
                  <Switch
                    checked={settings.showResults}
                    onCheckedChange={(checked) => setSettings({ ...settings, showResults: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Allow Review</div>
                    <div className="text-sm text-muted-foreground">Let students review answers</div>
                  </div>
                  <Switch
                    checked={settings.allowReview}
                    onCheckedChange={(checked) => setSettings({ ...settings, allowReview: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Passing Score (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.passingScore}
                    onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 0 })}
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Max Attempts</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxAttempts}
                    onChange={(e) => setSettings({ ...settings, maxAttempts: parseInt(e.target.value) || 1 })}
                    className="bg-input border-border"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
