/** Accès à l'API NestJS du module évaluations. Aucune donnée n'est simulée ici. */

export type EvaluationState = 'DRAFT' | 'SUBMITTED' | 'REJECTED' | 'VALIDATED';

export type EvaluationSummary = {
  id: string;
  title: string;
  heldOn: string;
  maxScore: string;
  state: EvaluationState;
  version: number;
  editable: boolean;
  schoolClass: { id: string; code: string; label: string };
  subject: { code: string; label: string };
  period: { code: string; label: string; closed: boolean };
  teacher: { firstName: string; lastName: string };
  gradeCount?: number;
};

export type GradeRow = {
  enrollmentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  score: string | null;
};

export type EvaluationDetail = EvaluationSummary & {
  grades: GradeRow[];
  lastSubmission: {
    attempt: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    submittedAt: string;
    decidedAt: string | null;
    reason: string | null;
  } | null;
};

export type GradeError = { enrollmentId: string | null; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly errors: GradeError[];

  constructor(status: number, message: string, errors: GradeError[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// En développement, Vite relaie /api vers le backend local (voir vite.config.ts).
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'Le serveur est injoignable. Vérifiez que le backend est démarré.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const details = (body ?? {}) as { message?: unknown; errors?: unknown };
    const message = typeof details.message === 'string' ? details.message : `Le serveur a répondu ${response.status}.`;
    throw new ApiError(response.status, message, Array.isArray(details.errors) ? details.errors as GradeError[] : []);
  }
  return body as T;
}

export function listEvaluations() {
  return request<EvaluationSummary[]>('/evaluations');
}

export function getEvaluation(id: string) {
  return request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}`);
}

export function saveGrades(id: string, grades: { enrollmentId: string; score: string | null }[]) {
  return request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}/grades`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grades }),
  });
}

export function submitEvaluation(id: string) {
  return request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}/submission`, { method: 'POST' });
}
