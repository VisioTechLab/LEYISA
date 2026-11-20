import { api as request } from '../../shared/api';

export type Reviewer = { id: string; label: string };
export type Period = { id: string; code: string; label: string };
export type SubmittedGrade = { matricule: string; student: string; score: string | number | null; status?: string; appreciation?: { QTE: string; QLT: string; COUL: string; observation?: string } | null };
export type Submission = {
  id: string; attempt: number; status: string; submittedAt: string; reason: string | null;
  evaluation: { id: string; title: string; maxScore: string; kind?: string };
  subject: string; schoolClass: { id: string; label: string }; period: { id: string; label: string };
  author: { id: string; label: string };
};
export type ClassPeriod = {
  id: string; classId?: string; classCode?: string; yearCode?: string; classLabel: string; periodLabel: string; status: 'OPEN' | 'CLOSED' | 'PUBLISHED';
  evaluationCount: number; resultCount: number;
};

export const resultsApi = {
  bootstrap: () => request<{ periods: Period[] }>('/results/bootstrap'),
  submissions: (periodId?: string) => request<Submission[]>(`/results/submissions${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}`),
  detail: (id: string) => request<Submission & { grades: SubmittedGrade[] }>(`/results/submissions/${id}`),
  decide: (id: string, action: 'approve' | 'reject', reason?: string) => request<Submission>(`/results/submissions/${id}/${action}`, {
    method: 'POST', body: JSON.stringify(action === 'reject' ? { reason } : {}),
  }),
  classPeriods: (periodId?: string) => request<ClassPeriod[]>(`/results/class-periods${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}`),
  preview: (id: string) => request<Preview>(`/results/class-periods/${id}/preview`),
  close: (id: string) => request<{ status: string; snapshotsCreated: number }>(`/results/class-periods/${id}/close`, { method: 'POST', body: JSON.stringify({ confirmed:true }) }),
  publish: (id:string)=>request(`/results/class-periods/${id}/publish`,{method:'POST',body:'{}'}),
  finalResults: (id: string) => request<FinalResults>(`/results/class-periods/${id}/final-results`),
};

export type Preview = {
  classPeriod: { id: string; classId?: string; classCode?: string; yearCode?: string; classLabel: string; periodLabel: string; status: string };
  readyToClose: boolean; problems: string[];
  students: Array<{ id?:string;identity: { matricule?: string; firstName?: string; lastName?: string }; subjectResults: Array<{ label: string; earned: number | null; maximum: number }>; totalEarned: number; totalMaximum: number }>;
};
export type FinalResults = { classPeriod: { id: string; classId?: string; classCode?: string; yearCode?: string; classLabel: string; periodLabel: string; status: string }; students: Preview['students'] };
