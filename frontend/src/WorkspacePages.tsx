import { RetakeDecisionField } from './features/results/DeliberationPanel';
import { BulletinWorkspace } from './features/bulletins/BulletinWorkspace';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api, post } from './shared/api';
import { useSession } from './shared/session';
import { can } from './features/auth/authApi';
import { locationValue, rememberLocation, searchText, useWorkspaceState } from './shared/workspaceState';
import { evaluationStatus } from './shared/labels';
import { PageHeading } from './shared/PageHeading';

// Contrats d'écran : données réseau uniquement, aucun jeu de démonstration embarqué.
type Row=Record<string,any>;
export function useResource<T>(path: string | null) {
 const [state, setState] = useState({ path, data: null as T | null, error: '', loading: path !== null });
 const generation = useRef(0);
 const activePath = useRef<string | null>(null);
 const refresh = useCallback(async () => {
  if (!path || activePath.current !== path) return;
  const request = ++generation.current;
  setState(current => ({ path, data: current.path === path ? current.data : null, error: '', loading: true }));
  try {
   const data = await api<T>(path);
   if (request === generation.current) setState({ path, data, error: '', loading: false });
  } catch (error) {
   if (request === generation.current) {
    setState({ path, data: null, error: error instanceof Error ? error.message : 'Chargement impossible.', loading: false });
   }
  }
 }, [path]);
 useEffect(() => {
  activePath.current = path;
  void refresh();
  return () => {
   activePath.current = null;
   generation.current += 1;
  };
 }, [path, refresh]);
 return state.path === path
  ? { ...state, refresh }
  : { data: null, error: '', loading: path !== null, refresh };
}
function Feedback({error,loading}:{error:string;loading:boolean}) {return error?<p role="alert" className="form-feedback feedback-error">{error}</p>:loading?<p role="status">Chargement…</p>:null;}
export function Panel({title,children,disclosure}:{title:string;children:ReactNode;disclosure?:boolean}) {return (disclosure??/^(Ajouter|Créer|Nouveau|Nouvel|Nouvelle|Identité|Préparer un profil)/.test(title))
 ? <details className="leyisa-card workspace-disclosure"><summary>{title}</summary>{children}</details>
 : <section className="leyisa-card"><h2>{title}</h2>{children}</section>;}
export function Field({label,name,type='text',required=true,value,children}:{label:string;name:string;type?:string;required?:boolean;value?:string;children?:ReactNode}) {return <label><span>{label}{required?' *':''}</span>{children?<select aria-label={label} name={name} required={required} defaultValue={value}>{children}</select>:<input aria-label={label} name={name} type={type} step={type==='number'?'any':undefined} required={required} defaultValue={value} maxLength={type==='password'?256:200}/>}</label>;}
export function ActionForm({children,action,label='Enregistrer',done}:{children?:ReactNode;action:(d:Record<string,string>)=>Promise<unknown>;label?:string;done?:()=>void}) {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const d=Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;setBusy(true);setError('');setMessage('');try{await action(d);setMessage('Enregistrement confirmé par le serveur.');done?.();}catch(e){setError(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}}
 return <form className="leyisa-form" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>{children}</fieldset>{error&&<p role="alert" className="feedback-error">{error}</p>}{message&&<p role="status">{message}</p>}<button className="leyisa-button" disabled={busy}>{busy?'Traitement…':label}</button></form>;
}
function Options({rows,label='label'}:{rows:Row[];label?:string}) {return <><option value="">Choisir…</option>{rows.map(r=><option key={r.id} value={r.id}>{r[label]??r.code??r.id}</option>)}</>;}
function Page({title,description,children}:{title:string;description?:string;children:ReactNode}) {return <main className="leyisa-page"><PageHeading title={title} description={description}/>{children}</main>;}
export function AccessPage(){return <Page title="Accès refusé ou conflit"><div className="leyisa-grid"><Panel title="401 — Session absente ou révoquée"><a href="#connexion">Se connecter</a></Panel><Panel title="403 — Permissions insuffisantes"><a href="#accueil">Retour à mon espace</a></Panel><Panel title="409 — Conflit de version ou ressource clôturée"><button onClick={()=>window.location.reload()}>Recharger les données</button></Panel><Panel title="400 — Données invalides"><p>Corrigez les champs indiqués puis renvoyez le formulaire.</p><a href="#accueil">Retour à mon espace</a></Panel></div></Page>;}

