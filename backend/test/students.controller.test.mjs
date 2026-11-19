import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { StudentsController } from "../dist/modules/students/students.controller.js";
import { StudentsService } from "../dist/modules/students/students.service.js";
import { StudentsSessionGuard } from "../dist/modules/students/students-session.guard.js";
import { PrismaService } from "../dist/common/prisma.service.js";

import { AuthService } from "../dist/modules/auth/auth.service.js";
import { PermissionGuard } from "../dist/modules/auth/permission.guard.js";
const context={userId:"u-sec",login:"sec",roles:["SEC"]};
const sample = [{ id: "student-1", matricule: "DEMO-001" }];
let receivedInput;
class StudentsControllerTestModule {}
Module({
  controllers: [StudentsController],
  providers: [
    { provide: StudentsService, useValue: {
      list: async () => sample,
      registrationOptions: async () => [{ id: "year-1", classes: [{ id: "class-1" }] }],
      register: async (input) => { receivedInput = input; return sample[0]; },
    } },
    StudentsSessionGuard,PermissionGuard,
    {provide:AuthService,useValue:{resolveSession:async()=>context}},
    { provide: PrismaService, useValue: {
      client: { session: { findFirst: async () => ({ user: { kind: "STAFF", roles: [{ role: "SEC" }] } }) } },
    } },
  ],
})(StudentsControllerTestModule);

let app;
let baseUrl;
before(async () => {
  app = await NestFactory.create(StudentsControllerTestModule, { logger: false, abortOnError: false });
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});
after(async () => app?.close());

test("GET /students retourne la liste sans cache", async () => {
  const response = await fetch(`${baseUrl}/students`, { headers: { Cookie: `leyisa_session=${"A".repeat(48)}` } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), sample);
});

test("GET /students/registration-options retourne les classes proposées", async () => {
  const response = await fetch(`${baseUrl}/students/registration-options`, { headers: { Cookie: `leyisa_session=${"A".repeat(48)}` } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: "year-1", classes: [{ id: "class-1" }] }]);
});

test("POST /students transmet le formulaire au service", async () => {
  const input = { matricule: "DEMO-002", firstName: "Aline" };
  const response = await fetch(`${baseUrl}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `leyisa_session=${"A".repeat(48)}` },
    body: JSON.stringify(input),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(receivedInput, input);
  assert.deepEqual(await response.json(), sample[0]);
});
