import { useEffect, useState, useSyncExternalStore } from 'react';
import { LoginPage } from './features/auth';
import { can, fetchCurrentUser, logout, type CurrentUser } from './features/auth/authApi';
import { StudentsPage } from './features/students/StudentsPage';
import { EvaluationsPage } from './features/evaluations/EvaluationsPage';
import { ResultsModulePage } from './features/results/ResultsModulePage';
import { SchoolLogo } from './SchoolLogo';
import { SessionContext } from './shared/session';
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
 const [user,setUser]=useState<CurrentUser|null>(null),[loading,setLoading]=useState(true),[chosenRole,setChosenRole]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;const refresh=()=>{void fetchCurrentUser().then(u=>{if(active){setUser(u);setLoading(false);}});};const expire=()=>{setUser(null);};refresh();window.addEventListener('leyisa:login',refresh);window.addEventListener('leyisa:session-expired',expire);return()=>{active=false;window.removeEventListener('leyisa:login',refresh);window.removeEventListener('leyisa:session-expired',expire);};},[]);
 const role=user?.roles.includes(chosenRole as never)?chosenRole:user?.roles[0]??'';
 const route=routes.find(r=>r.hash===hash.split('?')[0])??routes[0];
 useEffect(()=>{document.title=`${route.label} | Leyisa School`;},[route.label]);
 if(loading)return <p role="status">Vérification de la session…</p>;
 if(!user)return <LoginPage/>;
 async function signOut(){try{await logout();setUser(null);window.location.hash='#connexion';}catch(e){setError(e instanceof Error?e.message:'Déconnexion impossible.');}}
 const available=routes.filter(r=>!r.permission||can(user,r.permission));
 return <SessionContext.Provider value={user}><div className="leyisa-shell"><aside className="leyisa-sidebar"><a className="leyisa-brand" href="#accueil"><SchoolLogo/><span><strong>Leyisa School</strong><small>Espace de gestion</small></span></a><nav className="leyisa-nav" aria-label="Navigation principale">{available.map(r=><a key={r.hash} href={r.hash} aria-current={r.hash===route.hash?'page':undefined}>{r.label}</a>)}</nav><p className="leyisa-sidebar-note">VISIO TECH · DEMO-V1<br/>Données de démonstration</p></aside><div className="leyisa-workspace"><header className="leyisa-topbar"><p><span>Leyisa School</span><span aria-hidden="true">/</span>{route.label}</p><div className="session-controls"><span className="leyisa-chip">DEMO-V1</span><label className="sr-only" htmlFor="session-role">Rôle de la session</label><select id="session-role" value={role} onChange={e=>setChosenRole(e.target.value)}>{user.roles.map(r=><option key={r}>{r}</option>)}</select><button onClick={()=>void signOut()}>Déconnexion</button></div></header>{error&&<p role="alert">{error}</p>}<div key={hash}>{route.permission&&!can(user,route.permission)?<AccessPage/>:route.render(role)}</div></div></div></SessionContext.Provider>;
}
