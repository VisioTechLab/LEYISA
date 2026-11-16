const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

export type Reviewer = { id: string; label: string };
export type Period = { id: string; code: string; label: string };
export type Submission = {
  id: string; attempt: number; status: string; submittedAt: string; reason: string | null;
  evaluation: { id: string; title: string; maxScore: string };
  subject: string; schoolClass: { id: string; label: string }; period: { id: string; label: string };
  author: { id: string; label: string };
};
export type ClassPeriod = {
  id: string; classLabel: string; periodLabel: string; status: 'OPEN' | 'CLOSED';
  evaluationCount: number; resultCount: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message;
    throw new Error(message ?? `Erreur HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const resultsApi = {
  bootstrap: () => request<{ periods: Period[]; reviewers: Reviewer[] }>('/results/bootstrap'),
  submissions: (periodId?: string) => request<Submission[]>(`/results/submissions${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}`),
  detail: (id: string) => request<Submission & { grades: Array<{ matricule: string; student: string; score: string | number | null }> }>(`/results/submissions/${id}`),
  decide: (id: string, action: 'approve' | 'reject', actorId: string, reason?: string) => request<Submission>(`/results/submissions/${id}/${action}`, {
    method: 'POST', body: JSON.stringify(action === 'reject' ? { actorId, reason } : { actorId }),
  }),
  classPeriods: (periodId?: string) => request<ClassPeriod[]>(`/results/class-periods${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}`),
  preview: (id: string) => request<Preview>(`/results/class-periods/${id}/preview`),
  close: (id: string, actorId: string) => request<{ status: string; snapshotsCreated: number }>(`/results/class-periods/${id}/close`, { method: 'POST', body: JSON.stringify({ actorId }) }),
  finalResults: (id: string) => request<FinalResults>(`/results/class-periods/${id}/final-results`),
};

export type Preview = {
  classPeriod: { id: string; classLabel: string; periodLabel: string; status: string };
  readyToClose: boolean; problems: string[];
  students: Array<{ identity: { matricule?: string; firstName?: string; lastName?: string }; subjectResults: Array<{ label: string; earned: number | null; maximum: number }>; totalEarned: number; totalMaximum: number }>;
};
export type FinalResults = { classPeriod: { classLabel: string; periodLabel: string; status: string }; students: Preview['students'] };
