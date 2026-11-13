// Donne un identifiant et un mot de passe à un compte fictif existant (module auth, Sidonie).
// Sert à créer les comptes de démonstration tant que l'écran « Comptes et rôles » (W02)
// n'est pas raccordé. Décision « premier administrateur » encore ouverte.
//
//   node --env-file-if-exists=../.env scripts/auth-set-login.mjs --list
//   node --env-file-if-exists=../.env scripts/auth-set-login.mjs --user-id <uuid> --login direction.demo
//
// Sur une branche Neon partagée (LEYISA_DB_MODE=shared), l'écriture exige --shared-ok,
// à n'utiliser qu'avec l'accord de Kevin et Melvin. Le mot de passe est saisi sans écho
// et n'apparaît ni dans l'historique du terminal ni dans l'audit.
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createClient } from "../prisma/client.mjs";
import { databaseMode } from "../prisma/env.mjs";
import { hashPassword } from "../src/modules/auth/password.ts";

const { values } = parseArgs({
  options: {
    list: { type: "boolean", default: false },
    "user-id": { type: "string" },
    login: { type: "string" },
    "shared-ok": { type: "boolean", default: false },
  },
});

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => { if (!muted) rl.output.write(text); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
    muted = true;
  });
}

let db;
try {
  db = createClient({ connectionTimeoutMillis: 5_000, query_timeout: 5_000 });

  if (values.list) {
    const users = await db.user.findMany({
      where: { kind: "STAFF" },
      select: { id: true, firstName: true, lastName: true, login: true, loginEnabled: true, roles: { select: { role: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    for (const user of users) {
      const roles = user.roles.map(({ role }) => role).join(",");
      console.log(`${user.id}  ${user.firstName} ${user.lastName}  [${roles}]  ${user.login ?? "(sans identifiant)"}${user.loginEnabled ? "  actif" : ""}`);
    }
  } else {
    const userId = values["user-id"];
    const login = values.login?.trim();
    if (!userId || !login || login.length > 100) throw new Error("Indiquez --user-id et --login (100 caractères au plus).");
    if (databaseMode() === "shared" && !values["shared-ok"]) {
      throw new Error("Base partagée : ajoutez --shared-ok seulement après l'accord de Kevin et Melvin.");
    }
    const password = await askHidden("Mot de passe (8 caractères au moins) : ");
    if (password.length < 8 || password.length > 256) throw new Error("Le mot de passe doit compter entre 8 et 256 caractères.");
    if (password !== await askHidden("Confirmez le mot de passe : ")) throw new Error("Les deux saisies sont différentes.");

    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { login, passwordHash, loginEnabled: true } });
      await tx.auditEntry.create({
        data: { actorId: null, action: "AUTH_LOGIN_PROVISIONED", targetType: "User", targetId: userId },
      });
    });
    console.log(`Identifiant « ${login} » activé pour le compte ${userId}.`);
  }
} catch (error) {
  const known = error instanceof Error && !("code" in error);
  console.error(known ? error.message : "Opération impossible. Vérifiez DATABASE_URL, l'identifiant du compte et l'unicité de l'identifiant.");
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
}
