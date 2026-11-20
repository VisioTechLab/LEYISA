import type { RoleCode } from "./auth-context.js";

/** Matrice approuvée du 14/11/2026 : feuilles RBAC/CRUD/ABAC.
 * Les contrôles de ressource s'ajoutent dans les services ; ELEVE reste désactivé par défaut.
 */
export const PERMISSIONS = {
  // Accès (Sidonie)
  "accounts.manage": ["ADM"], // US-003
  "audit.read": ["ADM"], // AUD01 approuvé

  // Configuration scolaire (Jonathan)
  "school.configure": ["ADM"], // US-004 à US-008
  "school.read": ["ADM", "SEC", "ENS", "DIR"], // lecture des années, classes, matières

  // Élèves et inscriptions (Franck)
  "students.search": ["SEC", "DIR", "ENS"], // STU01 + ABAC
  "students.create": ["SEC"], // US-010
  "students.enroll": ["SEC"], // US-011
  "students.history": ["SEC", "DIR", "ENS"], // STU02 + ABAC
  "students.update": ["SEC"],

  // Enseignants et affectations (Kevin)
  "teachers.manage": ["DIR"], // CRUD approuvé
  "assignments.manage": ["DIR"], // ASN02
  "assignments.read": ["ADM", "SEC", "ENS", "DIR"],
  "assignments.readOwn": ["ENS"], // US-015, filtré sur le compte connecté

  // Évaluations et notes (Joel)
  "evaluations.create": ["ENS"], // US-016, enseignant affecté seulement
  "grades.write": ["ENS"], // US-017 et US-019, enseignant affecté seulement
  "grades.submit": ["ENS"], // US-018, enseignant affecté seulement
  "evaluations.read": ["ENS", "DIR"],

  // Validation, résultats et clôture (Melvin)
  "submissions.read": ["DIR"], // US-020
  "submissions.decide": ["DIR"], // US-021 et US-022, jamais sa propre soumission (R03)
  "results.preview": ["DIR"], // US-023
  "results.close": ["DIR"], // US-024
  "results.publish": ["DIR"],

  // Bulletins (Jonathan)
  "bulletins.produce": ["SEC", "DIR"], // BUL01
  "bulletins.download": ["SEC", "DIR", "ELEVE"], // BUL02 + ABAC
} as const satisfies Record<string, readonly RoleCode[]>;

export function permissionsByRole(roles: readonly RoleCode[]) {
  return Object.fromEntries(roles.map(role => [role, permissionsFor([role])]));
}

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
