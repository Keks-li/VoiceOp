import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, BookOpen, Sparkles, BookOpenCheck, Trash2, Edit2, Volume2, CheckCircle, Circle, PlusCircle, HelpCircle, Users, GraduationCap, XCircle, UserCheck, Search, Mic, MicOff
} from 'lucide-react';
import { Course, Week, QuizQuestion, Assignment, AssignmentSubmission, Enrollment, ParsedVoiceCommand, User, WeekFile } from '../types';
import { generateAICourse } from '../lib/gemini';
import { fetchAllStudents, StudentWithCourses } from '../lib/db';
import InstructorAssignments from './InstructorAssignments';
import { InstructorFilePanel } from './WeekFileSection';

interface InstructorDashboardProps {
  courses: Course[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  enrollments: Enrollment[];
  voiceCommand: ParsedVoiceCommand | null;
  currentUser: User | null;
  onAddCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onUpdateCourse: (course: Course) => void;
  onAddAssignment: (data: Omit<Assignment, 'id' | 'createdAt'>) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  onUpdateEnrollments: (ids: string[], status: 'approved' | 'rejected') => void;
  onAddCourseAI?: (topic: string) => Promise<void>;
}

export default function InstructorDashboard({
  courses,
  assignments,
  submissions,
  enrollments,
  voiceCommand,
  currentUser,
  onAddCourse,
  onDeleteCourse,
  onUpdateCourse,
  onAddAssignment,
  onDeleteAssignment,
  onGradeSubmission,
  onUpdateEnrollments,
  onAddCourseAI,
}: InstructorDashboardProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'assignments' | 'students'>('list');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Students roster state
  const [students, setStudents] = useState<StudentWithCourses[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // Enrollment bulk-action state
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [enrollmentsTab, setEnrollmentsTab] = useState<'requests' | 'roster'>('requests');

  // Student Roster search and expansion states
  const [rosterSearch, setRosterSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Manual Course form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  
  // AI Course form state
  const [aiTopic, setAiTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // STT Dictation State
  const [activeDictationField, setActiveDictationField] = useState<string | null>(null);
  const dictationRecRef = useRef<any>(null);

  // Grade form state for student card inline grading
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { grade: string; feedback: string }>>({});

  const startDictation = (fieldId: string, onTranscript: (text: string) => void) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    if (activeDictationField === fieldId) {
      stopDictation();
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setActiveDictationField(fieldId);
    };

    rec.onresult = (e: any) => {
      const resultText = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      onTranscript(resultText);
    };

    rec.onerror = (err: any) => {
      console.error('Dictation Error:', err);
      stopDictation();
    };

    rec.onend = () => {
      setActiveDictationField(null);
    };

    rec.start();
    dictationRecRef.current = rec;
  };

  const stopDictation = () => {
    if (dictationRecRef.current) {
      dictationRecRef.current.stop();
      dictationRecRef.current = null;
    }
    setActiveDictationField(null);
  };

  // Edit Course Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editCourseData, setEditCourseData] = useState<Course | null>(null);
  const [selectedEditWeekIndex, setSelectedEditWeekIndex] = useState<number>(0);

  // Text-To-Speech state for reviewing drafted text
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Load students when the students tab becomes active
  useEffect(() => {
    if (activeTab !== 'students') return;
    setStudentsLoading(true);
    setStudentsError(null);
    fetchAllStudents()
      .then(setStudents)
      .catch((err) => setStudentsError(err.message || 'Failed to load students.'))
      .finally(() => setStudentsLoading(false));
  }, [activeTab]);

  // Handle Voice Commands
  useEffect(() => {
    if (!voiceCommand) return;
    const { command, params } = voiceCommand;
    if (command === 'navigation:list') {
      setActiveTab('list');
      setIsEditing(false);
      setSelectedCourse(null);
    } else if (command === 'navigation:create') {
      setActiveTab('create');
      setIsEditing(false);
      setSelectedCourse(null);
    } else if (command === 'navigation:assignments') {
      setActiveTab('assignments');
      setIsEditing(false);
      setSelectedCourse(null);
    } else if (command === 'navigation:students') {
      setActiveTab('students');
      setIsEditing(false);
      setSelectedCourse(null);
    } else if (command === 'course:select') {
      const match = courses.find(c =>
        c.title.toLowerCase().includes(params?.courseTitle?.toLowerCase() || '')
      );
      if (match) {
        setSelectedCourse(match);
        setActiveTab('list');
        setIsEditing(false);
      }
    } else if (command === 'course:create_ai' && params?.topic) {
      if (onAddCourseAI) {
        onAddCourseAI(params.topic);
      }
    }
  }, [voiceCommand]);

  // Web TTS review reading (incorporates delay to bypass Chromium cancel-speak bugs)
  const speakText = (textToSpeak: string) => {
    if (!synthRef.current) return;
    
    if (isPlayingTts) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
      return;
    }

    synthRef.current.cancel();

    setTimeout(() => {
      if (!synthRef.current) return;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => setIsPlayingTts(false);
      utterance.onerror = () => setIsPlayingTts(false);
      
      const savedRate = localStorage.getItem('voiceop_tts_rate');
      const savedVoice = localStorage.getItem('voiceop_tts_voice_name');
      
      if (savedRate) utterance.rate = parseFloat(savedRate);
      if (savedVoice) {
        const voices = synthRef.current.getVoices();
        const matched = voices.find(v => v.name === savedVoice);
        if (matched) utterance.voice = matched;
      }

      setIsPlayingTts(true);
      synthRef.current.speak(utterance);
    }, 100);
  };

  const stopTts = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
    }
  };

