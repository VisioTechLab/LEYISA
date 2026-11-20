import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { activeRoleHeaders, api, post } from '../../shared/api';
import { PageHeading } from '../../shared/PageHeading';
import { useSession } from '../../shared/session';
import { can } from '../auth/authApi';
import { locationValue, rememberLocation, useWorkspaceState } from '../../shared/workspaceState';
import './bulletins.css';

const PdfDocumentView = lazy(() => import('./PdfDocumentView').then(module => ({ default: module.PdfDocumentView })));

type Identity = { lastName?: string; postName?: string; firstName?: string; classLabel?: string; periodCode?: string; yearCode?: string; matricule?: string; cycle?: string; level?:string };
type Bulletin = { id: string; identitySnapshot: Identity; issued?:boolean; documentPeriodSupported?:boolean; classPeriodId?:string };
type Folder={id:string;year:string;cycle:string;level:string;classLabel:string;periodCode:string;position:number;total:number;issued:number;documentPeriodSupported:boolean};
type EntryPage={items:Bulletin[];total:number;page:number;pageSize:number};
const cycleLabel=(c:string)=>({MATERNEL:'Maternelle',PRIMAIRE:'Primaire',SECONDAIRE_TECHNIQUE:'Secondaire / technique'}[c]??c);
const periodName=(p:string)=>({ANNEE:'Année complète',REPECHAGE:'Repêchage',T1:'Premier trimestre',T2:'Deuxième trimestre',T3:'Troisième trimestre',S1:'Premier semestre',S2:'Deuxième semestre',P1:'Première période',P2:'Deuxième période',P3:'Troisième période',P4:'Quatrième période',P5:'Cinquième période',P6:'Sixième période',E1:'Premier examen',E2:'Deuxième examen',E3:'Troisième examen'}[p]??p);
const displayLabel=(v:string)=>v.replace(/\s*[—–]\s*/g,': ').replace(/\b(\d+)(?:e|è|ème)\s+primaire\b/gi,'$1e Primaire').replace(/\b([123])(?:re|ère|e|è)\s+maternelle\b/gi,(_,n)=>n==='1'?'1re Maternelle':n+'e Maternelle');
const sectionName=(label:string,level:string)=>{const l=displayLabel(label),n=displayLabel(level);if(n&&l.toLocaleLowerCase('fr').startsWith(n.toLocaleLowerCase('fr')+' ')){const suffix=l.slice(n.length).trim();if(/^[A-Z]$/.test(suffix))return suffix;}return l;};
type Detail = { id: string; classPeriodId?:string; identity: Identity; templateVersion: string; archivedTemplates: string[]; publicationComplete?: boolean; documentPeriodSupported?: boolean };
type PdfFile = { key: string; bytes: Uint8Array; url: string };
const compare = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' }).compare;
const name = (person: Identity) => [person.lastName, person.postName, person.firstName].filter(Boolean).join(' ');
const unique = (values: string[]) => [...new Set(values)].sort(compare);

type Selection = { year: string; cycle?:string; level?:string; schoolClass: string; period: string; id: string; version: string; search: string; query: string; mode?:'class'|'student'; matricule?:string };
const empty: Selection = { year: '', cycle:'',level:'',schoolClass: '', period: '', id: '', version: '', search: '', query: '',mode:'class',matricule:'' };

