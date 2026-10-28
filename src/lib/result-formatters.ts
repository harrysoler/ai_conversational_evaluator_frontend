import type { StudentAttempt } from '../types';

export function formatAttemptStatus(status: StudentAttempt['status']) {
  if (status === 'in_progress') return 'En progreso';
  if (status === 'completed') return 'Completado';
  return 'Cancelado';
}

export function getResultScoreLabel(result: {
  finalScore: number | null;
  evaluationStatus: 'completed' | 'failed' | null;
}) {
  if (result.finalScore !== null) return `Nota ${result.finalScore}`;
  if (result.evaluationStatus === 'failed') return 'Evaluación fallida';
  return 'Nota pendiente';
}

export function getResultScoreValue(result: {
  finalScore: number | null;
  teacherOverrideGrade?: number | null;
  evaluationStatus: 'completed' | 'failed' | null;
}) {
  if (result.teacherOverrideGrade !== undefined && result.teacherOverrideGrade !== null) {
    return result.teacherOverrideGrade;
  }

  if (result.finalScore !== null) return result.finalScore;
  if (result.evaluationStatus === 'failed') return 'Fallida';
  return 'Pendiente';
}

export function formatDateTime(value: string | null) {
  if (!value) return 'hora no disponible';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'hora no disponible';

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getStudentAttemptNumbers(attempts: StudentAttempt[]) {
  const orderedAttempts = [...attempts].sort(
    (firstAttempt, secondAttempt) => getDateTimeValue(firstAttempt.startedAt) - getDateTimeValue(secondAttempt.startedAt),
  );
  const liveTalkCounts = new Map<string, number>();
  const attemptNumbers = new Map<string, string>();

  for (const attempt of orderedAttempts) {
    const nextCount = (liveTalkCounts.get(attempt.liveTalkId) ?? 0) + 1;
    liveTalkCounts.set(attempt.liveTalkId, nextCount);
    attemptNumbers.set(attempt.id, `Intento ${nextCount}`);
  }

  return attemptNumbers;
}

function getDateTimeValue(value: string | null) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function formatAverageScore(attempts: StudentAttempt[]) {
  const scoredAttempts = attempts.filter((attempt) => attempt.finalScore !== null);
  if (scoredAttempts.length === 0) return '-';

  const total = scoredAttempts.reduce((sum, attempt) => sum + (attempt.finalScore ?? 0), 0);
  return (total / scoredAttempts.length).toFixed(2);
}
