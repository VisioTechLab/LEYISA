// Tests avec écritures : exécutés uniquement sur un PostgreSQL local (loopback),
// migré avec `npm run db:migrate`. Ignorés sur la base commune.
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { NestFactory } from "@nestjs/core";

function localDatabase() {
  try {
    const { hostname } = new URL(process.env.DATABASE_URL ?? "");
    return (process.env.LEYISA_DB_MODE ?? "local") === "local" && ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
}

const skip = localDatabase() ? false : "PostgreSQL local requis (LEYISA_DB_MODE=local et DATABASE_URL sur loopback)";
const day = (value) => new Date(`${value}T00:00:00.000Z`);
const suffix = randomUUID().slice(0, 8);

let app;
let db;
let base;
let fixture;

async function call(method, path, body) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  if (skip) return;
  const { createClient } = await import("../prisma/client.mjs");
  const { EvaluationsModule } = await import("../dist/modules/evaluations/evaluations.module.js");
  db = createClient();

  // Jeu fictif propre à cette exécution : une classe ouverte, deux élèves, un enseignant affecté.
  const year = await db.schoolYear.create({
    data: { code: `TEST-${suffix}`, startsOn: day("2026-09-01"), endsOn: day("2027-06-30") },
  });
  const period = await db.period.create({
    data: { schoolYearId: year.id, code: "P1", label: "Période 1", position: 1,
      startsOn: day("2026-09-01"), endsOn: day("2026-12-18") },
  });
  const schoolClass = await db.schoolClass.create({ data: { schoolYearId: year.id, code: "T1", label: "Classe de test" } });
  const otherClass = await db.schoolClass.create({ data: { schoolYearId: year.id, code: "T2", label: "Autre classe" } });
  const classPeriod = await db.classPeriod.create({
    data: { classId: schoolClass.id, periodId: period.id, schoolYearId: year.id },
  });
  const classSubject = await db.classSubject.create({
    data: { schoolClass: { connect: { id: schoolClass.id } },
      subject: { create: { code: `TEST-MATH-${suffix}`, label: "Mathématiques" } } },
  });
  const teacher = await db.teacher.create({
    data: { user: { create: { firstName: "Enseignant", lastName: "Test", roles: { create: { role: "ENS" } } } } },
  });
  const assignment = await db.teacherAssignment.create({
    data: { teacherId: teacher.id, classId: schoolClass.id, classSubjectId: classSubject.id, startsOn: day("2026-09-01") },
  });
  const students = [];
  for (const [index, firstName] of ["Amina", "Basile", "Clara"].entries()) {
    students.push(await db.student.create({
      data: { matricule: `TEST-${suffix}-${index}`,
        user: { create: { kind: "STUDENT", firstName, lastName: "Test", roles: { create: { role: "ELEVE" } } } } },
    }));
  }
  const enrollments = [];
  for (const student of students.slice(0, 2)) {
    enrollments.push(await db.enrollment.create({
      data: { studentId: student.id, classId: schoolClass.id, schoolYearId: year.id },
    }));
  }
  const outsider = await db.enrollment.create({
    data: { studentId: students[2].id, classId: otherClass.id, schoolYearId: year.id },
  });
  const evaluation = await db.evaluation.create({
    data: { assignmentId: assignment.id, classPeriodId: classPeriod.id, classId: schoolClass.id,
      title: `Interrogation de test ${suffix}`, heldOn: day("2026-10-08"), maxScore: 20 },
  });
  const empty = await db.evaluation.create({
    data: { assignmentId: assignment.id, classPeriodId: classPeriod.id, classId: schoolClass.id,
      title: `Grille vide ${suffix}`, heldOn: day("2026-10-09"), maxScore: 20 },
  });
  const director = await db.user.create({
    data: { firstName: "Direction", lastName: "Test", roles: { create: { role: "DIR" } } },
  });
  fixture = { evaluation, empty, enrollments, outsider, teacher, director };

  app = await NestFactory.create(EvaluationsModule, { logger: false, abortOnError: false });
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});

