import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Empreinte des mots de passe avec scrypt (module crypto de Node, aucune dépendance).
 * Format stocké dans User.passwordHash : scrypt$N$r$p$sel$empreinte (base64url).
 * Argon2id avait été proposé ; scrypt évite d'ajouter une dépendance au socle.
 */
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password, salt, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Faux pour toute empreinte absente, mal formée ou ne correspondant pas. */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  // Paramètres bornés : une empreinte modifiée ne doit pas bloquer le serveur.
  if (n !== N || r !== R || p !== P) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password, salt, { N: n, r, p });
  return timingSafeEqual(actual, expected);
}
