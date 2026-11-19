import { argon2, randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Argon2id (64 MiB, 3 passes, sel unique) via Node 24, sans dépendance native ajoutée.
 * Format PHC pour les nouvelles empreintes ; ancien scrypt vérifié puis rehaché à la connexion.
 * Les constantes scrypt ci-dessous servent seulement à préserver les anciens comptes.
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
  const key = await deriveArgon(password, salt);
  return `$argon2id$v=19$m=65536,t=3,p=1$${salt.toString("base64").replace(/=+$/, "")}$${key.toString("base64").replace(/=+$/, "")}`;
}

function deriveArgon(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => argon2("argon2id", {
    message: password, nonce: salt, memory: 65536, passes: 3, parallelism: 1, tagLength: 32,
  }, (error, key) => error ? reject(error) : resolve(key)));
}

/** Faux pour toute empreinte absente, mal formée ou ne correspondant pas. */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  if (stored.startsWith("$argon2id$")) {
    const match = /^\$argon2id\$v=19\$m=65536,t=3,p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(stored);
    if (!match) return false;
    const salt = Buffer.from(match[1], "base64"), expected = Buffer.from(match[2], "base64");
    if (salt.length !== 16 || expected.length !== 32) return false;
    return timingSafeEqual(await deriveArgon(password, salt), expected);
  }
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
