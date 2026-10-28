import type { RealtimeToken } from '@tanstack/ai';

export type AppRole = "admin" | "docente" | "estudiante";
export type AdminSection = "usuarios" | "programas" | "espacios" | "asignaciones" | "historico";
export type PageMetadata = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export const ADMIN_PAGE_SIZE = 25;
export const EMPTY_PAGE: PageMetadata = { page: 1, pageSize: ADMIN_PAGE_SIZE, totalItems: 0, totalPages: 1 };

export type ProgramOption = { id: string; name: string };
export type SearchOption = { id: string; label: string };
export type AdminUserFilters = { search: string; role: string; active: string };
export type AdminCatalogFilters = { search: string; active: string };
export type AdminSpaceFilters = AdminCatalogFilters & { programId: string };
export type AdminAssignmentFilters = { search: string; programId: string; spaceId: string; relation: string };

export type AppUser = {
  id: string;
  name: string;
  email: string;
  profile: {
    role: AppRole;
    documentNumber: string | null;
    institutionalCode: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
  } | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole | null;
  documentNumber: string | null;
  institutionalCode: string | null;
  isActive: boolean;
};

export type AcademicProgram = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type AcademicSpace = {
  id: string;
  programId: string;
  programName: string;
  code: string;
  name: string;
  description: string | null;
  credits: number | null;
  semester: number | null;
  isActive: boolean;
};

export type AdminSummary = {
  users: number;
  programs: number;
  spaces: number;
  assignments: number;
};

export type AdminAssignment = {
  id: string;
  scope: "program" | "academic_space";
  relation: "student" | "teacher";
  targetId: string;
  targetName: string;
  userId: string;
  userName: string;
  userEmail: string;
};

export type AdminResultAttempt = {
  id: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  teacherUserId: string;
  teacherName: string;
  programId: string;
  programName: string;
  academicSpaceId: string;
  academicSpaceName: string;
  liveTalkId: string;
  liveTalkTitle: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  finalScore: number | null;
  evaluationStatus: "completed" | "failed" | null;
  evaluationError: string | null;
  evaluationId: string | null;
  teacherReviewed: boolean;
  teacherOverrideGrade: number | null;
};

export type AdminResultMetrics = {
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  cancelledAttempts: number;
  evaluatedAttempts: number;
  reviewedAttempts: number;
  overrideAttempts: number;
  averageScore: number | null;
  byProgram: Array<{
    id: string;
    name: string;
    attemptsCount: number;
    averageScore: number | null;
  }>;
  bySpace: Array<{
    id: string;
    name: string;
    attemptsCount: number;
    averageScore: number | null;
  }>;
};

export type ConfirmationState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
} | null;

export type TeacherAcademicSpace = {
  id: string;
  code: string;
  name: string;
  programId: string;
  programName: string;
  studentsCount: number;
};

export type LiveTalkStatus = "draft" | "active" | "closed";

export type TeacherLiveTalk = {
  id: string;
  academicSpaceId: string;
  academicSpaceName: string;
  title: string;
  generalTopic: string;
  status: LiveTalkStatus;
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  topics: string[];
};

export type TeacherResultAttempt = {
  id: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  finalScore: number | null;
  evaluationStatus: "completed" | "failed" | null;
  evaluationError: string | null;
  evaluationId: string | null;
  teacherReviewed: boolean;
  teacherOverrideGrade: number | null;
};

export type StudentLiveTalk = {
  id: string;
  academicSpaceId: string;
  academicSpaceName: string;
  programName: string;
  title: string;
  generalTopic: string;
  status: "active";
  opensAt: string | null;
  closesAt: string | null;
  topics: string[];
};

export type StudentAttempt = {
  id: string;
  liveTalkId: string;
  liveTalkTitle: string;
  academicSpaceName: string;
  programName: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  finalScore: number | null;
  evaluationStatus: "completed" | "failed" | null;
  evaluationError: string | null;
  feedbackSummary: string | null;
};

export type StudentAttemptDetail = StudentAttempt & {
  generalTopic: string;
  evaluationId: string | null;
  rubricVersion: string | null;
  evaluatorModel: string | null;
  evaluatorModelVersion: string | null;
  teacherReviewed: boolean;
  teacherOverrideGrade: number | null;
  teacherOverrideReason: string | null;
  feedback: {
    summary: string;
    strengths: string | null;
    improvementOpportunities: string | null;
    recommendations: string | null;
  } | null;
  rubricItems: Array<{
    id: string;
    topic: string | null;
    score: number;
    maxScore: number;
    performanceLevel: string;
    evidence: Array<{
      turn_id: number;
      fragment: string;
    }>;
    justification: string;
  }>;
  transcript: Array<{
    turnId: number;
    speaker: "student" | "evaluator";
    text: string;
    occurredAt: string | null;
    sourceMessageId: string | null;
  }>;
};

export type TeacherAttemptDetail = {
  id: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  liveTalkId: string;
  liveTalkTitle: string;
  generalTopic: string;
  academicSpaceName: string;
  programName: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  finalScore: number | null;
  evaluationStatus: "completed" | "failed" | null;
  evaluationError: string | null;
  evaluationId: string | null;
  rubricVersion: string | null;
  evaluatorModel: string | null;
  evaluatorModelVersion: string | null;
  teacherReviewed: boolean;
  teacherOverrideGrade: number | null;
  teacherOverrideReason: string | null;
  feedback: {
    summary: string;
    strengths: string | null;
    improvementOpportunities: string | null;
    recommendations: string | null;
  } | null;
  rubricItems: StudentAttemptDetail["rubricItems"];
  transcript: StudentAttemptDetail["transcript"];
};

export type AdminAttemptDetail = AdminResultAttempt & {
  generalTopic: string;
  rubricVersion: string | null;
  evaluatorModel: string | null;
  evaluatorModelVersion: string | null;
  teacherOverrideReason: string | null;
  feedback: {
    summary: string;
    strengths: string | null;
    improvementOpportunities: string | null;
    recommendations: string | null;
  } | null;
  rubricItems: StudentAttemptDetail["rubricItems"];
  transcript: StudentAttemptDetail["transcript"];
};

export type ConversationToken = RealtimeToken & {
  attemptId: string;
};
