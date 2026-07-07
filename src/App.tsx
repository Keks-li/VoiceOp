import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BookOpen, Settings, LogOut, User as UserIcon, LogIn, Mic, RefreshCw, Key, Sun, Moon, UserPlus, Loader2
} from 'lucide-react';
import { ThemeMode, PrimaryColor, FontFamily, FontSize, User, Course, Assignment, AssignmentSubmission } from './types';
import AccessibilityControls from './components/AccessibilityControls';
import InstructorDashboard from './components/InstructorDashboard';
import StudentDashboard from './components/StudentDashboard';
import { supabase } from './lib/supabase';
import * as db from './lib/db';

const COURSES_STORAGE_KEY = 'voiceop_elearning_courses';
const USER_STORAGE_KEY = 'voiceop_elearning_user';
const ASSIGNMENTS_STORAGE_KEY = 'voiceop_elearning_assignments';
const SUBMISSIONS_STORAGE_KEY = 'voiceop_elearning_submissions';


// Mock initial courses
const INITIAL_COURSES: Course[] = [
  {
    id: 'course_1',
    title: 'Introduction to Modern JavaScript',
    instructorName: 'Sarah Jenkins (Mock Instructor)',
    description: 'Learn the core features of modern JavaScript, from variable scopes to asynchronous API executions.',
    weeks: [
      {
        id: 'week_1_1',
        weekNumber: 1,
        title: 'Foundations of JS & Declarations',
        content: 'JavaScript is a dynamic scripting language that powers client-side web behavior. Traditionally declared with var (which has functional scope and is hoisted), modern JavaScript uses let and const. The let keyword permits block-scoped declarations that are re-assignable, whereas const specifies block-scoped constants that cannot be rebinded. It is standard best practice to use const for references that will not change, minimizing accidental state modifications.',
        quiz: [
          {
            question: 'Which declaration type is block-scoped but allows re-assignment?',
            options: ['var', 'const', 'let', 'static'],
            correctAnswerIndex: 2
          },
          {
            question: 'What is a major problem associated with functional scoping of "var"?',
            options: ['Hoisting and variable leakage', 'Block level safety', 'Syntax errors', 'CORS blocked requests'],
            correctAnswerIndex: 0
          },
          {
            question: 'Can you re-assign a reference declared with const?',
            options: ['Yes, anytime', 'No, const variables are immutable references', 'Only in strict mode', 'Only inside function blocks'],
            correctAnswerIndex: 1
          }
        ]
      },
      {
        id: 'week_1_2',
        weekNumber: 2,
        title: 'Asynchronous JavaScript & Event Loop',
        content: 'Asynchronous JavaScript lets you execute long-running operations like database fetches or network queries without freezing the main thread. JavaScript is single-threaded, operating on a single call stack. To manage asynchronous tasks, the event loop coordinates execution between the call stack, web APIs, and the callback queue. Promises act as placeholders for values that will resolve in the future. With async/await syntax, you can write asynchronous code that reads like synchronous code.',
        quiz: [
          {
            question: 'What mechanism handles asynchronous callback queues in single-threaded JS?',
            options: ['Multi-threading compiler', 'The Event Loop', 'Hoisting stack', 'Redux Store'],
            correctAnswerIndex: 1
          },
          {
            question: 'Which keywords allow writing promise resolutions like synchronous lines?',
            options: ['then / catch', 'try / throw', 'async / await', 'defer / promise'],
            correctAnswerIndex: 2
          },
          {
            question: 'What is the state of a Promise that has not completed or rejected yet?',
            options: ['fulfilled', 'settled', 'resolved', 'pending'],
            correctAnswerIndex: 3
          }
        ]
      },
      {
        id: 'week_1_3',
        weekNumber: 3,
        title: 'ES6+ Syntax & Functional Paradigms',
        content: 'ECMAScript 2015 (ES6) brought significant enhancements to JS layout design. Arrow functions provide short syntax and bind the "this" value lexically rather than dynamically. Destructuring extracts properties from objects or indices from arrays directly into variables. Rest and spread parameters (... operator) provide flexible array combinations. Functional methods like map, filter, and reduce allow clean data transformations without side effects.',
        quiz: [
          {
            question: 'How do arrow functions handle the lexical value of "this"?',
            options: ['They bind it dynamically at execution', 'They inherit it lexically from parent context', 'They reset it to null', 'They force strict mode binding'],
            correctAnswerIndex: 1
          },
          {
            question: 'Which array method is best for selecting a subset of items matching a condition?',
            options: ['map()', 'reduce()', 'filter()', 'forEach()'],
            correctAnswerIndex: 2
          },
          {
            question: 'What syntax allows unpacking properties from objects directly into variable names?',
            options: ['Arrow parsing', 'Hoisted loading', 'Object destructuring', 'Spread syntax'],
            correctAnswerIndex: 2
          }
        ]
      },
      {
        id: 'week_1_4',
        weekNumber: 4,
        title: 'DOM Scripting & Interactivity',
        content: 'The Document Object Model (DOM) is an object-oriented representation of the web page. JavaScript interacts with the DOM to read, create, and modify HTML elements dynamically. Query selectors like querySelector allow targeting elements using CSS selector paths. Event listeners register callback functions when actions occur, such as a user clicking a button or pressing a keyboard key, making web pages dynamic and interactive.',
        quiz: [
          {
            question: 'Which method adds a click callback listener to a DOM node?',
            options: ['clickEvent()', 'addEventListener()', 'attachListener()', 'triggerClick()'],
            correctAnswerIndex: 1
          },
          {
            question: 'What targets elements using standard CSS syntax selectors?',
            options: ['getElementById', 'querySelector', 'getElementsByTagName', 'findNode'],
            correctAnswerIndex: 1
          },
          {
            question: 'What does "DOM" stand for?',
            options: ['Dynamic Object Method', 'Document Object Model', 'Digital Operation Management', 'Decentralized Output Memory'],
            correctAnswerIndex: 1
          }
        ]
      }
    ]
  },
  {
    id: 'course_2',
    title: 'Artificial Intelligence Fundamentals',
    instructorName: 'Dr. Alex Rivera (Mock Instructor)',
    description: 'An overview of machine learning architectures, neural networks, natural language processing, and prompt engineering.',
    weeks: [
      {
        id: 'week_2_1',
        weekNumber: 1,
        title: 'Foundations of AI & Machine Learning',
        content: 'Artificial Intelligence simulates cognitive human intelligence in machines. Machine Learning (ML) is a subset of AI focused on building systems that learn patterns from historic datasets. Supervised learning trains a model on labelled pairs to predict outcomes (e.g. regression/classification). Unsupervised learning uncovers hidden clusters in unlabelled data. Reinforcement learning rewards agents for making optimal sequential decisions inside environments.',
        quiz: [
          {
            question: 'Which ML category uses labelled dataset pairs for model training?',
            options: ['Unsupervised Learning', 'Reinforcement Learning', 'Supervised Learning', 'Clustering Analysis'],
            correctAnswerIndex: 2
          },
          {
            question: 'What represents the core goal of Unsupervised Learning?',
            options: ['Maximize numeric rewards', 'Discover hidden structures/clusters in unlabeled data', 'Label training images', 'Build recursive loops'],
            correctAnswerIndex: 1
          },
          {
            question: 'What is Reinforcement Learning primarily based on?',
            options: ['Decision Trees', 'Trial and error with reward functions', 'Labeled image classification', 'Clustering similar texts'],
            correctAnswerIndex: 1
          }
        ]
      },
      {
        id: 'week_2_2',
        weekNumber: 2,
        title: 'Neural Networks & Deep Learning',
        content: 'Deep Learning uses artificial neural networks with multiple hidden layers. Inspired by biology, neural networks contain layers of artificial neurons (nodes). Signals pass through nodes, multiplied by weights and modified by biases. Activation functions (like ReLU or Sigmoid) introduce non-linearity, allowing networks to learn complex decision boundaries. Backpropagation utilizes gradient descent to tune weight connections and minimize prediction errors.',
        quiz: [
          {
            question: 'What mathematical function introduces non-linearity in node outputs?',
            options: ['Linear multiplier', 'Activation Function', 'Bias offset', 'Summation function'],
            correctAnswerIndex: 1
          },
          {
            question: 'Which algorithm optimizes weights by propagating loss backward?',
            options: ['Backpropagation', 'Linear Regression', 'Forward pass', 'Heuristic search'],
            correctAnswerIndex: 0
          },
          {
            question: 'Why are hidden layers critical in Deep Learning?',
            options: ['They store raw training datasets', 'They compose non-linear feature abstractions', 'They handle API connections', 'They parse user syntax'],
            correctAnswerIndex: 1
          }
        ]
      },
      {
        id: 'week_2_3',
        weekNumber: 3,
        title: 'Natural Language Processing',
        content: 'Natural Language Processing (NLP) is an AI branch that helps computers parse, understand, and generate human language. Traditional NLP relies on tokenization (splitting text into words), stemming (reducing words to roots), and vector representations. Modern NLP uses embeddings, which map words to dense vectors in high-dimensional space. Words with similar semantic meanings are grouped closer together, allowing models to grasp nuances and context.',
        quiz: [
          {
            question: 'What process splits text sentences into single word segments?',
            options: ['Stemming', 'Vector mapping', 'Tokenization', 'Chunking'],
            correctAnswerIndex: 2
          },
          {
            question: 'What is a word embedding?',
            options: ['A database record of text', 'A dense vector representing semantic meaning', 'An HTML typography label', 'A prompt instructions key'],
            correctAnswerIndex: 1
          },
          {
            question: 'Words with similar meanings will have embeddings that are:',
            options: ['At opposite ends of the space', 'Mathematically orthogonal', 'Closer together in vector space', 'Identical vectors'],
            correctAnswerIndex: 2
          }
        ]
      },
      {
        id: 'week_2_4',
        weekNumber: 4,
        title: 'Large Language Models & Transformers',
        content: 'Large Language Models (LLMs) are massive neural networks trained on vast text corpora. The Transformer architecture, introduced in 2017, forms their foundation. It utilizes a self-attention mechanism, allowing models to weigh the importance of different words in a sentence regardless of their distance. Models like Gemini generate coherent responses by predicting the next most likely token. Prompt engineering is the practice of crafting precise inputs to guide model output.',
        quiz: [
          {
            question: 'What core mechanism in Transformers analyzes word relevance over long distances?',
            options: ['Recursive pooling', 'Self-attention', 'Feedforward backprop', 'Convolution filters'],
            correctAnswerIndex: 1
          },
          {
            question: 'What is prompt engineering?',
            options: ['Writing server code', 'Configuring database schemas', 'Crafting structured inputs to optimize AI output', 'Fine-tuning neural network weights'],
            correctAnswerIndex: 2
          },
          {
            question: 'How do LLMs generate responses?',
            options: ['By querying web search engines directly', 'By predicting the next most likely token', 'By matching pre-written answers', 'By executing database joins'],
            correctAnswerIndex: 1
          }
        ]
      }
    ]
  }
];

