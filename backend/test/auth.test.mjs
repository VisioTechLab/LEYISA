import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaService } from "../dist/common/prisma.service.js";
import { AuditWriter } from "../dist/modules/auth/audit-writer.js";
import { AuthController } from "../dist/modules/auth/auth.controller.js";
import { AuthService } from "../dist/modules/auth/auth.service.js";
import { LoginThrottle } from "../dist/modules/auth/login-throttle.js";
import { hashPassword, verifyPassword } from "../dist/modules/auth/password.js";
import { SessionGuard } from "../dist/modules/auth/session.guard.js";
import { hashSessionToken, readCookie } from "../dist/modules/auth/session-token.js";

describe("mots de passe", () => {
  test("vérifie le bon mot de passe et refuse les autres", async () => {
    const stored = await hashPassword("motdepasse-fictif");
    assert.match(stored, /^scrypt\$16384\$8\$1\$/);
    assert.equal(await verifyPassword(stored, "motdepasse-fictif"), true);
    assert.equal(await verifyPassword(stored, "autre"), false);
    assert.notEqual(await hashPassword("motdepasse-fictif"), stored);
  });

  test("refuse une empreinte absente ou modifiée", async () => {
    assert.equal(await verifyPassword("", "x"), false);
    assert.equal(await verifyPassword("scrypt$1048576$8$1$AAAA$BBBB", "x"), false);
  });
});

describe("limitation et cookie", () => {
  test("bloque au seuil, par adresse et identifiant", () => {
    let now = 0;
    const throttle = new LoginThrottle(2, 15, () => now);
    const key = LoginThrottle.key("10.0.0.1", "direction.demo");
    throttle.recordFailure(key);
    throttle.recordFailure(key);
    assert.equal(throttle.retryAfterSeconds(key), 900);
    assert.equal(throttle.retryAfterSeconds(LoginThrottle.key("10.0.0.2", "direction.demo")), 0);
    now += 15 * 60_000 + 1;
    assert.equal(throttle.retryAfterSeconds(key), 0);
  });

  test("lit uniquement le cookie demandé", () => {
    assert.equal(readCookie("a=1; leyisa_session=abc", "leyisa_session"), "abc");
    assert.equal(readCookie("old_leyisa_session=abc", "leyisa_session"), undefined);
  });
});

// Base fictive en mémoire, au format des appels Prisma utilisés par le module.
function createFakeDb() {
  const state = { users: [], sessions: [], audit: [] };
  const client = {
    user: {
      findUnique: async ({ where }) => {
        const user = state.users.find((u) => u.login === where.login);
        return user ? { ...user, roles: user.roles.map((role) => ({ role })) } : null;
      },
    },
    session: {
      create: async ({ data }) => {
        const session = { id: `session-${state.sessions.length + 1}`, revokedAt: null, ...data };
        state.sessions.push(session);
        return session;
      },
      updateMany: async ({ where, data }) => {
        const targets = state.sessions.filter((s) =>
          (where.id === undefined || s.id === where.id) &&
          (where.tokenHash === undefined || s.tokenHash === where.tokenHash) && s.revokedAt === null);
        for (const s of targets) Object.assign(s, data);
        return { count: targets.length };
      },
      findUnique: async ({ where }) => {
        const session = state.sessions.find((s) => s.tokenHash === where.tokenHash);
        if (!session) return null;
        const user = state.users.find((u) => u.id === session.userId);
        return { ...session, user: { ...user, roles: user.roles.map((role) => ({ role })) } };
      },
    },
    auditEntry: { create: async ({ data }) => { state.audit.push(data); return data; } },
    $transaction: async (fn) => fn(client),
  };
  return { state, client };
}

describe("routes /auth", () => {
  let app;
  let base;
  let fake;

  before(async () => {
    fake = createFakeDb();
    class AuthTestModule {}
    Module({
      controllers: [AuthController],
      providers: [AuthService, AuditWriter, SessionGuard, { provide: PrismaService, useValue: { client: fake.client } }],
    })(AuthTestModule);
    app = await NestFactory.create(AuthTestModule, { logger: false, abortOnError: false });
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  after(async () => app?.close());

  beforeEach(async () => {
    fake.state.sessions.length = 0;
    fake.state.audit.length = 0;
    fake.state.users.splice(0, fake.state.users.length,
      { id: "00000000-0000-4000-8000-000000000001", kind: "STAFF", firstName: "Direction", lastName: "Démo",
        login: "direction.demo", passwordHash: await hashPassword("secret-fictif"), loginEnabled: true, roles: ["DIR"] },
      { id: "00000000-0000-4000-8000-000000000002", kind: "STAFF", firstName: "Compte", lastName: "Inactif",
        login: "inactif.demo", passwordHash: await hashPassword("secret-fictif"), loginEnabled: false, roles: ["SEC"] });
  });

  const post = (path, body, cookie) => fetch(new URL(path, base), {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  test("connexion réussie : cookie protégé, sans secret dans la réponse", async () => {
    const response = await post("/auth/login", { login: "direction.demo", password: "secret-fictif" });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /^leyisa_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const body = await response.json();
    assert.deepEqual(body.user.roles, ["DIR"]);
    assert.equal(JSON.stringify(body).includes("scrypt"), false);
    const token = cookie.split(";")[0].split("=")[1];
    assert.equal(fake.state.sessions[0].tokenHash, hashSessionToken(decodeURIComponent(token)));
    assert.equal(fake.state.audit.at(-1).action, "AUTH_LOGIN_SUCCESS");
  });

  test("même message pour un mauvais mot de passe, un inconnu ou un compte désactivé", async () => {
    for (const body of [
      { login: "direction.demo", password: "faux" },
      { login: "personne.demo", password: "secret-fictif" },
      { login: "inactif.demo", password: "secret-fictif" },
    ]) {
      const response = await post("/auth/login", body);
      assert.equal(response.status, 401);
      assert.equal((await response.json()).message, "Identifiant ou mot de passe incorrect.");
    }
    assert.equal(fake.state.sessions.length, 0);
  });

  test("champs vides refusés par le serveur", async () => {
    assert.equal((await post("/auth/login", { login: "  ", password: "" })).status, 400);
  });

  test("/auth/me puis déconnexion : la session ne sert plus", async () => {
    const login = await post("/auth/login", { login: "direction.demo", password: "secret-fictif" });
    const cookie = login.headers.get("set-cookie").split(";")[0];

    const me = await fetch(new URL("/auth/me", base), { headers: { cookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.login, "direction.demo");

    assert.equal((await post("/auth/logout", undefined, cookie)).status, 204);
    assert.equal((await fetch(new URL("/auth/me", base), { headers: { cookie } })).status, 401);
    assert.equal(fake.state.audit.at(-1).action, "AUTH_LOGOUT");
  });

  test("/auth/me sans cookie : 401", async () => {
    assert.equal((await fetch(new URL("/auth/me", base))).status, 401);
  });
});
