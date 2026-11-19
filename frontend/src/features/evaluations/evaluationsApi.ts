import { api } from '../../shared/api';
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
  status?:string;
  appreciation?:Record<string,string>|null;
};

export type EvaluationDetail = EvaluationSummary & {
  kind:string;
  history?:Array<{attempt:number;status:string;reason:string|null}>;
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

export function listEvaluations() {
  return request<EvaluationSummary[]>('/evaluations');
}

export function getEvaluation(id: string) {
  return request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}`);
}

export function saveGrades(id: string, version:number, grades: { enrollmentId: string; score: string | null }[]) {
  return request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}/grades`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grades,version }),
  });
}

export function submitEvaluation(id: string,version:number) {
  return request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}/submission`, { method: 'POST',body:JSON.stringify({version}) });
}

async function request<T>(path:string,init?:RequestInit):Promise<T> {
 try{return await api<T>(path,init);}catch(error){const e=error as {status?:number;message:string;details?:{errors?:GradeError[]}};throw new ApiError(e.status??0,e.message,e.details?.errors??[]);}
}
