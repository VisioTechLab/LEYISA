import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { StudentsSessionGuard } from "../dist/modules/students/students-session.guard.js";

const token = "A".repeat(48);
const contextFor = (authorization) => ({
  switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
});

function makeGuard(session) {
  let lookup;
  const guard = new StudentsSessionGuard({
    client: { session: { findFirst: async (args) => { lookup = args; return session; } } },
  });
  return { guard, getLookup: () => lookup };
}

test("refuse une requête sans session bearer sans lire la base", async () => {
  const { guard, getLookup } = makeGuard(null);
  await assert.rejects(() => guard.canActivate(contextFor(undefined)), UnauthorizedException);
  assert.equal(getLookup(), undefined);
});

test("autorise une session staff active avec le rôle SEC", async () => {
  const { guard, getLookup } = makeGuard({
    user: { kind: "STAFF", roles: [{ role: "SEC" }] },
  });
  assert.equal(await guard.canActivate(contextFor(`Bearer ${token}`)), true);
  assert.equal(getLookup().where.tokenHash, createHash("sha256").update(token).digest("hex"));
  assert.equal(getLookup().where.revokedAt, null);
});

test("refuse un rôle sans accès au module élèves", async () => {
  const { guard } = makeGuard({ user: { kind: "STAFF", roles: [{ role: "ENS" }] } });
  await assert.rejects(() => guard.canActivate(contextFor(`Bearer ${token}`)), ForbiddenException);
});

test("refuse une session qui ne représente pas un membre du personnel", async () => {
  const { guard } = makeGuard({ user: { kind: "STUDENT", roles: [{ role: "ELEVE" }] } });
  await assert.rejects(() => guard.canActivate(contextFor(`Bearer ${token}`)), UnauthorizedException);
});
