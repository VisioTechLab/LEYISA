import { useEffect, useState, useSyncExternalStore } from 'react';
import { LoginPage } from './features/auth';
import { can, fetchCurrentUser, logout, type CurrentUser, type RoleCode } from './features/auth/authApi';
import { StudentsPage } from './features/students/StudentsPage';
import { EvaluationsPage } from './features/evaluations/EvaluationsPage';
import { ResultsModulePage } from './features/results/ResultsModulePage';
import { SchoolLogo } from './SchoolLogo';
import { SessionContext } from './shared/session';
import { setApiRole } from './shared/api';
import { parentEntry, roleMenus, roleNames } from './shared/navigation';
import { WorkspaceStateProvider } from './shared/workspaceState';
import { AccessPage, AccountsPage, AuditPage, BulletinsPage, Dashboard, EvaluationsHome, SchoolPages, StudentRecordPages, TeacherPages } from './WorkspacePages';

const routes=[
 {hash:'#accueil',label:'Accueil',permission:'',render:(role:string)=><Dashboard role={role}/>},
 {hash:'#comptes',label:'Comptes / rôles',permission:'accounts.manage',render:()=> <AccountsPage/>},
 {hash:'#scolarite',label:'Configuration scolaire',permission:'school.read',render:()=> <SchoolPages/>},
 {hash:'#classes',label:'Classes et matières',permission:'school.read',render:()=> <SchoolPages view="classes"/>},
 {hash:'#programme',label:'Programme de classe',permission:'school.read',render:()=> <SchoolPages view="program"/>},
 {hash:'#enseignants',label:'Enseignants',permission:'teachers.manage',render:()=> <TeacherPages view="teachers"/>},
 {hash:'#affectations',label:'Affectations',permission:'assignments.read',render:()=> <TeacherPages/>},
 {hash:'#eleves',label:'Élèves / inscriptions',permission:'students.search',render:()=> <StudentsPage/>},
 {hash:'#dossier',label:'Créer un dossier',permission:'students.create',render:()=> <StudentRecordPages view="record"/>},
 {hash:'#historique',label:'Historique scolaire',permission:'students.history',render:()=> <StudentRecordPages view="history"/>},
 {hash:'#inscription',label:'Inscrire un élève',permission:'students.enroll',render:()=> <StudentRecordPages view="enroll"/>},
 {hash:'#cours',label:'Mes cours',permission:'assignments.readOwn',render:()=> <TeacherPages view="mine"/>},
 {hash:'#evaluations',label:'Mes évaluations',permission:'evaluations.read',render:()=> <EvaluationsHome/>},
 {hash:'#evaluation',label:'Créer une évaluation',permission:'evaluations.create',render:()=> <EvaluationsHome create/>},
 {hash:'#notes',label:'Saisie des notes',permission:'grades.write',render:()=> <EvaluationsPage/>},
 {hash:'#mes-soumissions',label:'Mes soumissions',permission:'grades.submit',render:()=> <EvaluationsHome submissions/>},
 {hash:'#soumission',label:'Soumissions',permission:'grades.submit',render:()=> <EvaluationsPage/>},
 {hash:'#corrections',label:'Corrections',permission:'grades.write',render:()=> <EvaluationsPage/>},
 {hash:'#validation',label:'Validation des notes',permission:'submissions.read',render:()=> <ResultsModulePage initialView="queue"/>},
 {hash:'#detail-soumission',label:'Détail de soumission',permission:'submissions.read',render:()=> <ResultsModulePage initialView="detail"/>},
 {hash:'#rejet',label:'Rejeter avec motif',permission:'submissions.decide',render:()=> <ResultsModulePage initialView="reject"/>},
 {hash:'#previsualisation',label:'Prévisualiser résultats',permission:'results.preview',render:()=> <ResultsModulePage initialView="preview"/>},
 {hash:'#cloture',label:'Clôturer',permission:'results.close',render:()=> <ResultsModulePage initialView="close"/>},
 {hash:'#resultats',label:'Résultats et publication',permission:'results.preview',render:()=> <ResultsModulePage initialView="final"/>},
 {hash:'#bulletins',label:'Bulletins disponibles',permission:'bulletins.download',render:()=> <BulletinsPage catalog/>},
 {hash:'#bulletin',label:'Générer un bulletin',permission:'bulletins.produce',render:()=> <BulletinsPage/>},
 {hash:'#audit',label:'Journal d’audit',permission:'audit.read',render:()=> <AuditPage/>},
 {hash:'#acces',label:'Accès / conflits',permission:'',render:()=> <AccessPage/>},
];
function subscribe(onChange:()=>void){window.addEventListener('hashchange',onChange);return()=>window.removeEventListener('hashchange',onChange);}
export default function App(){
 const hash=useSyncExternalStore(subscribe,()=>window.location.hash||'#accueil');
 const [menuOpen,setMenuOpen]=useState(false);
 const [user,setUser]=useState<CurrentUser|null>(null),[loading,setLoading]=useState(true),[choice,setChoice]=useState({userId:'',role:''}),[error,setError]=useState('');
 useEffect(()=>{let active=true;const refresh=()=>{setError('');setLoading(true);void fetchCurrentUser().then(u=>{if(active){setUser(u);setLoading(false);}}).catch(error=>{if(active){setError(error instanceof Error?error.message:'Service momentanément indisponible.');setLoading(false);}});};const expire=()=>{setApiRole('');setUser(null);};refresh();window.addEventListener('leyisa:login',refresh);window.addEventListener('leyisa:session-expired',expire);return()=>{active=false;window.removeEventListener('leyisa:login',refresh);window.removeEventListener('leyisa:session-expired',expire);};},[]);
 const role=(choice.userId===user?.id&&user?.roles.includes(choice.role as RoleCode)?choice.role:user?.roles[0]??'') as RoleCode;
 // Le rôle demandé ne peut que réduire les droits attribués ; le serveur le revérifie.
 setApiRole(role);
 const scopedUser=user?{...user,permissions:user.permissionsByRole?.[role]??(user.roles.length===1?user.permissions:[])}:null;
 const route=routes.find(r=>r.hash===hash.split('?')[0])??routes[0];
 const parent=role?parentEntry(role,route.hash)??roleMenus[role][0]:undefined;
 useEffect(()=>{document.title=`${route.label} | Leyisa School`;setMenuOpen(false);},[route.label]);
 if(loading)return <p role="status">Vérification de la session…</p>;
 if(!user||!scopedUser)return error?<main className="leyisa-page"><h1>Connexion au service</h1><p role="alert">{error}</p><button className="leyisa-button" onClick={()=>window.dispatchEvent(new Event('leyisa:login'))}>Réessayer</button></main>:<LoginPage/>;
 async function signOut(){try{await logout();setApiRole('');setUser(null);window.location.hash='#connexion';}catch(e){setError(e instanceof Error?e.message:'Déconnexion impossible.');}}
 function changeRole(next:string){if(!user?.roles.includes(next as RoleCode))return;setChoice({userId:user.id,role:next});setMenuOpen(false);window.location.hash='#accueil';}
 const links=roleMenus[role].filter(item=>{const entry=routes.find(r=>r.hash===item.hash);return entry&&(!entry.permission||can(scopedUser,entry.permission));});
 return <SessionContext.Provider value={scopedUser}><WorkspaceStateProvider key={`${user.id}:${role}`}><div className="leyisa-shell"><aside className="leyisa-sidebar" data-open={menuOpen}>
  <a className="leyisa-brand" href="#accueil"><SchoolLogo/><span><strong>Leyisa School</strong><small>{roleNames[role]}</small></span></a>
  <button type="button" className="leyisa-menu-toggle" aria-expanded={menuOpen} aria-controls="leyisa-navigation" onClick={()=>setMenuOpen(open=>!open)}>{menuOpen?'Fermer le menu':'Ouvrir le menu'}</button>
  <nav id="leyisa-navigation" className="leyisa-nav" aria-label="Navigation principale"><p className="workspace-role">Espace {roleNames[role]}</p><ul>{links.map(item=><li key={item.hash}><a href={item.hash} onClick={()=>setMenuOpen(false)} aria-current={item.hash===(parent?.hash??route.hash)?'page':undefined}>{item.label}</a></li>)}</ul></nav>
  <p className="leyisa-sidebar-note">VISIO TECH · DEMO-V1</p>
 </aside><div className="leyisa-workspace"><header className="leyisa-topbar"><p><a href={parent?.hash??'#accueil'}>{parent?.label??'Accueil'}</a>{parent?.hash!==route.hash&&<><span aria-hidden="true">/</span>{route.label}</>}</p>
 <div className="session-controls"><span className="leyisa-chip">{['localhost','127.0.0.1'].includes(window.location.hostname)?'Démo locale':'DEMO-V1'}</span>{user.roles.length>1?<><label className="sr-only" htmlFor="session-role">Rôle actif</label><select id="session-role" value={role} onChange={e=>changeRole(e.target.value)}>{user.roles.map(r=><option key={r} value={r}>{roleNames[r]}</option>)}</select></>:<span className="leyisa-chip">{roleNames[role]}</span>}<button onClick={()=>void signOut()}>Déconnexion</button></div></header>
 {error&&<p role="alert">{error}</p>}<div key={`${role}:${route.hash}`} data-route={route.hash}>{route.permission&&!can(scopedUser,route.permission)?<AccessPage/>:route.render(role)}</div>
 </div></div></WorkspaceStateProvider></SessionContext.Provider>;
}