const dashboards = {
 ADM:{title:'Tableau de bord Administration',main:'/school/bootstrap',related:'/users?page=1',primary:['Gérer les comptes','#comptes'],links:[['Configuration scolaire','#scolarite'],['Classes et programmes','#classes'],['Audit','#audit']]},
 SEC:{title:'Tableau de bord Secrétariat',main:'/students?pagination=1',related:'/bulletins/count',primary:['Retrouver un élève','#eleves'],links:[['Inscriptions','#inscription'],['Bulletins','#bulletins']]},
 ENS:{title:'Mon espace Enseignant',main:'/assignments/mine',related:'/evaluations',primary:['Ouvrir mes classes et cours','#cours'],links:[['Mes évaluations','#evaluations'],['Mes soumissions','#mes-soumissions']]},
 DIR:{title:'Tableau de bord Direction',main:'/results/class-periods',related:'/results/submissions',primary:['Examiner les soumissions','#validation'],links:[['Enseignants et affectations','#enseignants'],['Résultats','#resultats'],['Bulletins','#bulletins']]},
 ELEVE:{title:'Mes bulletins publiés',main:'/bulletins/count',related:null,primary:['Mes bulletins','#bulletins'],links:[]},
};
export function Dashboard({role}:{role:string}){
 const view=dashboards[role as keyof typeof dashboards]??dashboards.ELEVE;
 const current=useResource<Row|Row[]>(view.main),related=useResource<Row|Row[]>(view.related);
 const rows:Row[]=Array.isArray(current.data)?current.data:current.data?.items??[];
 const other:Row[]=Array.isArray(related.data)?related.data:[];
 const loading=current.loading||related.loading,error=current.error||related.error;
 let stats:[string,string|number][]=[];let overview:{id:string;label:string;context:string;href:string}[]=[];
 if(role==='ADM'){
  const years:Row[]=!Array.isArray(current.data)?current.data?.years??[]:[];
  stats=[['Années scolaires',years.length],['Classes',years.reduce((sum,y)=>sum+y.classes.length,0)],['Comptes utilisateurs',!Array.isArray(related.data)?related.data?.total??0:0]];
  overview=years.map(y=>({id:y.id,label:y.code,context:`${y.classes.length} classes`,href:'#scolarite'}));
 }else if(role==='SEC'){
  stats=[['Dossiers élèves',!Array.isArray(current.data)?current.data?.total??0:0],['Résultats publiés',!Array.isArray(related.data)?related.data?.total??0:0]];
  overview=rows.slice(0,5).map(r=>({id:r.id,label:`${r.user.lastName} ${r.postName??''} ${r.user.firstName}`,context:r.matricule,href:`#historique?student=${r.id}`}));
 }else if(role==='ENS'){
  stats=[['Mes cours',rows.length],['Mes évaluations',other.length],['À corriger',other.filter(r=>r.state==='REJECTED').length]];
  overview=rows.slice(0,5).map(r=>({id:r.id,label:r.classSubject.subject.label,context:r.classSubject.schoolClass.label,href:`#evaluations?assignment=${r.id}`}));
 }else if(role==='DIR'){
  stats=[['Soumissions à examiner',other.length],['Classes',new Set(rows.map(r=>r.classId??r.classCode??r.classLabel)).size],['Résultats publiés',rows.filter(r=>r.status==='PUBLISHED').reduce((n,r)=>n+r.resultCount,0)]];
  overview=other.slice(0,5).map(r=>({id:r.id,label:r.evaluation.title,context:r.schoolClass.label,href:'#validation'}));
 }else{stats=[['Résultats publiés',!Array.isArray(current.data)?current.data?.total??0:0]];}
 return <Page title={view.title}>
  <Feedback error={error} loading={loading}/>
  <div className="leyisa-stats">{stats.map(([label,value])=><Panel key={label} title={label}><strong>{loading||error?'—':value}</strong></Panel>)}</div>
  <div className="leyisa-grid dashboard-workspace"><Panel title="Accès rapides"><ul className="workspace-shortcuts">{[view.primary,...view.links].map(([label,href],index)=><li key={href}><div><strong>{label}</strong><small>Ouvrir le module</small></div><a className={index===0?'leyisa-button':'workspace-open'} href={href}>Ouvrir<span className="sr-only"> : {label}</span></a></li>)}</ul></Panel>
  <Panel title="Vue d’ensemble">{!loading&&!error&&(overview.length?<div className="leyisa-table-wrap"><table><thead><tr><th>{role==='ENS'?'Cours':role==='SEC'?'Élève':role==='DIR'?'Soumission':'Année scolaire'}</th><th>{role==='SEC'?'Matricule':'Contexte'}</th><th>Action</th></tr></thead><tbody>{overview.map(r=><tr key={r.id}><td>{r.label}</td><td>{r.context}</td><td><a href={r.href}>Consulter</a></td></tr>)}</tbody></table></div>:<p>Aucun élément à afficher dans votre périmètre.</p>)}<div className="dashboard-more"><a href={view.primary[1]}>Ouvrir le module</a></div></Panel></div>
 </Page>;
}

export function CollectionTools({search,onSearch,children}:{search:string;onSearch:(s:string)=>void;children?:ReactNode}){
 return <div className="collection-tools"><label>Rechercher<input type="search" value={search} onChange={e=>onSearch(e.target.value)} placeholder="Nom, classe ou matière"/></label>{children}</div>;
}
export function Pagination({page,total,size=15,onPage}:{page:number;total:number;size?:number;onPage:(n:number)=>void}){
 const pages=Math.max(1,Math.ceil(total/size));return <div className="workspace-pagination"><span>{total} résultat(s) · page {page} sur {pages}</span><button disabled={page<=1} onClick={()=>onPage(page-1)}>Précédent</button><button disabled={page>=pages} onClick={()=>onPage(page+1)}>Suivant</button></div>;
}

