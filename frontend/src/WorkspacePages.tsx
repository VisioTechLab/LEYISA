import { RetakeDecisionField } from './features/results/DeliberationPanel';
import { BulletinWorkspace } from './features/bulletins/BulletinWorkspace';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api, post } from './shared/api';
import { useSession } from './shared/session';
import { can } from './features/auth/authApi';
import { locationValue, rememberLocation, useWorkspaceState } from './shared/workspaceState';
import { evaluationStatus } from './shared/labels';

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
export function Panel({title,children}:{title:string;children:ReactNode}) {return <section className="leyisa-card"><h2>{title}</h2>{children}</section>;}
export function Field({label,name,type='text',required=true,value,children}:{label:string;name:string;type?:string;required?:boolean;value?:string;children?:ReactNode}) {return <label><span>{label}{required?' *':''}</span>{children?<select aria-label={label} name={name} required={required} defaultValue={value}>{children}</select>:<input aria-label={label} name={name} type={type} step={type==='number'?'any':undefined} required={required} defaultValue={value} maxLength={type==='password'?256:200}/>}</label>;}
export function ActionForm({children,action,label='Enregistrer',done}:{children?:ReactNode;action:(d:Record<string,string>)=>Promise<unknown>;label?:string;done?:()=>void}) {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const d=Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;setBusy(true);setError('');setMessage('');try{await action(d);setMessage('Enregistrement confirmé par le serveur.');done?.();}catch(e){setError(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}}
 return <form className="leyisa-form" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>{children}</fieldset>{error&&<p role="alert" className="feedback-error">{error}</p>}{message&&<p role="status">{message}</p>}<button className="leyisa-button" disabled={busy}>{busy?'Traitement…':label}</button></form>;
}
function Options({rows,label='label'}:{rows:Row[];label?:string}) {return <><option value="">Choisir…</option>{rows.map(r=><option key={r.id} value={r.id}>{r[label]??r.code??r.id}</option>)}</>;}
function Page({title,description,children}:{title:string;description?:string;children:ReactNode}) {return <main className="leyisa-page"><header className="leyisa-page-heading"><h1>{title}</h1><p>{description}</p></header>{children}</main>;}
export function AccessPage(){return <Page title="Accès refusé ou conflit"><div className="leyisa-grid"><Panel title="401 — Session absente ou révoquée"><a href="#connexion">Se connecter</a></Panel><Panel title="403 — Permissions insuffisantes"><a href="#accueil">Retour à mon espace</a></Panel><Panel title="409 — Conflit de version ou ressource clôturée"><button onClick={()=>window.location.reload()}>Recharger les données</button></Panel><Panel title="400 — Données invalides"><p>Corrigez les champs indiqués puis renvoyez le formulaire.</p><a href="#accueil">Retour à mon espace</a></Panel></div></Page>;}

const dashboards = {
 ADM: {
  title: 'Tableau de bord Administration', main: '/school/bootstrap', related: '/assignments',
  links: [['Configurer l’année', '#scolarite'], ['Classes et matières', '#classes'], ['Gérer les comptes', '#comptes']],
 },
 SEC: {
  title: 'Tableau de bord Secrétariat', main: '/students', related: '/bulletins',
  links: [['Liste des élèves', '#eleves'], ['Nouveau dossier', '#dossier'], ['Inscription annuelle', '#inscription']],
 },
 ENS: {
  title: 'Mon espace Enseignant', main: '/assignments/mine', related: '/evaluations',
  links: [['Mes cours', '#cours'], ['Nouvelle évaluation', '#evaluation'], ['Saisie des notes', '#notes']],
 },
 DIR: {
  title: 'Tableau de bord Direction', main: '/results/class-periods', related: '/results/submissions',
  links: [['File de validation', '#validation'], ['Prévisualiser les résultats', '#previsualisation'], ['Clôturer une période', '#cloture']],
 },
 ELEVE: {
  title: 'Mes bulletins publiés', main: '/bulletins', related: null,
  links: [['Bulletins disponibles', '#bulletins']],
 },
};

