import { api, post } from '../../shared/api';
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

export async function login(identifier:string,password:string):Promise<CurrentUser> {
  try {return (await post<{user:CurrentUser}>('/auth/login',{login:identifier.trim(),password})).user;}
  catch(error){throw new LoginError(error instanceof Error?error.message:'Connexion impossible.');}
}
export async function fetchCurrentUser():Promise<CurrentUser|null> {
  try{return (await api<{user:CurrentUser}>('/auth/me')).user;}catch{return null;}
}
export async function logout():Promise<void> {await post('/auth/logout',{});}
export function homeHashFor(_user:CurrentUser):string {return '#accueil';}