  // AI syllabus generation
  const handleGenerateCourseAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;

    setIsAiGenerating(true);
    setAiError(null);

    try {
      const generated = await generateAICourse(aiTopic.trim());
      generated.instructorName = currentUser?.name || 'Instructor';
      onAddCourse(generated);
      setAiTopic('');
      setActiveTab('list');
      setSelectedCourse(generated);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to generate course. Verify API key in accessibility settings.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Manual course creation
  const handleCreateCourseManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    const newCourse: Course = {
      id: `manual_${Date.now()}`,
      title: courseTitle.trim(),
      instructorName: currentUser?.name || 'Instructor',
      description: courseDesc.trim() || 'No description provided.',
      weeks: Array.from({ length: 4 }).map((_, idx) => ({
        id: `week_manual_${Date.now()}_${idx}`,
        weekNumber: idx + 1,
        title: `Week ${idx + 1}: Module Title`,
        content: 'Add content here...',
        quiz: [
          {
            question: 'Sample review question for this module?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswerIndex: 0
          }
        ]
      }))
    };

    onAddCourse(newCourse);
    setCourseTitle('');
    setCourseDesc('');
    setActiveTab('list');
    setSelectedCourse(newCourse);
  };

  const startEditingCourse = (course: Course) => {
    setEditCourseData({ ...course });
    setIsEditing(true);
    setSelectedEditWeekIndex(0);
  };

  const updateEditWeekField = (weekIdx: number, field: 'title' | 'content', value: string) => {
    if (!editCourseData) return;
    
    const updatedWeeks = [...editCourseData.weeks];
    updatedWeeks[weekIdx] = {
      ...updatedWeeks[weekIdx],
      [field]: value
    };

    setEditCourseData({
      ...editCourseData,
      weeks: updatedWeeks
    });
  };

  // --- Quiz editing helpers ---

