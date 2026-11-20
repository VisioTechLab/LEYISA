import type { RoleCode } from '../features/auth/authApi';
export const roleNames: Record<RoleCode,string> = {ADM:'Administration',SEC:'Secrétariat',ENS:'Enseignement',DIR:'Direction',ELEVE:'Élève'};
type Entry={hash:string;label:string;children?:string[]};
export const roleMenus: Record<RoleCode,Entry[]> = {
 ADM:[{hash:'#accueil',label:'Accueil'},{hash:'#comptes',label:'Comptes utilisateurs'},{hash:'#scolarite',label:'Configuration scolaire'},{hash:'#classes',label:'Classes et programmes',children:['#programme']},{hash:'#audit',label:'Audit'}],
 SEC:[{hash:'#accueil',label:'Accueil'},{hash:'#eleves',label:'Élèves',children:['#dossier','#historique']},{hash:'#inscription',label:'Inscriptions'},{hash:'#bulletins',label:'Bulletins',children:['#bulletin']}],
 ENS:[{hash:'#accueil',label:'Accueil'},{hash:'#cours',label:'Mes classes et cours'},{hash:'#evaluations',label:'Mes évaluations',children:['#evaluation','#notes','#corrections']},{hash:'#mes-soumissions',label:'Mes soumissions',children:['#soumission']}],
 DIR:[{hash:'#accueil',label:'Accueil'},{hash:'#enseignants',label:'Enseignants et affectations',children:['#affectations']},{hash:'#validation',label:'Validation des notes',children:['#detail-soumission','#rejet']},{hash:'#resultats',label:'Résultats',children:['#previsualisation','#cloture']},{hash:'#bulletins',label:'Bulletins',children:['#bulletin']}],
 ELEVE:[{hash:'#accueil',label:'Accueil'},{hash:'#bulletins',label:'Bulletins',children:['#bulletin']}],
};
export function parentEntry(role:RoleCode,route:string){return roleMenus[role].find(item=>item.hash===route||item.children?.includes(route));}