after(async () => {
  await app?.close();
  await db?.$disconnect();
});

test("consultation : la liste contient l'évaluation et son contexte", { skip }, async () => {
  const { status, body } = await call("GET", "/evaluations");
  assert.equal(status, 200);
  const found = body.find(({ id }) => id === fixture.evaluation.id);
  assert.equal(found.state, "DRAFT");
  assert.equal(found.editable, true);
  assert.equal(found.maxScore, "20");
  assert.equal(found.heldOn, "2026-10-08");
  assert.equal(found.schoolClass.code, "T1");
  assert.equal(found.subject.label, "Mathématiques");
  assert.equal(found.teacher.lastName, "Test");
});

test("consultation : le détail liste les inscriptions de la classe, sans note au départ", { skip }, async () => {
  const { status, body } = await call("GET", `/evaluations/${fixture.evaluation.id}`);
  assert.equal(status, 200);
  assert.deepEqual(body.grades.map(({ firstName, score }) => [firstName, score]), [["Amina", null], ["Basile", null]]);
  assert.equal(body.lastSubmission, null);
});

test("consultation : identifiant inconnu ou mal formé", { skip }, async () => {
  assert.equal((await call("GET", `/evaluations/${randomUUID()}`)).status, 404);
  assert.equal((await call("GET", "/evaluations/pas-un-uuid")).status, 400);
});

test("saisie : les notes hors limites sont refusées et rien n'est enregistré", { skip }, async () => {
  const [first, second] = fixture.enrollments;
  const path = `/evaluations/${fixture.evaluation.id}/grades`;
  for (const score of [-1, 20.5, 21, "abc", "12,5"]) {
    const { status, body } = await call("PUT", path, { grades: [
      { enrollmentId: first.id, score: 10 },
      { enrollmentId: second.id, score },
    ] });
    assert.equal(status, 400, `note acceptée à tort : ${score}`);
    assert.deepEqual(body.errors.map(({ enrollmentId }) => enrollmentId), [second.id]);
  }
  assert.equal(await db.grade.count({ where: { evaluationId: fixture.evaluation.id } }), 0);
});

test("saisie : une inscription d'une autre classe est refusée", { skip }, async () => {
  const { status, body } = await call("PUT", `/evaluations/${fixture.evaluation.id}/grades`, {
    grades: [{ enrollmentId: fixture.outsider.id, score: 10 }],
  });
  assert.equal(status, 400);
  assert.equal(body.errors[0].enrollmentId, fixture.outsider.id);
});

test("saisie : corps vide ou mal formé", { skip }, async () => {
  const path = `/evaluations/${fixture.evaluation.id}/grades`;
  assert.equal((await call("PUT", path, {})).status, 400);
  assert.equal((await call("PUT", path, { grades: [] })).status, 400);
  assert.equal((await call("PUT", `/evaluations/${randomUUID()}/grades`, { grades: [] })).status, 404);
});

test("saisie : les notes sont enregistrées, relues et modifiables", { skip }, async () => {
  const [first, second] = fixture.enrollments;
  const path = `/evaluations/${fixture.evaluation.id}/grades`;
  const saved = await call("PUT", path, { grades: [
    { enrollmentId: first.id, score: 15 },
    { enrollmentId: second.id, score: "12.5" },
  ] });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.grades.map(({ score }) => score), ["15", "12.5"]);

  // Envoi partiel : la note absente de l'envoi reste inchangée ; une note peut redevenir vide.
  await call("PUT", path, { grades: [{ enrollmentId: second.id, score: null }] });
  const reread = await call("GET", `/evaluations/${fixture.evaluation.id}`);
  assert.deepEqual(reread.body.grades.map(({ score }) => score), ["15", null]);
  assert.equal(reread.body.state, "DRAFT");
});