  const updateQuizQuestion = (weekIdx: number, qIdx: number, field: 'question', value: string) => {
    if (!editCourseData) return;
    const updatedWeeks = [...editCourseData.weeks];
    const updatedQuiz = [...(updatedWeeks[weekIdx].quiz ?? [])];
    updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], [field]: value };
    updatedWeeks[weekIdx] = { ...updatedWeeks[weekIdx], quiz: updatedQuiz };
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
  };

  const updateQuizOption = (weekIdx: number, qIdx: number, optIdx: number, value: string) => {
    if (!editCourseData) return;
    const updatedWeeks = [...editCourseData.weeks];
    const updatedQuiz = [...(updatedWeeks[weekIdx].quiz ?? [])];
    const updatedOptions = [...updatedQuiz[qIdx].options];
    updatedOptions[optIdx] = value;
    updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], options: updatedOptions };
    updatedWeeks[weekIdx] = { ...updatedWeeks[weekIdx], quiz: updatedQuiz };
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
  };

  const setCorrectAnswer = (weekIdx: number, qIdx: number, optIdx: number) => {
    if (!editCourseData) return;
    const updatedWeeks = [...editCourseData.weeks];
    const updatedQuiz = [...(updatedWeeks[weekIdx].quiz ?? [])];
    updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], correctAnswerIndex: optIdx };
    updatedWeeks[weekIdx] = { ...updatedWeeks[weekIdx], quiz: updatedQuiz };
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
  };

  const addQuizQuestion = (weekIdx: number) => {
    if (!editCourseData) return;
    const updatedWeeks = [...editCourseData.weeks];
    const newQuestion: QuizQuestion = {
      question: 'New question?',
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: 0
    };
    const updatedQuiz = [...(updatedWeeks[weekIdx].quiz ?? []), newQuestion];
    updatedWeeks[weekIdx] = { ...updatedWeeks[weekIdx], quiz: updatedQuiz };
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
  };

  const setQuestionType = (weekIdx: number, qIdx: number, type: 'mcq' | 'essay') => {
    if (!editCourseData) return;
    const updatedWeeks = [...editCourseData.weeks];
    const updatedQuiz = [...(updatedWeeks[weekIdx].quiz ?? [])];
    updatedQuiz[qIdx] = { 
      ...updatedQuiz[qIdx], 
      type,
      options: updatedQuiz[qIdx].options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: updatedQuiz[qIdx].correctAnswerIndex ?? 0
    };
    updatedWeeks[weekIdx] = { ...updatedWeeks[weekIdx], quiz: updatedQuiz };
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
  };

  const deleteQuizQuestion = (weekIdx: number, qIdx: number) => {
    if (!editCourseData) return;
    const updatedWeeks = [...editCourseData.weeks];
    const updatedQuiz = (updatedWeeks[weekIdx].quiz ?? []).filter((_, i) => i !== qIdx);
    updatedWeeks[weekIdx] = { ...updatedWeeks[weekIdx], quiz: updatedQuiz };
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
  };

  // --- End quiz helpers ---

  // --- Add / Delete Week ---

  const addWeek = () => {
    if (!editCourseData) return;
    const nextNum = editCourseData.weeks.length + 1;
    const newWeek: Week = {
      id: `week_new_${Date.now()}`,
      weekNumber: nextNum,
      title: `Week ${nextNum}: New Module`,
      content: 'Add content here...',
      quiz: [
        {
          question: 'Sample review question for this module?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswerIndex: 0,
        },
      ],
    };
    const updatedWeeks = [...editCourseData.weeks, newWeek];
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
    setSelectedEditWeekIndex(updatedWeeks.length - 1);
  };

  const deleteWeek = (weekIdx: number) => {
    if (!editCourseData || editCourseData.weeks.length <= 1) return;
    const updatedWeeks = editCourseData.weeks
      .filter((_, i) => i !== weekIdx)
      .map((w, i) => ({ ...w, weekNumber: i + 1 }));
    setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
    setSelectedEditWeekIndex(Math.max(0, weekIdx - 1));
  };

  // --- End Week helpers ---

  const saveEditedCourse = () => {
    if (!editCourseData) return;
    onUpdateCourse(editCourseData);
    setIsEditing(false);
    if (selectedCourse?.id === editCourseData.id) {
      setSelectedCourse(editCourseData);
    }
    setEditCourseData(null);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-2xl font-black uppercase text-black dark:text-white tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 stroke-[2.5] text-purple-600 dark:text-purple-400" />
            Instructor Dashboard
          </h2>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
            Publish courses, write curriculum syllabus content, or generate lessons using Gemini AI.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('list'); setIsEditing(false); setSelectedCourse(null); }}
            className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] ${
              activeTab === 'list' && !isEditing
                ? 'bg-[#FFD600] text-black' 
                : 'bg-white dark:bg-slate-800 text-black dark:text-white'
            }`}
          >
            My Courses
          </button>
          <button
            onClick={() => { setActiveTab('create'); setIsEditing(false); setSelectedCourse(null); }}
            className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] flex items-center gap-1.5 ${
              activeTab === 'create' && !isEditing
                ? 'bg-[#FFD600] text-black' 
                : 'bg-white dark:bg-slate-800 text-black dark:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            New Syllabus
          </button>
          <button
            onClick={() => { setActiveTab('assignments'); setIsEditing(false); setSelectedCourse(null); }}
            className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] flex items-center gap-1.5 ${
              activeTab === 'assignments' && !isEditing
                ? 'text-white'
                : 'bg-white dark:bg-slate-800 text-black dark:text-white'
            }`}
            style={activeTab === 'assignments' && !isEditing ? { backgroundColor: 'var(--accent)' } : {}}
          >
            📋 Assignments
          </button>
          <button
            onClick={() => { setActiveTab('students'); setIsEditing(false); setSelectedCourse(null); }}
            className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] flex items-center gap-1.5 ${
              activeTab === 'students' && !isEditing
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-slate-800 text-black dark:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 stroke-[2.5]" />
            Students
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LIST / DETAILS SIDEBAR (4 cols) — hidden on assignments/students tabs */}
        {(activeTab === 'list' || activeTab === 'create' || isEditing) && (
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-black uppercase text-black dark:text-white mb-3 tracking-wide">
              Course Catalog ({courses.length})
            </h3>
            
            {courses.length === 0 ? (
              <p className="text-xs font-bold text-gray-500 py-6 text-center">No courses drafted yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => { setSelectedCourse(course); setIsEditing(false); }}
                    className={`p-3 border-2 border-black rounded-2xl cursor-pointer transition-all flex flex-col gap-1.5 ${
                      selectedCourse?.id === course.id
                        ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-black uppercase tracking-tight text-black dark:text-white break-words max-w-[80%]">
                        {course.title}
                      </span>
                      <BookOpen className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    </div>
                    
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="flex justify-between items-center text-[9px] font-extrabold text-gray-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                      <span>{course.weeks.length} Module{course.weeks.length !== 1 ? 's' : ''}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this course outline?')) {
                            onDeleteCourse(course.id);
                            if (selectedCourse?.id === course.id) setSelectedCourse(null);
                          }
                        }}
                        className="text-rose-500 hover:underline flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* WORKSPACE CONTENT AREA — 8 cols alongside sidebar, or full 12 cols for assignments/students */}
        <div className={activeTab === 'assignments' || activeTab === 'students' ? 'lg:col-span-12' : 'lg:col-span-8'}>
          
          {/* TAB 1: LIST / SELECT COURSE VIEW */}
          {activeTab === 'list' && !isEditing && (
            <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-h-[400px] flex flex-col justify-between">
              {selectedCourse ? (
                <div className="space-y-6">
                  {/* Title & Edit Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b-2 border-dashed border-black pb-4">
                    <div>
                      <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-purple-300">
                        Instructor View
                      </span>
                      <h3 className="text-xl font-black uppercase text-black dark:text-white mt-1">
                        {selectedCourse.title}
                      </h3>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                        Curriculum Lead: {selectedCourse.instructorName}
                      </p>
                    </div>

                    <button
                      onClick={() => startEditingCourse(selectedCourse)}
                      className="px-3.5 py-1.5 bg-black text-white hover:bg-slate-850 border-2 border-black rounded-xl font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Syllabus
                    </button>
                  </div>

                  {/* Course Description */}
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">
                      Course Description
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-slate-350 leading-relaxed font-bold">
                      {selectedCourse.description}
                    </p>
                  </div>

                  {/* Weekly Modules list */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">
                      Syllabus Breakdown ({selectedCourse.weeks.length} Week{selectedCourse.weeks.length !== 1 ? 's' : ''})
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {selectedCourse.weeks.map((week) => (
                        <div key={week.id} className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-black rounded-2xl space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                            <span className="text-xs font-black uppercase text-[#9333EA] dark:text-[#C084FC]">
                              Week {week.weekNumber}: {week.title}
                            </span>
                            
                            <button
                              onClick={() => speakText(week.content)}
                              className="px-2 py-1 text-[10px] font-black bg-white dark:bg-slate-800 border-2 border-black rounded-lg flex items-center gap-1 text-black dark:text-white"
                              title="Listen to content review"
                            >
                              <Volume2 className="w-3 h-3 text-black dark:text-white" />
                              Review Speak
                            </button>
                          </div>
                          
                          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-h-[100px] overflow-y-auto">
                            {week.content}
                          </p>
                          
                          {week.quiz && week.quiz.length > 0 && (
                            <div className="text-[10px] bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl text-purple-900 dark:text-purple-300 font-bold">
                              ✓ AI Generated Quiz Included ({week.quiz.length} Questions)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-3 animate-pulse" />
                  <h4 className="text-sm font-black uppercase text-black dark:text-white">
                    No Course Selected
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mt-1">
                    Select a course syllabus draft from the side library, or click "New Syllabus" to draft a curriculum outline.
                  </p>
                </div>
              )}

              {/* TTS Status Player inside details bar */}
              {isPlayingTts && (
                <div className="mt-6 p-3 bg-[#9333EA] text-white border-2 border-black rounded-2xl flex items-center justify-between shadow-[3px_3px_0px_0px_#000000]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider">Reading Syllabus to Teacher...</span>
                  </div>
                  <button
                    onClick={stopTts}
                    className="p-1 border border-white bg-black hover:bg-slate-850 rounded-lg text-xs font-bold"
                  >
                    Stop Reader
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE SYLLABUS PANEL (AI & MANUAL TOGGLES) */}
          {activeTab === 'create' && !isEditing && (
            <div className="space-y-6">
              
              {/* Option A: Generate with Gemini AI */}
              <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse stroke-[2.5]" />
                  <h3 className="text-sm font-black uppercase text-black dark:text-white">
                    Option A: Generate Course Outline via Gemini AI
                  </h3>
                </div>

                <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal">
                  Give Gemini a general topic (e.g. "Basic Algebra", "Healthy Dieting", or "Python OOP"). Gemini will instantly construct a high-quality, structured 4-week course syllabus including lectures, examples, and weekly tests.
                </p>

                <form onSubmit={handleGenerateCourseAI} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Course Core Topic
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Introduction to Astronomy for Beginners"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => startDictation('aiTopic', (text) => setAiTopic(prev => (prev ? prev + ' ' + text : text)))}
                        className={`p-2.5 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                          activeDictationField === 'aiTopic'
                            ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                            : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                        }`}
                        title={activeDictationField === 'aiTopic' ? 'Stop Listening' : 'Dictate Topic (STT)'}
                      >
                        {activeDictationField === 'aiTopic' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {aiError && (
                    <div className="p-3 bg-rose-100 border-2 border-rose-300 text-rose-800 rounded-xl text-xs font-bold">
                      {aiError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAiGenerating || !aiTopic.trim()}
                    className={`w-full py-3 px-4 border-2 border-black rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] ${
                      isAiGenerating || !aiTopic.trim()
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-[#9333EA] text-white hover:bg-[#A855F7]'
                    }`}
                  >
                    {isAiGenerating ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Gemini drafting curriculum...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        Generate AI Course Syllabus
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Option B: Manual Input Form */}
              <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Plus className="w-5 h-5 text-purple-500 stroke-[2.5]" />
                  <h3 className="text-sm font-black uppercase text-black dark:text-white">
                    Option B: Draft Syllabus Manually
                  </h3>
                </div>

                <form onSubmit={handleCreateCourseManual} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Course Title
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. UX/UI Foundations"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => startDictation('courseTitle', (text) => setCourseTitle(prev => (prev ? prev + ' ' + text : text)))}
                        className={`p-2.5 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                          activeDictationField === 'courseTitle'
                            ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                            : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                        }`}
                        title={activeDictationField === 'courseTitle' ? 'Stop Listening' : 'Dictate Title (STT)'}
                      >
                        {activeDictationField === 'courseTitle' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Course Summary
                    </label>
                    <div className="flex items-start gap-2">
                      <textarea
                        placeholder="Enter a brief summary overview for students..."
                        rows={3}
                        value={courseDesc}
                        onChange={(e) => setCourseDesc(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => startDictation('courseDesc', (text) => setCourseDesc(prev => (prev ? prev + ' ' + text : text)))}
                        className={`p-2.5 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                          activeDictationField === 'courseDesc'
                            ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                            : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                        }`}
                        title={activeDictationField === 'courseDesc' ? 'Stop Listening' : 'Dictate Summary (STT)'}
                      >
                        {activeDictationField === 'courseDesc' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!courseTitle.trim()}
                    className={`w-full py-3 px-4 border-2 border-black rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] ${
                      !courseTitle.trim()
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-slate-850'
                    }`}
                  >
                    Draft 4-Week Manual Course Shell
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: EDIT SYLLABUS MATERIAL MODE */}
          {isEditing && editCourseData && (
            <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
              
              <div className="flex justify-between items-center border-b-2 border-black pb-4">
                <div>
                  <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-yellow-300">
                    Edit Mode
                  </span>
                  <h3 className="text-lg font-black uppercase text-black dark:text-white mt-1">
                    Editing: {editCourseData.title}
                  </h3>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 border border-black hover:bg-slate-100 dark:hover:bg-slate-850 text-black dark:text-white text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedCourse}
                    className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>              {/* Week Nav Tabs + Add Week button */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 items-center">
                {editCourseData.weeks.map((week, idx) => (
                  <div key={week.id} className="relative flex-shrink-0 group">
                    <button
                      onClick={() => { setSelectedEditWeekIndex(idx); }}
                      className={`px-3.5 py-2 border-2 border-black rounded-xl text-xs font-black uppercase transition-all pr-6 ${
                        selectedEditWeekIndex === idx 
                          ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_0px_#000000]' 
                          : 'bg-slate-50 dark:bg-slate-950 text-black dark:text-white'
                      }`}
                    >
                      W{week.weekNumber}
                    </button>
                    {editCourseData.weeks.length > 1 && (
                      <button
                        onClick={() => deleteWeek(idx)}
                        title="Remove this week"
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 bg-rose-500 text-white rounded-full items-center justify-center border border-black"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addWeek}
                  title="Add a new week"
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border-2 border-dashed border-black rounded-xl text-xs font-black uppercase bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Add Week
                </button>
              </div>

              {/* Edit Week Forms */}
              <div className="space-y-4 border-2 border-dashed border-black p-4 rounded-2xl bg-amber-50/30">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Week Module Title
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editCourseData.weeks[selectedEditWeekIndex].title}
                      onChange={(e) => updateEditWeekField(selectedEditWeekIndex, 'title', e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => startDictation('weekTitle', (text) => {
                        const cur = editCourseData.weeks[selectedEditWeekIndex].title || '';
                        updateEditWeekField(selectedEditWeekIndex, 'title', cur ? cur + ' ' + text : text);
                      })}
                      className={`p-2 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        activeDictationField === 'weekTitle'
                          ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                          : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                      }`}
                      title={activeDictationField === 'weekTitle' ? 'Stop Listening' : 'Dictate Week Title (STT)'}
                    >
                      {activeDictationField === 'weekTitle' ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Module Lecture Content
                  </label>
                  <div className="flex items-start gap-2">
                    <textarea
                      rows={6}
                      value={editCourseData.weeks[selectedEditWeekIndex].content}
                      onChange={(e) => updateEditWeekField(selectedEditWeekIndex, 'content', e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => startDictation('weekContent', (text) => {
                        const cur = editCourseData.weeks[selectedEditWeekIndex].content || '';
                        updateEditWeekField(selectedEditWeekIndex, 'content', cur ? cur + ' ' + text : text);
                      })}
                      className={`p-2 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        activeDictationField === 'weekContent'
                          ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                          : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                      }`}
                      title={activeDictationField === 'weekContent' ? 'Stop Listening' : 'Dictate Content (STT)'}
                    >
                      {activeDictationField === 'weekContent' ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quiz Editor Panel */}
              <div className="border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {/* Quiz Header */}
                <div className="bg-purple-600 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 stroke-[2.5]" />
                    <span className="text-xs font-black uppercase tracking-wider">Quiz Questions</span>
                    <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                      {(editCourseData.weeks[selectedEditWeekIndex].quiz ?? []).length} Questions
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addQuizQuestion(selectedEditWeekIndex)}
                    className="flex items-center gap-1.5 bg-white text-purple-700 font-black text-[10px] uppercase px-3 py-1.5 rounded-xl border-2 border-black hover:bg-[#FFD600] hover:text-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    Add Question
                  </button>
                </div>

                {/* Questions List */}
                <div className="bg-slate-50 dark:bg-slate-950 divide-y-2 divide-black">
                  {(editCourseData.weeks[selectedEditWeekIndex].quiz ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-600">
                        No quiz questions yet. Click "Add Question" to create one.
                      </p>
                    </div>
                  ) : (
                    (editCourseData.weeks[selectedEditWeekIndex].quiz ?? []).map((q, qIdx) => (
                      <div key={qIdx} className="p-4 space-y-3">

                        {/* Question header row */}
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white text-[10px] font-black rounded-full flex items-center justify-center mt-0.5">
                            {qIdx + 1}
                          </span>
                          <div className="flex-1">
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => updateQuizQuestion(selectedEditWeekIndex, qIdx, 'question', e.target.value)}
                              placeholder="Enter your question here..."
                              className="w-full px-3 py-2 border-2 border-black rounded-xl bg-white dark:bg-slate-900 font-bold text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none leading-relaxed"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteQuizQuestion(selectedEditWeekIndex, qIdx)}
                            className="flex-shrink-0 p-1.5 bg-rose-100 hover:bg-rose-200 border border-rose-400 text-rose-600 rounded-lg transition-all"
                            title="Delete this question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Question type switcher */}
                        <div className="ml-8 flex items-center gap-4 text-xs font-bold">
                          <span className="text-[10px] uppercase text-gray-400 font-black">Question Type:</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setQuestionType(selectedEditWeekIndex, qIdx, 'mcq')}
                              className={`px-3 py-1 border-2 border-black rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                (q.type || 'mcq') === 'mcq'
                                  ? 'bg-[#FFD600] text-black shadow-[1.5px_1.5px_0px_0px_#000000]'
                                  : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-black'
                              }`}
                            >
                              Multiple Choice
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuestionType(selectedEditWeekIndex, qIdx, 'essay')}
                              className={`px-3 py-1 border-2 border-black rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                q.type === 'essay'
                                  ? 'bg-[#FFD600] text-black shadow-[1.5px_1.5px_0px_0px_#000000]'
                                  : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-black'
                              }`}
                            >
                              Essay Type
                            </button>
                          </div>
                        </div>

                        {/* Answer options (only for multiple choice) */}
                        {(q.type || 'mcq') === 'mcq' ? (
                          <>
                            <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                                    q.correctAnswerIndex === optIdx
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                      : 'border-black bg-white dark:bg-slate-900'
                                  }`}
                                >
                                  {/* Correct answer radio */}
                                  <button
                                    type="button"
                                    onClick={() => setCorrectAnswer(selectedEditWeekIndex, qIdx, optIdx)}
                                    className="flex-shrink-0"
                                    title={q.correctAnswerIndex === optIdx ? 'Correct answer' : 'Set as correct answer'}
                                  >
                                    {q.correctAnswerIndex === optIdx ? (
                                      <CheckCircle className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-emerald-400 stroke-[2]" />
                                    )}
                                  </button>

                                  {/* Option label */}
                                  <span className="text-[9px] font-black text-slate-400 uppercase flex-shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>

                                  {/* Option text input */}
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateQuizOption(selectedEditWeekIndex, qIdx, optIdx, e.target.value)}
                                    className="flex-1 min-w-0 bg-transparent text-xs font-bold text-black dark:text-white focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Correct answer indicator */}
                            <p className="ml-8 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              ✓ Correct: Option {String.fromCharCode(65 + q.correctAnswerIndex)} — Click the circle on any option to change the correct answer
                            </p>
                          </>
                        ) : (
                          <div className="ml-8 p-3 bg-indigo-50/50 dark:bg-slate-950/50 border-2 border-dashed border-black rounded-xl text-[10px] font-bold text-gray-500 dark:text-slate-400">
                            ✏️ Essay Question: Students will answer this with a freeform text response (typing or dictating via Speech-to-Text).
                          </div>
                        )}

                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Week Files Section ── */}
              <div className="border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-amber-500 text-black px-5 py-3">
                  <span className="text-xs font-black uppercase tracking-wider">📎 Week Files & Resources</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900">
                  <InstructorFilePanel
                    files={editCourseData.weeks[selectedEditWeekIndex].files || []}
                    onFilesChange={(newFiles: WeekFile[]) => {
                      const updatedWeeks = [...editCourseData.weeks];
                      updatedWeeks[selectedEditWeekIndex] = {
                        ...updatedWeeks[selectedEditWeekIndex],
                        files: newFiles,
                      };
                      setEditCourseData({ ...editCourseData, weeks: updatedWeeks });
                    }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* ASSIGNMENTS TAB — inside right panel, beside the menu on desktop */}
          {activeTab === 'assignments' && !isEditing && courses.length > 0 && (
            <InstructorAssignments
              courses={courses}
              assignments={assignments}
              submissions={submissions}
              onAddAssignment={onAddAssignment}
              onDeleteAssignment={onDeleteAssignment}
              onGradeSubmission={onGradeSubmission}
            />
          )}
          {activeTab === 'assignments' && !isEditing && courses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-sm font-black uppercase text-slate-400">Create a course first before adding assignments.</p>
            </div>
          )}

          {/* STUDENTS TAB — inside right panel, beside the menu on desktop */}
          {activeTab === 'students' && !isEditing && (() => {
            const pendingEnrollments = enrollments.filter(e => e.status === 'pending');
            const allPendingSelected = pendingEnrollments.length > 0 &&
              pendingEnrollments.every(e => selectedEnrollmentIds.has(e.id));

            const toggleSelect = (id: string) => {
              setSelectedEnrollmentIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            };

            const toggleAll = () => {
              if (allPendingSelected) {
                setSelectedEnrollmentIds(new Set());
              } else {
                setSelectedEnrollmentIds(new Set(pendingEnrollments.map(e => e.id)));
              }
            };

            const handleBulkAction = async (status: 'approved' | 'rejected') => {
              const ids = Array.from(selectedEnrollmentIds) as string[];
              if (ids.length === 0) return;
              await onUpdateEnrollments(ids, status);
              setSelectedEnrollmentIds(new Set());
            };

            return (
              <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3 border-b-2 border-black pb-4">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 border-2 border-black rounded-xl">
                    <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase text-black dark:text-white tracking-tight">Students &amp; Enrollments</h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Review enrollment requests and manage your student roster.</p>
                  </div>
                  {pendingEnrollments.length > 0 && (
                    <span className="ml-auto bg-amber-400 text-black text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-black">
                      {pendingEnrollments.length} Pending
                    </span>
                  )}
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEnrollmentsTab('requests')}
                    className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 ${
                      enrollmentsTab === 'requests' ? 'bg-[#FFD600] text-black' : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Enrollment Requests
                    {pendingEnrollments.length > 0 && (
                      <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{pendingEnrollments.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => { setEnrollmentsTab('roster'); setStudentsLoading(true); setStudentsError(null); fetchAllStudents().then(setStudents).catch(err => setStudentsError(err.message)).finally(() => setStudentsLoading(false)); }}
                    className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 ${
                      enrollmentsTab === 'roster' ? 'bg-[#FFD600] text-black' : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Student Roster
                  </button>
                </div>

                {/* ── ENROLLMENT REQUESTS PANEL ── */}
                {enrollmentsTab === 'requests' && (
                  <div className="space-y-4">
                    {/* Bulk action toolbar */}
                    {pendingEnrollments.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 rounded-2xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allPendingSelected}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded border-2 border-black accent-black"
                          />
                          <span className="text-xs font-black uppercase text-black dark:text-white">Select All ({pendingEnrollments.length})</span>
                        </label>

                        <div className="ml-auto flex gap-2">
                          <button
                            disabled={selectedEnrollmentIds.size === 0}
                            onClick={() => handleBulkAction('approved')}
                            className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-500 border-2 border-black rounded-xl text-xs font-black uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            ✓ Approve Selected
                          </button>
                          <button
                            disabled={selectedEnrollmentIds.size === 0}
                            onClick={() => handleBulkAction('rejected')}
                            className="px-3 py-1.5 bg-rose-400 hover:bg-rose-500 border-2 border-black rounded-xl text-xs font-black uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            ✕ Reject Selected
                          </button>
                        </div>
                      </div>
                    )}

                    {pendingEnrollments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-2" />
                        <p className="text-sm font-black uppercase text-slate-400">No pending enrollment requests.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingEnrollments.map((enrollment) => {
                          const course = courses.find(c => c.id === enrollment.courseId);
                          return (
                            <div key={enrollment.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border-2 border-black rounded-2xl">
                              <input
                                type="checkbox"
                                checked={selectedEnrollmentIds.has(enrollment.id)}
                                onChange={() => toggleSelect(enrollment.id)}
                                className="w-4 h-4 rounded border-2 border-black accent-black flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-black dark:text-white truncate">{enrollment.studentName}</p>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                                  Requesting: {course?.title || enrollment.courseId}
                                </p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => onUpdateEnrollments([enrollment.id], 'approved')}
                                  className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-500 border border-black rounded-lg text-[10px] font-black uppercase"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => onUpdateEnrollments([enrollment.id], 'rejected')}
                                  className="px-2.5 py-1 bg-rose-400 hover:bg-rose-500 border border-black rounded-lg text-[10px] font-black uppercase"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Show already-processed enrollments */}
                    {enrollments.filter(e => e.status !== 'pending').length > 0 && (
                      <div className="space-y-2 pt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Previously Processed</p>
                        {enrollments.filter(e => e.status !== 'pending').map(enrollment => {
                          const course = courses.find(c => c.id === enrollment.courseId);
                          return (
                            <div key={enrollment.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl opacity-75">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-black dark:text-white truncate">{enrollment.studentName}</p>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{course?.title || enrollment.courseId}</p>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                enrollment.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                  : 'bg-rose-100 text-rose-700 border-rose-300'
                              }`}>
                                {enrollment.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── STUDENT ROSTER PANEL ── */}
                {enrollmentsTab === 'roster' && (
                  <div className="space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search students by name or email..."
                        value={rosterSearch}
                        onChange={e => setRosterSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                      />
                    </div>

                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white" />
                      </div>
                    ) : studentsError ? (
                      <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs font-bold text-rose-700">{studentsError}</div>
                    ) : students.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-2" />
                        <p className="text-sm font-black uppercase text-slate-400">No enrolled students yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {students
                          .filter(s =>
                            !rosterSearch ||
                            s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                            s.email.toLowerCase().includes(rosterSearch.toLowerCase())
                          )
                          .map(student => {
                            const isExpanded = expandedStudentId === student.id;
                            const studentEnrollments = enrollments.filter(e => e.studentId === student.id && e.status === 'approved');
                            const studentSubmissions = submissions.filter(s => s.studentId === student.id);

                            return (
                              <div key={student.id} className="border-2 border-black rounded-2xl overflow-hidden">
                                {/* Student row */}
                                <button
                                  onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                                  className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 border-2 border-black flex items-center justify-center flex-shrink-0">
                                    <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-black dark:text-white truncate">{student.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{student.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300">
                                      {studentEnrollments.length} Course{studentEnrollments.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className={`text-[10px] text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                  </div>
                                </button>

                                {/* Expanded: courses + submissions */}
                                {isExpanded && (
                                  <div className="p-4 border-t-2 border-dashed border-black bg-white dark:bg-slate-900 space-y-3">
                                    {studentEnrollments.length === 0 ? (
                                      <p className="text-[10px] font-bold text-slate-400 text-center py-2">No approved course enrollments.</p>
                                    ) : (
                                      studentEnrollments.map(enrollment => {
                                        const course = courses.find(c => c.id === enrollment.courseId);
                                        const courseSubmissions = studentSubmissions.filter(s => s.courseId === enrollment.courseId);
                                        return (
                                          <div key={enrollment.id} className="space-y-2">
                                            <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                                              📚 {course?.title || enrollment.courseId}
                                            </p>
                                            {courseSubmissions.length === 0 ? (
                                              <p className="text-[10px] text-slate-400 pl-3">No submissions yet.</p>
                                            ) : (
                                              courseSubmissions.map(sub => {
                                                const assignment = assignments.find(a => a.id === sub.assignmentId);
                                                const maxScore = assignment?.maxScore || 100;
                                                const draftKey = sub.id;
                                                const draft = gradeDrafts[draftKey] || { grade: sub.grade !== undefined && sub.grade !== null ? String(sub.grade) : '', feedback: sub.feedback || '' };

                                                return (
                                                  <div key={sub.id} className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                      <p className="text-[10px] font-bold text-black dark:text-white">{assignment?.title || sub.assignmentId}</p>
                                                      {sub.grade !== undefined && sub.grade !== null ? (
                                                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-300">
                                                          {sub.grade}/{maxScore}
                                                        </span>
                                                      ) : (
                                                        <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-300">Ungraded</span>
                                                      )}
                                                    </div>
                                                    <div className="flex gap-2 items-end">
                                                      <input
                                                        type="number"
                                                        min={0}
                                                        max={maxScore}
                                                        placeholder={`Grade /\u200b${maxScore}`}
                                                        value={draft.grade}
                                                        onChange={e => setGradeDrafts(prev => ({ ...prev, [draftKey]: { ...draft, grade: e.target.value } }))}
                                                        className="w-20 px-2 py-1 border-2 border-black rounded-lg bg-slate-50 dark:bg-slate-950 font-bold text-[10px] text-black dark:text-white focus:outline-none"
                                                      />
                                                      <input
                                                        type="text"
                                                        placeholder="Feedback (optional)"
                                                        value={draft.feedback}
                                                        onChange={e => setGradeDrafts(prev => ({ ...prev, [draftKey]: { ...draft, feedback: e.target.value } }))}
                                                        className="flex-1 px-2 py-1 border-2 border-black rounded-lg bg-slate-50 dark:bg-slate-950 font-bold text-[10px] text-black dark:text-white focus:outline-none"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const gradeNum = parseFloat(draft.grade);
                                                          if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > maxScore) {
                                                            alert(`Grade must be between 0 and ${maxScore}.`);
                                                            return;
                                                          }
                                                          onGradeSubmission(sub.id, gradeNum, draft.feedback);
                                                          alert('Grade saved successfully!');
                                                        }}
                                                        className="self-end px-3 py-1 bg-emerald-400 hover:bg-emerald-500 border border-black text-black rounded-lg text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                                      >
                                                        Save Grade
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