export function BulletinWorkspace({ catalog = false }: { catalog?: boolean }) {
  const user = useSession();
  const [folders,setFolders]=useState<Folder[]>([]);
  const [entries,setEntries]=useState<EntryPage>({items:[],total:0,page:1,pageSize:25});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selection, setSelection] = useWorkspaceState<Selection>('bulletins', empty);
  const requested = locationValue('result');
  const { year, cycle='',level='',schoolClass, period, id, version, search, query,mode='class',matricule='' } = selection;
  const [searching, setSearching] = useState(false), [searchError, setSearchError] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  useEffect(() => {
    if (requested && requested !== id) setSelection({ ...empty, id: requested });
  }, [requested]);
  const [detail, setDetail] = useState<Detail | null>(null), [detailError, setDetailError] = useState('');
  const [file, setFile] = useState<PdfFile | null>(null), [pdfError, setPdfError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [issuing, setIssuing] = useState(false), [message, setMessage] = useState('');
  const [issueError, setIssueError] = useState('');

  useEffect(() => {
    const controller=new AbortController();setLoading(true);setListError('');
    api<Folder[]>('/bulletins/archive',{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setFolders(data);setLoading(false);}})
      .catch(error=>{if(!controller.signal.aborted){setFolders([]);setListError(error.message);setLoading(false);}});
    return ()=>controller.abort();
  },[refresh]);
  const years=unique(folders.map(f=>f.year)).reverse();
  const activeYear=years.includes(year)?year:'';
  const yearFolders=folders.filter(f=>!activeYear||f.year===activeYear);
  const cycles=unique(yearFolders.map(f=>f.cycle));
  const activeCycle=cycles.includes(cycle)?cycle:'';
  const cycleFolders=yearFolders.filter(f=>!activeCycle||f.cycle===activeCycle);
  const levels=unique(cycleFolders.map(f=>f.level));
  const activeLevel=levels.includes(level)?level:'';
  const levelFolders=cycleFolders.filter(f=>!activeLevel||f.level===activeLevel);
  const classes=unique(levelFolders.map(f=>f.classLabel));
  const activeClass=classes.includes(schoolClass)?schoolClass:'';
  const classFolders=levelFolders.filter(f=>!activeClass||f.classLabel===activeClass);
  const periods=unique(classFolders.map(f=>f.periodCode)).sort((a,b)=>(classFolders.find(f=>f.periodCode===a)?.position??0)-(classFolders.find(f=>f.periodCode===b)?.position??0));
  const activePeriod=periods.includes(period)?period:'';
  const scoped=classFolders.filter(f=>!activePeriod||f.periodCode===activePeriod);
  const context=mode==='class'&&activeClass&&activePeriod&&scoped.length===1?scoped[0]:undefined;
  const contextId=context?.id??(mode==='class'&&id&&detail?.id===id&&!activeYear?detail.classPeriodId:'')??'';
  const totalPublished=folders.reduce((n,f)=>n+f.total,0);
  const totalIssued=folders.reduce((n,f)=>n+f.issued,0);
  const queryKey=mode==='class'?contextId:query+'|'+matricule;
  const entryKey=queryKey+'|'+catalogPage;
  const [loadedKey,setLoadedKey]=useState('');
  useEffect(()=>{
    setSearchError('');setEntries({items:[],total:0,page:1,pageSize:25});setLoadedKey('');
    if(mode==='class'?!contextId:!query&&!matricule){setSearching(false);return;}
    const controller=new AbortController();setSearching(true);
    const params=new URLSearchParams({page:String(catalogPage)});
    if(mode==='class')params.set('context',contextId);
    else if(matricule)params.set('matricule',matricule);
    else params.set('search',query);
    api<EntryPage>(`/bulletins/archive/entries?${params}`,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted){setEntries(value);setLoadedKey(entryKey);setSearching(false);}})
      .catch(error=>{if(!controller.signal.aborted){setSearchError(error.message);setSearching(false);}});
    return ()=>controller.abort();
  },[mode,contextId,query,matricule,catalogPage,refresh]);
  const candidates=loadedKey===entryKey?entries.items:[];
  const selectedId=id||undefined;
  const selected=candidates.find(row=>row.id===id)??(detail?.id===id?{id,identitySnapshot:detail.identity}:undefined);
  function choose(next:Bulletin){
    setSelection(previous=>({...previous,id:next.id,version:''}));
    rememberLocation('result',next.id);
  }
  function changeFilter(values:Partial<Selection>){
    setSelection(previous=>({...previous,...values,id:'',version:''}));
    rememberLocation('result','');setCatalogPage(1);
  }
  function changeMode(next:'class'|'student'){
    changeFilter({...empty,mode:next});
  }
  const current = detail?.id === selectedId ? detail : null;
  const versions = current ? [...new Set([current.templateVersion, ...current.archivedTemplates])] : [];
  const activeVersion = versions.includes(version) ? version : versions[0] ?? '';
  const pdfKey = selectedId && activeVersion ? `${selectedId}:${activeVersion}` : '';
  const currentFile = file?.key === pdfKey ? file : null;
  const downloadable = !!current && current.publicationComplete !== false && current.documentPeriodSupported !== false;

  useEffect(() => {
    setDetail(null); setDetailError(''); setMessage(''); setIssueError(''); setPdfError('');
    if (!selectedId) return;
    const controller = new AbortController();
    api<Detail>(`/bulletins/${selectedId}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setDetail(data); })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    return () => controller.abort();
  }, [selectedId, refresh]);

  useEffect(() => {
    setFile(null); setPdfError('');
    if (!selectedId || !activeVersion || !downloadable) return;
    const controller = new AbortController(); let objectUrl: string | undefined;
    async function load() {
      const response = await fetch(`/api/v1/bulletins/${selectedId}/pdf?${new URLSearchParams({ templateVersion: activeVersion })}`, { credentials: 'same-origin', headers: activeRoleHeaders(), cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('leyisa:session-expired'));
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.message === 'string' ? body.message : `Document indisponible (${response.status}).`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!response.headers.get('content-type')?.includes('application/pdf') || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Le serveur n’a pas renvoyé un document PDF valide.');
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setFile({ key: pdfKey, bytes, url: objectUrl });
    }
    void load().catch(error => { if (!controller.signal.aborted) setPdfError(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selectedId, activeVersion, downloadable, pdfKey, refresh]);

  const filename = useMemo(() => {
    const person = current?.identity;
    return `bulletin-${person?.matricule || selectedId || 'eleve'}-${person?.yearCode || 'annee'}-${person?.classLabel || 'classe'}-${person?.periodCode || 'publie'}-${activeVersion}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
  }, [current, selectedId, activeVersion]);

  async function issue() {
    if (!selectedId || issuing) return;
    setIssuing(true); setMessage(''); setIssueError('');
    try { await post(`/bulletins/${selectedId}/generate`, {}); setMessage('Émission enregistrée. Le document affiché est prêt à être remis.'); }
    catch (error) { setIssueError(error instanceof Error ? error.message : 'L’émission n’a pas pu être enregistrée.'); }
    finally { setIssuing(false); }
  }

  return <main className="leyisa-page bulletin-workspace">
    <PageHeading title="Bulletins scolaires" description={catalog ? 'Retrouver les documents publiés et consulter leur version originale.' : 'Consulter et remettre un bulletin publié.'} action={<a href={`${catalog ? '#bulletin' : '#bulletins'}${selectedId ? `?result=${selectedId}` : ''}`} className="bulletin-return">{catalog ? 'Préparer la remise' : 'Tous les bulletins'}</a>}/>
    {listError && <div className="bulletin-error" role="alert"><p>{listError}</p><button onClick={() => setRefresh(n => n + 1)}>Réessayer</button></div>}
    {loading && <p role="status">Chargement des bulletins publiés…</p>}
    {!loading && !listError && !folders.length && <section className="bulletin-empty"><h2>Aucun bulletin publié</h2><p>Les documents apparaîtront ici après la publication des résultats par la direction.</p><a href="#accueil">Retour à l’accueil</a></section>}
    {!loading && (folders.length > 0 || !!id) && <div className="bulletin-columns">
      <section className="bulletin-selection" aria-labelledby="bulletin-choice-heading">
        <h2 id="bulletin-choice-heading">{catalog ? "Bulletins disponibles" : "Archives scolaires"}</h2><p className="bulletin-muted">{totalPublished} résultats publiés, {totalIssued} documents émis</p><div className="archive-modes" aria-label="Mode de consultation"><button type="button" aria-pressed={mode==='class'} onClick={()=>changeMode('class')}>Par classe</button><button type="button" aria-pressed={mode==='student'} onClick={()=>changeMode('student')}>Par élève</button></div>
        <form role="search" className="bulletin-search" onSubmit={event => { event.preventDefault(); setSelection(previous => ({ ...previous, mode:'student',query: search.trim(),matricule:'' })); setCatalogPage(1); }}>
          <label>Rechercher un élève<input type="search" aria-label="Rechercher un élève" placeholder="Nom ou matricule" maxLength={120} value={search} onChange={event => setSelection(previous => ({ ...previous, search: event.target.value }))}/></label>
          <button type="submit" className="leyisa-button leyisa-button-secondary" disabled={searching}>{searching ? 'Recherche…' : 'Rechercher'}</button>
          {query && <button type="button" className="bulletin-clear" onClick={() => { setSelection(previous => ({ ...previous, mode:'class',query: '', search: '',matricule:'' })); setCatalogPage(1); }}>Effacer la recherche</button>}
        </form>
        {searching && <p role="status" className="bulletin-muted">Recherche des dossiers publiés…</p>}
        {searchError && <p role="alert" className="bulletin-error">{searchError}</p>}
        {mode==='class'&&<div className="bulletin-fields">
          <label>Année scolaire<select aria-label="Année scolaire" value={activeYear} onChange={e=>changeFilter({year:e.target.value,cycle:'',level:'',schoolClass:'',period:''})}><option value="">Choisir une année</option>{years.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Cycle<select aria-label="Cycle" value={activeCycle} disabled={!activeYear} onChange={e=>changeFilter({cycle:e.target.value,level:'',schoolClass:'',period:''})}><option value="">Tous les cycles</option>{cycles.map(v=><option value={v} key={v}>{cycleLabel(v)}</option>)}</select></label>
          <label>Niveau<select aria-label="Niveau" value={activeLevel} disabled={!activeYear} onChange={e=>changeFilter({level:e.target.value,schoolClass:'',period:''})}><option value="">Tous les niveaux</option>{levels.map(v=><option value={v} key={v}>{displayLabel(v)}</option>)}</select></label>
          <label>Classe<select aria-label="Classe" value={activeClass} disabled={!activeYear} onChange={e=>changeFilter({schoolClass:e.target.value,period:''})}><option value="">Choisir une classe</option>{classes.map(v=><option value={v} key={v}>{activeLevel?sectionName(v,activeLevel):displayLabel(v)}</option>)}</select></label>
          <label>Période ou session<select aria-label="Période ou session" value={activePeriod} disabled={!activeClass} onChange={e=>changeFilter({period:e.target.value})}><option value="">Choisir une période</option>{periods.map(v=><option value={v} key={v}>{periodName(v)}</option>)}</select></label>
        </div>}
        {mode==='class'&&!context&&<div className="archive-folders"><p className="bulletin-label">{!activeYear?'Années scolaires':!activeCycle?'Cycles':!activeLevel?'Niveaux':!activeClass?'Classes':'Périodes'}</p>
          {(!activeYear?years:!activeCycle?cycles:!activeLevel?levels:!activeClass?classes:periods).map(v=>{
            const groups=(!activeYear?folders:!activeCycle?yearFolders:!activeLevel?cycleFolders:!activeClass?levelFolders:classFolders).filter(f=>(!activeYear?f.year:!activeCycle?f.cycle:!activeLevel?f.level:!activeClass?f.classLabel:f.periodCode)===v);
            return <button type="button" key={v} onClick={()=>changeFilter(!activeYear?{year:v,cycle:'',level:'',schoolClass:'',period:''}:!activeCycle?{cycle:v,level:'',schoolClass:'',period:''}:!activeLevel?{level:v,schoolClass:'',period:''}:!activeClass?{schoolClass:v,period:''}:{period:v})}><span><strong>{!activeYear?v:!activeCycle?cycleLabel(v):activeClass?periodName(v):activeLevel?sectionName(v,activeLevel):displayLabel(v)}</strong><small>{groups.reduce((n,f)=>n+f.total,0)} résultats, {groups.reduce((n,f)=>n+f.issued,0)} émis</small></span><span aria-hidden="true">›</span></button>;
          })}
        </div>}
        {mode==='student'&&matricule&&<p className="bulletin-muted">Dossier individuel : <strong>{matricule}</strong> <button type="button" className="bulletin-clear" onClick={()=>{setSelection(p=>({...p,matricule:''}));setCatalogPage(1);}}>Retour à la recherche</button></p>}
        {mode==='student'&&!query&&!matricule&&<p className="bulletin-muted">Recherchez un élève par nom ou matricule pour retrouver ses années, classes et périodes.</p>}
        {context&&<p className="bulletin-muted">{context.year} : {displayLabel(context.level)} : {sectionName(context.classLabel,context.level)} : {periodName(context.periodCode)}<br/>{context.total} résultats, {context.issued} émis</p>}
        {(loadedKey===entryKey||selected)&&<div className="bulletin-catalog" aria-label="Dossiers trouvés">
          <p className="bulletin-label">{entries.total} résultat(s)</p>
          {(candidates.length>0||selected)&&<label>Élève<select aria-label="Élève" value={selectedId??''} onChange={e=>{const row=candidates.find(r=>r.id===e.target.value);if(row)choose(row);}}><option value="">Choisir un document</option>{selected&&!candidates.some(r=>r.id===selectedId)&&<option value={selectedId}>{name(selected.identitySnapshot)} (dossier conservé)</option>}{candidates.map(r=><option key={r.id} value={r.id}>{r.identitySnapshot.matricule} : {name(r.identitySnapshot)} ({r.identitySnapshot.yearCode}, {periodName(r.identitySnapshot.periodCode??"")})</option>)}</select></label>}
          <ul>{candidates.map(r=><li key={r.id}><button type="button" onClick={()=>choose(r)} aria-pressed={r.id===selectedId}><strong>{name(r.identitySnapshot)}</strong><span>{r.identitySnapshot.matricule} : {r.identitySnapshot.yearCode}, {displayLabel(r.identitySnapshot.classLabel??"")}</span><span>{periodName(r.identitySnapshot.periodCode??'')} : {r.documentPeriodSupported===false?'Résultat sans gabarit PDF':r.issued?'Document émis':'Résultat publié'}</span></button>{mode==='student'&&!matricule&&r.identitySnapshot.matricule&&<button className="archive-student-link" type="button" onClick={()=>{setSelection(p=>({...p,matricule:r.identitySnapshot.matricule}));setCatalogPage(1);}}>Tout le parcours de cet élève</button>}</li>)}</ul>
          {loadedKey===entryKey&&!entries.total&&<p role="status" className="bulletin-muted">Aucun résultat pour cette recherche.</p>}
          {entries.total>entries.pageSize&&<div className="workspace-controls"><button type="button" disabled={catalogPage===1} onClick={()=>setCatalogPage(n=>n-1)}>Précédent</button><span>Page {catalogPage} / {Math.ceil(entries.total/entries.pageSize)}</span><button type="button" disabled={catalogPage*entries.pageSize>=entries.total} onClick={()=>setCatalogPage(n=>n+1)}>Suivant</button></div>}
        </div>}
        {current && <div className="bulletin-dossier"><p className="bulletin-label">Dossier sélectionné</p><strong>{name(current.identity)}</strong><dl><div><dt>Matricule</dt><dd>{current.identity.matricule || 'Non renseigné'}</dd></div><div><dt>Année scolaire</dt><dd>{current.identity.yearCode || 'Non renseignée'}</dd></div><div><dt>Niveau</dt><dd>{displayLabel(current.identity.level??'Non renseigné')}</dd></div><div><dt>Classe</dt><dd>{displayLabel(current.identity.classLabel??'Non renseignée')}</dd></div><div><dt>Document</dt><dd>{activeVersion}</dd></div></dl></div>}
        {current && versions.length > 1 && <details className="bulletin-versions"><summary>Versions archivées</summary><label>Version du document<select aria-label="Version du document" value={activeVersion} onChange={e => setSelection(previous => ({ ...previous, version: e.target.value }))}>{versions.map(value => <option key={value}>{value}</option>)}</select></label></details>}
        {!catalog && can(user, 'bulletins.produce') && <button className="leyisa-button bulletin-issue" disabled={!currentFile || !downloadable || issuing || activeVersion !== current?.templateVersion} onClick={() => void issue()}>{issuing ? 'Enregistrement…' : 'Enregistrer l’émission'}</button>}
        {message && <p className="bulletin-message" role="status">{message}</p>}
        {issueError && <p className="bulletin-error" role="alert">{issueError}</p>}
        <p className="bulletin-notice">DEMO-V1 : résultats publiés et figés. Les versions précédentes restent conservées.</p>
      </section>
      <section className="bulletin-document" aria-labelledby="bulletin-preview-heading">
        <div className="bulletin-document-heading"><div><h2 id="bulletin-preview-heading">Aperçu du document</h2><p className="bulletin-muted">Le PDF affiché est celui que vous téléchargez.</p></div>{currentFile && <a className="leyisa-button bulletin-save" href={currentFile.url} download={filename}>Télécharger PDF</a>}</div>
        {detailError && <div className="bulletin-error" role="alert"><p>{detailError}</p><button onClick={() => setRefresh(n => n + 1)}>Réessayer</button></div>}
        {pdfError && <div className="bulletin-error" role="alert"><p>{pdfError}</p><button onClick={() => setRefresh(n => n + 1)}>Recharger le PDF</button></div>}
        {current?.publicationComplete === false && <div className="bulletin-empty"><h3>Publication des composantes en attente</h3><p>Le bulletin complet sera disponible après la publication de toutes ses périodes. Aucun document vide n’est proposé.</p></div>}
        {current?.publicationComplete !== false && current?.documentPeriodSupported === false && <div className="bulletin-empty"><h3>{current.identity.cycle === 'PRIMAIRE' ? 'Choisissez une synthèse trimestrielle' : 'Aucun gabarit adapté à cette période'}</h3><p>{current.identity.cycle === 'PRIMAIRE' ? `Le modèle primaire présente les synthèses T1, T2 et T3. Les notes de ${current.identity.periodCode} n’apparaissent pas dans ses colonnes. Sélectionnez un trimestre publié ou l’année complète.` : 'Sélectionnez une période publiée compatible avec le modèle de ce cycle.'} Le serveur refuse ce document incompatible.</p></div>}
        {!selectedId&&<div className="bulletin-empty"><h3>Sélectionnez un document</h3><p>Le lecteur ne charge aucun PDF tant qu’un bulletin n’est pas sélectionné.</p></div>}
        {selectedId && !currentFile && !detailError && !pdfError && (!current || downloadable) && <p className="bulletin-loading" role="status">Chargement du document PDF…</p>}
        {currentFile && <Suspense fallback={<p className="bulletin-loading" role="status">Ouverture du lecteur PDF…</p>}><PdfDocumentView key={currentFile.key} bytes={currentFile.bytes}/></Suspense>}
      </section>
    </div>}
  </main>;
}