test("soumission : une grille sans aucune note est refusée", { skip }, async () => {
  const { status } = await call("POST", `/evaluations/${fixture.empty.id}/submission`);
  assert.equal(status, 409);
  assert.equal(await db.submission.count({ where: { evaluationId: fixture.empty.id } }), 0);
});

test("soumission : la grille est figée et l'évaluation attend une décision", { skip }, async () => {
  const [first, second] = fixture.enrollments;
  const id = fixture.evaluation.id;
  const { status, body } = await call("POST", `/evaluations/${id}/submission`);
  assert.equal(status, 201);
  assert.equal(body.state, "SUBMITTED");
  assert.equal(body.editable, false);
  assert.equal(body.lastSubmission.status, "PENDING");
  assert.equal(body.lastSubmission.attempt, 1);

  const submission = await db.submission.findFirstOrThrow({ where: { evaluationId: id } });
  assert.equal(submission.evaluationVersion, 1);
  assert.equal(submission.submittedById, fixture.teacher.userId);
  const snapshot = [...submission.gradeSnapshot].sort((a, b) => String(a.score).localeCompare(String(b.score)));
  assert.deepEqual(snapshot, [{ enrollmentId: first.id, score: "15" }, { enrollmentId: second.id, score: null }]);

  // Tant que la décision n'est pas prise : ni nouvelle saisie, ni seconde soumission.
  const blocked = await call("PUT", `/evaluations/${id}/grades`, { grades: [{ enrollmentId: first.id, score: 1 }] });
  assert.equal(blocked.status, 409);
  assert.equal((await call("POST", `/evaluations/${id}/submission`)).status, 409);
  assert.equal(await db.submission.count({ where: { evaluationId: id } }), 1);
});

test("après un rejet : la correction puis une nouvelle soumission sont possibles", { skip }, async () => {
  const [first] = fixture.enrollments;
  const id = fixture.evaluation.id;
  // Le rejet relève du module results ; il est simulé ici comme dans le jeu de données commun.
  const pending = await db.submission.findFirstOrThrow({ where: { evaluationId: id, status: "PENDING" } });
  await db.$transaction([
    db.submission.update({ where: { id: pending.id }, data: {
      status: "REJECTED", decidedAt: new Date(), decidedById: fixture.director.id, reason: "Exemple fictif : vérifier.",
    } }),
    db.evaluation.update({ where: { id }, data: { state: "REJECTED" } }),
  ]);

  const rejected = await call("GET", `/evaluations/${id}`);
  assert.equal(rejected.body.editable, true);
  assert.equal(rejected.body.lastSubmission.status, "REJECTED");
  assert.equal(rejected.body.lastSubmission.reason, "Exemple fictif : vérifier.");

  assert.equal((await call("PUT", `/evaluations/${id}/grades`, { grades: [{ enrollmentId: first.id, score: 16 }] })).status, 200);
  const again = await call("POST", `/evaluations/${id}/submission`);
  assert.equal(again.status, 201);
  assert.equal(again.body.lastSubmission.attempt, 2);
  assert.equal(again.body.version, 2);
});

test("après validation : les notes ne sont plus modifiables", { skip }, async () => {
  const [first] = fixture.enrollments;
  const id = fixture.evaluation.id;
  const pending = await db.submission.findFirstOrThrow({ where: { evaluationId: id, status: "PENDING" } });
  await db.$transaction([
    db.submission.update({ where: { id: pending.id }, data: {
      status: "APPROVED", decidedAt: new Date(), decidedById: fixture.director.id,
    } }),
    db.evaluation.update({ where: { id }, data: { state: "VALIDATED" } }),
  ]);
  assert.equal((await call("PUT", `/evaluations/${id}/grades`, { grades: [{ enrollmentId: first.id, score: 1 }] })).status, 409);
  assert.equal((await call("POST", `/evaluations/${id}/submission`)).status, 409);
});
