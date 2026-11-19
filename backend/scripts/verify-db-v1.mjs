import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '../prisma/client.mjs';
import {requireLocalFixtures} from '../prisma/env.mjs';
requireLocalFixtures();const db=createClient();const rollback=new Error('ROLLBACK_LOCAL_VERIFY');let checks=0;
function pass(name){checks++;console.log(`OK — ${name}`);}
const day=s=>new Date(`${s}T00:00:00Z`);
try {
 const report=await db.reportCard.findFirst({where:{notice:'DEMO-V1'},include:{resultSnapshot:{include:{classPeriod:true,enrollment:{include:{student:{include:{user:{include:{roles:true,sessions:true}}}}}}}}}});
 assert.ok(report,'Exécuter le parcours API V1 avant db:verify. Aucun jeu statique n’est accepté comme preuve.');
 const result=report.resultSnapshot,cp=result.classPeriod,student=result.enrollment.student;
 assert.equal(student.user.kind,'STUDENT');pass('identité élève distincte du personnel');
 assert.equal(student.user.loginEnabled,false);pass('connexion élève désactivée par défaut');
 assert.equal(student.user.login,null);assert.equal(student.user.passwordHash,null);pass('aucun identifiant de connexion élève implicite');
 assert.equal(student.user.sessions.length,0);pass('aucune session élève créée par inscription');
 assert.deepEqual(student.user.roles.map(r=>r.role),['ELEVE']);pass('rôle élève cohérent');
 assert.ok(cp.closedAt&&cp.publishedAt);pass('bulletin issu de résultat clôturé et publié');
 assert.equal(report.notice,'DEMO-V1');pass('marque actuelle du bulletin');
 assert.match(result.calculationProfile,/DEMO-V1/);pass('profil versionné explicitement démo');
 // Contrôle SQL de forme uniquement ; aucune valeur de jeton n'est affichée.
 const [invalid]=await db.$queryRaw`SELECT count(*)::int AS count FROM "Session" WHERE "tokenHash" !~ '^[a-f0-9]{64}$'`;
 assert.equal(invalid.count,0);pass('seules empreintes SHA-256 stockées');
 try {await db.$transaction(async tx=>{
  async function refuses(name,query,codes=['23514']){
   await tx.$executeRawUnsafe('SAVEPOINT negative_case');let caught;
   try{await query();}catch(error){caught=error;}
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT negative_case');await tx.$executeRawUnsafe('RELEASE SAVEPOINT negative_case');
   assert.ok(caught,`${name} : écriture acceptée à tort`);
   const code=caught.meta?.driverAdapterError?.cause?.originalCode??caught.code;
   assert.ok(codes.includes(code),`${name} : code ${code}`);pass(name);
  }
  const audit=await tx.auditEntry.findFirstOrThrow();
  await refuses('audit non modifiable',()=>tx.$executeRaw`UPDATE "AuditEntry" SET action='INVALID' WHERE id=${audit.id}::uuid`,['23514','42501']);
  await refuses('audit non supprimable',()=>tx.$executeRaw`DELETE FROM "AuditEntry" WHERE id=${audit.id}::uuid`,['23514','42501']);
  await refuses('snapshot clôturé non modifiable',()=>tx.$executeRaw`UPDATE "ResultSnapshot" SET "overallMean"=0 WHERE id=${result.id}::uuid`);
  await refuses('snapshot clôturé non supprimable',()=>tx.$executeRaw`DELETE FROM "ResultSnapshot" WHERE id=${result.id}::uuid`);
  await refuses('réouverture refusée',()=>tx.$executeRaw`UPDATE "ClassPeriod" SET "closedAt"=NULL,"closedById"=NULL WHERE id=${cp.id}::uuid`);
  await refuses('dépublication silencieuse refusée',()=>tx.$executeRaw`UPDATE "ClassPeriod" SET "publishedAt"=NULL,"publishedById"=NULL WHERE id=${cp.id}::uuid`);
  await refuses('bulletin logique non duplicable',()=>tx.$executeRaw`INSERT INTO "ReportCard" ("resultSnapshotId","templateVersion") VALUES (${result.id}::uuid,${report.templateVersion})`,['23505']);
  await refuses('nouveau bulletin avec ancienne marque refusé',()=>tx.$executeRaw`INSERT INTO "ReportCard" ("resultSnapshotId","templateVersion",notice) VALUES (${result.id}::uuid,'INVALID','DÉMONSTRATION - NON OFFICIEL')`);
  await refuses('identifiants élève non activables implicitement',()=>tx.$executeRaw`UPDATE "User" SET login='invalid',"passwordHash"='invalid',"loginEnabled"=true WHERE id=${student.userId}::uuid`);
  await refuses('rôle STAFF interdit à identité élève',()=>tx.$executeRaw`INSERT INTO "UserRole" ("userId","userKind",role) VALUES (${student.userId}::uuid,'STUDENT','ENS')`);
  const year=await tx.schoolYear.create({data:{code:`VERIFY-${randomUUID()}`,startsOn:day('2020-09-01'),endsOn:day('2021-07-02')}});
  const period=await tx.period.create({data:{schoolYearId:year.id,profile:'SECONDAIRE_TECHNIQUE',code:'P1',kind:'PERIODE',label:'P1',position:1,startsOn:day('2020-09-01'),endsOn:day('2020-11-04')}});
  await tx.period.create({data:{schoolYearId:year.id,profile:'PRIMAIRE',code:'P1',kind:'PERIODE',label:'P1 primaire',position:1,startsOn:day('2020-09-01'),endsOn:day('2020-11-04')}});pass('même code et chevauchement permis entre cycles');
  await tx.period.create({data:{schoolYearId:year.id,profile:'SECONDAIRE_TECHNIQUE',code:'E1',kind:'EXAMEN',label:'E1',position:2,startsOn:day('2020-10-01'),endsOn:day('2020-10-08')}});pass('créneau examen chevauchant période permis');
  await refuses('périodes ordinaires du même cycle non chevauchantes',()=>tx.$executeRaw`INSERT INTO "Period" ("schoolYearId",code,label,position,"startsOn","endsOn") VALUES (${year.id}::uuid,'BAD','BAD',3,'2020-10-01','2020-11-01')`,['23P01']);
  await refuses('période hors année refusée',()=>tx.$executeRaw`INSERT INTO "Period" ("schoolYearId",code,label,position,"startsOn","endsOn") VALUES (${year.id}::uuid,'OUT','OUT',3,'2019-01-01','2019-02-01')`);
  const cls=await tx.schoolClass.create({data:{schoolYearId:year.id,code:'VERIFY',label:'Classe temporaire'}});
  const unit=await tx.classPeriod.create({data:{classId:cls.id,periodId:period.id,schoolYearId:year.id}});
  const subject=await tx.subject.create({data:{code:`VERIFY-${randomUUID()}`,label:'Matière temporaire'}});
  const cs=await tx.classSubject.create({data:{classId:cls.id,subjectId:subject.id,resultMaxScore:'20',componentMaxima:{P1:'20'},source:'DEMO_PROPOSE'}});
  const teacher=await tx.teacher.findFirstOrThrow();
  const assignment=await tx.teacherAssignment.create({data:{teacherId:teacher.id,classSubjectId:cs.id,classId:cls.id,startsOn:year.startsOn}});
  await refuses('affectation simultanée refusée',()=>tx.$executeRaw`INSERT INTO "TeacherAssignment" ("teacherId","classSubjectId","classId","startsOn") VALUES (${teacher.id}::uuid,${cs.id}::uuid,${cls.id}::uuid,'2020-10-01')`,['23P01']);
  const enrollment=await tx.enrollment.create({data:{studentId:student.id,classId:cls.id,schoolYearId:year.id}});
  await refuses('double inscription annuelle refusée',()=>tx.$executeRaw`INSERT INTO "Enrollment" ("studentId","classId","schoolYearId") VALUES (${student.id}::uuid,${cls.id}::uuid,${year.id}::uuid)`,['23505']);
  await refuses('classe et année incohérentes refusées',()=>tx.$executeRaw`INSERT INTO "Enrollment" ("studentId","classId","schoolYearId") VALUES (${student.id}::uuid,${cls.id}::uuid,${cp.schoolYearId}::uuid)`,['23503','23505']);
  const evaluation=await tx.evaluation.create({data:{assignmentId:assignment.id,classPeriodId:unit.id,classId:cls.id,title:'Brouillon temporaire',heldOn:day('2020-10-02'),maxScore:'20'}});
  const grade=await tx.grade.create({data:{evaluationId:evaluation.id,enrollmentId:enrollment.id,classId:cls.id,score:null}});assert.equal(grade.score,null);pass('note vide distincte de zéro');
  await refuses('note négative refusée',()=>tx.$executeRaw`UPDATE "Grade" SET score=-1 WHERE id=${grade.id}::uuid`);
  await refuses('note NaN refusée',()=>tx.$executeRaw`UPDATE "Grade" SET score='NaN' WHERE id=${grade.id}::uuid`);
  await refuses('note hors barème refusée',()=>tx.$executeRaw`UPDATE "Grade" SET score=21 WHERE id=${grade.id}::uuid`);
  await refuses('grade d’une autre classe refusé',()=>tx.$executeRaw`INSERT INTO "Grade" ("evaluationId","enrollmentId","classId",score,"updatedAt") VALUES (${evaluation.id}::uuid,${result.enrollmentId}::uuid,${cls.id}::uuid,10,now())`,['23503']);
  await refuses('grade dupliqué refusé',()=>tx.$executeRaw`INSERT INTO "Grade" ("evaluationId","enrollmentId","classId",score,"updatedAt") VALUES (${evaluation.id}::uuid,${enrollment.id}::uuid,${cls.id}::uuid,10,now())`,['23505']);
  await refuses('programme utilisé non réécrit',()=>tx.$executeRaw`UPDATE "ClassSubject" SET "resultMaxScore"=30 WHERE id=${cs.id}::uuid`);
  await refuses('clôture incomplète refusée',()=>tx.$executeRaw`UPDATE "ClassPeriod" SET "closedAt"=now(),"closedById"=${cp.closedById}::uuid WHERE id=${unit.id}::uuid`);
  await refuses('publication avant clôture refusée',()=>tx.$executeRaw`UPDATE "ClassPeriod" SET "publishedAt"=now(),"publishedById"=${cp.closedById}::uuid WHERE id=${unit.id}::uuid`);
  await tx.grade.update({where:{id:grade.id},data:{score:'0'}});pass('zéro valide persisté');
  const submission=await tx.submission.create({data:{evaluationId:evaluation.id,attempt:1,evaluationVersion:1,submittedById:teacher.userId,gradeSnapshot:[{enrollmentId:enrollment.id,score:'0'}]}});
  await tx.evaluation.update({where:{id:evaluation.id},data:{state:'SUBMITTED'}});
  await refuses('note soumise verrouillée',()=>tx.$executeRaw`UPDATE "Grade" SET score=1 WHERE id=${grade.id}::uuid`);
  await refuses('auto-décision refusée en DB',()=>tx.$executeRaw`UPDATE "Submission" SET status='APPROVED',"decidedById"="submittedById","decidedAt"=now() WHERE id=${submission.id}::uuid`);
  await refuses('historique de soumission non effaçable',()=>tx.$executeRaw`DELETE FROM "Submission" WHERE id=${submission.id}::uuid`);
  throw rollback;
 },{timeout:30000});}catch(error){if(error!==rollback)throw error;}
 console.log(`${checks} contrôles réussis. Toutes les écritures de vérification ont été annulées.`);
}finally{await db.$disconnect();}
