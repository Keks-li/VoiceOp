import { supabase } from './supabase';
import { Course, Assignment, AssignmentSubmission, User } from '../types';

// --- Mappings ---

function mapDBCourseToApp(dbCourse: any): Course {
  return {
    id: dbCourse.id,
    title: dbCourse.title,
    instructorName: dbCourse.instructor_name,
    description: dbCourse.description || '',
    weeks: dbCourse.weeks || [],
  };
}

function mapAppCourseToDB(course: Course) {
  return {
    id: course.id,
    title: course.title,
    instructor_name: course.instructorName,
    description: course.description,
    weeks: course.weeks,
  };
}

function mapDBAssignmentToApp(dbAssignment: any): Assignment {
  return {
    id: dbAssignment.id,
    courseId: dbAssignment.course_id,
    title: dbAssignment.title,
    description: dbAssignment.description || '',
    dueDate: dbAssignment.due_date,
    createdAt: dbAssignment.created_at,
    maxScore: dbAssignment.max_score,
  };
}

function mapAppAssignmentToDB(assignment: Omit<Assignment, 'createdAt'> & { createdAt?: string }) {
  const dbObj: any = {
    id: assignment.id,
    course_id: assignment.courseId,
    title: assignment.title,
    description: assignment.description,
    due_date: assignment.dueDate,
    max_score: assignment.maxScore,
  };
  if (assignment.createdAt) {
    dbObj.created_at = assignment.createdAt;
  }
  return dbObj;
}

function mapDBSubmissionToApp(dbSub: any): AssignmentSubmission {
  return {
    id: dbSub.id,
    assignmentId: dbSub.assignment_id,
    courseId: dbSub.course_id,
    studentId: dbSub.student_id,
    studentName: dbSub.student_name,
    textContent: dbSub.text_content || '',
    fileDataUrl: dbSub.file_data_url,
    fileName: dbSub.file_name,
    submittedAt: dbSub.submitted_at,
    grade: dbSub.grade !== null ? dbSub.grade : undefined,
    feedback: dbSub.feedback !== null ? dbSub.feedback : undefined,
  };
}

function mapAppSubmissionToDB(sub: Omit<AssignmentSubmission, 'submittedAt'> & { submittedAt?: string }) {
  const dbObj: any = {
    id: sub.id,
    assignment_id: sub.assignmentId,
    course_id: sub.courseId,
    student_id: sub.studentId,
    student_name: sub.studentName,
    text_content: sub.textContent,
    file_data_url: sub.fileDataUrl,
    file_name: sub.fileName,
    grade: sub.grade,
    feedback: sub.feedback,
  };
  if (sub.submittedAt) {
    dbObj.submitted_at = sub.submittedAt;
  }
  return dbObj;
}

// --- Courses ---

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBCourseToApp);
}

export async function upsertCourse(course: Course): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .upsert(mapAppCourseToDB(course));

  if (error) throw error;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw error;
}

// --- Assignments ---

export async function fetchAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBAssignmentToApp);
}

export async function upsertAssignment(assignment: Assignment): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .upsert(mapAppAssignmentToDB(assignment));

  if (error) throw error;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}

// --- Submissions ---

export async function fetchSubmissions(userId: string, role: 'student' | 'instructor'): Promise<AssignmentSubmission[]> {
  let query = supabase.from('submissions').select('*');

  if (role === 'student') {
    query = query.eq('student_id', userId);
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBSubmissionToApp);
}

export async function insertSubmission(sub: AssignmentSubmission): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .insert(mapAppSubmissionToDB(sub));

  if (error) throw error;
}

export async function updateGrade(submissionId: string, grade: number, feedback: string): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .update({ grade, feedback })
    .eq('id', submissionId);

  if (error) throw error;
}

// --- Profiles / Users ---

export async function fetchProfile(userId: string): Promise<Omit<User, 'email'> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null;
    }
    throw error;
  }
  return data ? {
    id: data.id,
    name: data.name,
    role: data.role as 'student' | 'instructor'
  } : null;
}

export async function upsertProfile(userId: string, name: string, role: 'student' | 'instructor'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, name, role });

  if (error) throw error;
}
