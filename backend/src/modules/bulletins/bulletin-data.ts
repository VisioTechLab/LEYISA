import { object } from "../../common/input.js";

type RecordValue = Record<string, unknown>;

export type FrozenBulletin = {
  id: string;
  classPeriodId: string;
  identitySnapshot: unknown;
  subjectResults: unknown;
  sourceVersions: unknown;
  classPeriod: { publishedAt: Date | null; period: { code: string; kind: string } };
  decisions: Array<{ id: string; outcome: string; reason: string; courses: unknown }>;
};

export type BulletinSubject = {
  subjectId: string;
  subjectCode?: string;
  label: string;
  earned?: string | null;
  maximum?: string | null;
  nonApplicable?: boolean;
  components?: Record<string, BulletinSubject>;
  appreciation?: Array<RecordValue>;
};

function isNotApplicable(subject: BulletinSubject): boolean {
  if (subject.nonApplicable) return true;
  const parts = Object.values(subject.components ?? {});
  return parts.length > 0 && parts.every(isNotApplicable);
}

export const subjectsOf = (value: unknown) => Array.isArray(value) ? value as BulletinSubject[] : [];
export const display = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";
export const nameOf = (identity: RecordValue) =>
  [identity.lastName, identity.postName, identity.firstName].map(display).filter(Boolean).join(" ");
export const joined = (left: unknown, right: unknown) => {
  const a = display(left), b = display(right);
  return a && b ? `${a} / ${b}` : a || b;
};

function references(snapshot: FrozenBulletin) {
  return Array.isArray(snapshot.sourceVersions) ? snapshot.sourceVersions as RecordValue[] : [];
}

export function prepareBulletin(root: FrozenBulletin, snapshots: FrozenBulletin[], cutoff: Date) {
  const stored = new Map(snapshots.map(snapshot => [snapshot.id, snapshot]));
  const byCode = new Map<string, FrozenBulletin>();
  const isPublished = (snapshot: FrozenBulletin) => snapshot.classPeriod.publishedAt !== null && snapshot.classPeriod.publishedAt <= cutoff;
  const identity = object(root.identitySnapshot);
  const isRetake = root.classPeriod.period.kind === 'REPECHAGE';
  const original = isRetake && references(root).some(ref => ref.session === 1 && ref.snapshotId === identity.originalSnapshotId)
    ? stored.get(display(identity.originalSnapshotId)) : undefined;

  function walk(snapshot: FrozenBulletin): boolean {
    const { code, kind } = snapshot.classPeriod.period;
    const edges = new Map<string, FrozenBulletin | undefined>();
    for (const ref of references(snapshot)) {
      if (typeof ref.code !== "string") continue;
      const child = stored.get(display(ref.snapshotId));
      if (child?.classPeriodId === ref.classPeriodId && child?.classPeriod.period.code === ref.code) edges.set(ref.code, child);
      else if (!edges.has(ref.code)) edges.set(ref.code, undefined);
    }
    const complete = [...edges.values()].map(child => child ? walk(child) : false).every(Boolean);
    const composite = ['TRIMESTRE', 'SEMESTRE', 'ANNUEL'].includes(kind);
    if (!isPublished(snapshot) || !complete || (composite && !edges.size)) return false;
    byCode.set(code, snapshot);
    return true;
  }

  const baseComplete = isRetake ? !!original && walk(original) : walk(root);
  const releaseVisible = isPublished(root) && baseComplete;
  const base = isRetake ? original : root;
  const baseSubjects = subjectsOf(base?.subjectResults ?? root.subjectResults);
  const componentSubjects = new Map([...byCode].map(([code, snapshot]) =>
    [code, new Map(subjectsOf(snapshot.subjectResults).map(subject => [subject.subjectId, subject]))]));
  const component = (subject: BulletinSubject, code: string) => {
    const match = componentSubjects.get(code)?.get(subject.subjectId);
    return match && isNotApplicable(match) ? { ...match, nonApplicable: true } : match;
  };
  const identityFor = (code: string) => {
    const snapshot = byCode.get(code);
    return snapshot ? object(snapshot.identitySnapshot) : {};
  };
  const retakeDecisions = new Set(references(root).filter(ref => ref.session === 2).map(ref => ref.decisionId));
  const authorization = original?.decisions.find(decision => decision.outcome === "REPECHAGE" && retakeDecisions.has(decision.id));
  const eligible = new Set(Array.isArray(authorization?.courses) ? authorization.courses : []);
  const retakeScores = new Map<string, BulletinSubject>();
  if (isRetake && releaseVisible) {
    for (const subject of subjectsOf(root.subjectResults)) {
      const exam = subject.components?.S2?.components?.E2;
      if (eligible.has(subject.subjectId) && exam) retakeScores.set(subject.subjectId, exam);
    }
  }

  return {
    identity,
    baseSubjects,
    component,
    identityFor,
    decision: releaseVisible ? root.decisions[0] : undefined,
    firstDecision: baseComplete ? original?.decisions[0] : undefined,
    isRetake,
    retakeScores,
    releaseVisible,
    slimSubjects: subjectsOf(root.subjectResults).map(subject => releaseVisible
      ? { ...subject, ...(isNotApplicable(subject) ? { nonApplicable: true } : {}) }
      : { subjectId: subject.subjectId, subjectCode: subject.subjectCode, label: subject.label, earned: null, maximum: null })
  };
}

export type BulletinData = ReturnType<typeof prepareBulletin>;