export function Dashboard({ role }: { role: string }) {
 const view = dashboards[role as keyof typeof dashboards] ?? dashboards.ELEVE;
 const current = useResource<Row | Row[]>(view.main);
 const related = useResource<Row | Row[]>(view.related);
 const rows = Array.isArray(current.data) ? current.data : [];
 const other = Array.isArray(related.data) ? related.data : [];
 const loading = current.loading || related.loading;
 const error = current.error || related.error;

 let stats: [string, string | number][];
 let columns: [string, string];
 let overview: [string, string, string][];
 switch (role) {
  case 'ADM': {
   const years: Row[] = current.data && !Array.isArray(current.data) ? current.data.years : [];
   const activeYear = years[0];
   const teachers = related.data && !Array.isArray(related.data) ? related.data.teachers.length : 0;
   stats = [['Année scolaire', activeYear?.code ?? '—'], ['Classes', activeYear?.classes.length ?? 0], ['Enseignants', teachers]];
   columns = ['Année', 'Classes'];
   overview = years.map(year => [year.id, year.code, String(year.classes.length)]);
   break;
  }
  case 'SEC':
   stats = [['Dossiers affichés', rows.length], ['Inscriptions associées', rows.reduce((sum, row) => sum + row.enrollments.length, 0)], ['Bulletins disponibles', other.length]];
   columns = ['Élève', 'Dernière classe'];
   overview = rows.map(row => [row.id, `${row.user.lastName} ${row.user.firstName}`, row.enrollments[0]?.schoolClass.label ?? '—']);
   break;
  case 'ENS':
   stats = [['Cours affectés', rows.length], ['Évaluations', other.length], ['Corrections', other.filter(row => row.state === 'REJECTED').length]];
   columns = ['Matière', 'Classe'];
   overview = rows.map(row => [row.id, row.classSubject.subject.label, row.classSubject.schoolClass.label]);
   break;
  case 'DIR':
   stats = [['À valider', other.length], ['Périodes ouvertes', rows.filter(row => row.status === 'OPEN').length], ['Périodes clôturées', rows.filter(row => row.status !== 'OPEN').length]];
   columns = ['Soumission', 'Classe'];
   overview = other.map(row => [row.id, row.evaluation.title, row.schoolClass.label]);
   break;
  default:
   stats = [['Bulletins disponibles', rows.length]];
   columns = ['Classe', 'Période'];
   overview = rows.map(row => [row.id, row.identitySnapshot.classLabel, row.identitySnapshot.periodLabel]);
 }
 return (
  <Page title={view.title}>
   <Feedback error={error} loading={loading}/>
   <div className="leyisa-stats">
    {stats.map(([label, value]) => <Panel key={label} title={label}><strong>{loading || error ? '—' : value}</strong></Panel>)}
   </div>
   <div className="leyisa-grid">
    <Panel title="Accès rapides">
     <ul className="action-list">{view.links.map(([label, link]) => (
      <li key={link}><span>{label}</span><a className="leyisa-button leyisa-button-secondary" href={link} aria-label={label}>Ouvrir</a></li>
     ))}</ul>
    </Panel>
    <Panel title="Vue d’ensemble">
     {overview.length > 0 ? (
      <table className="dashboard-overview">
       <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
       <tbody>{overview.slice(0, 5).map(([id, label, value]) => <tr key={id}><td>{label}</td><td>{value}</td></tr>)}</tbody>
      </table>
     ) : !loading && !error && <p>Aucun élément à afficher.</p>}
     <a href={view.links[0][1]} className="leyisa-button">Ouvrir le module</a>
    </Panel>
   </div>
  </Page>
 );
}

