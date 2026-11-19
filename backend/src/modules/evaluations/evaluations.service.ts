import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { formatScore, parseGrades } from "./grade-rules.js";
import type { AuthContext } from "../auth/auth-context.js";
import { day, object, positive, text, uuid } from "../../common/input.js";

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
  assignmentActive: boolean;
  kind:string;
  decisionId:string|null;
};

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste des évaluations existantes, de la plus récente à la plus ancienne. */
  async list(auth:AuthContext) {
    const evaluations = await this.prisma.client.evaluation.findMany({
      where:auth.roles.includes("DIR")?{}:{assignment:{teacher:{userId:auth.userId}}},
      include: { ...evaluationInclude, _count: { select: { grades: true } } },
      orderBy: [{ heldOn: "desc" }, { title: "asc" }],
    });
    return evaluations.map((evaluation) => ({
      ...summary(evaluation),
      gradeCount: evaluation._count.grades,
    }));
  }

  /** Une évaluation avec les inscriptions de sa classe, leurs notes et la dernière soumission. */
  async detail(id: string,auth:AuthContext) {
    const evaluation = await this.prisma.client.evaluation.findUnique({
      where: { id },
      include: {
        ...evaluationInclude,
        grades: true,
        submissions: { orderBy: { attempt: "desc" } },
      },
    });
    if (!evaluation) throw new NotFoundException("Évaluation introuvable.");
    if(!auth.roles.includes("DIR")&&evaluation.assignment.teacher.userId!==auth.userId)throw new ForbiddenException("Cette évaluation ne vous est pas affectée.");

    const enrollments = await this.prisma.client.enrollment.findMany({
      where: { classId: evaluation.classId,...(evaluation.decisionId?{results:{some:{decisions:{some:{id:evaluation.decisionId}}}}}:{}) },
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
          status:evaluation.grades.find(g=>g.enrollmentId===enrollment.id)?.status??"NON_SAISI",
          appreciation:evaluation.grades.find(g=>g.enrollmentId===enrollment.id)?.appreciation??null,
        };
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));

    const [last] = evaluation.submissions;
    return {
      ...summary(evaluation),
      grades,
      kind:evaluation.kind,
      history:evaluation.submissions.map(s=>({attempt:s.attempt,status:s.status,reason:s.reason,submittedAt:s.submittedAt})),
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
  async saveGrades(id: string, body: unknown,auth:AuthContext) {
    await this.write(async (tx) => {
      const evaluation = await lockEvaluation(tx, id);
      requireOwner(evaluation,auth);requireVersion(evaluation,body);
      requireEditable(evaluation);

      const raw=object(body);
      const { grades, errors } = parseGrades(body, evaluation.maxScore);
      if(evaluation.kind==='APPRECIATION' && Array.isArray(raw.grades)) {
        errors.splice(0,errors.length);grades.splice(0,grades.length);
        if(raw.grades.length<1||raw.grades.length>500)throw new BadRequestException("Grille invalide.");
        const seen=new Set<string>();
        for(const row of raw.grades) {const d=object(row),enrollmentId=uuid(d.enrollmentId);if(seen.has(enrollmentId))throw new BadRequestException("Inscription en double.");seen.add(enrollmentId);grades.push({enrollmentId,score:null});}
      }
      if (errors.length === 0) {
        const known = await tx.enrollment.findMany({
          where: { id: { in: grades.map((grade) => grade.enrollmentId) }, classId: evaluation.classId,...(evaluation.decisionId?{results:{some:{decisions:{some:{id:evaluation.decisionId}}}}}:{}) },
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
      for(const grade of grades) {
        const row=(raw.grades as Record<string,unknown>[]).find(g=>g.enrollmentId===grade.enrollmentId)!;
        const status=String(row.status??(grade.score===null?"NON_SAISI":"PRESENT"));
        if(!["PRESENT","NON_SAISI","ABSENT_JUSTIFIE","ABSENT_NON_JUSTIFIE","DISPENSE"].includes(status))throw new BadRequestException("Statut de note invalide.");
        if(status!=="PRESENT"&&grade.score!==null)throw new BadRequestException("Une absence/dispense ne doit pas être transformée en note.");
        let appreciation:Record<string,string>|undefined;
        if(evaluation.kind==='APPRECIATION') {
          const a=object(row.appreciation);appreciation={};
          for(const k of ['QTE','QLT','COUL']) {const v=text(a[k],k,30);if(!['D1','D2','D3'].includes(v))throw new BadRequestException("Codes démo D1/D2/D3 requis ; légende officielle non confirmée.");appreciation[k]=v;}
          appreciation.observation=typeof a.observation==='string'?a.observation.slice(0,500):'';
        }
        const data={score:grade.score,status,appreciation};
        await tx.grade.upsert({where:{evaluationId_enrollmentId:{evaluationId:id,enrollmentId:grade.enrollmentId}},create:{evaluationId:id,enrollmentId:grade.enrollmentId,classId:evaluation.classId,...data},update:data});
      }
      await tx.evaluation.update({where:{id},data:{version:{increment:1}}});
      await tx.auditEntry.create({data:{actorId:auth.userId,action:"GRADES_SAVED",targetType:"Evaluation",targetId:id}});
    });
    return this.detail(id,auth);
  }

  /**
   * Soumet la grille : fige les notes dans une Submission en attente et passe
   * l'évaluation à SUBMITTED, dans la même transaction.
   */
  async submit(id: string,auth:AuthContext,body:unknown) {
    await this.write(async (tx) => {
      const evaluation = await lockEvaluation(tx, id);
      requireOwner(evaluation,auth);requireVersion(evaluation,body);
      requireEditable(evaluation);

      const enrollments = await tx.enrollment.findMany({
        where: { classId: evaluation.classId,...(evaluation.decisionId?{results:{some:{decisions:{some:{id:evaluation.decisionId}}}}}:{}) },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      const grades = await tx.grade.findMany({ where: { evaluationId: id } });
      const scores = new Map(grades.map((grade) => [grade.enrollmentId, grade.score]));
      const snapshot = enrollments.map((enrollment) => {
        const score = scores.get(enrollment.id);
        const grade=grades.find(g=>g.enrollmentId===enrollment.id);
        return { enrollmentId: enrollment.id, score: score == null ? null : formatScore(score.toString()),status:grade?.status??"NON_SAISI",appreciation:grade?.appreciation??null };
      });
      if (!snapshot.some((entry) => entry.score !== null || entry.appreciation!==null)) {
        throw new ConflictException("Aucune note n'est enregistrée : la grille ne peut pas être soumise.");
      }

      const previous = await tx.submission.aggregate({ where: { evaluationId: id }, _max: { attempt: true } });
      const attempt = (previous._max.attempt ?? 0) + 1;
      // Comme dans le jeu de données commun : une nouvelle version par tentative après rejet.
      const version = evaluation.version;

      await tx.submission.create({
        data: {
          evaluationId: id,
          attempt,
          evaluationVersion: version,
          gradeSnapshot: snapshot,
          // Provisoire tant que l'authentification n'identifie pas l'utilisateur :
          // l'auteur enregistré est l'enseignant affecté à l'évaluation.
          submittedById: auth.userId,
        },
      });
      await tx.evaluation.update({ where: { id }, data: { state: "SUBMITTED", version } });
      await tx.auditEntry.create({data:{actorId:auth.userId,action:"GRADES_SUBMITTED",targetType:"Evaluation",targetId:id}});
    });
    return this.detail(id,auth);
  }

  async create(body:unknown,auth:AuthContext) {
    const d=object(body),assignmentId=uuid(d.assignmentId),classPeriodId=uuid(d.classPeriodId),heldOn=day(d.heldOn),kind=text(d.kind,"Type");
    if(!['TRAVAIL_JOURNALIER','EXAMEN','REPECHAGE','APPRECIATION'].includes(kind))throw new BadRequestException("Type d'évaluation invalide.");
    const result=await this.prisma.client.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "ClassPeriod" WHERE id=${classPeriodId}::uuid FOR UPDATE`;
      const cp=await tx.classPeriod.findUnique({where:{id:classPeriodId},include:{period:true,schoolClass:true}});
      const assignment=await tx.teacherAssignment.findUnique({where:{id:assignmentId},include:{teacher:true,classSubject:true}});
      if(!cp||!assignment)throw new NotFoundException("Contexte introuvable.");
      if(assignment.teacher.userId!==auth.userId)throw new ForbiddenException("Ce cours ne vous est pas affecté.");
      if(cp.closedAt)throw new ConflictException("Période clôturée.");
      if(cp.classId!==assignment.classId||cp.period.profile!==cp.schoolClass.cycle||heldOn<assignment.startsOn||assignment.endsOn&&heldOn>=assignment.endsOn||heldOn<cp.period.startsOn||heldOn>cp.period.endsOn)throw new BadRequestException("Date, classe, cycle ou affectation incohérents.");
      if((kind==='EXAMEN'&&cp.period.kind!=='EXAMEN')||(kind==='TRAVAIL_JOURNALIER'&&cp.period.kind!=='PERIODE')||(kind==='APPRECIATION'&&(cp.schoolClass.cycle!=='MATERNEL'||cp.period.kind!=='PERIODE')))throw new BadRequestException("Type incompatible avec le composant.");
      let decisionId:string|undefined;
      if(kind==='REPECHAGE') {
        decisionId=uuid(d.decisionId);
        const decision=await tx.deliberationDecision.findUnique({where:{id:decisionId},include:{profile:true,resultSnapshot:{include:{classPeriod:true,decisions:{orderBy:{version:'desc'},take:1}}}}});
        if(!decision||decision.outcome!=='REPECHAGE'||decision.resultSnapshot.classId!==cp.classId||cp.period.kind!=='REPECHAGE'||!decision.resultSnapshot.classPeriod.publishedAt||decision.resultSnapshot.decisions[0]?.id!==decision.id)throw new BadRequestException('Décision de première session publiée requise.');
        if(!(decision.courses as string[]).includes(assignment.classSubject.subjectId)||object(decision.profile.config).retakeMode!=='REPLACE_E2_DEMO')throw new BadRequestException('Cours ou mode de repêchage non autorisé par le profil DEMO.');
      }
      if(cp.schoolClass.cycle==='MATERNEL'&&kind!=='APPRECIATION')throw new BadRequestException("Le maternel utilise des appréciations.");
      const evaluation=await tx.evaluation.create({data:{assignmentId,classPeriodId,classId:cp.classId,title:text(d.title,"Titre"),heldOn,maxScore:kind==='APPRECIATION'?'1':positive(d.maxScore),kind,decisionId}});
      await tx.auditEntry.create({data:{actorId:auth.userId,action:"EVALUATION_CREATED",targetType:"Evaluation",targetId:evaluation.id}});return evaluation;
    });return this.detail(result.id,auth);
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
  await tx.$queryRaw`SELECT cp.id FROM "ClassPeriod" cp JOIN "Evaluation" e ON e."classPeriodId"=cp.id WHERE e.id=${id}::uuid FOR UPDATE OF cp`;
  const rows = await tx.$queryRaw<LockedEvaluation[]>`
    SELECT e.id, e."classId", e."maxScore"::text AS "maxScore", e.state::text AS state, e.version,
      cp."closedAt" IS NOT NULL AS closed, t."userId" AS "teacherUserId", e.kind,e."decisionId",
      ta."startsOn"<=e."heldOn" AND (ta."endsOn" IS NULL OR ta."endsOn">e."heldOn") AS "assignmentActive"
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

function requireOwner(evaluation:LockedEvaluation,auth:AuthContext) {
  if(evaluation.teacherUserId!==auth.userId||!evaluation.assignmentActive)throw new ForbiddenException("Cette évaluation ne vous est pas affectée.");
}
function requireVersion(evaluation:LockedEvaluation,body:unknown) {
  if(object(body).version!==evaluation.version)throw new ConflictException("Version périmée : rechargez la grille.");
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
