import { supabase } from './supabase';
import { Course, Assignment, AssignmentSubmission, User, Enrollment } from '../types';


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

export interface StudentWithCourses {
  id: string;
  name: string;
  email?: string;
  enrolledCourseIds: string[];
  submissionCount: number;
}

/**
 * Fetches all student profiles plus a derived list of the course IDs
 * they have submitted assignments for (used as a proxy for enrollment).
 */
export async function fetchAllStudents(): Promise<StudentWithCourses[]> {
  // Fetch all profiles with role=student
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('role', 'student');

  if (profilesError) throw profilesError;
  if (!profiles || profiles.length === 0) return [];

  // Fetch all submissions so we can derive which courses each student engaged with
  const { data: subs, error: subsError } = await supabase
    .from('submissions')
    .select('student_id, course_id');

  if (subsError) throw subsError;

  const subsByCourse = (subs || []).reduce<Record<string, Set<string>>>((acc, sub) => {
    if (!acc[sub.student_id]) acc[sub.student_id] = new Set();
    acc[sub.student_id].add(sub.course_id);
    return acc;
  }, {});

  return profiles.map((p) => {
    const courseSet = subsByCourse[p.id] || new Set<string>();
    return {
      id: p.id,
      name: p.name,
      enrolledCourseIds: Array.from(courseSet),
      submissionCount: (subs || []).filter(s => s.student_id === p.id).length,
    };
  });
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

function mapDBEnrollmentToApp(row: any): Enrollment {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    studentName: row.student_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Student requests enrollment in a course (inserts pending row). */
export async function requestEnrollment(
  studentId: string,
  courseId: string,
  studentName: string
): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert(
      { student_id: studentId, course_id: courseId, student_name: studentName, status: 'pending' },
      { onConflict: 'student_id,course_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return mapDBEnrollmentToApp(data);
}

/** Returns all enrollments for a specific student. */
export async function fetchMyEnrollments(studentId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBEnrollmentToApp);
}

/** Returns ALL enrollments across all students (instructor view). */
export async function fetchAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBEnrollmentToApp);
}

/** Bulk update enrollment status (approve or reject). */
export async function updateEnrollmentStatus(
  ids: string[],
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('enrollments')
    .update({ status })
    .in('id', ids);

  if (error) throw error;
}