export function AccountsPage(){const [page,setPage]=useState(1);const r=useResource<Row>(`/users?page=${page}`);const user=useSession();const [selected,setSelected]=useState<Row|null>(null);return <Page title="Comptes et rôles" description="Créer un compte inactif, puis l’activer après remise sécurisée des identifiants."><Feedback error={r.error} loading={r.loading}/><div className="leyisa-grid"><Panel title="Comptes utilisateurs"><div className="leyisa-table-wrap"><table><thead><tr><th>Utilisateur</th><th>Rôles</th><th>Statut</th><th>Action</th></tr></thead><tbody>{r.data?.items.map((row:Row)=><tr key={row.id}><td>{row.login}</td><td>{row.roles.map((r:Row)=>r.role).join(', ')}</td><td>{row.loginEnabled?'Actif':'Inactif'}</td><td><button onClick={()=>setSelected(row)} disabled={row.id===user?.id}>Ouvrir</button></td></tr>)}</tbody></table></div><div className="workspace-controls"><button disabled={page===1} onClick={()=>setPage(page-1)}>Précédent</button><span>Page {page}</span><button disabled={page*50>=(r.data?.total??0)} onClick={()=>setPage(page+1)}>Suivant</button></div>{selected&&<div key={selected.id}><h3>{selected.login}</h3><ActionForm action={d=>api(`/users/${selected.id}/status`,{method:'PATCH',body:JSON.stringify({enabled:d.enabled==='true'})})} done={r.refresh} label="Modifier le statut"><Field label="Statut" name="enabled" value={String(selected.loginEnabled)}><option value="true">Actif</option><option value="false">Inactif</option></Field></ActionForm><ActionForm action={d=>api(`/users/${selected.id}/roles`,{method:'PUT',body:JSON.stringify({roles:[d.role]})})} done={r.refresh} label="Attribuer le rôle"><Field label="Rôle" name="role">{['ENS','SEC','DIR','ADM'].map(role=><option key={role}>{role}</option>)}</Field></ActionForm></div>}</Panel><Panel title="Nouveau compte"><ActionForm action={d=>post('/users',{...d,roles:[d.role]} )} done={r.refresh}><Field label="Identifiant" name="login"/><Field label="Nom" name="lastName"/><Field label="Prénom" name="firstName"/><Field label="Mot de passe initial (12 caractères minimum)" name="initialPassword" type="password"/><Field label="Rôle initial" name="role">{['ENS','SEC','DIR','ADM'].map(role=><option key={role}>{role}</option>)}</Field><p>Le compte est créé inactif. Vos propres rôles et votre statut sont protégés.</p></ActionForm></Panel></div></Page>;}

