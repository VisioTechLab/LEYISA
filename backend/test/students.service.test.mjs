import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { StudentsService } from "../dist/modules/students/students.service.js";

const input = {
  firstName: "Aline",
  lastName: "Mabiala",
  matricule: "DEMO-TEST-001",
  birthDate: "2013-04-18",
  classId: "123e4567-e89b-12d3-a456-426614174000",
  schoolYearId: "123e4567-e89b-12d3-a456-426614174001",
};

function makeService(client) {
  return new StudentsService({ client });
}

test("register crée User, rôle, Student et Enrollment dans une transaction", async () => {
  let transactionCount = 0;
  let createArgs;
  const student = { id: "student-id" };
  const service = makeService({
    $transaction: async (callback) => {
      transactionCount += 1;
      return callback({
        student: {
          create: async (args) => {
            createArgs = args;
            return student;
          },
        },
      });
    },
  });

  assert.equal(await service.register(input), student);
  assert.equal(transactionCount, 1);
  assert.equal(createArgs.data.user.create.kind, "STUDENT");
  assert.equal(createArgs.data.user.create.roles.create.role, "ELEVE");
  assert.equal(createArgs.data.enrollments.create.classId, input.classId);
  assert.equal(createArgs.data.enrollments.create.schoolYearId, input.schoolYearId);
  assert.equal(createArgs.data.birthDate.toISOString(), "2013-04-18T00:00:00.000Z");
});

test("register refuse une date invalide avant la transaction", async () => {
  let transactionCount = 0;
  const service = makeService({
    $transaction: async () => {
      transactionCount += 1;
    },
  });

  await assert.rejects(
    () => service.register({ ...input, birthDate: "2013-02-31" }),
    BadRequestException,
  );
  assert.equal(transactionCount, 0);
});

test("register convertit le matricule dupliqué en conflit", async () => {
  const service = makeService({
    $transaction: async () => {
      throw Object.assign(new Error("duplicate"), { code: "P2002" });
    },
  });

  await assert.rejects(() => service.register(input), ConflictException);
});

test("list retourne les élèves avec identité, classe et année scolaire", async () => {
  const students = [{ id: "student-id" }];
  let query;
  const service = makeService({
    student: {
      findMany: async (args) => {
        query = args;
        return students;
      },
    },
  });

  assert.equal(await service.list(), students);
  assert.ok(query.include.user.select.firstName);
  assert.ok(query.include.enrollments.include.schoolClass.select.schoolYear.select.code);
});

test("registrationOptions renvoie les classes rattachées aux années existantes", async () => {
  const options = [{ id: input.schoolYearId, code: "2026-2027", classes: [] }];
  let query;
  const service = makeService({
    schoolYear: { findMany: async (args) => { query = args; return options; } },
  });

  assert.equal(await service.registrationOptions(), options);
  assert.ok(query.select.classes.select.id);
  assert.deepEqual(query.orderBy, { startsOn: "desc" });
});

test("findById valide l’identifiant et retourne le dossier", async () => {
  const student = { id: input.classId };
  let query;
  const service = makeService({
    student: {
      findUnique: async (args) => {
        query = args;
        return student;
      },
    },
  });

  assert.equal(await service.findById(input.classId), student);
  assert.deepEqual(query.where, { id: input.classId });
});

test("findById signale un identifiant invalide et un élève absent", async () => {
  const service = makeService({ student: { findUnique: async () => null } });

  await assert.rejects(() => service.findById("not-an-uuid"), BadRequestException);
  await assert.rejects(() => service.findById(input.classId), NotFoundException);
});
