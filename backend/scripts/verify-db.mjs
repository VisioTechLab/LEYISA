import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "../prisma/client.mjs";
import { requireLocalFixtures } from "../prisma/env.mjs";

requireLocalFixtures();

const db = createClient();
const rollback = new Error("Annulation volontaire des écritures de vérification.");
const orphan = "00000000-0000-0000-0000-000000000001";
const day = (value) => new Date(`${value}T00:00:00.000Z`);
let checks = 0;
function pass(name) {
  checks++;
  console.log(`OK — ${name}`);
}

try {
  const year = await db.schoolYear.findUniqueOrThrow({ where: { code: "DEMO-2026-2027" } });
  const student = await db.student.findUniqueOrThrow({
    where: { matricule: "DEMO-E001" },
    include: { user: { include: { roles: true, sessions: true } }, enrollments: true },
  });
  const enrollment = student.enrollments.find((row) => row.schoolYearId === year.id);
  const { classId } = enrollment;
  const classPeriod = await db.classPeriod.findFirstOrThrow({ where: { classId, closedAt: { not: null } } });
  const result = await db.resultSnapshot.findFirstOrThrow({
    where: { classPeriodId: classPeriod.id, enrollmentId: enrollment.id }, include: { reportCards: true },
  });
  const evaluated = await db.evaluation.findFirstOrThrow({
    where: { classPeriodId: classPeriod.id, title: "Mathématiques : interrogation" }, include: { assignment: true },
  });
  const submission = await db.submission.findFirstOrThrow({
    where: { evaluation: { classPeriodId: classPeriod.id }, status: "REJECTED" },
  });

  assert.equal(student.enrollments.length, 2);
  assert.equal(new Set(student.enrollments.map((row) => row.schoolYearId)).size, 2);
  assert.equal(student.user.kind, "STUDENT");
  assert.equal(student.user.loginEnabled, false);
  assert.equal(student.user.login, null);
  assert.equal(student.user.passwordHash, null);
  assert.deepEqual(student.user.roles.map(({ role, userKind }) => [role, userKind]), [["ELEVE", "STUDENT"]]);
  assert.deepEqual(student.user.sessions, []);
  pass("dossier unique, deux années conservées, rôle ELEVE sans accès");

  assert.equal(result.overallMean.toFixed(2), "13.50");
  assert.equal(result.calculationProfile, "DEMO_V1");
  assert.equal(result.reportCards[0].notice, "DÉMONSTRATION - NON OFFICIEL");
  assert.equal(classPeriod.publishedAt, null);
  assert.equal(submission.gradeSnapshot.find((grade) => grade.enrollmentId === enrollment.id).score, "10");
  const approved = await db.submission.findFirstOrThrow({ where: { evaluationId: submission.evaluationId, status: "APPROVED" } });
  assert.equal(approved.attempt, submission.attempt + 1);
  assert.equal(approved.gradeSnapshot.find((grade) => grade.enrollmentId === enrollment.id).score, "12");
  const assignments = await db.teacherAssignment.findMany({
    where: { classSubjectId: evaluated.assignment.classSubjectId }, orderBy: { startsOn: "asc" },
  });
  assert.equal(assignments.length, 2);
  assert.equal(assignments[0].id, evaluated.assignmentId);
  assert.notEqual(assignments[0].teacherId, assignments[1].teacherId);
  assert.equal(+assignments[0].endsOn, +assignments[1].startsOn);
  pass("remplacement, rejet corrigé, résultat clôturé à 13,50 et bulletin issu du snapshot");

  try {
    await db.$transaction(async (tx) => {
      // Chaque refus PostgreSQL annule son instruction ; le reste de la transaction reste vérifiable.
      async function refuses(name, code, query, message) {
        await tx.$executeRawUnsafe("SAVEPOINT leyisa_negative_case");
        try {
          await query();
          assert.fail(`Écriture invalide acceptée : ${name}`);
        } catch (error) {
          const pg = error.meta?.driverAdapterError?.cause;
          assert.equal(pg?.originalCode, code, `${name} : ${error.message}`);
          if (message) assert.ok(pg.originalMessage.includes(message), error.message);
        }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT leyisa_negative_case");
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT leyisa_negative_case");
        pass(name);
      }

      const otherStudent = await tx.user.create({ data: { kind: "STUDENT", firstName: "Test", lastName: "Fictif" } });
      const unusedUser = await tx.user.create({ data: { kind: "STUDENT", firstName: "Test", lastName: "Doublon" } });
      const otherClass = await tx.schoolClass.create({
        data: { schoolYearId: year.id, code: `VERIFY-${randomUUID()}`, label: "Classe de test temporaire" },
      });
      const otherEnrollment = await tx.student.create({
        data: { userId: otherStudent.id, matricule: `VERIFY-${randomUUID()}`,
          enrollments: { create: { classId: otherClass.id, schoolYearId: year.id } } },
        include: { enrollments: true },
      });
      const otherEnrollmentId = otherEnrollment.enrollments[0].id;
      const previous = student.enrollments.find((row) => row.schoolYearId !== year.id);

      await refuses("matricule en double", "23505", () => tx.$executeRaw`
        INSERT INTO "Student" ("userId", matricule) VALUES (${unusedUser.id}::uuid, ${student.matricule})`, "Student_matricule_key");
      await refuses("classe et année incohérentes", "23503", () => tx.$executeRaw`
        INSERT INTO "Enrollment" ("studentId", "classId", "schoolYearId")
        VALUES (${otherEnrollment.id}::uuid, ${otherClass.id}::uuid, ${previous.schoolYearId}::uuid)`, "Enrollment_classId_schoolYearId_fkey");
      await refuses("deux inscriptions de l’élève pour la même année", "23505", () => tx.$executeRaw`
        INSERT INTO "Enrollment" ("studentId", "classId", "schoolYearId")
        VALUES (${student.id}::uuid, ${otherClass.id}::uuid, ${year.id}::uuid)`, "Enrollment_studentId_schoolYearId_key");
      await refuses("inscription orpheline", "23503", () => tx.$executeRaw`
        INSERT INTO "Enrollment" ("studentId", "classId", "schoolYearId")
        VALUES (${orphan}::uuid, ${classId}::uuid, ${year.id}::uuid)`, "Enrollment_studentId_fkey");
      await refuses("inscription historique non réattribuable", "23514", () => tx.$executeRaw`
        UPDATE "Enrollment" SET "studentId" = ${otherEnrollment.id}::uuid WHERE id = ${enrollment.id}::uuid`);
      await refuses("affectations qui se chevauchent", "23P01", () => tx.$executeRaw`
        INSERT INTO "TeacherAssignment" ("teacherId", "classSubjectId", "classId", "startsOn")
        VALUES (${assignments[1].teacherId}::uuid, ${assignments[1].classSubjectId}::uuid, ${classId}::uuid, '2026-11-01')`);
      await refuses("ancien enseignant non remplaçable dans une affectation utilisée", "23514", () => tx.$executeRaw`
        UPDATE "TeacherAssignment" SET "teacherId" = ${assignments[1].teacherId}::uuid WHERE id = ${assignments[0].id}::uuid`);
      await refuses("matière historique non réattribuable", "23514", () => tx.$executeRaw`
        UPDATE "ClassSubject" SET "subjectId" = ${orphan}::uuid WHERE id = ${assignments[0].classSubjectId}::uuid`, "class subject cannot be reassigned");
      await refuses("dates de période qui se chevauchent", "23P01", () => tx.$executeRaw`
        INSERT INTO "Period" ("schoolYearId", code, label, position, "startsOn", "endsOn")
        VALUES (${year.id}::uuid, 'VERIFY-P', 'Test', 2, '2026-12-01', '2026-12-20')`);
      await refuses("un élève ne peut recevoir un rôle du personnel", "23514", () => tx.$executeRaw`
        INSERT INTO "UserRole" ("userId", "userKind", role) VALUES (${student.userId}::uuid, 'STUDENT', 'ENS')`, "user_role_matches_kind");
      await refuses("un membre du personnel ne peut recevoir le rôle ELEVE", "23514", () => tx.$executeRaw`
        INSERT INTO "UserRole" ("userId", role) VALUES (${classPeriod.closedById}::uuid, 'ELEVE')`, "user_role_matches_kind");
      await refuses("changer le type porté par le rôle ne contourne pas le lien au User", "23503", () => tx.$executeRaw`
        INSERT INTO "UserRole" ("userId", "userKind", role) VALUES (${student.userId}::uuid, 'STAFF', 'ENS')`, "UserRole_userId_userKind_fkey");
      await refuses("impossible d’activer l’accès de l’élève même muni du rôle ELEVE", "23514", () => tx.$executeRaw`
        UPDATE "User" SET "loginEnabled" = true, login = 'verify-student', "passwordHash" = repeat('x', 64)
        WHERE id = ${student.userId}::uuid`, "user_student_no_credentials");
      await refuses("impossible d’ouvrir une session pour un élève", "23514", () => tx.$executeRaw`
        INSERT INTO "Session" ("userId", "tokenHash", "expiresAt")
        VALUES (${student.userId}::uuid, repeat('a', 64), now() + interval '1 hour')`, "enabled staff login");
      await refuses("impossible d’ajouter un identifiant de connexion élève", "23514", () => tx.$executeRaw`
        UPDATE "User" SET login = 'verify-student' WHERE id = ${student.userId}::uuid`, "user_student_no_credentials");

      const nextPeriod = await tx.period.create({ data: {
        schoolYearId: year.id, code: "VERIFY-P2", label: "P2 test", position: 2,
        startsOn: day("2027-01-04"), endsOn: day("2027-03-26"),
      } });
      const open = await tx.classPeriod.create({
        data: { schoolYearId: year.id, periodId: nextPeriod.id, classId },
      });
      const draft = await tx.evaluation.create({ data: {
        classId, classPeriodId: open.id, assignmentId: assignments[1].id,
        title: "Brouillon de test", heldOn: day("2027-02-10"), maxScore: 20,
      } });
      const blank = await tx.grade.create({ data: { evaluationId: draft.id, enrollmentId: enrollment.id, classId } });
      assert.equal(blank.score, null);
      pass("note vide conservée sans conversion en zéro");

      await refuses("note pour une autre classe", "23503", () => tx.$executeRaw`
        INSERT INTO "Grade" ("evaluationId", "enrollmentId", "classId", score, "updatedAt")
        VALUES (${draft.id}::uuid, ${otherEnrollmentId}::uuid, ${classId}::uuid, 10, now())`, "Grade_enrollmentId_classId_fkey");
      await refuses("note dupliquée", "23505", () => tx.$executeRaw`
        INSERT INTO "Grade" ("evaluationId", "enrollmentId", "classId", score, "updatedAt")
        VALUES (${draft.id}::uuid, ${enrollment.id}::uuid, ${classId}::uuid, 10, now())`, "Grade_evaluationId_enrollmentId_key");
      await refuses("note au-dessus du barème", "23514", () => tx.$executeRaw`
        UPDATE "Grade" SET score = 21 WHERE id = ${blank.id}::uuid`, "exceeds evaluation scale");
      await refuses("date d’évaluation hors période", "23514", () => tx.$executeRaw`
        UPDATE "Evaluation" SET "heldOn" = '2027-03-30' WHERE id = ${draft.id}::uuid`, "outside period");
      await refuses("clôture incomplète", "23514", () => tx.$executeRaw`
        UPDATE "ClassPeriod" SET "closedAt" = now(), "closedById" = ${classPeriod.closedById}::uuid
        WHERE id = ${open.id}::uuid`, "closing requires");
      await refuses("publication avant la clôture", "23514", () => tx.$executeRaw`
        UPDATE "ClassPeriod" SET "publishedAt" = now(), "publishedById" = ${classPeriod.closedById}::uuid
        WHERE id = ${open.id}::uuid`, "publication history");
      await refuses("note clôturée non modifiable", "23514", () => tx.$executeRaw`
        UPDATE "Grade" SET score = 0 WHERE "evaluationId" = ${evaluated.id}::uuid`, "class period is closed");
      await refuses("tentative rejetée non effaçable", "23514", () => tx.$executeRaw`
        DELETE FROM "Submission" WHERE id = ${submission.id}::uuid`, "history cannot be deleted");
      await refuses("résultat clôturé non modifiable", "23514", () => tx.$executeRaw`
        UPDATE "ResultSnapshot" SET "overallMean" = 0 WHERE id = ${result.id}::uuid`, "class period is closed");
      await refuses("résultat clôturé non supprimable", "23514", () => tx.$executeRaw`
        DELETE FROM "ResultSnapshot" WHERE id = ${result.id}::uuid`, "class period is closed");
      await refuses("réouverture interdite", "23514", () => tx.$executeRaw`
        UPDATE "ClassPeriod" SET "closedAt" = NULL, "closedById" = NULL WHERE id = ${classPeriod.id}::uuid`, "closure and publication history");
      await refuses("bulletin logique non duplicable", "23505", () => tx.$executeRaw`
        INSERT INTO "ReportCard" ("resultSnapshotId", "templateVersion") VALUES (${result.id}::uuid, 'DEMO_V1')`);

      const published = await tx.classPeriod.update({ where: { id: classPeriod.id },
        data: { publishedAt: new Date(), publishedById: classPeriod.closedById },
      });
      assert.ok(published.publishedAt);
      assert.equal(+published.closedAt, +classPeriod.closedAt);
      assert.equal((await tx.resultSnapshot.findUniqueOrThrow({ where: { id: result.id } })).overallMean.toFixed(2), "13.50");
      pass("publication après clôture sans altérer le résultat");
      throw rollback;
    }, { timeout: 15000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(`${checks} contrôles réussis. Écritures de test annulées.`);
} finally {
  await db.$disconnect();
}
