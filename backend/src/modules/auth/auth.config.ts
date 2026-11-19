/**
 * Réglages du module auth. Les valeurs par défaut sont des PROPOSITIONS
 * (docs/modele-acces.md) : seuil et durée de la limitation restent à valider avec Joel.
 */
function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const SESSION_COOKIE_NAME = "leyisa_session";

export const authConfig = {
  /** Durée de vie d'une session, en minutes (proposé : 8 h). */
  sessionTtlMinutes: Math.min(480,readInt("AUTH_SESSION_TTL_MINUTES", 480)),
  /** Échecs autorisés avant blocage, pour un même identifiant depuis une même adresse. */
  maxFailedAttempts: readInt("AUTH_MAX_FAILED_ATTEMPTS", 5),
  /** Durée du blocage temporaire, en minutes. Jamais de blocage définitif. */
  lockoutMinutes: readInt("AUTH_LOCKOUT_MINUTES", 15),
  /** Cookie Secure hors développement local (HTTPS obligatoire en production). */
  secureCookie: process.env.NODE_ENV === "production",
} as const;

/**
 * Délais des transactions : Neon met la base en veille et le réveil peut
 * dépasser les 2 secondes d'attente par défaut de Prisma (erreur P2028).
 */
export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

export const LOGIN_MAX_LENGTH = 100;
export const PASSWORD_MAX_LENGTH = 256;
