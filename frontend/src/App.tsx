import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LoginPage } from './features/auth';
import { can, fetchCurrentUser, logout, type CurrentUser, type RoleCode } from './features/auth/authApi';
import { StudentsPage } from './features/students/StudentsPage';
import { EvaluationsPage } from './features/evaluations/EvaluationsPage';
import { ResultsModulePage } from './features/results/ResultsModulePage';
import { SchoolLogo } from './SchoolLogo';
import { SessionContext } from './shared/session';
import { api, setApiRole, userError } from './shared/api';
import { parentEntry, roleMenus, roleNames } from './shared/navigation';
import { WorkspaceStateProvider } from './shared/workspaceState';
import { deploymentLabel, isPrivateRecipe } from './shared/deployment';
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
type AlertItem = { id: string; label: string; detail: string; href: string };
type TeacherAlert = { id:string; title:string; state:string; schoolClass?:{label:string}; subject?:{label:string} };
type PendingAlert = { id:string; evaluation:{title:string}; schoolClass:{label:string} };
/** Notifications à la demande, issues des données autorisées du profil courant.
 * Aucun historique privé n'est conservé dans le navigateur et aucun polling au démarrage. */
function RoleNotifications({role}:{role:RoleCode}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const [alerts,setAlerts]=useState<AlertItem[]>([]),[error,setError]=useState('');
 const version=useRef(0);
 useEffect(()=>()=>{version.current++;},[]);
 if(role!=='ENS'&&role!=='DIR')return null;
 async function refresh(){
  const request=++version.current;setBusy(true);setError('');
  try {
   let next:AlertItem[];
   if(role==='ENS') {
    const evaluations=await api<TeacherAlert[]>('/evaluations');
    next=evaluations.filter(e=>e.state==='REJECTED'||e.state==='VALIDATED')
      .slice(0,12).map(e=>({id:e.id,label:e.state==='REJECTED'?'Notes rejetées':'Notes validées',
      detail:`${e.schoolClass?.label??'Classe'} : ${e.subject?.label??e.title}`,
      href:'#mes-soumissions'}));
   } else {
    const pending=await api<PendingAlert[]>('/results/submissions');
    next=pending.slice(0,12).map(e=>({id:e.id,label:'Notes à examiner',
      detail:`${e.schoolClass.label} : ${e.evaluation.title}`,href:'#validation'}));
   }
   if(request===version.current)setAlerts(next);
  }catch(e){if(request===version.current)setError(userError(e));}
  finally{if(request===version.current)setBusy(false);}
 }
 function toggle(){const next=!open;setOpen(next);if(next)void refresh();}
 return <div className="leyisa-notifications">
  <button type="button" className="leyisa-notification-trigger" aria-expanded={open} aria-controls="leyisa-notification-list" onClick={toggle}>Notifications</button>
  {open&&<section id="leyisa-notification-list" className="leyisa-notification-panel" aria-label="Notifications du profil">
   <header><strong>{role==='ENS'?'Décisions sur mes notes':'Soumissions à examiner'}</strong><button type="button" onClick={()=>void refresh()} disabled={busy}>Actualiser</button></header>
   {busy&&<p role="status">Mise à jour des notifications…</p>}
   {error&&<p role="alert">{error}</p>}
   {!busy&&!error&&(alerts.length?<ul>{alerts.map(a=><li key={a.id}><a href={a.href} onClick={()=>setOpen(false)}><strong>{a.label}</strong><span>{a.detail}</span></a></li>)}</ul>:<p>Aucune notification à traiter.</p>)}
   <small>Consultez cette liste pour obtenir les derniers états enregistrés.</small>
  </section>}
 </div>;
}
function subscribe(onChange:()=>void){window.addEventListener('hashchange',onChange);return()=>window.removeEventListener('hashchange',onChange);}
export default function App(){
 const hash=useSyncExternalStore(subscribe,()=>window.location.hash||'#accueil');
 const [menuOpen,setMenuOpen]=useState(false);
 const [dark,setDark]=useState(false);
 const [user,setUser]=useState<CurrentUser|null>(null),[loading,setLoading]=useState(true),[choice,setChoice]=useState({userId:'',role:''}),[error,setError]=useState('');
 useEffect(()=>{
  let active=true,generation=0,checkingFocus=false,identity:string|null|undefined;
  const refresh=async(silent=false)=>{
   const request=++generation;setError('');if(!silent){setLoading(true);setUser(null);}
   try{const next=await fetchCurrentUser();if(active&&request===generation){const nextIdentity=next?.id??null;if(identity!==undefined&&identity!==nextIdentity)window.location.hash='#accueil';identity=nextIdentity;setUser(next);setLoading(false);}}
   catch(error){if(active&&request===generation){setError(error instanceof Error?error.message:'Service momentanément indisponible.');setLoading(false);}}
  };
  const fullRefresh=()=>{void refresh();};
  // Une simple reprise de fenêtre ne démonte pas le dossier/PDF sélectionné.
  const focusRefresh=()=>{if(document.visibilityState!=='visible'||checkingFocus)return;checkingFocus=true;void refresh(true).finally(()=>{checkingFocus=false;});};
  const expire=()=>{generation++;setApiRole('');setUser(null);setLoading(false);};
  fullRefresh();window.addEventListener('leyisa:login',fullRefresh);window.addEventListener('leyisa:auth-changed',fullRefresh);window.addEventListener('leyisa:session-expired',expire);window.addEventListener('focus',focusRefresh);document.addEventListener('visibilitychange',focusRefresh);
  return()=>{active=false;generation++;window.removeEventListener('leyisa:login',fullRefresh);window.removeEventListener('leyisa:auth-changed',fullRefresh);window.removeEventListener('leyisa:session-expired',expire);window.removeEventListener('focus',focusRefresh);document.removeEventListener('visibilitychange',focusRefresh);};
 },[]);
 const role=(choice.userId===user?.id&&user?.roles.includes(choice.role as RoleCode)?choice.role:user?.roles[0]??'') as RoleCode;
 // Le rôle demandé ne peut que réduire les droits attribués ; le serveur le revérifie.
 setApiRole(role);
 const scopedUser=user?{...user,permissions:user.permissionsByRole?.[role]??(user.roles.length===1?user.permissions:[])}:null;
 const route=routes.find(r=>r.hash===hash.split('?')[0])??routes[0];
 const parent=role?parentEntry(role,route.hash)??roleMenus[role][0]:undefined;
 useEffect(()=>{document.title=`${route.label} | Leyisa School`;setMenuOpen(false);},[route.label]);
 if(loading)return <main className="leyisa-session-loading" role="status" aria-busy="true"><span className="leyisa-loading-mark" aria-hidden="true"/><strong>Ouverture de votre espace</strong><p>Vérification de la session…</p></main>;
 if(!user||!scopedUser)return error?<main className="leyisa-page"><h1>Connexion au service</h1><p role="alert">{error}</p><button className="leyisa-button" onClick={()=>window.dispatchEvent(new Event('leyisa:login'))}>Réessayer</button></main>:<LoginPage/>;
 async function signOut(){try{await logout();setApiRole('');setUser(null);window.location.hash='#connexion';}catch(e){setError(e instanceof Error?e.message:'Déconnexion impossible.');}}
 function changeRole(next:string){if(!user?.roles.includes(next as RoleCode))return;setChoice({userId:user.id,role:next});setMenuOpen(false);window.location.hash='#accueil';}
 const links=roleMenus[role].filter(item=>{const entry=routes.find(r=>r.hash===item.hash);return entry&&(!entry.permission||can(scopedUser,entry.permission));});
 return <SessionContext.Provider value={{...scopedUser,roles:[role]}}><WorkspaceStateProvider key={`${user.id}:${role}`}><div className="leyisa-shell" data-theme={dark?"dark":"light"}>
 <header className="leyisa-topbar"><div className="leyisa-top-left"><a className="leyisa-brand" href="#accueil"><SchoolLogo/><strong>Leyisa School</strong></a><nav className="leyisa-breadcrumb" aria-label="Fil d’Ariane"><a href="#accueil">Accueil</a>{route.hash!=='#accueil'&&<>{parent?.hash!=='#accueil'&&parent?.hash!==route.hash&&<><span aria-hidden="true">/</span><a href={parent?.hash??'#accueil'}>{parent?.label??'Accueil'}</a></>}<span aria-hidden="true">/</span><span aria-current="page">{route.label}</span></>}{route.hash==='#accueil'&&<span className="sr-only" aria-current="page">Page actuelle</span>}</nav></div>
 <div className="session-controls"><span className="leyisa-chip">{deploymentLabel}</span>{user.roles.length>1?<><label className="sr-only" htmlFor="session-role">Rôle actif</label><select id="session-role" value={role} onChange={e=>changeRole(e.target.value)}>{user.roles.map(r=><option key={r} value={r}>{roleNames[r]}</option>)}</select></>:<span className="leyisa-chip">{roleNames[role]}</span>}<RoleNotifications key={`${user.id}:${role}`} role={role}/><button type="button" className="leyisa-theme-toggle" aria-pressed={dark} onClick={()=>setDark(value=>!value)}>{dark?"Mode clair":"Mode sombre"}</button><button onClick={()=>void signOut()}>Déconnexion</button></div></header>
 <aside className="leyisa-sidebar" data-open={menuOpen}>
  <button type="button" className="leyisa-menu-toggle" aria-expanded={menuOpen} aria-controls="leyisa-navigation" onClick={()=>setMenuOpen(open=>!open)}>{menuOpen?'Fermer le menu':'Ouvrir le menu'}</button>
  <nav id="leyisa-navigation" className="leyisa-nav" aria-label="Navigation principale"><p className="workspace-role">Menu principal</p><ul>{links.map(item=><li key={item.hash}><a href={item.hash} onClick={()=>setMenuOpen(false)} aria-current={item.hash===(parent?.hash??route.hash)?'page':undefined}>{item.label}</a></li>)}</ul></nav>
  <p className="leyisa-sidebar-note">VISIO TECH · {deploymentLabel}<br/>{isPrivateRecipe?'Données scolaires : accès privé':'Données de démonstration'}</p>
 </aside><div className="leyisa-workspace">
 {error&&<p role="alert">{error}</p>}<div key={`${role}:${route.hash}`} data-route={route.hash}>{route.permission&&!can(scopedUser,route.permission)?<AccessPage/>:route.render(role)}</div>
 </div></div></WorkspaceStateProvider></SessionContext.Provider>;
}
