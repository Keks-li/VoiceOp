import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, Sparkles, Volume2, VolumeX, MessageSquare, HelpCircle, ArrowRight, Check, X, RefreshCw, ClipboardList, GraduationCap, Clock, CheckCircle, XCircle, Library, Mic, MicOff
} from 'lucide-react';
import { Course, Week, ChatMessage, QuizQuestion, Assignment, AssignmentSubmission, User, Enrollment, ParsedVoiceCommand } from '../types';
import { simplifyWeekContent, chatWithStudyBuddy } from '../lib/gemini';
import StudentAssignments from './StudentAssignments';

interface StudentDashboardProps {
  courses: Course[];
  currentUser: User;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  enrollments: Enrollment[];
  voiceCommand: ParsedVoiceCommand | null;
  onSubmitAssignment: (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => void;
  onRequestEnrollment: (courseId: string) => void;
}

export default function StudentDashboard({
  courses,
  currentUser,
  assignments,
  submissions,
  enrollments,
  voiceCommand,
  onSubmitAssignment,
  onRequestEnrollment,
}: StudentDashboardProps) {
  // Main navigation view
  const [view, setView] = useState<'catalog' | 'my-courses' | 'assignments'>('my-courses');
  // Navigation & Browsing
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Simplification State
  const [simplifiedText, setSimplifiedText] = useState<string | null>(null);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [simplifyError, setSimplifyError] = useState<string | null>(null);

  // Chat Buddy State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // STT Dictation State
  const [activeDictationField, setActiveDictationField] = useState<string | null>(null);
  const dictationRecRef = useRef<any>(null);

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

    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
      setTtsSection(null);
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

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Speech Synthesis Player State
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsSection, setTtsSection] = useState<'main' | 'simplified' | 'chat' | null>(null);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load browser Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Reset states when changing weeks
  useEffect(() => {
    setSimplifiedText(null);
    setSimplifyError(null);
    setChatHistory([]);
    setQuizAnswers([]);
    setQuizSubmitted(false);
    setQuizScore(null);
    stopTts();
  }, [selectedCourse, selectedWeekIndex]);

  // TTS Read-Aloud logic (incorporates delay to bypass Chromium cancel-speak bugs)
  const speak = (textToSpeak: string, section: string, messageId: string | null = null) => {
    if (!synthRef.current) return;

    if (isPlayingTts && ttsSection === section && activeSpeechMessageId === messageId) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
      setTtsSection(null);
      setActiveSpeechMessageId(null);
      return;
    }

    synthRef.current.cancel();