export function SchoolPages({view='school'}:{view?:'school'|'classes'|'program'}) {
 const r=useResource<Row>('/school/bootstrap');const user=useSession();const editable=can(user,'school.configure');
 const [yearId,setYearId]=useWorkspaceState('school-year',''),[classId,setClassId]=useWorkspaceState('school-class','');const years:Row[]=r.data?.years??[];const year=years.find(y=>y.id===yearId)??years.find(y=>y.classes.some((c:Row)=>c.subjects.length>0))??years[0];const classes:Row[]=year?.classes??[];const schoolClass=classes.find(c=>c.id===classId)??classes[0];
 const refresh=()=>void r.refresh();const title=view==='classes'?'Classes et matières':view==='program'?'Programme d’une classe':'Configuration scolaire';
 return <Page title={title} description="Années, calendriers par cycle et programmes versionnés."><Feedback error={r.error} loading={r.loading}/><div className="workspace-controls"><label>Année scolaire<select aria-label="Année scolaire" value={year?.id??''} onChange={e=>setYearId(e.target.value)}><Options rows={years} label="code"/></select></label><label>Classe<select aria-label="Classe" value={schoolClass?.id??''} onChange={e=>setClassId(e.target.value)}><Options rows={classes}/></select></label></div><div className="leyisa-stats"><Panel title="Année scolaire"><strong>{year?.code??'Aucune année'}</strong></Panel><Panel title="Composants de calendrier"><strong>{year?.periods.length??0}</strong></Panel><Panel title="Classes"><strong>{classes.length}</strong></Panel></div><div className="leyisa-grid"><Panel title={view==='school'?'Programme de la classe':view==='classes'?'Classes et matières':'Programme attendu'}><div className="leyisa-table-wrap"><table><thead><tr><th>{view==='classes'?'Classe':'Matière'}</th><th>{view==='classes'?'Cycle / niveau':'Maxima et référence'}</th><th>Action</th></tr></thead><tbody>{(view==='classes'?classes:schoolClass?.subjects??[]).map((row:Row)=><tr key={row.id}><td>{view==='classes'?row.label:row.subject.label}</td><td>{view==='classes'?`${row.cycle} / ${row.level}`:<><dl className="programme-maxima">{Object.entries(row.componentMaxima).map(([code,maximum])=><div key={code}><dt>{code}</dt><dd>{String(maximum??'N/A')}</dd></div>)}</dl><small className="programme-source">{row.source}</small></>}</td><td><a href="#programme" onClick={()=>setClassId(view==='classes'?row.id:schoolClass?.id)}>Programme</a></td></tr>)}</tbody></table></div>{view==='school'&&<details><summary>Calendrier du cycle de la classe</summary><div className="leyisa-table-wrap"><table><thead><tr><th>Cycle</th><th>Composant</th><th>Début</th><th>Fin</th></tr></thead><tbody>{year?.periods.filter((p:Row)=>p.profile===schoolClass?.cycle).map((p:Row)=><tr key={p.id}><td>{p.profile}</td><td>{p.code} · {p.kind}</td><td>{p.startsOn.slice(0,10)}</td><td>{p.endsOn.slice(0,10)}</td></tr>)}</tbody></table></div></details>}</Panel><Panel title={view==='school'?'Ajouter une période':view==='classes'?'Ajouter une classe':'Ajouter une matière au programme'}>{!editable?<p>Lecture seule : configuration réservée à l’administration.</p>:view==='school'?<ActionForm key={year?.id} done={refresh} action={d=>post('/school/periods',{...d,schoolYearId:year?.id,position:Number(d.position)})}><Field label="Cycle" name="profile">{['MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE'].map(c=><option key={c}>{c}</option>)}</Field><Field label="Code" name="code"/><Field label="Libellé" name="label"/><Field label="Type" name="kind">{['PERIODE','EXAMEN','EVEIL','TRIMESTRE','SEMESTRE','ANNUEL','EVENEMENT'].map(c=><option key={c}>{c}</option>)}</Field><Field label="Composant parent (T1, S1, ANNEE…)" name="parentCode" required={false}/><Field label="Ordre" name="position" type="number"/><Field label="Début inclus" name="startsOn" type="date"/><Field label="Fin incluse" name="endsOn" type="date"/><Field label="Référence / version" name="source" value="DEMO_PROPOSE"/></ActionForm>:view==='classes'?<ActionForm done={refresh} action={d=>post('/school/classes',{...d,schoolYearId:year?.id})}><Field label="Code de classe" name="code"/><Field label="Libellé" name="label"/><Field label="Cycle" name="cycle">{['MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE'].map(c=><option key={c}>{c}</option>)}</Field><Field label="Niveau" name="level"/><Field label="Code option" name="optionCode" required={false}/><Field label="Version du programme" name="programVersion" value="DEMO-V1.1"/></ActionForm>:<ActionForm key={schoolClass?.id} done={refresh} action={d=>{const componentMaxima=Object.fromEntries(Object.entries(d).filter(([k])=>k.startsWith('max_')).map(([k,v])=>[k.slice(4),v==='N/A'?null:v]));return post('/school/program',{classId:schoolClass?.id,subjectId:d.subjectId,resultMaxScore:d.resultMaxScore,position:Number(d.position),source:d.source,componentMaxima});}}><Field label="Matière" name="subjectId"><Options rows={r.data?.subjects??[]}/></Field><Field label="Maximum de référence" name="resultMaxScore" type="number"/><Field label="Ordre sur le bulletin" name="position" type="number"/>{year?.periods.filter((p:Row)=>p.profile===schoolClass?.cycle&&['PERIODE','EXAMEN'].includes(p.kind)).map((p:Row)=><Field key={p.id} label={`Maximum ${p.code} (ou N/A)`} name={`max_${p.code}`}/>)}<Field label="Référence / version" name="source" value="DEMO_PROPOSE"/><p>Les valeurs absentes bloquent la clôture. Les programmes utilisés restent figés.</p></ActionForm>}</Panel></div>{editable&&view==='classes'&&<Panel title="Ajouter une matière au catalogue"><ActionForm done={refresh} action={d=>post('/school/subjects',d)}><Field label="Code" name="code"/><Field label="Matière" name="label"/></ActionForm></Panel>}{editable&&view==='school'&&<div className="leyisa-grid"><Panel title="Créer une année scolaire"><ActionForm done={refresh} action={d=>post('/school/years',d)}><Field label="Code année" name="code"/><Field label="Début" name="startsOn" type="date"/><Field label="Fin" name="endsOn" type="date"/></ActionForm></Panel><Panel title="Identité de l’établissement"><ActionForm done={refresh} action={d=>post('/school/identity',d)}>{[['name','École'],['code','Code école'],['province','Province'],['city','Ville / territoire'],['commune','Commune'],['address','Adresse']].map(([name,label])=><Field key={name} name={name} label={label} required={false} value={r.data?.settings?.identity?.[name]??''}/>)}</ActionForm></Panel></div>}{editable&&view==='program'&&year&&schoolClass&&schoolClass.cycle!=='MATERNEL'&&<DemoProfileForm year={year} schoolClass={schoolClass}/>}</Page>;
}

