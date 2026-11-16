import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";

const TRANSACTION = { maxWait: 10_000, timeout: 20_000 } as const;
type WriteClient = Parameters<Parameters<PrismaService["client"]["$transaction"]>[0]>[0];

type GradeSnapshotEntry = { enrollmentId: string; score: string | number | null };

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap() {
    const [classPeriods, reviewers] = await Promise.all([
      this.prisma.client.classPeriod.findMany({
        include: { period: true, schoolClass: true },
        orderBy: [{ period: { position: "asc" } }, { schoolClass: { code: "asc" } }],
      }),
      this.prisma.client.user.findMany({
        where: { roles: { some: { role: "DIR" } } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
    ]);
    return {
      periods: uniquePeriods(classPeriods),
      reviewers: reviewers.map((user) => ({ id: user.id, label: `${user.firstName} ${user.lastName}` })),
    };
  }

  async listPendingSubmissions(periodId?: string) {
    const submissions = await this.prisma.client.submission.findMany({
      where: {
        status: "PENDING",
        evaluation: {
          classPeriod: { closedAt: null, ...(periodId ? { periodId } : {}) },
        },
      },
      include: submissionContext,
      orderBy: { submittedAt: "asc" },
    });
    return submissions.map(formatSubmissionSummary);
  }

  async submissionDetail(id: string) {
    const submission = await this.prisma.client.submission.findUnique({ where: { id }, include: submissionContext });
    if (!submission) throw new NotFoundException("Soumission introuvable.");
    const snapshot = parseSnapshot(submission.gradeSnapshot);
    const enrollments = await this.prisma.client.enrollment.findMany({
      where: { id: { in: snapshot.map((entry) => entry.enrollmentId) } },
      include: { student: { include: { user: true } } },
    });
    const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
    return {
      ...formatSubmissionSummary(submission),
      grades: snapshot.map((entry) => {
        const enrollment = enrollmentById.get(entry.enrollmentId);
        return {
          enrollmentId: entry.enrollmentId,
          matricule: enrollment?.student.matricule ?? "Inconnu",
          student: enrollment ? `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}` : "Élève inconnu",
          score: entry.score,
        };
      }),
    };
  }

  async approveSubmission(id: string, body: unknown) {
    const actorId = parseActorId(body);
    await this.prisma.client.$transaction(async (tx) => {
      const submission = await lockPendingSubmission(tx, id);
      await requireDirector(tx, actorId);
      if (submission.submittedById === actorId) {
        throw new ForbiddenException("L'auteur d'une soumission ne peut pas l'approuver.");
      }
      if (submission.closedAt) throw new ConflictException("La période de cette soumission est déjà clôturée.");
      await tx.submission.update({
        where: { id },
        data: { status: "APPROVED", decidedById: actorId, decidedAt: new Date(), reason: null },
      });
      await tx.evaluation.update({ where: { id: submission.evaluationId }, data: { state: "VALIDATED" } });
      await writeAudit(tx, actorId, "SUBMISSION_APPROVED", "Submission", id);
    }, TRANSACTION);
    return this.submissionDetail(id);
  }

  async rejectSubmission(id: string, body: unknown) {
    const { actorId, reason } = parseRejection(body);
    await this.prisma.client.$transaction(async (tx) => {
      const submission = await lockPendingSubmission(tx, id);
      await requireDirector(tx, actorId);
      if (submission.submittedById === actorId) {
        throw new ForbiddenException("L'auteur d'une soumission ne peut pas la rejeter.");
      }
      if (submission.closedAt) throw new ConflictException("La période de cette soumission est déjà clôturée.");
      await tx.submission.update({
        where: { id },
        data: { status: "REJECTED", decidedById: actorId, decidedAt: new Date(), reason },
      });
      await tx.evaluation.update({ where: { id: submission.evaluationId }, data: { state: "REJECTED" } });
      await writeAudit(tx, actorId, "SUBMISSION_REJECTED", "Submission", id);
    }, TRANSACTION);
    return this.submissionDetail(id);
  }

  async listClassPeriods(periodId?: string) {
    const contexts = await this.prisma.client.classPeriod.findMany({
      where: periodId ? { periodId } : undefined,
      include: {
        period: true,
        schoolClass: true,
        _count: { select: { evaluations: true, results: true } },
      },
      orderBy: [{ period: { position: "asc" } }, { schoolClass: { code: "asc" } }],
    });
    return contexts.map((context) => ({
      id: context.id,
      classCode: context.schoolClass.code,
      classLabel: context.schoolClass.label,
      periodCode: context.period.code,
      periodLabel: context.period.label,
      status: context.closedAt ? "CLOSED" : "OPEN",
      evaluationCount: context._count.evaluations,
      resultCount: context._count.results,
    }));
  }

  async previewClassPeriod(id: string) {
    const context = await loadClassPeriod(this.prisma.client, id);
    return buildPreview(context, false);
  }

  async closeClassPeriod(id: string, body: unknown) {
    const actorId = parseActorId(body);
    return this.prisma.client.$transaction(async (tx) => {
      await requireDirector(tx, actorId);
      await tx.$queryRaw`SELECT id FROM "ClassPeriod" WHERE id = ${id}::uuid FOR UPDATE`;
      const context = await loadClassPeriod(tx, id);
      if (context.closedAt) throw new ConflictException("La période est déjà clôturée.");
      const preview = buildPreview(context, true);
      const snapshots = await tx.resultSnapshot.createMany({
        data: preview.students.map((student) => ({
          classPeriodId: context.id,
          enrollmentId: student.enrollmentId,
          classId: context.classId,
          identitySnapshot: student.identity,
          subjectResults: student.subjectResults,
          sourceVersions: preview.sourceVersions,
          // Conserve une valeur normalisée pour la compatibilité du schéma ; l'écran final expose total/max.
          overallMean: student.totalMaximum === 0 ? 0 : (student.totalEarned / student.totalMaximum) * 20,
          calculationProfile: "PERIOD_TOTAL_V1",
        })),
      });
      await tx.classPeriod.update({ where: { id }, data: { closedAt: new Date(), closedById: actorId } });
      await writeAudit(tx, actorId, "CLASS_PERIOD_CLOSED", "ClassPeriod", id);
      return { classPeriodId: id, status: "CLOSED", snapshotsCreated: snapshots.count };
    }, TRANSACTION);
  }

  async finalResults(id: string) {
    const classPeriod = await this.prisma.client.classPeriod.findUnique({
      where: { id },
      include: { period: true, schoolClass: true, results: { orderBy: { enrollment: { student: { matricule: "asc" } } } } },
    });
    if (!classPeriod) throw new NotFoundException("Classe-période introuvable.");
    if (!classPeriod.closedAt) throw new ConflictException("Les résultats finaux ne sont disponibles qu'après la clôture.");
    return {
      classPeriod: {
        id: classPeriod.id,
        classLabel: classPeriod.schoolClass.label,
        periodLabel: classPeriod.period.label,
        status: "CLOSED",
      },
      students: classPeriod.results.map((result) => formatFinalResult(result)),
    };
  }
}

const submissionContext = {
  submittedBy: true,
  evaluation: {
    include: {
      assignment: { include: { classSubject: { include: { subject: true } } } },
      classPeriod: { include: { schoolClass: true, period: true } },
    },
  },
} as const;

async function loadClassPeriod(client: WriteClient | PrismaService["client"], id: string) {
  const context = await client.classPeriod.findUnique({
    where: { id },
    include: {
      period: true,
      schoolClass: {
        include: {
          subjects: { include: { subject: true }, orderBy: { subject: { code: "asc" } } },
          enrollments: { include: { student: { include: { user: true } } }, orderBy: { student: { matricule: "asc" } } },
        },
      },
      evaluations: {
        include: {
          assignment: { include: { classSubject: { include: { subject: true } } } },
          submissions: { where: { status: "APPROVED" }, orderBy: { attempt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!context) throw new NotFoundException("Classe-période introuvable.");
  return context;
}

function buildPreview(context: Awaited<ReturnType<typeof loadClassPeriod>>, requireReady: boolean) {
  const problems: string[] = [];
  const evaluationsBySubject = new Map<string, typeof context.evaluations>();
  for (const evaluation of context.evaluations) {
    const subjectId = evaluation.assignment.classSubject.subjectId;
    const values = evaluationsBySubject.get(subjectId) ?? [];
    values.push(evaluation);
    evaluationsBySubject.set(subjectId, values);
    if (evaluation.state !== "VALIDATED" || evaluation.submissions.length !== 1) {
      problems.push(`L'évaluation « ${evaluation.title} » n'est pas validée.`);
    }
  }
  for (const classSubject of context.schoolClass.subjects) {
    if ((evaluationsBySubject.get(classSubject.subjectId) ?? []).length === 0) {
      problems.push(`La matière « ${classSubject.subject.label} » n'a aucune évaluation traitée.`);
    }
  }
  if (requireReady && problems.length > 0) {
    throw new ConflictException({ message: "La clôture est bloquée.", problems });
  }

  const sourceVersions = context.evaluations.flatMap((evaluation) => {
    const submission = evaluation.submissions[0];
    return submission ? [{ evaluationId: evaluation.id, submissionId: submission.id, attempt: submission.attempt, version: submission.evaluationVersion }] : [];
  });
  const students = context.schoolClass.enrollments.map((enrollment) =>
    buildStudentResult(context, enrollment.id, evaluationsBySubject),
  );
  const missingScores = students.flatMap((student) => student.missingScores);
  if (requireReady && missingScores.length > 0) {
    throw new ConflictException({ message: "La clôture est bloquée par des notes manquantes.", problems: missingScores });
  }
  return {
    classPeriod: { id: context.id, classLabel: context.schoolClass.label, periodLabel: context.period.label, status: context.closedAt ? "CLOSED" : "OPEN" },
    readyToClose: !context.closedAt && problems.length === 0 && missingScores.length === 0,
    problems: [...problems, ...missingScores],
    sourceVersions,
    students,
  };
}

function buildStudentResult(context: Awaited<ReturnType<typeof loadClassPeriod>>, enrollmentId: string, evaluationsBySubject: Map<string, typeof context.evaluations>) {
  const enrollment = context.schoolClass.enrollments.find((item) => item.id === enrollmentId);
  const subjectResults = context.schoolClass.subjects.map((classSubject) => {
    const evaluations = evaluationsBySubject.get(classSubject.subjectId) ?? [];
    let earnedPoints = 0;
    let evaluationMaximum = 0;
    let missing = false;
    for (const evaluation of evaluations) {
      const entry = parseSnapshot(evaluation.submissions[0]?.gradeSnapshot).find((grade) => grade.enrollmentId === enrollmentId);
      const score = entry ? numericScore(entry.score) : null;
      if (score === null) missing = true;
      else earnedPoints += score;
      evaluationMaximum += Number(evaluation.maxScore);
    }
    const maximum = Number(classSubject.resultMaxScore);
    return {
      subjectId: classSubject.subjectId,
      subjectCode: classSubject.subject.code,
      label: classSubject.subject.label,
      earned: missing || evaluationMaximum === 0 ? null : (earnedPoints / evaluationMaximum) * maximum,
      maximum,
      missing,
    };
  });
  const missingScores = subjectResults.filter((subject) => subject.missing).map((subject) => `Note manquante pour ${subject.label}.`);
  const totalEarned = subjectResults.reduce((total, subject) => total + (subject.earned ?? 0), 0);
  const totalMaximum = subjectResults.reduce((total, subject) => total + subject.maximum, 0);
  return {
    enrollmentId,
    identity: enrollment
      ? {
          enrollmentId,
          matricule: enrollment.student.matricule,
          firstName: enrollment.student.user.firstName,
          lastName: enrollment.student.user.lastName,
          classLabel: context.schoolClass.label,
          periodCode: context.period.code,
        }
      : { enrollmentId },
    subjectResults: subjectResults.map(({ missing, ...subject }) => subject),
    totalEarned,
    totalMaximum,
    missingScores,
  };
}

async function lockPendingSubmission(tx: WriteClient, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; evaluationId: string; submittedById: string; closedAt: Date | null; status: string }>>`
    SELECT s.id, s."evaluationId", s."submittedById", cp."closedAt", s.status::text
    FROM "Submission" s
    JOIN "Evaluation" e ON e.id = s."evaluationId"
    JOIN "ClassPeriod" cp ON cp.id = e."classPeriodId"
    WHERE s.id = ${id}::uuid
    FOR UPDATE OF s, e, cp
  `;
  if (rows.length === 0) throw new NotFoundException("Soumission introuvable.");
  const submission = rows[0];
  if (submission.status !== "PENDING") throw new ConflictException("Cette soumission est déjà traitée.");
  return submission;
}

async function requireDirector(tx: WriteClient, actorId: string) {
  const actor = await tx.user.findFirst({ where: { id: actorId, roles: { some: { role: "DIR" } } }, select: { id: true } });
  if (!actor) throw new ForbiddenException("Cette action exige un compte Direction.");
}

async function writeAudit(tx: WriteClient, actorId: string, action: string, targetType: string, targetId: string) {
  await tx.auditEntry.create({ data: { actorId, action, targetType, targetId } });
}

function parseActorId(body: unknown) {
  if (!isObject(body) || typeof body.actorId !== "string" || body.actorId.trim() === "") {
    throw new BadRequestException("actorId est obligatoire pendant la démonstration sans authentification.");
  }
  return body.actorId;
}

function parseRejection(body: unknown) {
  const actorId = parseActorId(body);
  if (!isObject(body) || typeof body.reason !== "string" || body.reason.trim() === "") {
    throw new BadRequestException("Le motif du rejet est obligatoire.");
  }
  return { actorId, reason: body.reason.trim() };
}

function parseSnapshot(value: unknown): GradeSnapshotEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => isObject(entry) && typeof entry.enrollmentId === "string" && (typeof entry.score === "string" || typeof entry.score === "number" || entry.score === null)
    ? [{ enrollmentId: entry.enrollmentId, score: entry.score }]
    : []);
}

function numericScore(value: GradeSnapshotEntry["score"]) {
  if (value === null) return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatSubmissionSummary(submission: any) {
  return {
    id: submission.id,
    attempt: submission.attempt,
    status: submission.status,
    submittedAt: submission.submittedAt,
    decidedAt: submission.decidedAt,
    reason: submission.reason,
    evaluation: { id: submission.evaluation.id, title: submission.evaluation.title, maxScore: submission.evaluation.maxScore.toString() },
    subject: submission.evaluation.assignment.classSubject.subject.label,
    schoolClass: { id: submission.evaluation.classPeriod.schoolClass.id, label: submission.evaluation.classPeriod.schoolClass.label },
    period: { id: submission.evaluation.classPeriod.period.id, label: submission.evaluation.classPeriod.period.label },
    author: { id: submission.submittedBy.id, label: `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}` },
  };
}

function uniquePeriods(classPeriods: Array<{ period: { id: string; code: string; label: string } }>) {
  const periods = new Map<string, { id: string; code: string; label: string }>();
  classPeriods.forEach(({ period }) => periods.set(period.id, period));
  return [...periods.values()];
}

function formatFinalResult(result: any) {
  const subjectResults = Array.isArray(result.subjectResults) ? result.subjectResults : [];
  const totalEarned = subjectResults.reduce((total: number, subject: any) => total + Number(subject.earned ?? 0), 0);
  const totalMaximum = subjectResults.reduce((total: number, subject: any) => total + Number(subject.maximum ?? 0), 0);
  return { identity: result.identitySnapshot, subjectResults, totalEarned, totalMaximum };
}
