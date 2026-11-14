import type { RoleCode } from "./auth-context.js";

/**
 * Matrice des droits (RBAC) — G01, proposée par Sidonie, à valider par Kevin.
 * Source : rôles et user stories du Ready-to-Code (US-001 à US-027).
 * Règle R02 : une permission absente de ce tableau n'est accordée à personne.
 * Le rôle ELEVE existe dans le schéma mais ne reçoit aucun droit en V1.
 *
 * Les contrôles d'appartenance (ABAC) s'ajoutent dans chaque module :
 * voir docs/matrice-droits.md et les fonctions de access-rules.ts.
 */
export const PERMISSIONS = {
  // Accès (Sidonie)
  "accounts.manage": ["ADM"], // US-003
  "audit.read": ["ADM", "DIR"], // US-027

  // Configuration scolaire (Jonathan)
  "school.configure": ["ADM"], // US-004 à US-008
  "school.read": ["ADM", "SEC", "ENS", "DIR"], // lecture des années, classes, matières

  // Élèves et inscriptions (Franck)
  "students.search": ["SEC"], // US-009
  "students.create": ["SEC"], // US-010
  "students.enroll": ["SEC"], // US-011
  "students.history": ["SEC"], // US-012

  // Enseignants et affectations (Kevin)
  "teachers.manage": ["ADM"], // US-013
  "assignments.manage": ["ADM"], // US-014
  "assignments.readOwn": ["ENS"], // US-015, filtré sur le compte connecté

  // Évaluations et notes (Joel)
  "evaluations.create": ["ENS"], // US-016, enseignant affecté seulement
  "grades.write": ["ENS"], // US-017 et US-019, enseignant affecté seulement
  "grades.submit": ["ENS"], // US-018, enseignant affecté seulement

  // Validation, résultats et clôture (Melvin)
  "submissions.read": ["DIR"], // US-020
  "submissions.decide": ["DIR"], // US-021 et US-022, jamais sa propre soumission (R03)
  "results.preview": ["DIR"], // US-023
  "results.close": ["DIR"], // US-024

  // Bulletins (Jonathan)
  "bulletins.produce": ["DIR"], // US-025
  "bulletins.download": ["SEC", "DIR"], // US-026
} as const satisfies Record<string, readonly RoleCode[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Vrai si un des rôles reçoit la permission. Permission inconnue : toujours faux. */
export function rolesAllow(roles: readonly RoleCode[], permission: string): boolean {
  if (!Object.hasOwn(PERMISSIONS, permission)) return false;
  const allowed: readonly RoleCode[] = PERMISSIONS[permission as Permission];
  return roles.some((role) => allowed.includes(role));
}

/** Liste des permissions d'un ensemble de rôles, pour l'écran (menus). */
export function permissionsFor(roles: readonly RoleCode[]): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) => rolesAllow(roles, permission));
}