export function TeacherPages({view='assignments'}:{view?:'teachers'|'assignments'|'mine'}) {
 const r=useResource<any>(view==='mine'?'/assignments/mine':'/assignments');const school=useResource<Row>('/school/bootstrap');const [classId,setClassId]=useWorkspaceState('assignment-class','');const classes:Row[]=school.data?.years.flatMap((y:Row)=>y.classes)??[];const chosen=classes.find(c=>c.id===classId)??classes[0];const user=useSession();const editable=can(user,'assignments.manage');const rows:Row[]=view==='mine'?r.data??[]:view==='teachers'?r.data?.teachers??[]:r.data?.assignments??[];
 return <Page title={view==='mine'?'Mes cours':view==='teachers'?'Fiche enseignant':'Enseignants et affectations'} description={view==='mine'?'Uniquement les cours du compte connecté.':'Les affectations conservent leur historique.'}><Feedback error={r.error||school.error} loading={r.loading||school.loading}/><div className="leyisa-grid"><Panel title={view==='teachers'?'Enseignants':'Affectations de l’année'}><div className="leyisa-table-wrap"><table><thead><tr><th>{view==='teachers'?'Enseignant':'Classe'}</th><th>{view==='teachers'?'Matricule':'Matière'}</th><th>Contexte</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{view==='teachers'?`${row.user.firstName} ${row.user.lastName}`:row.classSubject.schoolClass.label}</td><td>{view==='teachers'?row.staffNumber:row.classSubject.subject.label}</td><td>{view==='teachers'?row.user.loginEnabled?'Actif':'Inactif':<>{row.startsOn.slice(0,10)} — {row.endsOn?.slice(0,10)??'Fin non fixée'} {view==='mine'&&<a href={`#evaluation?assignment=${row.id}`}>Créer une évaluation</a>}</>}</td></tr>)}</tbody></table></div>{!r.loading&&!r.error&&rows.length===0&&<p className="leyisa-description">{view==='mine'?'Aucun cours ne vous est affecté. La direction prépare les affectations.':view==='teachers'?'Aucun enseignant enregistré.':'Aucune affectation enregistrée.'}</p>}</Panel><Panel title={view==='mine'?'Continuer le parcours':view==='teachers'?'Créer une fiche enseignant':'Nouvelle affectation'}>{view==='mine'?<ul className="action-list"><li><a href="#evaluations">Mes évaluations</a></li><li><a href="#evaluation">Nouvelle évaluation</a></li><li><a href="#notes">Saisir les notes</a></li></ul>:!editable?<p>Lecture seule. La direction gère les enseignants et affectations.</p>:view==='teachers'?<ActionForm action={d=>post('/assignments/teachers',d)} done={r.refresh}><Field label="Compte ENS actif" name="userId"><Options rows={(r.data?.candidates??[]).map((c:Row)=>({...c,label:`${c.firstName} ${c.lastName}`}))}/></Field><Field label="Matricule enseignant" name="staffNumber" required={false}/></ActionForm>:<><label>Classe<select aria-label="Classe" value={chosen?.id??''} onChange={e=>setClassId(e.target.value)}><Options rows={classes}/></select></label><ActionForm key={chosen?.id} action={d=>post('/assignments',d)} done={r.refresh}><Field label="Enseignant" name="teacherId"><Options rows={(r.data?.teachers??[]).map((t:Row)=>({...t,label:`${t.user.firstName} ${t.user.lastName}`}))}/></Field><Field label="Matière du programme" name="classSubjectId"><Options rows={(chosen?.subjects??[]).map((s:Row)=>({...s,label:s.subject.label}))}/></Field><Field label="Début inclus" name="startsOn" type="date"/><Field label="Fin exclusive" name="endsOn" type="date" required={false}/></ActionForm></>}</Panel></div></Page>;
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
 const selected=id?(record.data??r.data?.find(s=>s.id===id)):r.data?.[0];
 useEffect(()=>{if(!id&&selected){setId(selected.id);if(view!=='record')rememberLocation('student',selected.id);}},[selected?.id,id]);
 const user=useSession();const write=can(user,'students.enroll');
 function selectStudent(next:string){setId(next);rememberLocation('student',next);}
 const choices=[...new Map([...(r.data??[]),...(selected?[selected]:[])].map(student=>[student.id,student])).values()];
 const fields=<><Field label="Matricule permanent" name="matricule"/><Field label="Nom" name="lastName"/><Field label="Postnom" name="postName" required={false}/><Field label="Prénom" name="firstName"/><Field label="Date de naissance" name="birthDate" type="date" required={false}/><Field label="Lieu de naissance" name="birthPlace" required={false}/><Field label="Sexe" name="sex" required={false}><option value="">Non renseigné</option><option value="F">Féminin</option><option value="M">Masculin</option></Field><Field label="Numéro permanent" name="permanentNumber" required={false}/><Field label="Responsable" name="guardian" required={false}/><Field label="Contact" name="contact" required={false}/></>;
 return <Page title={view==='record'?'Nouveau dossier élève':view==='history'?'Fiche et historique scolaire':'Inscription annuelle'} description="Une identité permanente ; une inscription distincte pour chaque année."><Feedback error={r.error||school.error||record.error} loading={r.loading||school.loading||record.loading}/>{view!=='record'&&<label>Rechercher un dossier<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Matricule ou nom"/></label>}{view!=='record'&&<label>Élève<select aria-label="Élève" value={selected?.id??''} onChange={e=>selectStudent(e.target.value)}><Options rows={choices.map(s=>({...s,label:`${s.matricule} — ${s.user.lastName} ${s.postName??''} ${s.user.firstName}`}))}/></select></label>}<div className="leyisa-grid"><Panel title={view==='record'?'Créer un dossier élève':view==='history'?'Fiche élève':'Nouvelle inscription annuelle'}>{view==='record'?(write?<ActionForm action={async d=>{const location=window.location.hash;const saved=await post<Row>('/students/records',d);if(window.location.hash===location)setId(saved.id);return saved;}} done={r.refresh} label="Enregistrer le dossier"><div className="leyisa-fields-grid">{fields}</div></ActionForm>:<p>Création réservée au secrétariat.</p>):view==='history'?<><p>{selected?.matricule}</p><h3>{selected?.user.lastName} {selected?.postName} {selected?.user.firstName}</h3><p>Naissance : {selected?.birthDate?.slice(0,10)??'—'}</p>{write&&<a className="leyisa-button" href={`#inscription?student=${selected?.id??''}`}>Inscrire à une nouvelle année</a>}</>:write&&selected?<ActionForm key={selected.id} action={d=>post(`/students/${selected.id}/enrollments`,{classId:d.classId,schoolYearId:school.data?.find(y=>y.classes.some((c:Row)=>c.id===d.classId))?.id})} done={r.refresh} label="Confirmer l’inscription"><Field label="Classe / année scolaire" name="classId"><Options rows={school.data?.flatMap(y=>y.classes.map((c:Row)=>({...c,label:`${c.label} — ${y.code}`})))??[]}/></Field></ActionForm>:<p>Choisissez un dossier ; inscription réservée au secrétariat.</p>}</Panel><Panel title={view==='history'?'Historique scolaire':'Contrôles indispensables'}>{view==='history'?<ul>{selected?.enrollments.map((en:Row)=><li key={en.id}>{en.schoolClass.schoolYear.code} — {en.schoolClass.label}</li>)}</ul>:<><p>Matricule unique, homonymes autorisés.</p><p>Une inscription par année, dans une classe de la même année.</p><p>Les anciens dossiers et résultats sont conservés.</p></>}</Panel></div></Page>;
}

