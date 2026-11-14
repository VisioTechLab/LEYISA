/**
 * Appels au module auth du backend NestJS.
 * Le cookie de session est géré par le navigateur (HttpOnly) : React ne le lit jamais
 * et ne stocke aucun mot de passe ni jeton.
 */
export type RoleCode = "ADM" | "SEC" | "ENS" | "DIR" | "ELEVE";

export interface CurrentUser {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  roles: RoleCode[];
  /** Permissions calculées par le serveur (matrice des droits). */
  permissions: string[];
}

/**
 * Pour afficher ou masquer un menu ou un bouton. Ce n'est qu'un confort :
 * le serveur revérifie chaque action et refuse avec 403 si le rôle ne suffit pas.
 */
export function can(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export class LoginError extends Error {}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function login(identifier: string, password: string): Promise<CurrentUser> {
  let response: Response;
  try {
    response = await fetch("/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "same-origin",
      body: JSON.stringify({ login: identifier.trim(), password }),
    });
  } catch {
    throw new LoginError("Le serveur ne répond pas. Vérifiez que le backend est démarré.");
  }

  if (response.ok) return ((await response.json()) as { user: CurrentUser }).user;
  if (response.status === 401) throw new LoginError("Identifiant ou mot de passe incorrect.");
  if (response.status === 429) throw new LoginError("Trop de tentatives. Réessayez dans quelques minutes.");
  if (response.status === 400) throw new LoginError("Saisissez votre identifiant et votre mot de passe.");
  throw new LoginError("La connexion est momentanément impossible. Réessayez plus tard.");
}

/** Utilisateur connecté, ou null s'il n'y a pas de session valide. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await fetch("/auth/me", { credentials: "same-origin" });
    if (!response.ok) return null;
    return ((await response.json()) as { user: CurrentUser }).user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // Hors ligne : la session expirera d'elle-même côté serveur.
  }
}

/** Page d'arrivée selon le rôle (propositions, à aligner avec les accueils D-ADM à D-DIR). */
export function homeHashFor(user: CurrentUser): string {
  if (can(user, "school.configure")) return "#scolarite";
  if (can(user, "students.enroll")) return "#eleves";
  if (can(user, "grades.write")) return "#notes";
  if (can(user, "submissions.decide")) return "#validation";
  return "#connexion";
}
