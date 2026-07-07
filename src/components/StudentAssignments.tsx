import React, { useState, useRef } from 'react';
import {
  ClipboardList, Upload, Mic, MicOff, Send, CheckCircle2,
  Clock, FileText, X, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Assignment, AssignmentSubmission, Course, User, ParsedVoiceCommand } from '../types';

interface StudentAssignmentsProps {
  courses: Course[];
  currentUser: User;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  voiceCommand: ParsedVoiceCommand | null;
  onSubmit: (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => void;
}

export default function StudentAssignments({
  courses,
  currentUser,
  assignments,
  submissions,
  voiceCommand,
  onSubmit,
}: StudentAssignmentsProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id ?? '');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState<Record<string, string>>({});
  const [fileData, setFileData] = useState<Record<string, { name: string; dataUrl: string }>>({});
  const [isVoicing, setIsVoicing] = useState<string | null>(null); // assignment id currently voice-recording
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Filter assignments for the selected course
  const courseAssignments = assignments.filter((a) => a.courseId === selectedCourseId);

  // Check if student already submitted for an assignment
  const getSubmission = (assignmentId: string) =>
    submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === currentUser.id
    );

  // ── Voice dictation ──────────────────────────────────────────────────────
  const startVoice = (assignmentId: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTextDraft((prev) => ({
        ...prev,
        [assignmentId]: (prev[assignmentId] ?? '') + ' ' + transcript,
      }));
    };
    recognition.onerror = () => stopVoice();
    recognition.onend = () => setIsVoicing(null);
    recognition.start();
    recognitionRef.current = recognition;
    setIsVoicing(assignmentId);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsVoicing(null);
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileChange = (assignmentId: string, file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileData((prev) => ({
        ...prev,
        [assignmentId]: { name: file.name, dataUrl: reader.result as string },
      }));
    };
    reader.readAsDataURL(file);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = (assignment: Assignment) => {
    const text = textDraft[assignment.id]?.trim() ?? '';
    const file = fileData[assignment.id];

    if (!text && !file) {
      alert('Please write a response or upload a PDF before submitting.');
      return;
    }

    onSubmit({
      assignmentId: assignment.id,
      courseId: assignment.courseId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      textContent: text,
      fileDataUrl: file?.dataUrl,
      fileName: file?.name,
    });

    // Clear draft
    setTextDraft((prev) => { const n = { ...prev }; delete n[assignment.id]; return n; });
    setFileData((prev) => { const n = { ...prev }; delete n[assignment.id]; return n; });
    setExpandedId(null);
    setSubmitSuccess(assignment.id);
    setTimeout(() => setSubmitSuccess(null), 4000);
  };

  React.useEffect(() => {
    if (!voiceCommand) return;
    const { command } = voiceCommand;
    if (command === 'assignment:submit' && expandedId) {
      const activeAssignment = assignments.find(a => a.id === expandedId);
      if (activeAssignment) {
        handleSubmit(activeAssignment);
      }
    }
  }, [voiceCommand]);

  const isDue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-2xl font-black uppercase text-black dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 stroke-[2.5]" style={{ color: 'var(--accent)' }} />
            My Assignments
          </h2>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
            Submit your work via written response or PDF upload. Voice dictation is supported.
          </p>
        </div>

        {/* Course Selector */}
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white text-xs font-bold focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Success toast */}
      {submitSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-800 font-bold text-sm animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          Assignment submitted successfully! Your instructor will review it.
        </div>
      )}

      {/* Assignment list */}
      {courseAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-3" />
          <h3 className="text-sm font-black uppercase text-black dark:text-white">No Assignments Yet</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Your instructor hasn't posted any assignments for this course.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courseAssignments.map((assignment) => {
            const existing = getSubmission(assignment.id);
            const overdue = isDue(assignment.dueDate);
            const isOpen = expandedId === assignment.id;

            return (
              <div
                key={assignment.id}
                className="bg-white dark:bg-slate-900 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
              >
                {/* Assignment card header */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : assignment.id)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-xl border-2 border-black flex-shrink-0"
                      style={{ backgroundColor: existing ? '#D1FAE5' : 'var(--accent-light, #F3E8FF)' }}
                    >
                      {existing
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                        : <FileText className="w-5 h-5 stroke-[2.5]" style={{ color: 'var(--accent)' }} />
                      }
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-black dark:text-white">{assignment.title}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          overdue
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}>
                          <Clock className="w-2.5 h-2.5" />
                          Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {overdue && ' (Overdue)'}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Max: {assignment.maxScore} pts</span>
                        {existing && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Submitted
                          </span>
                        )}
                        {existing?.grade !== undefined && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                            Grade: {existing.grade}/{assignment.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="border-t-2 border-dashed border-black p-5 space-y-5">

                    {/* Description */}
                    <div className="p-4 rounded-2xl border-2 border-black" style={{ backgroundColor: 'var(--accent-light, #F3E8FF)' }}>
                      <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--accent-text)' }}>Assignment Brief</p>
                      <p className="text-sm font-bold text-black dark:text-slate-800 leading-relaxed">{assignment.description}</p>
                    </div>

                    {/* Already submitted view */}
                    {existing ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-2">
                          <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Your Submission</p>
                          {existing.textContent && (
                            <p className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{existing.textContent}</p>
                          )}
                          {existing.fileName && (
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                              <FileText className="w-4 h-4" /> {existing.fileName}
                            </div>
                          )}
                          <p className="text-[9px] text-emerald-600 font-black">
                            Submitted: {new Date(existing.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        {existing.feedback && (
                          <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-2xl space-y-1">
                            <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Instructor Feedback</p>
                            <p className="text-xs font-bold text-blue-900 leading-relaxed">{existing.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Submission form */
                      <div className="space-y-4">

                        {/* Text response */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                              Written Response
                            </label>
                            {/* Voice toggle */}
                            <button
                              type="button"
                              onClick={() => isVoicing === assignment.id ? stopVoice() : startVoice(assignment.id)}
                              className={`flex items-center gap-1.5 px-3 py-1 border-2 border-black rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                                isVoicing === assignment.id
                                  ? 'bg-rose-400 text-white animate-pulse'
                                  : 'bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-amber-50'
                              }`}
                            >
                              {isVoicing === assignment.id
                                ? <><MicOff className="w-3 h-3" /> Stop Voice</>
                                : <><Mic className="w-3 h-3" /> Voice Dictate</>
                              }
                            </button>
                          </div>
                          <textarea
                            rows={6}
                            placeholder="Type your assignment response here, or click 'Voice Dictate' to speak your answer..."
                            value={textDraft[assignment.id] ?? ''}
                            onChange={(e) =>
                              setTextDraft((prev) => ({ ...prev, [assignment.id]: e.target.value }))
                            }
                            className="w-full px-4 py-3 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none focus:ring-2 leading-relaxed"
                            style={{ '--tw-ring-color': 'var(--accent)' } as any}
                          />
                        </div>

                        {/* PDF Upload */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            Attach PDF (Optional)
                          </label>
                          <div
                            className="relative border-2 border-dashed border-black rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-solid"
                            style={{ backgroundColor: fileData[assignment.id] ? 'var(--accent-light, #F3E8FF)' : '#F8FAFC' }}
                            onClick={() => fileInputRefs.current[assignment.id]?.click()}
                          >
                            <input
                              ref={(el) => { fileInputRefs.current[assignment.id] = el; }}
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => handleFileChange(assignment.id, e.target.files?.[0] ?? null)}
                            />
                            {fileData[assignment.id] ? (
                              <div className="flex items-center justify-center gap-3">
                                <FileText className="w-6 h-6 text-emerald-600" />
                                <div className="text-left">
                                  <p className="text-xs font-black text-black">{fileData[assignment.id].name}</p>
                                  <p className="text-[9px] text-gray-500">PDF ready to submit</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFileData((prev) => { const n = { ...prev }; delete n[assignment.id]; return n; });
                                  }}
                                  className="ml-auto p-1 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-slate-400" />
                                <p className="text-xs font-black text-black dark:text-white">Click to upload PDF</p>
                                <p className="text-[9px] text-gray-400">Max 10 MB · PDF only</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Submit button */}
                        <button
                          type="button"
                          onClick={() => handleSubmit(assignment)}
                          disabled={!textDraft[assignment.id]?.trim() && !fileData[assignment.id]}
                          className="w-full py-3 px-4 border-2 border-black rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed text-white"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          <Send className="w-4 h-4 stroke-[2.5]" />
                          Submit Assignment
                        </button>

                        {overdue && (
                          <div className="flex items-center gap-2 text-[10px] font-black text-rose-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            This assignment is past its due date. You can still submit, but it will be marked late.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