export function EvaluationsHome({create=false}:{create?:boolean}) {
 const r=useResource<Row[]>(create?'/assignments/mine':'/evaluations');const [assignmentId,setAssignmentId]=useWorkspaceState('evaluation-assignment',locationValue('assignment'));const requested=locationValue('assignment');useEffect(()=>{if(requested)setAssignmentId(requested);},[requested]);const rows=r.data??[];const assignment=rows.find(a=>a.id===assignmentId)??rows[0];
 return <Page title={create?'Créer une évaluation':'Mes évaluations'} description="Le cours, le composant et le barème sont vérifiés côté serveur."><Feedback error={r.error} loading={r.loading}/><div className="leyisa-grid"><Panel title={create?'Créer une évaluation':'Mes évaluations'}>{create?<><label>Cours affecté<select aria-label="Cours affecté" value={assignment?.id??''} onChange={e=>setAssignmentId(e.target.value)}><Options rows={rows.map(a=>({...a,label:`${a.classSubject.schoolClass.label} — ${a.classSubject.subject.label}`}))}/></select></label><ActionForm key={assignment?.id} action={async d=>{const location=window.location.hash;const result=await post<Row>('/evaluations',{...d,assignmentId:assignment?.id});if(window.location.hash===location)window.location.hash=`#notes?id=${result.id}`;}} label="Créer l’évaluation"><Field label="Composant de résultat" name="classPeriodId"><Options rows={assignment?.classSubject.schoolClass.classPeriods.filter((cp:Row)=>!cp.closedAt).map((cp:Row)=>({...cp,label:`${cp.period.code} — ${cp.period.kind}`}))??[]}/></Field><RetakeDecisionField/><Field label="Intitulé" name="title"/><Field label="Type" name="kind">{['TRAVAIL_JOURNALIER','EXAMEN','APPRECIATION','REPECHAGE'].map(k=><option key={k}>{k}</option>)}</Field><Field label="Barème maximum (hors appréciation)" name="maxScore" type="number" value="20"/><Field label="Date" name="heldOn" type="date"/></ActionForm></>:<div className="leyisa-table-wrap"><table><thead><tr><th>Évaluation</th><th>Barème</th><th>État</th><th>Action</th></tr></thead><tbody>{rows.map(e=><tr key={e.id}><td>{e.title} · {e.subject.label}</td><td>{e.maxScore}</td><td>{evaluationStatus(e.state)}</td><td><a href={`#notes?id=${e.id}`}>{e.editable?'Saisir / corriger':'Lire'}</a></td></tr>)}</tbody></table></div>}{!r.loading&&!r.error&&!rows.length&&<p className="leyisa-description">{create?'Aucun cours affecté : la direction doit préparer votre affectation avant la création.':'Aucune évaluation enregistrée dans votre périmètre.'}</p>}</Panel><Panel title={create?'Vérification métier':'Nouvelle évaluation'}><p>Affectation active, période ouverte, date cohérente et barème strictement positif.</p><p>La note zéro est distincte d’une note vide. La direction décide des soumissions sans modifier les notes.</p>{!create&&<a className="leyisa-button" href="#evaluation">Créer une évaluation</a>}</Panel></div></Page>;
}

