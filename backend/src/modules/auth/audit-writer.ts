import { Injectable } from "@nestjs/common";
import type { PrismaService } from "../../common/prisma.service.js";

/**
 * Contrat C09 — AuditWriter (producteur : module auth, Sidonie).
 * R25 : l'action et sa ligne d'audit s'écrivent dans la MÊME transaction :
 * passer le client de transaction `tx` reçu dans prisma.client.$transaction(…).
 * Interdit dans l'audit : mot de passe, jeton, cookie, copie complète des notes.
 */
export interface AuditEntryInput {
  actorId: string | null;
  /** Valeurs à fixer avec chaque responsable de module ; préfixe = module. */
  action: string;
  targetType: string;
  targetId: string;
}

/** Tout client Prisma (normal ou de transaction) qui sait écrire dans AuditEntry. */
export type AuditClient = Pick<PrismaService["client"], "auditEntry">;

@Injectable()
export class AuditWriter {
  async write(db: AuditClient, entry: AuditEntryInput): Promise<void> {
    await db.auditEntry.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
      },
    });
  }
}

/** Actions proposées pour le module auth. */
export const AUTH_AUDIT_ACTIONS = {
  loginSuccess: "AUTH_LOGIN_SUCCESS",
  loginFailure: "AUTH_LOGIN_FAILURE",
  logout: "AUTH_LOGOUT",
} as const;
