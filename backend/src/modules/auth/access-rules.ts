import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { AuthContext } from "./auth-context.js";

/**
 * Contrôles d'appartenance (ABAC) — G04. Le rôle ne suffit pas toujours :
 * chaque responsable de module appelle ces fonctions dans son service,
 * avec les données lues dans sa propre transaction.
 */

export const FORBIDDEN_MESSAGE = "Votre rôle ne permet pas cette action.";

/**
 * A1 / A2 — La ressource appartient au compte connecté
 * (affectation d'un enseignant, grille de notes : US-015, R15).
 * Message volontairement identique à celui d'une ressource introuvable
 * côté appelant si celui-ci préfère répondre 404 pour ne rien révéler.
 */
export function assertOwnedBy(auth: AuthContext, ownerUserId: string | null | undefined): void {
  if (!ownerUserId || ownerUserId !== auth.userId) {
    throw new ForbiddenException("Cette ressource ne vous est pas attribuée.");
  }
}

/** A3 — R03 : personne ne valide ni ne rejette sa propre soumission, même avec ENS et DIR. */
export function assertNotOwnSubmission(auth: AuthContext, submittedByUserId: string): void {
  if (submittedByUserId === auth.userId) {
    throw new ForbiddenException("Vous ne pouvez pas décider de vos propres notes.");
  }
}

/** A4 — R22 : aucune écriture sur une classe-période clôturée. */
export function assertPeriodOpen(isClosed: boolean): void {
  if (isClosed) {
    throw new ConflictException("Cette classe est clôturée pour la période : plus aucune modification n'est possible.");
  }
}