export function BulletinsPage({ catalog = false }: { catalog?: boolean }) {
 return <BulletinWorkspace catalog={catalog}/>;
}

export function AuditPage(){const [page,setPage]=useState(1),[action,setAction]=useState(''),[actor,setActor]=useState('');const r=useResource<Row>(`/audit?${new URLSearchParams({page:String(page),...(action?{action}:{}),...(actor?{actorId:actor}:{})})}`);return <Page title="Journal d’audit" description="Historique des actions effectuées. Consultation réservée à l’administration."><Feedback error={r.error} loading={r.loading}/><div className="leyisa-grid"><Panel title="Événements récents"><div className="leyisa-table-wrap"><table><thead><tr><th>Date</th><th>Acteur</th><th>Événement</th><th>Objet</th></tr></thead><tbody>{r.data?.items.map((e:Row)=><tr key={e.id}><td>{new Date(e.occurredAt).toLocaleString('fr-FR',{timeZone:'Africa/Kinshasa'})}</td><td>{e.actorId??'Inconnu'}</td><td>{e.action}</td><td>{e.targetType}</td></tr>)}</tbody></table></div><button disabled={page===1} onClick={()=>setPage(page-1)}>Précédent</button> Page {page} <button disabled={page*50>=(r.data?.total??0)} onClick={()=>setPage(page+1)}>Suivant</button></Panel><Panel title="Filtres"><ActionForm action={async d=>{setAction(d.action.trim());setActor(d.actorId.trim());setPage(1);}} label="Appliquer les filtres"><Field label="Type d’action exact" name="action" required={false}/><Field label="Identifiant de l’acteur" name="actorId" required={false}/></ActionForm></Panel></div></Page>;}

