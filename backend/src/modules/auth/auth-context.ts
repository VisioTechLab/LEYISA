/**
 * Contrat C01 — AuthContext (producteur : module auth, Sidonie).
 * Identité de la personne connectée, déduite uniquement de la session côté
 * serveur. Tous les modules lisent ce contexte ; aucun n'en fabrique un.
 */
export type RoleCode = "ADM" | "SEC" | "ENS" | "DIR" | "ELEVE";

export interface AuthContext {
  userId: string;
  login: string;
  firstName: string;
  lastName: string;
  roles: RoleCode[];
  sessionId: string;
}

/** R02 : aucun droit par défaut. Vrai seulement si un des rôles demandés est présent. */
export function hasAnyRole(context: AuthContext | undefined, roles: readonly RoleCode[]): boolean {
  if (!context) return false;
  return context.roles.some((role) => roles.includes(role));
}
