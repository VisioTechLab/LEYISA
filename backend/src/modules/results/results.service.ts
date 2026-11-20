import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/client";
import { object, todayCivil } from "../../common/input.js";
import { PrismaService } from "../../common/prisma.service.js";

const TRANSACTION = { maxWait: 10_000, timeout: 20_000 } as const;
// Protection de ca2d348 (recette privée) conservée : aucune clôture/publication
// sur base partagée sans validation explicite. Le scénario local reste isolé.
function assertValidatedResultsEnabled() {
  if (process.env.LEYISA_ALLOW_UNVALIDATED_RESULTS === 'false' ||
      process.env.LEYISA_DB_MODE !== 'local' && process.env.LEYISA_ALLOW_UNVALIDATED_RESULTS !== 'true') {
    throw new ConflictException('Clôture et publication suspendues : les règles pédagogiques doivent être validées.');
  }
}
type WriteClient = Parameters<Parameters<PrismaService["client"]["$transaction"]>[0]>[0];

type GradeSnapshotEntry = { enrollmentId: string; score: string | number | null; status?: string; appreciation?: { QTE: string; QLT: string; COUL: string; observation?: string } };

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap() {
    const classPeriods=await this.prisma.client.classPeriod.findMany({include:{period:true},orderBy:{period:{position:"asc"}}});
    return {periods:uniquePeriods(classPeriods)};
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
          status: entry.status ?? (entry.score === null && !entry.appreciation ? "NON_SAISI" : "PRESENT"),
          appreciation: entry.appreciation ?? null,
        };
      }),
    };
  }

  async approveSubmission(id: string, actorId: string) {
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

  async rejectSubmission(id: string, actorId: string, body: unknown) {
    const { reason } = parseRejection(body);
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
        schoolClass: { include: { schoolYear: true } },
        _count: { select: { evaluations: true, results: true } },
      },
      orderBy: [{ period: { position: "asc" } }, { schoolClass: { code: "asc" } }],
    });
    return contexts.map((context) => ({
      id: context.id,
      classId: context.schoolClass.id,
      yearCode: context.schoolClass.schoolYear.code,
      classCode: context.schoolClass.code,
      classLabel: context.schoolClass.label,
      periodCode: context.period.code,
      periodLabel: context.period.profile === 'HISTORIQUE' ? `${context.period.label} — historique` : context.period.label,
      status: context.publishedAt ? "PUBLISHED" : context.closedAt ? "CLOSED" : "OPEN",
      evaluationCount: context._count.evaluations,
      resultCount: context._count.results,
    }));
  }

  async previewClassPeriod(id: string) {
    const context = await loadClassPeriod(this.prisma.client, id);
    if (context.period.profile === 'HISTORIQUE') throw new ConflictException('Période historique : consultez les résultats figés sans recalcul.');
    return computePreview(this.prisma.client,context, false);
  }

  async closeClassPeriod(id: string, actorId: string, body: unknown) {
    assertValidatedResultsEnabled();
    if(object(body).confirmed!==true)throw new BadRequestException("Confirmation explicite requise.");
    return this.prisma.client.$transaction(async (tx) => {
      await requireDirector(tx, actorId);
      await tx.$queryRaw`SELECT c.id FROM "SchoolClass" c JOIN "ClassPeriod" cp ON cp."classId"=c.id WHERE cp.id=${id}::uuid FOR UPDATE OF c`;
      await tx.$queryRaw`SELECT id FROM "ClassPeriod" WHERE id = ${id}::uuid FOR UPDATE`;
      const context = await loadClassPeriod(tx, id);
      if (context.closedAt) throw new ConflictException("La période est déjà clôturée.");
      const preview = await computePreview(tx,context, true);
      if(context.period.endsOn.toISOString().slice(0,10)>todayCivil())throw new ConflictException("Le composant ne peut pas être clôturé avant sa fin.");
      const snapshots = await tx.resultSnapshot.createMany({
        data: preview.students.map((student) => ({
          classPeriodId: context.id,
          enrollmentId: student.enrollmentId,
          classId: context.classId,
          identitySnapshot: JSON.parse(JSON.stringify(student.identity)),
          subjectResults: JSON.parse(JSON.stringify(student.subjectResults)),
          sourceVersions: JSON.parse(JSON.stringify(preview.sourceVersions)),
          // Conserve une valeur normalisée pour la compatibilité du schéma ; l'écran final expose total/max.
          overallMean: new Decimal(student.totalMaximum).isZero() ? "0" : new Decimal(student.totalEarned).div(student.totalMaximum).mul(20).toFixed(8),
          calculationProfile: "DEMO-V1.PERIOD_TOTAL_V1.2",
        })),
      });
      await tx.classPeriod.update({ where: { id }, data: { closedAt: new Date(), closedById: actorId } });
      await writeAudit(tx, actorId, "CLASS_PERIOD_CLOSED", "ClassPeriod", id);
      return { classPeriodId: id, status: "CLOSED", snapshotsCreated: snapshots.count };
    }, TRANSACTION);
  }

  async publish(id:string,actorId:string) {
    assertValidatedResultsEnabled();
    return this.prisma.client.$transaction(async tx=>{
      await requireDirector(tx,actorId);
      await tx.$queryRaw`SELECT id FROM "ClassPeriod" WHERE id=${id}::uuid FOR UPDATE`;
      const context=await tx.classPeriod.findUnique({where:{id},include:{results:true}});
      if(!context)throw new NotFoundException("Classe-période introuvable.");
      if(!context.closedAt||context.results.length===0)throw new ConflictException("Publication exige résultats clôturés et validés.");
      if(context.publishedAt)throw new ConflictException("Résultats déjà publiés.");
      const period=await tx.period.findUnique({where:{id:context.periodId}});
      if(period?.profile==='HISTORIQUE')throw new ConflictException('Publication interdite pour cette période historique.');
      const cls=await tx.schoolClass.findUnique({where:{id:context.classId}});
      if(cls?.cycle!=='MATERNEL'&&['ANNUEL','REPECHAGE'].includes(period!.kind)) {
        for(const result of context.results)if(!await tx.deliberationDecision.findFirst({where:{resultSnapshotId:result.id}}))throw new ConflictException("Une décision motivée de démonstration est requise pour chaque synthèse avant publication.");
      }
      await tx.classPeriod.update({where:{id},data:{publishedAt:new Date(),publishedById:actorId}});
      await writeAudit(tx,actorId,"RESULTS_PUBLISHED","ClassPeriod",id);
      return {classPeriodId:id,status:"PUBLISHED"};
    },TRANSACTION);
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
        status: classPeriod.publishedAt?"PUBLISHED":"CLOSED",
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
          schoolYear:true,
          subjects: { include: { subject: true }, orderBy: { position: "asc" } },
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

Decimal.set({precision:40});
type Context=Awaited<ReturnType<typeof loadClassPeriod>>;
type SubjectResult={subjectId:string;subjectCode:string;label:string;earned:string|null;maximum:string;appreciation?:unknown;components?:Record<string,unknown>;missing?:boolean;nonApplicable?:boolean};
type StudentResult={enrollmentId:string;identity:Record<string,unknown>;subjectResults:SubjectResult[];totalEarned:string;totalMaximum:string;missingScores:string[];rank:number|null;percentage:string|null};

async function computePreview(client:WriteClient|PrismaService["client"],context:Context,requireReady:boolean) {
  if(context.period.kind==='REPECHAGE')return computeRetakePreview(client,context,requireReady);
  const settings=await client.schoolSettings.findUnique({where:{id:"school"}});
  const problems:string[]=[];
  let sourceVersions:object[]=[];
  let students:StudentResult[]=[];
  if(context.schoolClass.subjects.length===0)problems.push("Le programme ne contient aucune matière/attitude.");
  if(context.schoolClass.enrollments.length===0)problems.push("La classe ne contient aucune inscription.");
  if(['TRIMESTRE','SEMESTRE','ANNUEL'].includes(context.period.kind)) {
    const children=await client.classPeriod.findMany({where:{classId:context.classId,period:{parentCode:context.period.code,profile:context.period.profile,kind:{in:['PERIODE','EXAMEN','TRIMESTRE','SEMESTRE']}}},include:{period:true,results:true},orderBy:{period:{position:'asc'}}});
    if(children.length===0)problems.push("Aucun composant enfant configuré.");
    for(const child of children)if(!child.closedAt||child.results.length!==context.schoolClass.enrollments.length)problems.push(`Composant ${child.period.code} incomplet ou non clôturé.`);
    sourceVersions=children.flatMap(c=>c.results.map(r=>({snapshotId:r.id,classPeriodId:c.id,code:c.period.code})));
    students=context.schoolClass.enrollments.map(enrollment=>{
      const snapshots=children.map(child=>({code:child.period.code,result:child.results.find(r=>r.enrollmentId===enrollment.id)}));
      const first=snapshots.find(s=>s.result)?.result;
      const identity={...object(first?.identitySnapshot??{}),periodCode:context.period.code,periodLabel:context.period.label,kind:context.period.kind};
      const subjects:SubjectResult[]=context.schoolClass.subjects.map(cs=>{
        const components:Record<string,unknown>={};let earned=new Decimal(0),maximum=new Decimal(0),missing=false;
        for(const snapshot of snapshots) {
          const rows=Array.isArray(snapshot.result?.subjectResults)?snapshot.result!.subjectResults as unknown as SubjectResult[]:[];
          const row=rows.find(r=>r.subjectId===cs.subjectId);
          if(!row)missing=true;
          else {
            components[snapshot.code]=row;
            if(row.earned===null&&context.schoolClass.cycle!=='MATERNEL'&&!row.nonApplicable)missing=true;
            if(row.earned!==null)earned=earned.add(row.earned);maximum=maximum.add(row.maximum);
          }
          if(snapshot.result && object(snapshot.result.identitySnapshot).programVersion!==object(first?.identitySnapshot??{}).programVersion)missing=true;
        }
        return {subjectId:cs.subjectId,subjectCode:cs.subject.code,label:cs.subject.label,earned:context.schoolClass.cycle==='MATERNEL'?null:missing?null:earned.toString(),maximum:maximum.toString(),components,missing};
      });
      return finishStudent(enrollment.id,identity,subjects,context.schoolClass.cycle==='MATERNEL');
    });
  } else {
    const bySubject=new Map<string,typeof context.evaluations>();
    for(const evaluation of context.evaluations) {
      const key=evaluation.assignment.classSubject.subjectId;
      bySubject.set(key,[...(bySubject.get(key)??[]),evaluation]);
      if(evaluation.state!=='VALIDATED'||evaluation.submissions.length!==1||evaluation.submissions[0]?.evaluationVersion!==evaluation.version)problems.push(`Évaluation « ${evaluation.title} » non validée ou version incohérente.`);
    }
    for(const cs of context.schoolClass.subjects) {
      const maxima=cs.componentMaxima as Record<string,string|null>;
      if(context.schoolClass.cycle!=='MATERNEL' && (!Object.hasOwn(maxima,context.period.code)||cs.source==='A_CONFIRMER'))problems.push(`Maximum/source non configuré : ${cs.subject.label} / ${context.period.code}.`);
      if(maxima[context.period.code]!==null && !(bySubject.get(cs.subjectId)?.length))problems.push(`Aucune évaluation approuvée pour ${cs.subject.label}.`);
    }
    sourceVersions=context.evaluations.flatMap(e=>e.submissions.map(s=>({evaluationId:e.id,submissionId:s.id,attempt:s.attempt,version:s.evaluationVersion})));
    students=context.schoolClass.enrollments.map(enrollment=>{
      const subjects:SubjectResult[]=context.schoolClass.subjects.map(cs=>{
        const maxima=cs.componentMaxima as Record<string,string|null>;
        if(maxima[context.period.code]===null)return {subjectId:cs.subjectId,subjectCode:cs.subject.code,label:cs.subject.label,earned:null,maximum:'0',nonApplicable:true};
        const evaluations=bySubject.get(cs.subjectId)??[];
        let earned=new Decimal(0),scale=new Decimal(0),missing=evaluations.length===0;const appreciations:unknown[]=[];
        for(const evaluation of evaluations) {
          const snap=evaluation.submissions[0]?.gradeSnapshot;
          const entry=Array.isArray(snap)?snap.find(g=>g&&typeof g==='object'&&!Array.isArray(g)&&g.enrollmentId===enrollment.id) as Record<string,unknown>|undefined:undefined;
          if(context.schoolClass.cycle==='MATERNEL') {
            if(!entry?.appreciation)missing=true;else appreciations.push(entry.appreciation);
          } else {
            if(entry?.score===null||entry?.score===undefined||entry.status&&entry.status!=='PRESENT')missing=true;
            else earned=earned.add(String(entry.score));
            scale=scale.add(evaluation.maxScore.toString());
          }
        }
        const maximum=context.schoolClass.cycle==='MATERNEL'?'0':maxima[context.period.code]??'0';
        return {subjectId:cs.subjectId,subjectCode:cs.subject.code,label:cs.subject.label,earned:context.schoolClass.cycle==='MATERNEL'?null:missing||scale.isZero()?null:earned.div(scale).mul(maximum).toString(),maximum,missing,...(context.schoolClass.cycle==='MATERNEL'?{appreciation:appreciations}:{}),components:{}};
      });
      const student=enrollment.student;
      const identity={enrollmentId:enrollment.id,matricule:student.matricule,firstName:student.user.firstName,lastName:student.user.lastName,postName:student.postName,sex:student.sex,birthDate:student.birthDate?.toISOString().slice(0,10)??null,birthPlace:student.birthPlace,permanentNumber:student.permanentNumber,classLabel:context.schoolClass.label,yearCode:context.schoolClass.schoolYear.code,cycle:context.schoolClass.cycle,level:context.schoolClass.level,optionCode:context.schoolClass.optionCode,programVersion:context.schoolClass.programVersion,periodCode:context.period.code,periodLabel:context.period.label,kind:context.period.kind,school:settings?.identity??{},profile:'DEMO-V1.PERIOD_TOTAL_V1.2',decision:'A_VERIFIER'};
      return finishStudent(enrollment.id,identity,subjects,context.schoolClass.cycle==='MATERNEL');
    });
  }
  const missing=students.flatMap(s=>s.missingScores);problems.push(...missing);
  const complete=problems.length===0;
  if(context.schoolClass.cycle!=='MATERNEL'&&complete) {
    const maxima=new Set(students.map(s=>s.totalMaximum));
    if(maxima.size===1)for(const student of students)student.rank=1+students.filter(s=>new Decimal(s.totalEarned).gt(student.totalEarned)).length;
  }
  // Identité figée contient aussi les synthèses, sans recalcul lors du rendu PDF.
  for(const student of students)student.identity={...student.identity,totalEarned:student.totalEarned,totalMaximum:student.totalMaximum,percentage:student.percentage,rank:student.rank,effectif:students.length};
  if(requireReady&&!complete)throw new ConflictException({message:"Clôture bloquée : données ou règles incomplètes.",problems});
  return {classPeriod:{id:context.id,classLabel:context.schoolClass.label,periodLabel:context.period.label,status:context.publishedAt?'PUBLISHED':context.closedAt?'CLOSED':'OPEN'},readyToClose:!context.closedAt&&complete,problems,sourceVersions,students};
}
async function computeRetakePreview(client:WriteClient|PrismaService["client"],context:Context,requireReady:boolean) {
 const problems:string[]=[];
 const originals=await client.resultSnapshot.findMany({where:{classId:context.classId,classPeriod:{period:{kind:'ANNUEL'},publishedAt:{not:null}}},include:{decisions:{include:{profile:true},orderBy:{version:'desc'},take:1}}});
 if(originals.length!==context.schoolClass.enrollments.length)problems.push('Première session annuelle publiée incomplète.');
 const sourceVersions:object[]=originals.map(r=>({snapshotId:r.id,session:1}));
 const students:StudentResult[]=originals.map(original=>{
  const identity={...object(original.identitySnapshot),periodCode:context.period.code,periodLabel:context.period.label,kind:'REPECHAGE',session:2,decision:'A_VERIFIER',originalSnapshotId:original.id};
  const subjects=structuredClone(original.subjectResults) as unknown as SubjectResult[];
  const decision=original.decisions[0];
  if(decision?.outcome==='REPECHAGE') {
   if(object(decision.profile.config).retakeMode!=='REPLACE_E2_DEMO')problems.push('Mode de deuxième session non configuré.');
   for(const subjectId of decision.courses as string[]) {
    const subject=subjects.find(s=>s.subjectId===subjectId);const oldExam=subject?findComponent(subject,'E2'):undefined;
    if(!subject||!oldExam||oldExam.earned===null||new Decimal(oldExam.maximum).lte(0)){problems.push('Composant E2 source absent ou non applicable.');continue;}
    const evaluations=context.evaluations.filter(e=>e.decisionId===decision.id&&e.assignment.classSubject.subjectId===subjectId);
    if(!evaluations.length){problems.push(`Repêchage non évalué : ${subject.label}.`);continue;}
    let points=new Decimal(0),maximum=new Decimal(0),missing=false;
    for(const evaluation of evaluations) {
     const submission=evaluation.submissions[0];
     if(evaluation.state!=='VALIDATED'||!submission||submission.evaluationVersion!==evaluation.version){missing=true;continue;}
     const entry=parseSnapshot(submission.gradeSnapshot).find(g=>g.enrollmentId===original.enrollmentId);
     if(!entry||entry.score===null)missing=true;else points=points.add(entry.score);
     maximum=maximum.add(evaluation.maxScore.toString());
     sourceVersions.push({evaluationId:evaluation.id,submissionId:submission.id,version:submission.evaluationVersion,decisionId:decision.id,session:2});
    }
    if(missing||maximum.isZero()){problems.push(`Note de deuxième session incomplète : ${subject.label}.`);continue;}
    const replacement=points.div(maximum).mul(oldExam.maximum);
    const delta=replacement.sub(oldExam.earned!);
    replaceComponent(subject,'E2',replacement.toString(),delta);
   }
  }
  return finishStudent(original.enrollmentId,identity,subjects,false);
 });
 if(context.evaluations.some(e=>e.state!=='VALIDATED'))problems.push('Épreuves de deuxième session non validées.');
 if(students.length && new Set(students.map(s=>s.totalMaximum)).size===1&&!problems.length)for(const student of students)student.rank=1+students.filter(s=>new Decimal(s.totalEarned).gt(student.totalEarned)).length;
 for(const student of students)student.identity={...student.identity,totalEarned:student.totalEarned,totalMaximum:student.totalMaximum,percentage:student.percentage,rank:student.rank,effectif:students.length};
 if(requireReady&&problems.length)throw new ConflictException({message:'Clôture de deuxième session bloquée.',problems});
 return {classPeriod:{id:context.id,classLabel:context.schoolClass.label,periodLabel:context.period.label,status:context.publishedAt?'PUBLISHED':context.closedAt?'CLOSED':'OPEN'},readyToClose:!context.closedAt&&!problems.length&&students.length>0,problems,sourceVersions,students};
}
function findComponent(subject:SubjectResult,code:string):SubjectResult|undefined {
 const children=subject.components as Record<string,SubjectResult>|undefined;
 if(children?.[code])return children[code];
 for(const child of Object.values(children??{})){const found=findComponent(child,code);if(found)return found;}
}
function replaceComponent(subject:SubjectResult,code:string,earned:string,delta:Decimal):boolean {
 const children=subject.components as Record<string,SubjectResult>|undefined;let changed=false;
 if(children?.[code]){children[code].earned=earned;changed=true;}
 else for(const child of Object.values(children??{}))if(replaceComponent(child,code,earned,delta))changed=true;
 if(changed&&subject.earned!==null)subject.earned=new Decimal(subject.earned).add(delta).toString();
 return changed;
}

function finishStudent(enrollmentId:string,identity:Record<string,unknown>,subjects:SubjectResult[],maternal:boolean):StudentResult {
  const total=subjects.reduce((sum,s)=>sum.add(s.earned??'0'),new Decimal(0));
  const maximum=subjects.reduce((sum,s)=>sum.add(s.maximum),new Decimal(0));
  const missingScores=subjects.filter(s=>s.missing).map(s=>`Note/appréciation manquante : ${s.label}.`);
  return {enrollmentId,identity,subjectResults:subjects.map(({missing,...s})=>s),totalEarned:total.toString(),totalMaximum:maximum.toString(),missingScores,rank:null,percentage:maternal||maximum.isZero()||missingScores.length?null:total.div(maximum).mul(100).toString()};
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
  const actor = await tx.user.findFirst({ where: { id: actorId, loginEnabled:true, roles: { some: { role: "DIR" } } }, select: { id: true } });
  if (!actor) throw new ForbiddenException("Cette action exige un compte Direction.");
}

async function writeAudit(tx: WriteClient, actorId: string, action: string, targetType: string, targetId: string) {
  await tx.auditEntry.create({ data: { actorId, action, targetType, targetId } });
}

function parseRejection(body: unknown) {
  if (!isObject(body) || typeof body.reason !== "string" || body.reason.trim() === "") {
    throw new BadRequestException("Le motif du rejet est obligatoire.");
  }
  return { reason: body.reason.trim() };
}

function parseSnapshot(value: unknown): GradeSnapshotEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => isObject(entry) && typeof entry.enrollmentId === "string" && (typeof entry.score === "string" || typeof entry.score === "number" || entry.score === null)
    ? [{ enrollmentId: entry.enrollmentId, score: entry.score, ...(typeof entry.status==="string"?{status:entry.status}:{}), ...(isObject(entry.appreciation)&&typeof entry.appreciation.QTE==="string"&&typeof entry.appreciation.QLT==="string"&&typeof entry.appreciation.COUL==="string"?{appreciation:{QTE:entry.appreciation.QTE,QLT:entry.appreciation.QLT,COUL:entry.appreciation.COUL,...(typeof entry.appreciation.observation==="string"?{observation:entry.appreciation.observation}:{})}}:{}) }]
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
    evaluation: { id: submission.evaluation.id, title: submission.evaluation.title, kind: submission.evaluation.kind, maxScore: submission.evaluation.maxScore.toString() },
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

function formatFinalResult(result:any) {
  const identity=object(result.identitySnapshot);
  // Les anciens snapshots ne contiennent pas nécessairement de total/maxima.
  // Une absence ne représente pas une cote zéro ; ne pas recalculer l'historique.
  return {id:result.id,identity,subjectResults:result.subjectResults,totalEarned:identity.totalEarned??null,totalMaximum:identity.totalMaximum??null,percentage:identity.percentage??null,rank:identity.rank??null};
}