function DemoProfileForm({year,schoolClass}:{year:Row;schoolClass:Row}) {
 return <Panel title="Préparer un profil de délibération DEMO"><p>{year.code} · {schoolClass.cycle} · {schoolClass.level}. Une nouvelle version conserve les anciennes décisions.</p><ActionForm action={d=>post('/results/profiles',{code:d.code,version:Number(d.version),schoolYearId:year.id,cycle:schoolClass.cycle,level:schoolClass.level,optionCode:schoolClass.optionCode,status:'DEMO_PROPOSE',source:d.source,config:{admissionThreshold:d.admissionThreshold,failureThreshold:d.failureThreshold,retakeMode:d.retakeMode}})}><Field label="Code du profil" name="code"/><Field label="Version" name="version" type="number" value="1"/><Field label="Seuil proposé de passage (%)" name="admissionThreshold" type="number" value="50"/><Field label="Seuil proposé d’échec par cours (%)" name="failureThreshold" type="number" value="50"/><Field label="Deuxième session" name="retakeMode"><option value="MANUAL_ONLY">À vérifier manuellement</option><option value="REPLACE_E2_DEMO">DEMO : remplacement E2, sans modifier la première session</option></Field><Field label="Source et limites" name="source" value="DEMO_PROPOSE : scénario fictif, aucune norme scolaire affirmée"/></ActionForm></Panel>;
}
