import { createHash, randomBytes } from "node:crypto";

/**
 * Jeton de session : 32 octets aléatoires, envoyés uniquement dans le cookie.
 * La base ne garde que son empreinte (Session.tokenHash) : une fuite de la base
 * ne permet pas de reprendre une session ouverte.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Lit un cookie dans l'en-tête Cookie, sans dépendance externe. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
