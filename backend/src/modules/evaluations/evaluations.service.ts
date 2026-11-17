import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { formatScore, parseGrades } from "./grade-rules.js";

/** La connexion à la base commune peut dépasser le délai d'attente par défaut de Prisma. */
const TRANSACTION = { maxWait: 10_000, timeout: 20_000 } as const;

const evaluationInclude = {
  assignment: {
    include: {
      teacher: { include: { user: true } },
      classSubject: { include: { subject: true } },
    },
  },
  classPeriod: { include: { period: true, schoolClass: true } },
} as const;

type LockedEvaluation = {
  id: string;
  classId: string;
  maxScore: string;
  state: string;
  version: number;
  closed: boolean;
  teacherUserId: string;
};

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste des évaluations existantes, de la plus récente à la plus ancienne. */
  async list() {
    const evaluations = await this.prisma.client.evaluation.findMany({
      include: { ...evaluationInclude, _count: { select: { grades: true } } },
      orderBy: [{ heldOn: "desc" }, { title: "asc" }],
    });
    return evaluations.map((evaluation) => ({
      ...summary(evaluation),
      gradeCount: evaluation._count.grades,
    }));
  }

  /** Une évaluation avec les inscriptions de sa classe, leurs notes et la dernière soumission. */
  async detail(id: string) {
    const evaluation = await this.prisma.client.evaluation.findUnique({
      where: { id },
      include: {
        ...evaluationInclude,
        grades: true,
        submissions: { orderBy: { attempt: "desc" }, take: 1 },
      },
    });
    if (!evaluation) throw new NotFoundException("Évaluation introuvable.");

    const enrollments = await this.prisma.client.enrollment.findMany({
      where: { classId: evaluation.classId },
      include: { student: { include: { user: true } } },
    });
    const scores = new Map(evaluation.grades.map((grade) => [grade.enrollmentId, grade.score]));
    const grades = enrollments
      .map((enrollment) => {
        const score = scores.get(enrollment.id);
        return {
          enrollmentId: enrollment.id,
          matricule: enrollment.student.matricule,
          firstName: enrollment.student.user.firstName,
          lastName: enrollment.student.user.lastName,
          score: score == null ? null : formatScore(score.toString()),
        };
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));

    const [last] = evaluation.submissions;
    return {
      ...summary(evaluation),
      grades,
      lastSubmission: last
        ? {
            attempt: last.attempt,
            status: last.status,
            submittedAt: last.submittedAt.toISOString(),
            decidedAt: last.decidedAt?.toISOString() ?? null,
            reason: last.reason,
          }
        : null,
    };
  }

  /** Enregistre des notes de brouillon. Une note absente de l'envoi reste inchangée. */
  async saveGrades(id: string, body: unknown) {
    await this.write(async (tx) => {
      const evaluation = await lockEvaluation(tx, id);
      requireEditable(evaluation);

      const { grades, errors } = parseGrades(body, evaluation.maxScore);
      if (errors.length === 0) {
        const known = await tx.enrollment.findMany({
          where: { id: { in: grades.map((grade) => grade.enrollmentId) }, classId: evaluation.classId },
          select: { id: true },
        });
        const knownIds = new Set(known.map((enrollment) => enrollment.id));
        for (const { enrollmentId } of grades) {
          if (!knownIds.has(enrollmentId)) {
            errors.push({ enrollmentId, message: "Cette inscription n'appartient pas à la classe de l'évaluation." });
          }
        }
      }
      if (errors.length > 0) {
        throw new BadRequestException({ message: "Certaines notes sont refusées.", errors });
      }

      // Une seule requête pour toute la grille : la base commune est distante.
      await tx.$executeRaw`
        INSERT INTO "Grade" ("evaluationId", "enrollmentId", "classId", score, "updatedAt")
        SELECT ${id}::uuid, entry."enrollmentId", ${evaluation.classId}::uuid, entry.score, now()
        FROM jsonb_to_recordset(${JSON.stringify(grades)}::jsonb) AS entry("enrollmentId" uuid, score numeric)
        ON CONFLICT ("evaluationId", "enrollmentId")
        DO UPDATE SET score = EXCLUDED.score, "updatedAt" = EXCLUDED."updatedAt"
      `;
    });
    return this.detail(id);
  }

  /**
   * Soumet la grille : fige les notes dans une Submission en attente et passe
   * l'évaluation à SUBMITTED, dans la même transaction.
   */
  async submit(id: string) {
    await this.write(async (tx) => {
      const evaluation = await lockEvaluation(tx, id);
      requireEditable(evaluation);

      const enrollments = await tx.enrollment.findMany({
        where: { classId: evaluation.classId },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      const grades = await tx.grade.findMany({ where: { evaluationId: id } });
      const scores = new Map(grades.map((grade) => [grade.enrollmentId, grade.score]));
      const snapshot = enrollments.map((enrollment) => {
        const score = scores.get(enrollment.id);
        return { enrollmentId: enrollment.id, score: score == null ? null : formatScore(score.toString()) };
      });
      if (!snapshot.some((entry) => entry.score !== null)) {
        throw new ConflictException("Aucune note n'est enregistrée : la grille ne peut pas être soumise.");
      }

      const previous = await tx.submission.aggregate({ where: { evaluationId: id }, _max: { attempt: true } });
      const attempt = (previous._max.attempt ?? 0) + 1;
      // Comme dans le jeu de données commun : une nouvelle version par tentative après rejet.
      const version = attempt === 1 ? evaluation.version : evaluation.version + 1;

      await tx.submission.create({
        data: {
          evaluationId: id,
          attempt,
          evaluationVersion: version,
          gradeSnapshot: snapshot,
          // Provisoire tant que l'authentification n'identifie pas l'utilisateur :
          // l'auteur enregistré est l'enseignant affecté à l'évaluation.
          submittedById: evaluation.teacherUserId,
        },
      });
      await tx.evaluation.update({ where: { id }, data: { state: "SUBMITTED", version } });
    });
    return this.detail(id);
  }

  private async write(work: (tx: WriteClient) => Promise<void>): Promise<void> {
    try {
      await this.prisma.client.$transaction(work, TRANSACTION);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Filet de sécurité : les triggers du schéma commun refusent aussi ces écritures.
      const text = `${(error as Error)?.message ?? ""} ${JSON.stringify((error as { meta?: unknown })?.meta ?? "")}`;
      if (/grade is locked|class period is closed|evaluation is locked|submission_one_pending/.test(text)) {
        throw new ConflictException("L'évaluation n'est plus modifiable.");
      }
      if (/grade exceeds evaluation scale|grade_nonnegative/.test(text)) {
        throw new BadRequestException("Une note est en dehors du barème.");
      }
      throw error;
    }
  }
}

type WriteClient = Parameters<Parameters<PrismaService["client"]["$transaction"]>[0]>[0];

/** Verrouille l'évaluation jusqu'à la fin de la transaction et lit ce qui conditionne l'écriture. */
async function lockEvaluation(tx: WriteClient, id: string): Promise<LockedEvaluation> {
  const rows = await tx.$queryRaw<LockedEvaluation[]>`
    SELECT e.id, e."classId", e."maxScore"::text AS "maxScore", e.state::text AS state, e.version,
      cp."closedAt" IS NOT NULL AS closed, t."userId" AS "teacherUserId"
    FROM "Evaluation" e
    JOIN "ClassPeriod" cp ON cp.id = e."classPeriodId"
    JOIN "TeacherAssignment" ta ON ta.id = e."assignmentId"
    JOIN "Teacher" t ON t.id = ta."teacherId"
    WHERE e.id = ${id}::uuid
    FOR UPDATE OF e
  `;
  if (rows.length === 0) throw new NotFoundException("Évaluation introuvable.");
  return rows[0];
}

function requireEditable(evaluation: LockedEvaluation): void {
  if (evaluation.closed) throw new ConflictException("La période de cette classe est clôturée.");
  if (evaluation.state === "SUBMITTED") {
    throw new ConflictException("Les notes sont soumises et en attente de décision.");
  }
  if (evaluation.state === "VALIDATED") throw new ConflictException("Les notes sont validées.");
}

type EvaluationWithContext = {
  id: string;
  title: string;
  heldOn: Date;
  maxScore: { toString(): string };
  state: string;
  version: number;
  assignmentId: string;
  assignment: {
    teacher: { user: { firstName: string; lastName: string } };
    classSubject: { subject: { code: string; label: string } };
  };
  classPeriod: {
    closedAt: Date | null;
    period: { code: string; label: string };
    schoolClass: { id: string; code: string; label: string };
  };
};

function summary(evaluation: EvaluationWithContext) {
  const { assignment, classPeriod } = evaluation;
  const closed = classPeriod.closedAt !== null;
  return {
    id: evaluation.id,
    title: evaluation.title,
    heldOn: evaluation.heldOn.toISOString().slice(0, 10),
    maxScore: formatScore(evaluation.maxScore.toString()),
    state: evaluation.state,
    version: evaluation.version,
    editable: !closed && (evaluation.state === "DRAFT" || evaluation.state === "REJECTED"),
    assignmentId: evaluation.assignmentId,
    schoolClass: {
      id: classPeriod.schoolClass.id,
      code: classPeriod.schoolClass.code,
      label: classPeriod.schoolClass.label,
    },
    subject: { code: assignment.classSubject.subject.code, label: assignment.classSubject.subject.label },
    period: { code: classPeriod.period.code, label: classPeriod.period.label, closed },
    teacher: { firstName: assignment.teacher.user.firstName, lastName: assignment.teacher.user.lastName },
  };
}