function StaffCredentialsForm({account,done}:{account:Row;done:()=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  const form=e.currentTarget,d=new FormData(form);
  const newPassword=String(d.get('newPassword')??'');
  if(newPassword!==d.get('confirmPassword')){setError('Les deux mots de passe doivent être identiques.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   await post(`/users/${account.id}/credentials`,{...(!account.login?{login:String(d.get('login')??'').trim()}:{}),newPassword,adminPassword:String(d.get('adminPassword')??'')});
   form.reset();setMessage(account.login?'Mot de passe réinitialisé. Les anciennes sessions sont révoquées.':'Identifiants initialisés. Activez le compte après transmission sécurisée.');done();
  }catch(e){setError(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}
 }
 return <form className="leyisa-form" onSubmit={submit} aria-busy={busy}><h4>{account.login?'Réinitialiser le mot de passe':'Configurer les identifiants'}</h4><fieldset disabled={busy}>
 {!account.login&&<label>Identifiant<input name="login" required maxLength={100} autoComplete="off"/></label>}
 <label>Nouveau mot de passe<input name="newPassword" type="password" minLength={12} maxLength={256} autoComplete="new-password" required/></label>
 <label>Confirmer le nouveau mot de passe<input name="confirmPassword" type="password" minLength={12} maxLength={256} autoComplete="new-password" required/></label>
 <label>Votre mot de passe administrateur<input name="adminPassword" type="password" autoComplete="current-password" required maxLength={256}/></label>
 </fieldset>{error&&<p role="alert" className="feedback-error">{error}</p>}{message&&<p role="status">{message}</p>}<button className="leyisa-button" disabled={busy}>{busy?'Traitement…':account.login?'Réinitialiser le mot de passe':'Initialiser les identifiants'}</button></form>;
}
export function AccountsPage(){const [page,setPage]=useState(1);const r=useResource<Row>(`/users?page=${page}`);const user=useSession();const [selectedId,setSelectedId]=useState<string|null>(null);const selected=r.data?.items?.find((row:Row)=>row.id===selectedId)??null;return <Page title="Comptes et rôles" description="Créer un compte inactif, puis l’activer après remise sécurisée des identifiants."><Feedback error={r.error} loading={r.loading}/><div className="leyisa-grid"><Panel title="Comptes utilisateurs"><div className="leyisa-table-wrap"><table><thead><tr><th>Utilisateur</th><th>Rôles</th><th>Statut</th><th>Action</th></tr></thead><tbody>{r.data?.items.map((row:Row)=><tr key={row.id}><td><strong>{row.firstName} {row.lastName}</strong><br/>{row.login??"Identifiants non configurés"}</td><td>{row.roles.map((r:Row)=>r.role).join(', ')}</td><td>{row.loginEnabled?'Actif':'Inactif'}</td><td><button onClick={()=>setSelectedId(row.id)} disabled={row.id===user?.id}>Ouvrir</button></td></tr>)}</tbody></table></div><div className="workspace-controls"><button disabled={page===1} onClick={()=>setPage(page-1)}>Précédent</button><span>Page {page}</span><button disabled={page*50>=(r.data?.total??0)} onClick={()=>setPage(page+1)}>Suivant</button></div>{selected&&<div key={selected.id}><h3>{selected.firstName} {selected.lastName}</h3>{!selected.roles.some((r:Row)=>r.role==='ADM')&&selected.lastName!=='Recette historique synthétique'&&(selected.login||selected.roles.some((r:Row)=>r.role==='ENS'))&&<StaffCredentialsForm key={`${selected.id}:${selected.login??''}`} account={selected} done={r.refresh}/>}<ActionForm action={d=>api(`/users/${selected.id}/status`,{method:'PATCH',body:JSON.stringify({enabled:d.enabled==='true'})})} done={r.refresh} label="Modifier le statut"><Field label="Statut" name="enabled" value={String(selected.loginEnabled)}><option value="true">Actif</option><option value="false">Inactif</option></Field></ActionForm><ActionForm action={d=>api(`/users/${selected.id}/roles`,{method:'PUT',body:JSON.stringify({roles:[d.role]})})} done={r.refresh} label="Attribuer le rôle"><Field label="Rôle" name="role">{['ENS','SEC','DIR','ADM'].map(role=><option key={role}>{role}</option>)}</Field></ActionForm></div>}</Panel><Panel title="Nouveau compte"><ActionForm action={d=>post('/users',{...d,roles:[d.role]} )} done={r.refresh}><Field label="Identifiant" name="login"/><Field label="Nom" name="lastName"/><Field label="Prénom" name="firstName"/><Field label="Mot de passe initial (12 caractères minimum)" name="initialPassword" type="password"/><Field label="Rôle initial" name="role">{['ENS','SEC','DIR','ADM'].map(role=><option key={role}>{role}</option>)}</Field><p>Le compte est créé inactif. Vos propres rôles et votre statut sont protégés.</p></ActionForm></Panel></div></Page>;}

export function SchoolPages({view='school'}:{view?:'school'|'classes'|'program'}) {
 const r=useResource<Row>('/school/bootstrap');const user=useSession();const editable=can(user,'school.configure');
 const [yearId,setYearId]=useWorkspaceState('school-year',''),[classId,setClassId]=useWorkspaceState('school-class','');const years:Row[]=r.data?.years??[];const year=years.find(y=>y.id===yearId)??years.find(y=>y.classes.some((c:Row)=>c.subjects.length>0))??years[0];const classes:Row[]=year?.classes??[];const schoolClass=classes.find(c=>c.id===classId)??classes[0];
 const refresh=()=>void r.refresh();const title=view==='classes'?'Classes et matières':view==='program'?'Programme d’une classe':'Configuration scolaire';
 return <Page title={title} description="Années, calendriers par cycle et programmes versionnés."><Feedback error={r.error} loading={r.loading}/><div className="workspace-controls"><label>Année scolaire<select aria-label="Année scolaire" value={year?.id??''} onChange={e=>setYearId(e.target.value)}><Options rows={years} label="code"/></select></label><label>Classe<select aria-label="Classe" value={schoolClass?.id??''} onChange={e=>setClassId(e.target.value)}><Options rows={classes}/></select></label></div><div className="leyisa-stats"><Panel title="Année scolaire"><strong>{year?.code??'Aucune année'}</strong></Panel><Panel title="Composants de calendrier"><strong>{year?.periods.length??0}</strong></Panel><Panel title="Classes"><strong>{classes.length}</strong></Panel></div><div className="leyisa-grid"><Panel title={view==='school'?'Programme de la classe':view==='classes'?'Classes et matières':'Programme attendu'}><div className="leyisa-table-wrap"><table><thead><tr><th>{view==='classes'?'Classe':'Matière'}</th><th>{view==='classes'?'Cycle / niveau':'Maxima et référence'}</th><th>Action</th></tr></thead><tbody>{(view==='classes'?classes:schoolClass?.subjects??[]).map((row:Row)=><tr key={row.id}><td>{view==='classes'?row.label:row.subject.label}</td><td>{view==='classes'?`${row.cycle} / ${row.level}`:<><dl className="programme-maxima">{Object.entries(row.componentMaxima).map(([code,maximum])=><div key={code}><dt>{code}</dt><dd>{String(maximum??'N/A')}</dd></div>)}</dl><small className="programme-source">{row.source}</small></>}</td><td><a href="#programme" onClick={()=>setClassId(view==='classes'?row.id:schoolClass?.id)}>Programme</a></td></tr>)}</tbody></table></div>{view==='school'&&<details><summary>Calendrier du cycle de la classe</summary><div className="leyisa-table-wrap"><table><thead><tr><th>Cycle</th><th>Composant</th><th>Début</th><th>Fin</th></tr></thead><tbody>{year?.periods.filter((p:Row)=>p.profile===schoolClass?.cycle).map((p:Row)=><tr key={p.id}><td>{p.profile}</td><td>{p.code} · {p.kind}</td><td>{p.startsOn.slice(0,10)}</td><td>{p.endsOn.slice(0,10)}</td></tr>)}</tbody></table></div></details>}</Panel><Panel title={view==='school'?'Ajouter une période':view==='classes'?'Ajouter une classe':'Ajouter une matière au programme'}>{!editable?<p>Lecture seule : configuration réservée à l’administration.</p>:view==='school'?<ActionForm key={year?.id} done={refresh} action={d=>post('/school/periods',{...d,schoolYearId:year?.id,position:Number(d.position)})}><Field label="Cycle" name="profile">{['MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE'].map(c=><option key={c}>{c}</option>)}</Field><Field label="Code" name="code"/><Field label="Libellé" name="label"/><Field label="Type" name="kind">{['PERIODE','EXAMEN','EVEIL','TRIMESTRE','SEMESTRE','ANNUEL','EVENEMENT'].map(c=><option key={c}>{c}</option>)}</Field><Field label="Composant parent (T1, S1, ANNEE…)" name="parentCode" required={false}/><Field label="Ordre" name="position" type="number"/><Field label="Début inclus" name="startsOn" type="date"/><Field label="Fin incluse" name="endsOn" type="date"/><Field label="Référence / version" name="source" value="DEMO_PROPOSE"/></ActionForm>:view==='classes'?<ActionForm done={refresh} action={d=>post('/school/classes',{...d,schoolYearId:year?.id})}><Field label="Code de classe" name="code"/><Field label="Libellé" name="label"/><Field label="Cycle" name="cycle">{['MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE'].map(c=><option key={c}>{c}</option>)}</Field><Field label="Niveau" name="level"/><Field label="Code option" name="optionCode" required={false}/><Field label="Version du programme" name="programVersion" value="DEMO-V1.1"/></ActionForm>:<ActionForm key={schoolClass?.id} done={refresh} action={d=>{const componentMaxima=Object.fromEntries(Object.entries(d).filter(([k])=>k.startsWith('max_')).map(([k,v])=>[k.slice(4),v==='N/A'?null:v]));return post('/school/program',{classId:schoolClass?.id,subjectId:d.subjectId,resultMaxScore:d.resultMaxScore,position:Number(d.position),source:d.source,componentMaxima});}}><Field label="Matière" name="subjectId"><Options rows={r.data?.subjects??[]}/></Field><Field label="Maximum de référence" name="resultMaxScore" type="number"/><Field label="Ordre sur le bulletin" name="position" type="number"/>{year?.periods.filter((p:Row)=>p.profile===schoolClass?.cycle&&['PERIODE','EXAMEN'].includes(p.kind)).map((p:Row)=><Field key={p.id} label={`Maximum ${p.code} (ou N/A)`} name={`max_${p.code}`}/>)}<Field label="Référence / version" name="source" value="DEMO_PROPOSE"/><p>Les valeurs absentes bloquent la clôture. Les programmes utilisés restent figés.</p></ActionForm>}</Panel></div>{editable&&view==='classes'&&<Panel title="Ajouter une matière au catalogue"><ActionForm done={refresh} action={d=>post('/school/subjects',d)}><Field label="Code" name="code"/><Field label="Matière" name="label"/></ActionForm></Panel>}{editable&&view==='school'&&<div className="leyisa-grid"><Panel title="Créer une année scolaire"><ActionForm done={refresh} action={d=>post('/school/years',d)}><Field label="Code année" name="code"/><Field label="Début" name="startsOn" type="date"/><Field label="Fin" name="endsOn" type="date"/></ActionForm></Panel><Panel title="Identité de l’établissement"><ActionForm done={refresh} action={d=>post('/school/identity',d)}>{[['name','École'],['code','Code école'],['province','Province'],['city','Ville / territoire'],['commune','Commune'],['address','Adresse']].map(([name,label])=><Field key={name} name={name} label={label} required={false} value={r.data?.settings?.identity?.[name]??''}/>)}</ActionForm></Panel></div>}{editable&&view==='program'&&year&&schoolClass&&schoolClass.cycle!=='MATERNEL'&&<DemoProfileForm year={year} schoolClass={schoolClass}/>}</Page>;
}

export function TeacherPages({view='assignments'}:{view?:'teachers'|'assignments'|'mine'}){
 const mine=view==='mine',teachers=view==='teachers';
 const r=useResource<Row|Row[]>(mine?'/assignments/mine':'/assignments'),school=useResource<Row>(mine?null:'/school/bootstrap');
 const [search,setSearch]=useState(''),[page,setPage]=useState(1),[classId,setClassId]=useWorkspaceState('assignment-class','');
 const [teacherId,setTeacherId]=useWorkspaceState('assignment-teacher','');const requestedTeacher=locationValue('teacher');
 useEffect(()=>{if(!mine&&!teachers&&requestedTeacher)setTeacherId(requestedTeacher);},[requestedTeacher,mine,teachers]);
 const classes:Row[]=mine?Array.isArray(r.data)?[...new Map(r.data.map(a=>[a.classSubject.schoolClass.id,a.classSubject.schoolClass])).values()]:[]:school.data?.years.flatMap((y:Row)=>y.classes.map((c:Row)=>({...c,yearCode:y.code,yearStartsOn:y.startsOn})))??[];
 const data:Row=(!Array.isArray(r.data)?r.data:null)??{};
 const rows:Row[]=mine?Array.isArray(r.data)?r.data:[]:teachers?data.teachers??[]:data.assignments??[];
 const editable=can(useSession(),'assignments.manage');
 const filtered=rows.filter(row=>(!classId||teachers||row.classSubject.schoolClass.id===classId)&&(!teacherId||mine||teachers||row.teacher.id===teacherId)&&searchText(teachers?`${row.user.lastName} ${row.user.firstName} ${row.staffNumber??''}`:`${row.classSubject.schoolClass.label} ${row.classSubject.subject.label} ${row.teacher?.user.firstName??''} ${row.teacher?.user.lastName??''}`).includes(searchText(search)));
 const chosen=classes.find(c=>c.id===classId);const visible=filtered.slice((page-1)*15,page*15);
 const availableTeachers=(data.teachers??[]).filter((t:Row)=>t.user.loginEnabled);
 return <Page title={mine?'Mes classes et cours':'Enseignants et affectations'}><Feedback error={r.error||school.error} loading={r.loading||school.loading}/>
 {!mine&&<nav className="workspace-tabs" aria-label="Gestion des enseignants"><a href="#enseignants" aria-current={teachers?'page':undefined}>Enseignants</a><a href="#affectations" aria-current={!teachers?'page':undefined}>Affectations</a></nav>}
 <Panel title={mine?'Mes cours':teachers?'Enseignants':'Affectations'}>{!mine&&!teachers&&<label>Enseignant affiché<select aria-label="Enseignant affiché" value={teacherId} onChange={e=>{setTeacherId(e.target.value);rememberLocation('teacher',e.target.value);setPage(1);}}><option value="">Tous les enseignants</option>{(data.teachers??[]).map((t:Row)=><option key={t.id} value={t.id}>{t.user.lastName} {t.user.firstName} — {t.staffNumber??(t.user.loginEnabled?'Actif':'Inactif')}</option>)}</select></label>}<CollectionTools search={search} onSearch={value=>{setSearch(value);setPage(1);}}>{!teachers&&<label>Classe<select aria-label="Classe" value={classId} onChange={e=>{setClassId(e.target.value);setPage(1);}}><option value="">Toutes les classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}</CollectionTools>
 {!r.loading&&!r.error&&<><div className="leyisa-table-wrap"><table><thead><tr><th>{teachers?'Enseignant':'Classe'}</th><th>{teachers?'Matricule':'Matière'}</th><th>{teachers?'Statut':mine?'Évaluations':'Enseignant'}</th><th>Action</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{teachers?`${row.user.lastName} ${row.user.firstName}`:row.classSubject.schoolClass.label}</td><td>{teachers?row.staffNumber??'—':row.classSubject.subject.label}</td><td>{teachers?row.user.loginEnabled?'Actif':'Inactif':mine?row.evaluations.length:`${row.teacher.user.lastName} ${row.teacher.user.firstName}`}</td><td>{mine?<a href={`#evaluations?assignment=${row.id}`}>Ouvrir le cours</a>:teachers?<a href={`#affectations?teacher=${row.id}`} onClick={()=>{setTeacherId(row.id);setClassId('');setPage(1);}}>Affectations</a>:<small>{row.startsOn.slice(0,10)} — {row.endsOn?.slice(0,10)??'En cours'}</small>}</td></tr>)}</tbody></table></div>{!filtered.length&&<p>{mine?'Aucun cours dans votre périmètre pour ces filtres.':'Aucun résultat pour ces filtres.'}</p>}<Pagination page={page} total={filtered.length} onPage={setPage}/></>}
 </Panel>{editable&&!mine&&<Panel title={teachers?'Nouvel enseignant':'Nouvelle affectation'}>{teachers?!(data.candidates??[]).length?<p>Aucun nouveau compte enseignant actif à rattacher. L’administration peut préparer les comptes dans Comptes utilisateurs.</p>:<ActionForm action={d=>post('/assignments/teachers',d)} done={r.refresh}><Field label="Compte ENS actif" name="userId"><Options rows={(data.candidates??[]).map((c:Row)=>({...c,label:`${c.firstName} ${c.lastName}`}))}/></Field><Field label="Matricule enseignant" name="staffNumber" required={false}/></ActionForm>:<><label>Classe<select aria-label="Classe de la nouvelle affectation" value={classId} onChange={e=>setClassId(e.target.value)}><Options rows={classes.map(c=>({...c,label:`${c.label} — ${c.yearCode}`}))}/></select></label>{chosen&&!chosen.subjects?.length&&<p>Aucune matière au programme de cette classe. L’administration doit préparer son programme avant l’affectation.</p>}{!availableTeachers.length&&<p>Aucun enseignant actif disponible. Vérifiez son compte auprès de l’administration.</p>}{chosen&&chosen.subjects?.length>0&&availableTeachers.length>0&&<ActionForm key={`${chosen.id}:${teacherId}`} action={d=>post('/assignments',d)} done={r.refresh}><Field label="Enseignant" name="teacherId" value={availableTeachers.some((t:Row)=>t.id===teacherId)?teacherId:''}><Options rows={availableTeachers.map((t:Row)=>({...t,label:`${t.user.lastName} ${t.user.firstName}${t.staffNumber?` — ${t.staffNumber}`:''}`}))}/></Field><Field label="Matière du programme" name="classSubjectId"><Options rows={(chosen.subjects??[]).map((v:Row)=>({...v,label:v.subject.label}))}/></Field><Field label="Début inclus" name="startsOn" type="date"/><Field label="Fin exclusive" name="endsOn" type="date" required={false}/></ActionForm>}</>}</Panel>}
 </Page>;
}

