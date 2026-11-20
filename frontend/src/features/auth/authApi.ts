import { HttpError, api, post } from '../../shared/api';
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
  permissionsByRole?: Partial<Record<RoleCode, string[]>>;
}

/**
 * Pour afficher ou masquer un menu ou un bouton. Ce n'est qu'un confort :
 * le serveur revérifie chaque action et refuse avec 403 si le rôle ne suffit pas.
 */
export function can(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export class LoginError extends Error {}
// Aucun identifiant ni jeton n'est diffusé : chaque onglet relit sa session
// HttpOnly auprès du serveur et abandonne l'espace de l'ancien utilisateur.
const authChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('leyisa-auth');
authChannel?.addEventListener('message', event => {
  if (event.data === 'session-changed') window.dispatchEvent(new Event('leyisa:auth-changed'));
});

export async function login(identifier:string,password:string):Promise<CurrentUser> {
  try {const result=await post<{user:CurrentUser}>('/auth/login',{login:identifier.trim(),password});authChannel?.postMessage('session-changed');return result.user;}
  catch(error){throw new LoginError(error instanceof Error?error.message:'Connexion impossible.');}
}
export async function fetchCurrentUser():Promise<CurrentUser|null> {
  try{return (await api<{user:CurrentUser}>('/auth/me')).user;}catch(error){if(error instanceof HttpError&&error.status===401)return null;throw error;}
}
export async function logout():Promise<void> {await post('/auth/logout',{});authChannel?.postMessage('session-changed');}
export function homeHashFor(_user:CurrentUser):string {return '#accueil';}
