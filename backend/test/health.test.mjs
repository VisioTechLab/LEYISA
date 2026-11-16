import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { HealthController } from "../dist/common/health.controller.js";
import { PrismaService } from "../dist/common/prisma.service.js";

let ready = true;
class HealthTestModule {}
Module({
  controllers: [HealthController],
  providers: [{ provide: PrismaService, useValue: { isReady: async () => ready } }],
})(HealthTestModule);

let app;
let url;
before(async () => {
  app = await NestFactory.create(HealthTestModule, { logger: false, abortOnError: false });
  await app.listen(0, "127.0.0.1");
  url = new URL("/health", await app.getUrl());
});
after(async () => app?.close());

test("GET /health renvoie 200 lorsque PostgreSQL est prêt", async () => {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("GET /health renvoie uniquement le statut en cas d’indisponibilité", async () => {
  ready = false;
  const response = await fetch(url);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "unavailable" });
});