    setTimeout(() => {
      if (!synthRef.current) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => {
        setIsPlayingTts(false);
        setTtsSection(null);
        setActiveSpeechMessageId(null);
      };
      utterance.onerror = (e) => {
        console.error('SpeechSynthesis error:', e);
        setIsPlayingTts(false);
        setTtsSection(null);
        setActiveSpeechMessageId(null);
      };

      const savedRate = localStorage.getItem('voiceop_tts_rate');
      const savedVoice = localStorage.getItem('voiceop_tts_voice_name');
      
      if (savedRate) utterance.rate = parseFloat(savedRate);
      if (savedVoice) {
        const voices = synthRef.current.getVoices();
        const matched = voices.find(v => v.name === savedVoice);
        if (matched) utterance.voice = matched;
      }

      setIsPlayingTts(true);
      setTtsSection(section);
      setActiveSpeechMessageId(messageId);
      synthRef.current.speak(utterance);
    }, 100);
  };

  const stopTts = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
      setTtsSection(null);
      setActiveSpeechMessageId(null);
    }
  };

  // call Gemini to simplify course details
  const handleSimplifyContent = async () => {
    if (!selectedCourse) return;
    const currentWeek = selectedCourse.weeks[selectedWeekIndex];
    if (!currentWeek || !currentWeek.content) return;

    setIsSimplifying(true);
    setSimplifyError(null);
    setSimplifiedText(null);

    try {
      const simplified = await simplifyWeekContent(currentWeek.content);
      setSimplifiedText(simplified);
    } catch (err: any) {
      console.error(err);
      setSimplifyError(err.message || 'Failed to simplify week material.');
    } finally {
      setIsSimplifying(false);
    }
  };

  // Send message to Gemini chat study buddy
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedCourse) return;

    const userMessage: ChatMessage = {
      id: `chat_${Date.now()}_u`,
      sender: 'user',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatSending(true);
    setChatError(null);

    const currentWeek = selectedCourse.weeks[selectedWeekIndex];
    const lessonContext = `Current Lesson Content:\n${currentWeek.content}`;

    try {
      const aiResponseText = await chatWithStudyBuddy(
        selectedCourse.title,
        lessonContext,
        userMessage.text,
        chatHistory.map(m => ({ sender: m.sender, text: m.text })),
        selectedCourse.instructorName
      );

      const aiMessage: ChatMessage = {
        id: `chat_${Date.now()}_ai`,
        sender: 'assistant',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'Failed to communicate with AI Tutor.');
    } finally {
      setIsChatSending(false);
    }
  };

  // Quiz Handling
  const handleSelectQuizOption = (questionIdx: number, value: number | string) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [questionIdx]: value }));
  };

  const handleSubmitQuiz = async (questions: QuizQuestion[]) => {
    const unanswered = questions.some((_, idx) => quizAnswers[idx] === undefined || quizAnswers[idx] === '');
    if (unanswered) {
      alert('Please answer all questions before submitting.');
      return;
    }
    
    let correctCount = 0;
    let mcqCount = 0;
    questions.forEach((q, idx) => {
      if ((q.type || 'mcq') === 'mcq') {
        mcqCount++;
        if (quizAnswers[idx] === q.correctAnswerIndex) {
          correctCount++;
        }
      }
    });

    const answersSummary = questions.map((q, idx) => {
      const isEssay = q.type === 'essay';
      const ans = quizAnswers[idx];
      if (isEssay) {
        return `Question ${idx + 1} [Essay]: ${q.question}\nStudent Answer: "${ans || 'No response provided.'}"`;
      } else {
        const isCorrect = ans === q.correctAnswerIndex;
        const chosenOpt = ans !== undefined ? q.options[ans as number] : 'None';
        const correctOpt = q.options[q.correctAnswerIndex];
        return `Question ${idx + 1} [MCQ]: ${q.question}\nStudent Answer: ${String.fromCharCode(65 + (ans as number))} (${chosenOpt}) - ${isCorrect ? 'Correct' : `Incorrect (Correct is ${correctOpt})`}`;
      }
    }).join('\n\n');

    try {
      await onSubmitAssignment({
        assignmentId: `quiz_${selectedCourse!.id}_${selectedWeek.weekNumber}`,
        courseId: selectedCourse!.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        textContent: `--- WEEK ${selectedWeek.weekNumber} QUIZ SUBMISSION ---\nScore: ${correctCount}/${mcqCount} MCQ Correct\n\n${answersSummary}`,
      });
      setQuizScore(correctCount);
      setQuizSubmitted(true);
    } catch (err: any) {
      alert('Failed to submit quiz responses: ' + err.message);
    }
  };

  // Enrollment helpers
  const getEnrollment = (courseId: string) =>
    enrollments.find(e => e.studentId === currentUser.id && e.courseId === courseId);

  // Courses approved for this student
  const enrolledCourseIds = new Set(
    enrollments
      .filter(e => e.studentId === currentUser.id && e.status === 'approved')
      .map(e => e.courseId)
  );

  // Filtering Logic
  const filteredCatalog = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enrolledCourses = courses.filter(c => enrolledCourseIds.has(c.id));
  const filteredEnrolled = enrolledCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedWeek = selectedCourse?.weeks[selectedWeekIndex];

  // Handle Voice Commands
  useEffect(() => {
    if (!voiceCommand) return;
    const { command, params } = voiceCommand;
    if (command === 'navigation:list' || command === 'navigation:catalog') {
      setView('catalog');
      setSelectedCourse(null);
    } else if (command === 'navigation:assignments') {
      setView('assignments');
      setSelectedCourse(null);
    } else if (command === 'navigation:students') {
      setView('my-courses');
      setSelectedCourse(null);
    } else if (command === 'course:select') {
      const match = courses.find(c =>
        c.title.toLowerCase().includes(params?.courseTitle?.toLowerCase() || '')
      );
      if (match) {
        setSelectedCourse(match);
        setSelectedWeekIndex(0);
        const isApproved = enrolledCourseIds.has(match.id);
        if (isApproved) {
          setView('my-courses');
        } else {
          setView('catalog');
        }
      }
    } else if (command === 'course:simplify') {
      handleSimplifyContent();
    } else if (command === 'course:speak') {
      if (selectedWeek) {
        speak(selectedWeek.content, 'main');
      }
    } else if (command === 'quiz:select' && selectedWeek?.quiz && params?.questionNumber && params?.optionLetter) {
      const questionIdx = params.questionNumber - 1;
      const optionIdx = params.optionLetter.toUpperCase().charCodeAt(0) - 65;
      if (questionIdx >= 0 && questionIdx < selectedWeek.quiz.length && optionIdx >= 0 && optionIdx < 4) {
        handleSelectQuizOption(questionIdx, optionIdx);
      }
    } else if (command === 'quiz:submit' && selectedWeek?.quiz) {
      handleSubmitQuiz(selectedWeek.quiz);
    }
  }, [voiceCommand]);

  return (
    <div className="w-full space-y-6">
      
      {/* Search Header */}
      {!selectedCourse && (
        <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div>
            <h2 className="text-2xl font-black uppercase text-black dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600 stroke-[2.5]" />
              Learning Hub
            </h2>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
              Browse all courses or view your enrolled classes.
            </p>
          </div>

          {/* Nav tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView('my-courses')}
              className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 ${
                view === 'my-courses' ? 'bg-[#FFD600] text-black' : 'bg-white dark:bg-slate-800 text-black dark:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              My Courses
              {enrolledCourseIds.size > 0 && (
                <span className="bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {enrolledCourseIds.size}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('catalog')}
              className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 ${
                view === 'catalog' ? 'text-white' : 'bg-white dark:bg-slate-800 text-black dark:text-white'
              }`}
              style={view === 'catalog' ? { backgroundColor: 'var(--accent)' } : {}}
            >
              <Library className="w-3.5 h-3.5" /> Course Catalog
            </button>
            <button
              onClick={() => { setView('assignments'); setSelectedCourse(null); }}
              className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 ${
                view === 'assignments' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-black dark:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> My Assignments
              {assignments.filter(a => !submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser.id)).length > 0 && (
                <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                  {assignments.filter(a => !submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser.id)).length}
                </span>
              )}
            </button>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 stroke-[2.5]" />
            <input
              type="text"
              placeholder={view === 'catalog' ? 'Search all courses...' : 'Search your enrolled courses...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Assignments view */}
      {view === 'assignments' && !selectedCourse && courses.length > 0 && (
        <StudentAssignments
          courses={enrolledCourses.length > 0 ? enrolledCourses : courses}
          currentUser={currentUser}
          assignments={assignments}
          submissions={submissions}
          voiceCommand={voiceCommand}
          onSubmit={onSubmitAssignment}
        />
      )}
      {view === 'assignments' && !selectedCourse && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-sm font-black uppercase text-slate-400">No courses available yet.</p>
        </div>
      )}

      {/* Main Study Desk View — only accessible from My Courses (enrolled) */}
      {(view === 'my-courses') && selectedCourse && selectedWeek ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COURSE SYLLABUS MENU (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Back Button */}
            <button
              onClick={() => { setSelectedCourse(null); stopTts(); }}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border-2 border-black rounded-2xl font-black uppercase text-xs tracking-tight text-center transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] text-black dark:text-white"
            >
              ← Back to Catalog
            </button>

            {/* Syllabus Navigation Card */}
            <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <div>
                <h4 className="text-[10px] font-black uppercase text-[#9333EA] dark:text-[#C084FC]">
                  Course Syllabus
                </h4>
                <h3 className="text-xs font-black uppercase text-black dark:text-white leading-tight mt-0.5">
                  {selectedCourse.title}
                </h3>
              </div>

              <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
                {selectedCourse.weeks.map((week, idx) => {
                  const isUnlocked = idx === 0 || submissions.some(s => 
                    s.studentId === currentUser.id && 
                    s.assignmentId === `quiz_${selectedCourse.id}_${selectedCourse.weeks[idx - 1].weekNumber}`
                  );

                  return (
                    <button
                      key={week.id}
                      disabled={!isUnlocked}
                      onClick={() => { setSelectedWeekIndex(idx); }}
                      className={`w-full p-2.5 border-2 rounded-xl text-left text-xs transition-all font-bold ${
                        !isUnlocked
                          ? 'border-dashed border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-650 cursor-not-allowed opacity-60'
                          : selectedWeekIndex === idx
                            ? 'bg-[#FFD600] text-black border-black shadow-[2px_2px_0px_0px_#000000]'
                            : 'bg-slate-50 dark:bg-slate-950 text-black dark:text-white border-black hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between font-black text-[9px] uppercase tracking-wide">
                        <span>Week {week.weekNumber}</span>
                        {!isUnlocked && <span className="text-[10px] text-slate-400">🔒 Locked</span>}
                      </div>
                      <div className="truncate">{week.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MAIN MODULE CONTENT VIEW (9 cols) */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Week Lesson Board */}
            <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
              
              {/* Header Title + Speech control */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b-2 border-black pb-4">
                <div>
                  <span className="bg-purple-100 dark:bg-purple-950 border border-purple-300 text-purple-800 dark:text-purple-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    Week {selectedWeek.weekNumber} Module
                  </span>
                  <h2 className="text-lg font-black uppercase text-black dark:text-white mt-1">
                    {selectedWeek.title}
                  </h2>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => speak(selectedWeek.content, 'main')}
                    className={`px-3 py-1.5 border-2 border-black rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] ${
                      isPlayingTts && ttsSection === 'main'
                        ? 'bg-rose-350 text-black'
                        : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                    }`}
                  >
                    {isPlayingTts && ttsSection === 'main' ? (
                      <>
                        <VolumeX className="w-4 h-4 stroke-[2.5]" />
                        Mute Lesson
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 stroke-[2.5]" />
                        Speak Lesson
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSimplifyContent}
                    disabled={isSimplifying}
                    className="px-3 py-1.5 bg-[#9333EA] hover:bg-[#A855F7] text-white border-2 border-black rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    {isSimplifying ? 'Simplifying...' : 'Simplify Course'}
                  </button>
                </div>
              </div>

              {/* Text Lectures Body */}
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-350 font-bold whitespace-pre-line">
                  {selectedWeek.content}
                </p>
              </div>

              {/* Course Simplification Display */}
              {(simplifiedText || isSimplifying || simplifyError) && (
                <div className="border-4 border-black p-5 rounded-3xl bg-[#FEF3C7] dark:bg-amber-950/20 text-black dark:text-white shadow-[4px_4px_0px_0px_#000000] space-y-3">
                  <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                    <h4 className="text-xs font-black uppercase flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Gemini Simplified Lesson Outline
                    </h4>
                    
                    {simplifiedText && (
                      <button
                        onClick={() => speak(simplifiedText, 'simplified')}
                        className={`p-1.5 border border-black rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 ${
                          isPlayingTts && ttsSection === 'simplified'
                            ? 'bg-rose-400'
                            : 'bg-white text-black hover:bg-slate-50'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Listen
                      </button>
                    )}
                  </div>

                  {isSimplifying && (
                    <div className="flex items-center gap-2 py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-800"></div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-400">Gemini generating simpler course content...</span>
                    </div>
                  )}

                  {simplifyError && (
                    <p className="text-xs text-rose-500 font-bold py-2">{simplifyError}</p>
                  )}

                  {simplifiedText && (
                    <div className="text-xs font-medium leading-relaxed font-sans space-y-2 whitespace-pre-line">
                      {simplifiedText}
                    </div>
                  )}
                </div>
              )}

              {/* Module Quiz Section */}
              {selectedWeek.quiz && selectedWeek.quiz.length > 0 && (
                <div className="border-4 border-black p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/30 text-black dark:text-white space-y-4">
                  <h4 className="text-xs font-black uppercase flex items-center gap-1.5 text-slate-800 dark:text-slate-350">
                    <HelpCircle className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                    Module Review Quiz
                  </h4>
                  
                  <div className="space-y-4">
                    {selectedWeek.quiz.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black">
                            {qIdx + 1}. {q.question}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const text = q.type === 'essay'
                                ? `Question ${qIdx + 1}: ${q.question}. This is an essay question. Please type or speak your response.`
                                : `Question ${qIdx + 1}: ${q.question}. Options are: ` + 
                                  q.options.map((opt, oIdx) => `${String.fromCharCode(65 + oIdx)}. ${opt}`).join(", ");
                              speak(text, `quiz-${qIdx}`);
                            }}
                            className={`p-1 border border-black rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                              isPlayingTts && ttsSection === `quiz-${qIdx}`
                                ? 'bg-rose-350 text-black'
                                : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                            }`}
                            title="Read Question Out Loud"
                          >
                            {isPlayingTts && ttsSection === `quiz-${qIdx}` ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        
                        {(q.type || 'mcq') === 'mcq' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = quizAnswers[qIdx] === oIdx;
                              const isCorrect = q.correctAnswerIndex === oIdx;
                              
                              let optBg = 'bg-white dark:bg-slate-900';
                              if (isSelected) optBg = 'bg-amber-100 dark:bg-amber-950/40 border-amber-500';
                              if (quizSubmitted) {
                                if (isCorrect) optBg = 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-250';
                                else if (isSelected) optBg = 'bg-rose-100 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-250';
                              }

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSelectQuizOption(qIdx, oIdx)}
                                  disabled={quizSubmitted}
                                  className={`p-2.5 border-2 border-black rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 ${optBg}`}
                                >
                                  <span className={`w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-black ${
                                    isSelected ? 'bg-[#FFD600]' : 'bg-slate-100'
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <textarea
                                rows={3}
                                value={(quizAnswers[qIdx] as string) || ''}
                                disabled={quizSubmitted}
                                onChange={(e) => handleSelectQuizOption(qIdx, e.target.value)}
                                placeholder={quizSubmitted ? "No answer submitted." : "Type or speak your essay response here..."}
                                className="flex-1 px-3.5 py-2.5 border-2 border-black rounded-xl bg-white dark:bg-slate-900 font-bold text-xs text-black dark:text-white focus:outline-none"
                              />
                              {!quizSubmitted && (
                                <button
                                  type="button"
                                  onClick={() => startDictation(`quizEssay-${qIdx}`, (text) => {
                                    const cur = (quizAnswers[qIdx] as string) || '';
                                    handleSelectQuizOption(qIdx, cur ? cur + ' ' + text : text);
                                  })}
                                  className={`p-2.5 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                                    activeDictationField === `quizEssay-${qIdx}`
                                      ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                                      : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                                  }`}
                                  title={activeDictationField === `quizEssay-${qIdx}` ? 'Stop Listening' : 'Dictate Answer (STT)'}
                                >
                                  {activeDictationField === `quizEssay-${qIdx}` ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                            {quizSubmitted && (
                              <div className="p-2 border-2 border-black bg-indigo-50 dark:bg-slate-900 text-[10px] font-black uppercase text-indigo-700 rounded-xl">
                                📝 Free-response answer submitted. The instructor will view and grade this assessment.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                    {!quizSubmitted ? (
                      <button
                        onClick={() => handleSubmitQuiz(selectedWeek.quiz!)}
                        disabled={Object.keys(quizAnswers).length < selectedWeek.quiz.length}
                        className={`w-full sm:w-auto px-6 py-2.5 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] ${
                          Object.keys(quizAnswers).length < selectedWeek.quiz.length
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-400 hover:bg-emerald-500 text-black'
                        }`}
                      >
                        Submit Test Responses
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase text-slate-500">
                          Quiz graded MCQs score:
                        </span>
                        <span className="text-sm font-black px-3.5 py-1.5 border-2 border-black bg-[#FFD600] rounded-full text-black">
                          {quizScore} / {selectedWeek.quiz.filter(q => (q.type || 'mcq') === 'mcq').length} Correct
                        </span>
                        <button
                          onClick={() => {
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setQuizScore(null);
                          }}
                          className="p-2 border border-black hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Study Buddy floating / collapsible chat layout */}
            <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
              
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="w-full flex items-center justify-between font-black uppercase text-xs text-black dark:text-white"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                  Interactive Study Buddy AI (Chat Tutor)
                </div>
                <span>{chatOpen ? 'Hide Assistant' : 'Show Assistant'}</span>
              </button>

              {chatOpen && (
                <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col h-[400px]">
                  
                  {/* Chat message bubbles */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {chatHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-16 text-gray-400">
                        <MessageSquare className="w-8 h-8 stroke-[1.5] mb-2 animate-bounce" />
                        <p className="text-[11px] font-bold">Ask me anything about this week's lesson!</p>
                        <p className="text-[9px]">"What are arrows functions?", "Explain Asynchronous flow", etc.</p>
                      </div>
                    ) : (
                      chatHistory.map((msg) => {
                        const isUser = msg.sender === 'user';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-gray-500 font-bold px-1.5">{isUser ? 'You' : 'Study Buddy'}</span>
                            </div>
                            
                            <div className={`p-3 max-w-[85%] border-2 border-black rounded-2xl text-xs font-bold leading-normal flex items-start gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] ${
                              isUser
                                ? 'bg-amber-100 text-black border-amber-500 rounded-tr-none'
                                : 'bg-[#E0E7FF] dark:bg-slate-800 text-black dark:text-white rounded-tl-none'
                            }`}>
                              <p className="whitespace-pre-line flex-1">{msg.text}</p>
                              
                              {!isUser && (
                                <button
                                  onClick={() => speak(msg.text, 'chat', msg.id)}
                                  className={`p-1 rounded-md border border-black/20 ${
                                    isPlayingTts && activeSpeechMessageId === msg.id
                                      ? 'bg-rose-400'
                                      : 'bg-white hover:bg-slate-100 text-black'
                                  }`}
                                  title="Speak Answer"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            
                            <span className="text-[8px] text-gray-400 font-mono mt-0.5 px-1">{msg.timestamp}</span>
                          </div>
                        );
                      })
                    )}

                    {isChatSending && (
                      <div className="flex gap-2 items-center text-[10px] text-gray-500 dark:text-slate-400 font-bold py-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Tutor is studying lesson context to answer...
                      </div>
                    )}

                    {chatError && (
                      <p className="text-[10px] text-rose-500 font-bold">{chatError}</p>
                    )}
                  </div>

                  {/* Chat input box */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="relative flex-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Type a question for your study tutor..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 px-3 py-2 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => startDictation('chatInput', (text) => setChatInput(prev => (prev ? prev + ' ' + text : text)))}
                        className={`p-2 border-2 border-black rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                          activeDictationField === 'chatInput'
                            ? 'bg-rose-500 text-white animate-pulse shadow-none translate-x-0.5 translate-y-0.5'
                            : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                        }`}
                        title={activeDictationField === 'chatInput' ? 'Stop Listening' : 'Dictate Question (STT)'}
                      >
                        {activeDictationField === 'chatInput' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatSending}
                      className="px-4 py-2 bg-black text-white hover:bg-slate-850 rounded-xl border-2 border-black font-black uppercase text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Ask Buddy
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>

                </div>
              )}
            </div>

          </div>

        </div>
      ) : view === 'my-courses' && !selectedCourse ? (
        /* MY COURSES — approved enrollments only */
        <div className="space-y-4">
          {filteredEnrolled.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border-4 border-black p-12 rounded-3xl text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-4">
              <GraduationCap className="w-14 h-14 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
              <h4 className="text-sm font-black uppercase text-black dark:text-white">No Enrolled Courses Yet</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Browse the <strong>Course Catalog</strong> and request enrollment. Once an instructor approves your request, the course will appear here.
              </p>
              <button
                onClick={() => setView('catalog')}
                className="mt-2 px-5 py-2.5 bg-black text-white border-2 border-black rounded-2xl font-black uppercase text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-slate-800 flex items-center gap-2"
              >
                <Library className="w-3.5 h-3.5" />
                Browse Course Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrolled.map((course) => (
                <div
                  key={course.id}
                  onClick={() => { setSelectedCourse(course); setSelectedWeekIndex(0); }}
                  className="bg-white dark:bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Enrolled
                      </span>
                      <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    </div>
                    <h3 className="text-sm font-black uppercase text-black dark:text-white leading-tight">{course.title}</h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-bold">{course.description}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 mt-4 text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                    <span className="truncate max-w-[70%]">Tutor: {course.instructorName}</span>
                    <span className="text-[#9333EA] dark:text-[#C084FC] font-black uppercase">Study Now →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'catalog' ? (
        /* COURSE CATALOG — all courses with enrollment action */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCatalog.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 border-4 border-black p-12 rounded-3xl text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Search className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-3 stroke-[1.5]" />
              <h4 className="text-sm font-black uppercase text-black dark:text-white">No matching courses found</h4>
            </div>
          ) : (
            filteredCatalog.map((course) => {
              const enrollment = getEnrollment(course.id);
              const isApproved = enrollment?.status === 'approved';
              const isPending = enrollment?.status === 'pending';
              const isRejected = enrollment?.status === 'rejected';

              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[240px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="bg-purple-100 dark:bg-purple-950 text-[#9333EA] dark:text-[#C084FC] border border-purple-300 text-[8px] font-black uppercase px-2 py-0.5 rounded">
                        {course.weeks.length} Week{course.weeks.length !== 1 ? 's' : ''}
                      </span>
                      <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    </div>
                    <h3 className="text-sm font-black uppercase text-black dark:text-white leading-tight">{course.title}</h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-bold">{course.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide truncate">Tutor: {course.instructorName}</p>

                    {/* Enrollment CTA */}
                    {isApproved ? (
                      <button
                        onClick={() => { setSelectedCourse(course); setSelectedWeekIndex(0); setView('my-courses'); }}
                        className="w-full py-2 px-3 bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-black rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Enrolled — Open Course
                      </button>
                    ) : isPending ? (
                      <div className="w-full py-2 px-3 bg-amber-100 dark:bg-amber-950 border-2 border-amber-400 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <Clock className="w-3.5 h-3.5" /> Pending Approval
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRequestEnrollment(course.id); }}
                        className={`w-full py-2 px-3 border-2 border-black rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                          isRejected
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'bg-[#FFD600] text-black hover:bg-[#FEE21E]'
                        }`}
                      >
                        {isRejected ? (
                          <><XCircle className="w-3.5 h-3.5" /> Re-request Enrollment</>
                        ) : (
                          <><GraduationCap className="w-3.5 h-3.5" /> Request Enrollment</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

    </div>
  );
}
