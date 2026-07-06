import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, Sparkles, Volume2, VolumeX, MessageSquare, HelpCircle, ArrowRight, Mic, MicOff, Check, X, RefreshCw, ClipboardList
} from 'lucide-react';
import { Course, Week, ChatMessage, QuizQuestion, Assignment, AssignmentSubmission, User } from '../types';
import { simplifyWeekContent, chatWithStudyBuddy } from '../lib/gemini';
import StudentAssignments from './StudentAssignments';

interface StudentDashboardProps {
  courses: Course[];
  currentUser: User;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  onSubmitAssignment: (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => void;
}

export default function StudentDashboard({
  courses,
  currentUser,
  assignments,
  submissions,
  onSubmitAssignment,
}: StudentDashboardProps) {
  // Main navigation view
  const [view, setView] = useState<'courses' | 'assignments'>('courses');
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

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
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
  const speak = (textToSpeak: string, section: 'main' | 'simplified' | 'chat', messageId: string | null = null) => {
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
        chatHistory.map(m => ({ sender: m.sender, text: m.text }))
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
  const handleSelectQuizOption = (questionIdx: number, optionIdx: number) => {
    if (quizSubmitted) return;
    const newAnswers = [...quizAnswers];
    newAnswers[questionIdx] = optionIdx;
    setQuizAnswers(newAnswers);
  };

  const handleSubmitQuiz = (questions: QuizQuestion[]) => {
    if (quizAnswers.length < questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    setQuizScore(correctCount);
    setQuizSubmitted(true);
  };

  // Filtering Logic
  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedWeek = selectedCourse?.weeks[selectedWeekIndex];

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
              Select a course syllabus, listen to educational audios, and quiz yourself on your learning.
            </p>
          </div>

          {/* View toggle: Courses / Assignments */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('courses')}
              className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 ${
                view === 'courses' ? 'bg-[#FFD600] text-black' : 'bg-white dark:bg-slate-800 text-black dark:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Courses
            </button>
            <button
              onClick={() => { setView('assignments'); setSelectedCourse(null); }}
              className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 ${
                view === 'assignments' ? 'text-white' : 'bg-white dark:bg-slate-800 text-black dark:text-white'
              }`}
              style={view === 'assignments' ? { backgroundColor: 'var(--accent)' } : {}}
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
              placeholder="Search courses (e.g. JavaScript, AI, Biology)..."
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
          courses={courses}
          currentUser={currentUser}
          assignments={assignments}
          submissions={submissions}
          onSubmit={onSubmitAssignment}
        />
      )}
      {view === 'assignments' && !selectedCourse && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-sm font-black uppercase text-slate-400">No courses available yet.</p>
        </div>
      )}

      {/* Main Study Desk View — only show when in courses view */}
      {view === 'courses' && selectedCourse && selectedWeek ? (
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
                {selectedCourse.weeks.map((week, idx) => (
                  <button
                    key={week.id}
                    onClick={() => { setSelectedWeekIndex(idx); }}
                    className={`w-full p-2.5 border-2 border-black rounded-xl text-left text-xs transition-all font-bold ${
                      selectedWeekIndex === idx
                        ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_0px_#000000]'
                        : 'bg-slate-50 dark:bg-slate-950 text-black dark:text-white hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-[9px] uppercase tracking-wide">Week {week.weekNumber}</div>
                    <div className="truncate">{week.title}</div>
                  </button>
                ))}
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
                        <p className="text-xs font-black">
                          {qIdx + 1}. {q.question}
                        </p>
                        
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
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                    {!quizSubmitted ? (
                      <button
                        onClick={() => handleSubmitQuiz(selectedWeek.quiz!)}
                        disabled={quizAnswers.length < selectedWeek.quiz.length}
                        className={`w-full sm:w-auto px-6 py-2.5 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] ${
                          quizAnswers.length < selectedWeek.quiz.length
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-400 hover:bg-emerald-500 text-black'
                        }`}
                      >
                        Submit Test Responses
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase text-slate-500">
                          Quiz score:
                        </span>
                        <span className="text-sm font-black px-3.5 py-1.5 border-2 border-black bg-[#FFD600] rounded-full text-black">
                          {quizScore} / {selectedWeek.quiz.length} Correct
                        </span>
                        <button
                          onClick={() => {
                            setQuizAnswers([]);
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
                  <form onSubmit={handleSendMessage} className="flex gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Type a question for your study tutor..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                      />
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
      ) : view === 'courses' ? (
        /* COURSE CATALOG LISTING */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 border-4 border-black p-12 rounded-3xl text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Search className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-3 stroke-[1.5]" />
              <h4 className="text-sm font-black uppercase text-black dark:text-white">
                No matching courses found
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Try searching for another topic or have the instructor generate a new course outline in the Instructor Workspace.
              </p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => { setSelectedCourse(course); setSelectedWeekIndex(0); }}
                className="bg-white dark:bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between min-h-[220px]"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <span className="bg-purple-100 dark:bg-purple-950 text-[#9333EA] dark:text-[#C084FC] border border-purple-300 text-[8px] font-black uppercase px-2 py-0.5 rounded">
                      4 Weeks
                    </span>
                    <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  </div>

                  <h3 className="text-sm font-black uppercase text-black dark:text-white leading-tight">
                    {course.title}
                  </h3>
                  
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-bold">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 mt-4 text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                  <span className="truncate max-w-[70%]">Tutor: {course.instructorName}</span>
                  <span className="text-[#9333EA] dark:text-[#C084FC] hover:underline flex items-center gap-0.5 font-black uppercase">
                    Enter Class →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

    </div>
  );
}