export function StudentRecordPages({view}:{view:'record'|'history'|'enroll'}) {
 const [search,setSearch]=useWorkspaceState('student-search','');
 const r=useResource<Row[]>(`/students?search=${encodeURIComponent(search)}`);
 const school=useResource<Row[]>('/students/registration-options');
 const [id,setId]=useWorkspaceState('student','');
 const requested=locationValue('student');
 useEffect(()=>{if(id&&view!=='record'&&(!requested||requested===id))rememberLocation('student',id);},[id,view]);
 useEffect(()=>{if(requested&&requested!==id)setId(requested);},[requested]);
 const record=useResource<Row>(id?`/students/${id}`:null);
 const selected=id?(record.data??r.data?.find(s=>s.id===id)):undefined;
 useEffect(()=>{if(!id&&selected){setId(selected.id);if(view!=='record')rememberLocation('student',selected.id);}},[selected?.id,id]);
 const user=useSession();const write=can(user,'students.enroll');
 function selectStudent(next:string){setId(next);rememberLocation('student',next);}
 const choices=[...new Map([...(r.data??[]),...(selected?[selected]:[])].map(student=>[student.id,student])).values()];
 const fields=<><Field label="Matricule permanent" name="matricule"/><Field label="Nom" name="lastName"/><Field label="Postnom" name="postName" required={false}/><Field label="Prénom" name="firstName"/><Field label="Date de naissance" name="birthDate" type="date" required={false}/><Field label="Lieu de naissance" name="birthPlace" required={false}/><Field label="Sexe" name="sex" required={false}><option value="">Non renseigné</option><option value="F">Féminin</option><option value="M">Masculin</option></Field><Field label="Numéro permanent" name="permanentNumber" required={false}/><Field label="Responsable" name="guardian" required={false}/><Field label="Contact" name="contact" required={false}/></>;
 return <Page title={view==='record'?'Nouveau dossier élève':view==='history'?'Fiche et historique scolaire':'Inscription annuelle'} ><Feedback error={r.error||school.error||record.error} loading={r.loading||school.loading||record.loading}/><a className="workspace-back" href={view==='enroll'&&selected?`#historique?student=${selected.id}`:'#eleves'}>{view==='enroll'&&selected?'← Fiche de l’élève':'← Élèves'}</a>{view!=='record'&&<label>Rechercher un dossier<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Matricule ou nom"/></label>}{view!=='record'&&<label>Élève<select aria-label="Élève" value={selected?.id??''} onChange={e=>selectStudent(e.target.value)}><Options rows={choices.map(s=>({...s,label:`${s.matricule} — ${s.user.lastName} ${s.postName??''} ${s.user.firstName}`}))}/></select></label>}<div className="leyisa-grid"><Panel disclosure={false} title={view==='record'?'Créer un dossier élève':view==='history'?'Fiche élève':'Nouvelle inscription annuelle'}>{view==='record'?(write?<ActionForm action={async d=>{const location=window.location.hash;const saved=await post<Row>('/students/records',d);if(window.location.hash===location)setId(saved.id);return saved;}} done={r.refresh} label="Enregistrer le dossier"><div className="leyisa-fields-grid">{fields}</div></ActionForm>:<p>Création réservée au secrétariat.</p>):view==='history'?<>{!selected&&<p>Choisissez un élève ou ouvrez son dossier depuis la liste.</p>}<p>{selected?.matricule}</p><h3>{selected?.user.lastName} {selected?.postName} {selected?.user.firstName}</h3><p>Naissance : {selected?.birthDate?.slice(0,10)??'—'}</p>{write&&selected&&<a className="leyisa-button" href={`#inscription?student=${selected.id}`}>Inscrire à une nouvelle année</a>}</>:write&&selected?<ActionForm key={selected.id} action={d=>post(`/students/${selected.id}/enrollments`,{classId:d.classId,schoolYearId:school.data?.find(y=>y.classes.some((c:Row)=>c.id===d.classId))?.id})} done={r.refresh} label="Confirmer l’inscription"><Field label="Classe / année scolaire" name="classId"><Options rows={school.data?.flatMap(y=>y.classes.map((c:Row)=>({...c,label:`${c.label} — ${y.code}`})))??[]}/></Field></ActionForm>:<p>Choisissez un dossier ; inscription réservée au secrétariat.</p>}</Panel><Panel title={view==='history'?'Historique scolaire':'Contrôles indispensables'}>{view==='history'?<ul>{selected?.enrollments.map((en:Row)=><li key={en.id}>{en.schoolClass.schoolYear.code} — {en.schoolClass.label}</li>)}</ul>:<><p>Le dossier et ses anciennes inscriptions restent conservés.</p>{view==='record'&&id&&<a href={`#historique?student=${id}`}>Ouvrir le dossier enregistré</a>}</>}</Panel></div></Page>;
}

export function EvaluationsHome({create=false,submissions=false}:{create?:boolean;submissions?:boolean}){
 const r=useResource<Row[]>('/evaluations');const courses=useResource<Row[]>(can(useSession(),'assignments.readOwn')?'/assignments/mine':null);
 const [search,setSearch]=useState(''),[page,setPage]=useState(1),[classId,setClassId]=useState(''),[status,setStatus]=useState('');
 const assignmentId=locationValue('assignment');const assignment=courses.data?.find(c=>c.id===assignmentId);
 if(create)return <EvaluationCreate/>;
 const rows=r.data??[];const classes=[...new Map(rows.map(e=>[e.schoolClass.id,e.schoolClass])).values()];
 const filtered=rows.filter(e=>(!assignmentId||e.assignmentId===assignmentId)&&(!submissions||e.state!=='DRAFT')&&(!classId||e.schoolClass.id===classId)&&(!status||e.state===status)&&searchText(`${e.title} ${e.subject.label} ${e.schoolClass.label} ${e.period.label}`).includes(searchText(search)));
 const reset=(change:()=>void)=>{change();setPage(1);};
 return <Page title={submissions?'Mes soumissions':assignment?`${assignment.classSubject.schoolClass.label} · ${assignment.classSubject.subject.label}`:'Mes évaluations'}>
 <Feedback error={r.error||courses.error} loading={r.loading||courses.loading}/>
 {assignmentId&&<a className="workspace-back" href="#cours">← Mes classes et cours</a>}
 {!submissions&&<div className="workspace-primary"><a className="leyisa-button" href={`#evaluation${assignmentId?`?assignment=${assignmentId}`:''}`}>Créer une évaluation</a>{assignmentId&&<a href="#evaluations">Toutes mes évaluations</a>}</div>}
 <Panel title={submissions?'Suivi de mes soumissions':'Évaluations'}><CollectionTools search={search} onSearch={v=>reset(()=>setSearch(v))}><label>Classe<select value={classId} onChange={e=>reset(()=>setClassId(e.target.value))}><option value="">Toutes les classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>État<select value={status} onChange={e=>reset(()=>setStatus(e.target.value))}><option value="">Tous les états</option>{['DRAFT','SUBMITTED','REJECTED','VALIDATED'].filter(v=>!submissions||v!=='DRAFT').map(v=><option key={v} value={v}>{evaluationStatus(v)}</option>)}</select></label></CollectionTools>
 {!r.loading&&!r.error&&<><div className="leyisa-table-wrap"><table><thead><tr><th>Évaluation</th><th>Classe et matière</th><th>Période</th><th>État</th><th>Action</th></tr></thead><tbody>{filtered.slice((page-1)*15,page*15).map(e=><tr key={e.id}><td>{e.title}</td><td>{e.schoolClass.label} · {e.subject.label}</td><td>{e.period.label}</td><td>{evaluationStatus(e.state)}</td><td><a href={`#notes?id=${e.id}`}>{e.editable?'Ouvrir les notes':'Consulter'}</a></td></tr>)}</tbody></table></div>{!filtered.length&&<p>Aucune évaluation pour ces filtres dans votre périmètre.</p>}<Pagination page={page} total={filtered.length} onPage={setPage}/></>}
 </Panel></Page>;
}

function EvaluationCreate(){
 const r=useResource<Row[]>('/assignments/mine');const requested=locationValue('assignment');
 const [assignmentId,setAssignmentId]=useWorkspaceState('evaluation-assignment',requested);
 useEffect(()=>{if(requested)setAssignmentId(requested);},[requested]);
 const rows=r.data??[],assignment=rows.find(a=>a.id===assignmentId);
 return <Page title="Créer une évaluation"><Feedback error={r.error} loading={r.loading}/><a className="workspace-back" href={`#evaluations${assignmentId?`?assignment=${assignmentId}`:''}`}>← Mes évaluations</a>
 {!r.loading&&!r.error&&<Panel title="Évaluation"><label>Cours affecté<select aria-label="Cours affecté" value={assignment?.id??''} onChange={e=>{setAssignmentId(e.target.value);rememberLocation('assignment',e.target.value);}}><Options rows={rows.map(a=>({...a,label:`${a.classSubject.schoolClass.label} — ${a.classSubject.subject.label}`}))}/></select></label>
 {!rows.length&&<p>Aucun cours affecté : la direction doit préparer votre affectation.</p>}
 {requested&&!assignment&&rows.length>0&&<p role="alert">Le cours demandé n’est pas disponible dans vos affectations. Choisissez un cours autorisé.</p>}
 {assignment&&<AssignedEvaluationForm key={assignment.id} assignment={assignment}/>}</Panel>}</Page>;
}
function AssignedEvaluationForm({assignment}:{assignment:Row}) {
 const maternal=assignment.classSubject.schoolClass.cycle==='MATERNEL';
 const [kind,setKind]=useState(maternal?'APPRECIATION':'TRAVAIL_JOURNALIER');
 const [periodId,setPeriodId]=useState('');
 const expected=kind==='EXAMEN'?'EXAMEN':kind==='REPECHAGE'?'REPECHAGE':'PERIODE';
 const start=assignment.startsOn.slice(0,10);
 const end=assignment.endsOn?new Date(new Date(assignment.endsOn).getTime()-86400000).toISOString().slice(0,10):'9999-12-31';
 const periods=assignment.classSubject.schoolClass.classPeriods.filter((cp:Row)=>!cp.closedAt&&cp.period.profile===assignment.classSubject.schoolClass.cycle&&cp.period.kind===expected&&cp.period.startsOn.slice(0,10)<=end&&cp.period.endsOn.slice(0,10)>=start);
 const period=periods.find((cp:Row)=>cp.id===periodId);
 const min=period?[start,period.period.startsOn.slice(0,10)].sort().at(-1):undefined;
 const max=period?[end,period.period.endsOn.slice(0,10)].sort()[0]:undefined;
 const types=maternal?[['APPRECIATION','Appréciation']]:[['TRAVAIL_JOURNALIER','Travail journalier'],['EXAMEN','Examen'],['REPECHAGE','Repêchage']];
 return <><label>Type<select aria-label="Type" value={kind} onChange={e=>{setKind(e.target.value);setPeriodId('');}}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 {!periods.length?<p role="status">Aucune période ouverte compatible avec ce type et les dates de votre affectation. La direction doit vérifier votre affectation et l’administration le calendrier.</p>:<ActionForm key={kind} action={async d=>{const location=window.location.hash;const result=await post<Row>('/evaluations',{...d,kind,assignmentId:assignment.id});if(window.location.hash===location)window.location.hash=`#notes?id=${result.id}`;}} label="Créer l’évaluation">
 <label>Composant de résultat<select aria-label="Composant de résultat" name="classPeriodId" required value={period?.id??''} onChange={e=>setPeriodId(e.target.value)}><Options rows={periods.map((cp:Row)=>({...cp,label:`${cp.period.code} — ${cp.period.label}`}))}/></select></label>
 {kind==='REPECHAGE'&&<RetakeDecisionField/>}<Field label="Intitulé" name="title"/>
 {!maternal&&<Field label="Barème maximum (hors appréciation)" name="maxScore" type="number" value="20"/>}
 <label>Date<input aria-label="Date" name="heldOn" type="date" required min={min} max={max}/></label>
 </ActionForm>}</>;
}

export function BulletinsPage({ catalog = false }: { catalog?: boolean }) {
 return <BulletinWorkspace catalog={catalog}/>;
}

export function AuditPage(){const [page,setPage]=useState(1),[action,setAction]=useState(''),[actor,setActor]=useState('');const r=useResource<Row>(`/audit?${new URLSearchParams({page:String(page),...(action?{action}:{}),...(actor?{actorId:actor}:{})})}`);return <Page title="Journal d’audit" description="Historique des actions effectuées. Consultation réservée à l’administration."><Feedback error={r.error} loading={r.loading}/><div className="leyisa-grid"><Panel title="Événements récents"><div className="leyisa-table-wrap"><table><thead><tr><th>Date</th><th>Acteur</th><th>Événement</th><th>Objet</th></tr></thead><tbody>{r.data?.items.map((e:Row)=><tr key={e.id}><td>{new Date(e.occurredAt).toLocaleString('fr-FR',{timeZone:'Africa/Kinshasa'})}</td><td>{e.actorId??'Inconnu'}</td><td>{e.action}</td><td>{e.targetType}</td></tr>)}</tbody></table></div><button disabled={page===1} onClick={()=>setPage(page-1)}>Précédent</button> Page {page} <button disabled={page*50>=(r.data?.total??0)} onClick={()=>setPage(page+1)}>Suivant</button></Panel><Panel title="Filtres"><ActionForm action={async d=>{setAction(d.action.trim());setActor(d.actorId.trim());setPage(1);}} label="Appliquer les filtres"><Field label="Type d’action exact" name="action" required={false}/><Field label="Identifiant de l’acteur" name="actorId" required={false}/></ActionForm></Panel></div></Page>;}

function DemoProfileForm({year,schoolClass}:{year:Row;schoolClass:Row}) {
 return <Panel title="Préparer un profil de délibération DEMO"><p>{year.code} · {schoolClass.cycle} · {schoolClass.level}. Une nouvelle version conserve les anciennes décisions.</p><ActionForm action={d=>post('/results/profiles',{code:d.code,version:Number(d.version),schoolYearId:year.id,cycle:schoolClass.cycle,level:schoolClass.level,optionCode:schoolClass.optionCode,status:'DEMO_PROPOSE',source:d.source,config:{admissionThreshold:d.admissionThreshold,failureThreshold:d.failureThreshold,retakeMode:d.retakeMode}})}><Field label="Code du profil" name="code"/><Field label="Version" name="version" type="number" value="1"/><Field label="Seuil proposé de passage (%)" name="admissionThreshold" type="number" value="50"/><Field label="Seuil proposé d’échec par cours (%)" name="failureThreshold" type="number" value="50"/><Field label="Deuxième session" name="retakeMode"><option value="MANUAL_ONLY">À vérifier manuellement</option><option value="REPLACE_E2_DEMO">DEMO : remplacement E2, sans modifier la première session</option></Field><Field label="Source et limites" name="source" value="DEMO_PROPOSE : scénario fictif, aucune norme scolaire affirmée"/></ActionForm></Panel>;
}
