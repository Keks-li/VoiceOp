import React, { useState } from 'react';
import {
  ClipboardList, Plus, Trash2, Eye, CheckCircle2, Clock,
  FileText, ChevronDown, ChevronUp, Star, MessageSquare, AlertCircle
} from 'lucide-react';
import { Assignment, AssignmentSubmission, Course } from '../types';

interface InstructorAssignmentsProps {
  courses: Course[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
}

type PanelView = 'list' | 'create' | 'submissions';

export default function InstructorAssignments({
  courses,
  assignments,
  submissions,
  onAddAssignment,
  onDeleteAssignment,
  onGradeSubmission,
}: InstructorAssignmentsProps) {
  const [view, setView] = useState<PanelView>('list');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id ?? '');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Grade form state (per submission)
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { grade: string; feedback: string }>>({});

  const courseAssignments = assignments.filter((a) => a.courseId === selectedCourseId);
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const assignmentSubmissions = submissions.filter((s) => s.assignmentId === selectedAssignmentId);

  // ── Create assignment ─────────────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setCreateError('Title is required.'); return; }
    if (!form.dueDate) { setCreateError('Due date is required.'); return; }
    if (!selectedCourseId) { setCreateError('Select a course first.'); return; }
    setCreateError(null);
    onAddAssignment({
      courseId: selectedCourseId,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate,
      maxScore: form.maxScore,
    });
    setForm({ title: '', description: '', dueDate: '', maxScore: 100 });
    setView('list');
  };

  // ── Grade a submission ────────────────────────────────────────────────────
  const handleGrade = (submissionId: string, maxScore: number) => {
    const draft = gradeDrafts[submissionId];
    const gradeNum = parseFloat(draft?.grade ?? '');
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > maxScore) {
      alert(`Grade must be between 0 and ${maxScore}.`);
      return;
    }
    onGradeSubmission(submissionId, gradeNum, draft?.feedback ?? '');
    setExpandedSubmissionId(null);
  };

  const isDue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-2xl font-black uppercase text-black dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 stroke-[2.5]" style={{ color: 'var(--accent)' }} />
            Assignments Manager
          </h2>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
            Create assignments, set deadlines, review student submissions and provide grades.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Course filter */}
          <select
            value={selectedCourseId}
            onChange={(e) => { setSelectedCourseId(e.target.value); setView('list'); setSelectedAssignmentId(null); }}
            className="px-3 py-2 border-2 border-black rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white text-xs font-bold focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* Tab buttons */}
          {(['list', 'create'] as PanelView[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setSelectedAssignmentId(null); }}
              className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                view === v ? 'text-black' : 'bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-50'
              }`}
              style={view === v ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: '#000' } : {}}
            >
              {v === 'list' ? '📋 All Assignments' : '+ New Assignment'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CREATE VIEW ───────────────────────────────────────────────────── */}
      {view === 'create' && (
        <div className="bg-white dark:bg-slate-900 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
          <h3 className="text-lg font-black uppercase text-black dark:text-white border-b-2 border-dashed border-black pb-3">
            Create New Assignment
          </h3>
          {createError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Assignment Title *</label>
              <input
                type="text"
                placeholder="e.g. Week 2 Reflection Essay"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="px-4 py-3 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Assignment Brief / Instructions *</label>
              <textarea
                rows={4}
                placeholder="Describe what students need to do, any references they should use, and the format expected..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="px-4 py-3 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Due Date *</label>
                <input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="px-4 py-3 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Maximum Score</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.maxScore}
                  onChange={(e) => setForm({ ...form, maxScore: parseInt(e.target.value) || 100 })}
                  className="px-4 py-3 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-5 py-2.5 border-2 border-black rounded-xl text-xs font-black uppercase bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-5 border-2 border-black rounded-xl font-black uppercase text-xs text-white flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Publish Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && !selectedAssignmentId && (
        <>
          {courseAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-3" />
              <h3 className="text-sm font-black uppercase text-black dark:text-white">No Assignments for This Course</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-4">Create an assignment using the button above.</p>
              <button
                onClick={() => setView('create')}
                className="px-5 py-2.5 border-2 border-black rounded-xl font-black uppercase text-xs text-white shadow-[3px_3px_0px_0px_#000]"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                + New Assignment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {courseAssignments.map((assignment) => {
                const subCount = submissions.filter((s) => s.assignmentId === assignment.id).length;
                const overdue = isDue(assignment.dueDate);
                return (
                  <div key={assignment.id} className="bg-white dark:bg-slate-900 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-2.5 rounded-xl border-2 border-black flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent-light, #F3E8FF)' }}
                      >
                        <ClipboardList className="w-5 h-5 stroke-[2]" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black uppercase text-black dark:text-white">{assignment.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-0.5 line-clamp-2">{assignment.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            overdue ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                          }`}>
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(assignment.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-black text-slate-400">Max: {assignment.maxScore} pts</span>
                          <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300">
                            {subCount} submission{subCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => { setSelectedAssignmentId(assignment.id); setView('submissions'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl text-[10px] font-black uppercase bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Submissions
                        </button>
                        <button
                          onClick={() => onDeleteAssignment(assignment.id)}
                          className="p-1.5 border-2 border-black rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          title="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── SUBMISSIONS VIEW ──────────────────────────────────────────────── */}
      {view === 'submissions' && selectedAssignment && (
        <div className="space-y-4">
          {/* Back + header */}
          <div className="bg-white dark:bg-slate-900 border-4 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => { setView('list'); setSelectedAssignmentId(null); }}
              className="text-[10px] font-black uppercase text-gray-500 hover:text-black flex items-center gap-1 mb-3"
            >
              ← Back to Assignments
            </button>
            <h3 className="text-lg font-black uppercase text-black dark:text-white">{selectedAssignment.title}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-0.5">{selectedAssignment.description}</p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 text-slate-600">
                {assignmentSubmissions.length} / ? Submitted
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                Max Score: {selectedAssignment.maxScore} pts
              </span>
            </div>
          </div>

          {assignmentSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border-4 border-black rounded-3xl">
              <FileText className="w-10 h-10 text-slate-300 stroke-[1.5] mb-3" />
              <p className="text-sm font-black uppercase text-slate-400">No submissions yet</p>
            </div>
          ) : (
            assignmentSubmissions.map((sub) => {
              const isExpanded = expandedSubmissionId === sub.id;
              const draft = gradeDrafts[sub.id] ?? { grade: String(sub.grade ?? ''), feedback: sub.feedback ?? '' };
              return (
                <div key={sub.id} className="bg-white dark:bg-slate-900 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <button
                    onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-black text-white text-sm"
                        style={{ backgroundColor: 'var(--accent)' }}>
                        {sub.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-black dark:text-white">{sub.studentName}</p>
                        <p className="text-[9px] text-slate-400 font-bold">
                          {new Date(sub.submittedAt).toLocaleString()}
                          {sub.grade !== undefined && ` · Grade: ${sub.grade}/${selectedAssignment.maxScore}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.grade !== undefined ? (
                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Graded
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                          Needs Review
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t-2 border-dashed border-black p-5 space-y-4">
                      {/* Text response */}
                      {sub.textContent && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Written Response</p>
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-black rounded-xl">
                            <p className="text-xs font-bold text-black dark:text-white leading-relaxed whitespace-pre-wrap">{sub.textContent}</p>
                          </div>
                        </div>
                      )}
                      {/* PDF */}
                      {sub.fileDataUrl && sub.fileName && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">PDF Attachment</p>
                          <a
                            href={sub.fileDataUrl}
                            download={sub.fileName}
                            className="flex items-center gap-2.5 p-3 bg-blue-50 border-2 border-blue-400 rounded-xl text-blue-700 text-xs font-black hover:bg-blue-100 transition-all"
                          >
                            <FileText className="w-5 h-5" />
                            {sub.fileName}
                            <span className="ml-auto text-[9px] uppercase">Download</span>
                          </a>
                        </div>
                      )}

                      {/* Grade & Feedback */}
                      <div className="space-y-3 border-t border-dashed border-slate-200 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>
                          <Star className="w-3 h-3 inline mr-1" />Grade & Feedback
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-gray-400">Score (0–{selectedAssignment.maxScore})</label>
                            <input
                              type="number"
                              min={0}
                              max={selectedAssignment.maxScore}
                              value={draft.grade}
                              onChange={(e) => setGradeDrafts((prev) => ({ ...prev, [sub.id]: { ...draft, grade: e.target.value } }))}
                              className="px-3 py-2 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-gray-400">
                            <MessageSquare className="w-3 h-3 inline mr-1" />Instructor Feedback
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Write constructive feedback for the student..."
                            value={draft.feedback}
                            onChange={(e) => setGradeDrafts((prev) => ({ ...prev, [sub.id]: { ...draft, feedback: e.target.value } }))}
                            className="px-3 py-2 border-2 border-black rounded-xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white text-xs font-bold focus:outline-none leading-relaxed"
                          />
                        </div>
                        <button
                          onClick={() => handleGrade(sub.id, selectedAssignment.maxScore)}
                          className="px-5 py-2.5 border-2 border-black rounded-xl font-black uppercase text-xs text-white flex items-center gap-2 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          {sub.grade !== undefined ? 'Update Grade' : 'Submit Grade'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
