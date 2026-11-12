import { createClient } from "./client.mjs";
import { requireLocalFixtures } from "./env.mjs";

requireLocalFixtures();

const db = createClient();
const day = (value) => new Date(`${value}T00:00:00.000Z`);
const demoId = "da3e93d1-e67d-4b32-9df2-09f36fd21248";

try {
  const created = await db.$transaction(async (tx) => {
    if (await tx.auditEntry.findUnique({ where: { id: demoId } })) {
      // Complète uniquement le jeu fictif si celui-ci précède la migration ELEVE.
      const demoStudents = await tx.student.findMany({
        where: { matricule: { in: ["DEMO-E001", "DEMO-E002", "DEMO-E003"] } },
        select: { userId: true },
      });
      await tx.userRole.createMany({
        data: demoStudents.map(({ userId }) => ({ userId, userKind: "STUDENT", role: "ELEVE" })),
        skipDuplicates: true,
      });
      return false;
    }

    const year = await tx.schoolYear.create({
      data: { code: "DEMO-2026-2027", startsOn: day("2026-09-01"), endsOn: day("2027-06-30") },
    });
    const previousYear = await tx.schoolYear.create({
      data: { code: "DEMO-2025-2026", startsOn: day("2025-09-01"), endsOn: day("2026-06-30") },
    });
    const period = await tx.period.create({
      data: { schoolYearId: year.id, code: "P1", label: "Période 1", position: 1,
        startsOn: day("2026-09-01"), endsOn: day("2026-12-18") },
    });
    const schoolClass = await tx.schoolClass.create({
      data: { schoolYearId: year.id, code: "6A", label: "6e A" },
    });
    const previousClass = await tx.schoolClass.create({
      data: { schoolYearId: previousYear.id, code: "5A", label: "5e A" },
    });
    const classPeriod = await tx.classPeriod.create({
      data: { classId: schoolClass.id, periodId: period.id, schoolYearId: year.id },
    });

    const director = await tx.user.create({
      data: { firstName: "Direction", lastName: "Démo", roles: { create: { role: "DIR" } } },
    });
    const [previousTeacher, mathTeacher, frenchTeacher] = await Promise.all(
      ["Daniel", "Irène", "Nadia"].map((firstName) => tx.teacher.create({
        data: { user: { create: { firstName, lastName: "Démo", roles: { create: { role: "ENS" } } } } },
      })),
    );
    const [math, french] = await Promise.all([
      { code: "DEMO-MATH", label: "Mathématiques" },
      { code: "DEMO-FR", label: "Français" },
    ].map((data) => tx.classSubject.create({
      data: { schoolClass: { connect: { id: schoolClass.id } }, subject: { create: data } },
    })));
    async function assign(teacher, classSubject, from) {
      return tx.teacherAssignment.create({
        data: { teacherId: teacher.id, classId: schoolClass.id, classSubjectId: classSubject.id, startsOn: day(from) },
        include: { teacher: true },
      });
    }
    const firstAssignment = await assign(previousTeacher, math, "2026-09-01");
    const frenchAssignment = await assign(frenchTeacher, french, "2026-09-01");

    const students = await Promise.all(["Amina", "Basile", "Clara"].map((firstName, i) =>
      tx.student.create({
        data: {
          matricule: `DEMO-E00${i + 1}`,
          user: { create: {
            kind: "STUDENT", firstName, lastName: "Démo", roles: { create: { role: "ELEVE" } },
          } },
        },
        include: { user: true },
      }),
    ));
    await tx.enrollment.create({
      data: { studentId: students[0].id, classId: previousClass.id, schoolYearId: previousYear.id },
    });
    const enrollments = await Promise.all(students.map((student) => tx.enrollment.create({
      data: { studentId: student.id, classId: schoolClass.id, schoolYearId: year.id },
    })));

    async function evaluate(assignment, title, heldOn, maxScore, scores, rejectedFirstScore) {
      const evaluation = await tx.evaluation.create({
        data: { assignmentId: assignment.id, classPeriodId: classPeriod.id, classId: schoolClass.id,
          title, heldOn: day(heldOn), maxScore },
      });
      const snapshot = (values) => enrollments.map(({ id }, i) => ({ enrollmentId: id, score: String(values[i]) }));
      const draftScores = rejectedFirstScore === undefined ? scores : [rejectedFirstScore, ...scores.slice(1)];
      await tx.grade.createMany({ data: enrollments.map(({ id }, i) => ({
        evaluationId: evaluation.id, enrollmentId: id, classId: schoolClass.id, score: draftScores[i],
      })) });

      async function submitAndDecide(attempt, version, values, status) {
        const submission = await tx.submission.create({ data: {
          evaluationId: evaluation.id, attempt, evaluationVersion: version,
          submittedById: assignment.teacher.userId,
          gradeSnapshot: snapshot(values),
        } });
        await tx.evaluation.update({ where: { id: evaluation.id }, data: { state: "SUBMITTED", version } });
        return tx.submission.update({ where: { id: submission.id }, data: {
          status, decidedAt: new Date(), decidedById: director.id,
          reason: status === "REJECTED" ? "Exemple fictif : vérifier la première note." : null,
        } });
      }
      if (rejectedFirstScore !== undefined) {
        await submitAndDecide(1, 1, draftScores, "REJECTED");
        await tx.evaluation.update({ where: { id: evaluation.id }, data: { state: "REJECTED" } });
        await tx.grade.update({
          where: { evaluationId_enrollmentId: { evaluationId: evaluation.id, enrollmentId: enrollments[0].id } },
          data: { score: scores[0] },
        });
      }
      const version = rejectedFirstScore === undefined ? 1 : 2;
      const approved = await submitAndDecide(version, version, scores, "APPROVED");
      await tx.evaluation.update({ where: { id: evaluation.id }, data: { state: "VALIDATED" } });
      return { evaluationId: evaluation.id, submissionId: approved.id, version };
    }

    const math1 = await evaluate(firstAssignment, "Mathématiques : interrogation", "2026-09-24", 20, [15, 16, 11]);
    await tx.teacherAssignment.update({
      where: { id: firstAssignment.id }, data: { endsOn: day("2026-10-01") },
    });
    const secondAssignment = await assign(mathTeacher, math, "2026-10-01");
    const math2 = await evaluate(secondAssignment, "Mathématiques : exercice", "2026-10-15", 40, [30, 32, 22]);
    const fr = await evaluate(frenchAssignment, "Français : lecture", "2026-10-20", 20, [12, 14, 13], 10);

    // Valeurs attendues de ce jeu de test uniquement ; le module results implémentera le calcul.
    const mathMeans = ["15", "16", "11"];
    const frenchMeans = ["12", "14", "13"];
    const overallMeans = ["13.50", "15.00", "12.00"];
    const results = [];
    for (const [i, enrollment] of enrollments.entries()) {
      const { matricule, user: { firstName, lastName } } = students[i];
      results.push(await tx.resultSnapshot.create({ data: {
        classPeriodId: classPeriod.id, enrollmentId: enrollment.id, classId: schoolClass.id,
        identitySnapshot: { matricule, firstName, lastName, classLabel: schoolClass.label,
          schoolYearCode: year.code, periodCode: period.code },
        subjectResults: [{ subjectCode: "DEMO-MATH", meanOn20: mathMeans[i] },
          { subjectCode: "DEMO-FR", meanOn20: frenchMeans[i] }],
        sourceVersions: [math1, math2, fr],
        overallMean: overallMeans[i], calculationProfile: "DEMO_V1",
      } }));
    }
    await tx.classPeriod.update({ where: { id: classPeriod.id }, data: {
      closedAt: new Date(), closedById: director.id,
    } });
    await tx.auditEntry.create({ data: {
      id: demoId, actorId: director.id, action: "CLASS_PERIOD_CLOSED", targetType: "ClassPeriod", targetId: classPeriod.id,
    } });
    await tx.reportCard.createMany({ data: results.map(({ id }) => ({ resultSnapshotId: id, templateVersion: "DEMO_V1" })) });
    return true;
  });
  console.log(created ? "Parcours fictif DEMO_V1 inséré (clôturé, sans publication)." : "Parcours fictif déjà présent.");
} finally {
  await db.$disconnect();
}