export default function App() {
  // App settings states
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('voiceop_theme') as ThemeMode) || 'light';
  });
  const [primaryColor, setPrimaryColor] = useState<PrimaryColor>(() => {
    return (localStorage.getItem('voiceop_color') as PrimaryColor) || 'purple';
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    return (localStorage.getItem('voiceop_font') as FontFamily) || 'sans';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('voiceop_size') as FontSize) || 'medium';
  });
  const [ttsRate, setTtsRate] = useState<number>(() => {
    const saved = localStorage.getItem('voiceop_tts_rate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [ttsVoiceName, setTtsVoiceName] = useState<string>(() => {
    return localStorage.getItem('voiceop_tts_voice_name') || '';
  });

  // UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Courses Dataset
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);

  // Assignments & Submissions
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);

  // Login Form input states (Manual)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'student' | 'instructor'>('student');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign Up inputs
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [signupName, setSignupName] = useState('');

  // Listen to Supabase auth changes
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const profile = await db.fetchProfile(session.user.id);
          if (profile && active) {
            setCurrentUser({
              id: session.user.id,
              name: profile.name,
              email: session.user.email || '',
              role: profile.role,
            });
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoading(true);
        try {
          const profile = await db.fetchProfile(session.user.id);
          if (profile && active) {
            setCurrentUser({
              id: session.user.id,
              name: profile.name,
              email: session.user.email || '',
              role: profile.role,
            });
          }
        } catch (err) {
          console.error('Profile fetch error:', err);
        } finally {
          if (active) setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (active) {
          setCurrentUser(null);
          setCourses(INITIAL_COURSES);
          setAssignments([]);
          setSubmissions([]);
          setIsLoading(false);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch courses, assignments, and submissions when user logs in
  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    async function loadData() {
      try {
        const fetchedCourses = await db.fetchCourses();
        if (active) {
          // If courses database is empty, seed initial mock courses (if instructor)
          if (fetchedCourses.length === 0 && currentUser.role === 'instructor') {
            for (const course of INITIAL_COURSES) {
              await db.upsertCourse(course);
            }
            const seeded = await db.fetchCourses();
            if (active) setCourses(seeded);
          } else {
            setCourses(fetchedCourses.length > 0 ? fetchedCourses : INITIAL_COURSES);
          }
        }

        const fetchedAssignments = await db.fetchAssignments();
        if (active) setAssignments(fetchedAssignments);

        const fetchedSubmissions = await db.fetchSubmissions(currentUser.id, currentUser.role);
        if (active) setSubmissions(fetchedSubmissions);
      } catch (err) {
        console.error('Error fetching data from Supabase:', err);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [currentUser]);

  // Accessibility Desk settings application
  useEffect(() => {
    localStorage.setItem('voiceop_theme', themeMode);
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  // Apply primaryColor accent as CSS custom properties on :root
  useEffect(() => {
    localStorage.setItem('voiceop_color', primaryColor);
    const palettes: Record<string, { main: string; light: string; dark: string; text: string }> = {
      purple: { main: '#9333EA', light: '#F3E8FF', dark: '#6B21A8', text: '#7E22CE' },
      blue:   { main: '#2563EB', light: '#DBEAFE', dark: '#1D4ED8', text: '#1D4ED8' },
      green:  { main: '#059669', light: '#D1FAE5', dark: '#047857', text: '#065F46' },
      amber:  { main: '#D97706', light: '#FEF3C7', dark: '#B45309', text: '#92400E' },
    };
    const p = palettes[primaryColor];
    const root = document.documentElement;
    root.style.setProperty('--accent',       p.main);
    root.style.setProperty('--accent-light', p.light);
    root.style.setProperty('--accent-dark',  p.dark);
    root.style.setProperty('--accent-text',  p.text);
    // Also set data attribute for CSS selectors
    root.setAttribute('data-accent', primaryColor);
  }, [primaryColor]);


  useEffect(() => {
    localStorage.setItem('voiceop_font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('voiceop_size', fontSize);
    let scale = 1.0;
    if (fontSize === 'small') scale = 0.85;
    else if (fontSize === 'medium') scale = 1.0;
    else if (fontSize === 'large') scale = 1.25;
    else if (fontSize === 'xlarge') scale = 1.5;
    document.documentElement.style.setProperty('--page-font-scale', String(scale));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('voiceop_tts_rate', String(ttsRate));
  }, [ttsRate]);

  useEffect(() => {
    localStorage.setItem('voiceop_tts_voice_name', ttsVoiceName);
  }, [ttsVoiceName]);

  // Accessibility handlers
  const handleMakeSmaller = () => {
    if (fontSize === 'xlarge') setFontSize('large');
    else if (fontSize === 'large') setFontSize('medium');
    else if (fontSize === 'medium') setFontSize('small');
  };

  const handleMakeLarger = () => {
    if (fontSize === 'small') setFontSize('medium');
    else if (fontSize === 'medium') setFontSize('large');
    else if (fontSize === 'large') setFontSize('xlarge');
  };

  // Auth Operations
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Logout failed');
    }
  };

  const handleManualLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Credentials cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
        if (error) throw error;
      } else {
        // Sign Up Mode
        if (!signupName.trim()) {
          setLoginError('Name cannot be empty');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
          options: {
            data: {
              name: signupName,
              role: loginRole,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Trigger role update locally
          setCurrentUser({
            id: data.user.id,
            name: signupName,
            email: loginEmail,
            role: loginRole,
          });
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Add / Delete / Edit Course outline callbacks
  const handleAddCourse = async (newCourse: Course) => {
    try {
      await db.upsertCourse(newCourse);
      setCourses((prev) => [newCourse, ...prev]);
    } catch (err: any) {
      alert('Failed to add course: ' + err.message);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await db.deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err: any) {
      alert('Failed to delete course: ' + err.message);
    }
  };

  const handleUpdateCourse = async (updatedCourse: Course) => {
    try {
      await db.upsertCourse(updatedCourse);
      setCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));
    } catch (err: any) {
      alert('Failed to update course: ' + err.message);
    }
  };

  // ── Assignment CRUD ──────────────────────────────────────────────────────
  const handleAddAssignment = async (data: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newAssignment: Assignment = {
      ...data,
      id: `assignment_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    try {
      await db.upsertAssignment(newAssignment);
      setAssignments((prev) => [newAssignment, ...prev]);
    } catch (err: any) {
      alert('Failed to add assignment: ' + err.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await db.deleteAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      setSubmissions((prev) => prev.filter((s) => s.assignmentId !== assignmentId));
    } catch (err: any) {
      alert('Failed to delete assignment: ' + err.message);
    }
  };

  const handleStudentSubmit = async (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => {
    const newSub: AssignmentSubmission = {
      ...submission,
      id: `sub_${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    try {
      await db.insertSubmission(newSub);
      setSubmissions((prev) => [newSub, ...prev]);
    } catch (err: any) {
      alert('Failed to submit assignment: ' + err.message);
    }
  };

  const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      await db.updateGrade(submissionId, grade, feedback);
      setSubmissions((prev) =>
        prev.map((s) => s.id === submissionId ? { ...s, grade, feedback } : s)
      );
    } catch (err: any) {
      alert('Failed to grade submission: ' + err.message);
    }
  };

  // Font Family class mappings
  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  const activeFontClass = fontClasses[fontFamily];

  // Primary color borders / buttons
  const colorBorders = {
    purple: 'border-[#9333EA] focus:ring-[#9333EA]',
    blue: 'border-[#2563EB] focus:ring-[#2563EB]',
    green: 'border-[#059669] focus:ring-[#059669]',
    amber: 'border-[#FFD600] focus:ring-[#FFD600]',
  };

  const activeColorBorder = colorBorders[primaryColor];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: themeMode === 'dark' ? '#0F172A' : '#FFFBEB', color: themeMode === 'dark' ? '#F1F5F9' : '#09090B' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Initializing Classroom Studio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col antialiased transition-colors duration-300 ${activeFontClass}`}
      style={{ background: themeMode === 'dark' ? '#0F172A' : '#FFFBEB', color: themeMode === 'dark' ? '#F1F5F9' : '#09090B' }}
    >
      
      {/* Dynamic Header */}
      <header
        className="border-b-4 border-black py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30"
        style={{ backgroundColor: themeMode === 'dark' ? '#1E293B' : '#FFFFFF' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase leading-none"
                style={{ color: themeMode === 'dark' ? '#F1F5F9' : '#09090B' }}
              >
                VoiceOp Learn
              </h1>
              <span
                className="border-2 border-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] leading-none"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                AI
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
              Speech-Enabled E-Learning Studio
            </p>
          </div>
        </div>

        {/* Quick Accessibility Bar */}
        <div
          className="hidden md:flex items-center gap-3 border-2 border-black p-1.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: themeMode === 'dark' ? '#334155' : '#F8FAFC' }}
        >
          <span className="text-[9px] font-black uppercase pl-1 leading-none" style={{ color: themeMode === 'dark' ? '#94A3B8' : '#6B7280' }}>
            Text Size:
          </span>
          <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
            <button
              onClick={handleMakeSmaller}
              className="px-2 py-0.5 border-2 border-black rounded-lg text-[10px] font-black active:translate-x-0.5 active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              style={{ backgroundColor: themeMode === 'dark' ? '#1E293B' : '#fff', color: themeMode === 'dark' ? '#F1F5F9' : '#000' }}
              title="Decrease Font Size"
            >
              A-
            </button>
            <span
              className="text-[9px] font-black font-mono uppercase px-1.5 py-0.5 rounded border border-black/20"
              style={{ backgroundColor: themeMode === 'dark' ? '#0F172A' : '#E2E8F0', color: themeMode === 'dark' ? '#F1F5F9' : '#000' }}
            >
              {fontSize === 'small' ? '85%' : fontSize === 'medium' ? '100%' : fontSize === 'large' ? '125%' : '150%'}
            </span>
            <button
              onClick={handleMakeLarger}
              className="px-2 py-0.5 border-2 border-black rounded-lg text-[10px] font-black active:translate-x-0.5 active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              style={{ backgroundColor: themeMode === 'dark' ? '#1E293B' : '#fff', color: themeMode === 'dark' ? '#F1F5F9' : '#000' }}
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          <span className="text-[9px] font-black uppercase pl-1 leading-none" style={{ color: themeMode === 'dark' ? '#94A3B8' : '#6B7280' }}>
            Theme & Color:
          </span>
          <div className="flex items-center gap-1.5">
            {/* Dark / Light toggle */}
            <button
              onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              className="p-1.5 border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: themeMode === 'dark' ? '#FFD600' : '#1E293B',
                color: themeMode === 'dark' ? '#000' : '#fff'
              }}
              title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {themeMode === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Accent colour swatches */}
            {(['purple', 'blue', 'green', 'amber'] as PrimaryColor[]).map((col) => {
              const hexColors = {
                purple: '#9333EA',
                blue: '#2563EB',
                green: '#059669',
                amber: '#D97706',
              };
              const isSelected = primaryColor === col;
              return (
                <button
                  key={col}
                  onClick={() => setPrimaryColor(col)}
                  className="cursor-pointer transition-transform"
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '9999px',
                    backgroundColor: hexColors[col],
                    border: isSelected ? '3px solid #000' : '2px solid #000',
                    outline: isSelected ? '2px solid ' + hexColors[col] : 'none',
                    outlineOffset: '2px',
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={`${col} accent colour`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Accessibility desk toggle */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 border-2 border-black rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            title="Accessibility Desk"
          >
            <Settings className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* User Badge */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <div className="text-xs font-black text-black dark:text-white leading-none">
                  {currentUser.name}
                </div>
                <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 leading-none">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 border-2 border-black bg-rose-250 text-black rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-start">
        
        {currentUser ? (
          currentUser.role === 'instructor' ? (
            <InstructorDashboard
              courses={courses}
              assignments={assignments}
              submissions={submissions}
              onAddCourse={handleAddCourse}
              onDeleteCourse={handleDeleteCourse}
              onUpdateCourse={handleUpdateCourse}
              onAddAssignment={handleAddAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onGradeSubmission={handleGradeSubmission}
            />
          ) : (
            <StudentDashboard
              courses={courses}
              currentUser={currentUser}
              assignments={assignments}
              submissions={submissions}
              onSubmitAssignment={handleStudentSubmit}
            />
          )
        ) : (
          /* SIGN IN / SIGN UP SCREEN */
          <div className="max-w-md w-full mx-auto my-auto p-6 md:p-8 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6">
            
            <div className="text-center space-y-1.5">
              <span className="inline-block p-3 bg-[#FFD600] text-black border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000]">
                {authMode === 'login' ? <LogIn className="w-6 h-6 stroke-[2.5]" /> : <UserPlus className="w-6 h-6 stroke-[2.5]" />}
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                {authMode === 'login' ? 'Access Classroom Studio' : 'Create an Account'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">
                {authMode === 'login' 
                  ? 'Log in to write coursework or browse classes hands-free.' 
                  : 'Register a new student or instructor profile to begin.'}
              </p>
            </div>

            {/* Toggle Log In / Create Account buttons */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 border-2 border-black rounded-xl">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setLoginError(null); }}
                className={`py-2 text-xs font-black uppercase rounded-lg border transition-all ${
                  authMode === 'login'
                    ? 'bg-black text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-black dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setLoginError(null); }}
                className={`py-2 text-xs font-black uppercase rounded-lg border transition-all ${
                  authMode === 'signup'
                    ? 'bg-black text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-black dark:hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {/* Toggle Student / Instructor buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 border-2 border-black rounded-xl">
                <button
                  type="button"
                  onClick={() => { setLoginRole('student'); }}
                  className={`py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${
                    loginRole === 'student'
                      ? 'bg-black text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent text-gray-500 border-transparent hover:text-black dark:hover:text-white'
                  }`}
                >
                  Student Hub
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginRole('instructor'); }}
                  className={`py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${
                    loginRole === 'instructor'
                      ? 'bg-black text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent text-gray-500 border-transparent hover:text-black dark:hover:text-white'
                  }`}
                >
                  Teacher Studio
                </button>
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleManualLoginSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder={loginRole === 'student' ? 'Alex Student' : 'Sarah Jenkins'}
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="px-3.5 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder={loginRole === 'student' ? 'student@voiceop.edu' : 'instructor@voiceop.edu'}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="px-3.5 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="px-3.5 py-2.5 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs text-black dark:text-white focus:outline-none"
                  required
                />
              </div>

              {loginError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-300 text-rose-800 rounded-xl text-xs font-bold leading-relaxed">
                  {loginError}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#FFD600] text-black border-2 border-black rounded-2xl font-black uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_#000000] hover:bg-[#FEE21E] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_#000000] transition-all flex items-center justify-center gap-1.5"
                >
                  {authMode === 'login' ? 'Enter Classroom' : 'Create Account'}
                </button>

                {/* Pre-fill Quick Demo login button */}
                <button
                  type="button"
                  onClick={() => {
                    if (loginRole === 'student') {
                      setLoginEmail('student@voiceop.edu');
                      setLoginPassword('password123');
                      setSignupName('Alex Student');
                    } else {
                      setLoginEmail('instructor@voiceop.edu');
                      setLoginPassword('password123');
                      setSignupName('Sarah Jenkins');
                    }
                  }}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-black dark:text-white border-2 border-black rounded-2xl font-bold uppercase text-[10px] tracking-wide"
                >
                  Autofill Demo Credentials
                </button>
              </div>
            </form>

            <div className="text-center font-bold text-[10px] text-gray-500 border-t border-slate-150 dark:border-slate-800 pt-3 leading-relaxed">
              💡 <strong>Visibility settings:</strong> Use the display controls in the top header toolbar to adjust text sizes and color themes for better readability.
            </div>
            
          </div>
        )
        
        }

      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-6 px-6 mt-12 border-t-4 border-black text-center text-xs font-bold select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#FFD600] stroke-[2.5]" />
            <span className="font-mono text-xs tracking-wider uppercase">VoiceOp E-Learning Hub © 2026</span>
          </div>
          <p className="text-[10px] text-slate-400 max-w-sm sm:text-right leading-relaxed font-medium">
            Designed for ultimate accessibility, incorporating Speech Synthesis, Continuous Transcription, and custom interface scaling.
          </p>
        </div>
      </footer>



      {/* Shared Accessibility Sidebar drawer */}
      <AccessibilityControls
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        primaryColor={primaryColor}
        setPrimaryColor={setPrimaryColor}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        ttsRate={ttsRate}
        setTtsRate={setTtsRate}
        ttsVoiceName={ttsVoiceName}
        setTtsVoiceName={setTtsVoiceName}
      />

    </div>
  );
}
