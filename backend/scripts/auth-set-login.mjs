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
  if (error instanceof Error && !("code" in error) && !error.name.startsWith("Prisma")) {
    console.error(error.message);
  } else {
    const code = error?.code ?? error?.cause?.code ?? error?.name ?? "inconnu";
    const hints = {
      P2025: "Aucun compte ne porte cet identifiant technique (--user-id).",
      P2002: "Cet identifiant de connexion est déjà utilisé par un autre compte.",
      P2023: "L'identifiant technique (--user-id) n'a pas un format accepté.",
      "42501": "Le compte de base de données n'a pas le droit d'écrire dans cette table.",
      "23514": "Une règle de la base refuse cette modification.",
    };
    console.error(`Opération impossible (code ${code}). ${hints[code] ?? ""}`);
    // Détail technique, sans empreinte de mot de passe ni adresse de connexion.
    const detail = String(error?.message ?? "")
      .replace(/scrypt\$[^\s"',}]+/g, "[empreinte masquée]")
      .replace(/postgres(ql)?:\/\/\S+/g, "[adresse masquée]")
      .split("\n").map((line) => line.trim()).filter(Boolean).slice(-4).join("\n");
    if (detail) console.error(detail);
  }
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
}
