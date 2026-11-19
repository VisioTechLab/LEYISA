import { useEffect, useRef, useState } from 'react';
import { resultsApi, type ClassPeriod, type FinalResults, type Period, type Preview, type Submission } from './resultsApi';
import './results.css';
import { DeliberationPanel } from './DeliberationPanel';

type View = 'queue' | 'detail' | 'reject' | 'preview' | 'close' | 'final';
const displayNumber = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ValidationPage() { return <ResultsModulePage initialView="queue" />; }
export function FinalResultsPage() { return <ResultsModulePage initialView="final" />; }

export function ResultsModulePage({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [classPeriods, setClassPeriods] = useState<ClassPeriod[]>([]);
  const [classPeriodId, setClassPeriodId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [finalResults, setFinalResults] = useState<FinalResults | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('Chargement des données…');
  const periodRequest = useRef(0);
  const activeClassPeriod = useRef('');
  const [pendingDecision, setPendingDecision] = useState(false);

  function selectClassPeriod(id: string) {
    activeClassPeriod.current = id;
    setClassPeriodId(id);
    setPreview(null);
    setFinalResults(null);
    setConfirmed(false);
  }

  function selectPeriod(id: string) {
    periodRequest.current += 1;
    setPeriodId(id);
    setSubmissions([]);
    setSelected(null);
    setReason('');
    setClassPeriods([]);
    selectClassPeriod('');
  }

  useEffect(() => { void loadBootstrap(); }, []);
  useEffect(() => { if (periodId) void loadPeriodData(periodId); }, [periodId]);

  async function loadBootstrap() {
    try {
      const data = await resultsApi.bootstrap();
      setPeriods(data.periods);
      setPeriodId(data.periods[0]?.id ?? '');
      setMessage(data.periods.length ? '' : 'Aucune période disponible.');
    } catch (error) { setMessage(errorMessage(error)); }
  }
  async function loadPeriodData(nextPeriodId: string) {
    const request = ++periodRequest.current;
    try {
      const [queue, contexts] = await Promise.all([resultsApi.submissions(nextPeriodId), resultsApi.classPeriods(nextPeriodId)]);
      if (request !== periodRequest.current) return;
      setSubmissions(queue);
      setClassPeriods(contexts);
      if (!contexts.some(context => context.id === activeClassPeriod.current)) {
        selectClassPeriod(contexts[0]?.id ?? '');
      }
      setMessage('');
    } catch (error) {
      if (request === periodRequest.current) setMessage(errorMessage(error));
    }
  }
  async function openDetail(submission: Submission) {
    try { setSelected(await resultsApi.detail(submission.id)); setView('detail'); setMessage(''); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function approve() {
    if (!selected) return;
    try { await resultsApi.decide(selected.id, 'approve'); await loadPeriodData(periodId); setView('queue'); setMessage('Soumission approuvée.'); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function reject() {
    if (!selected || !reason.trim()) return;
    try { await resultsApi.decide(selected.id, 'reject', reason); await loadPeriodData(periodId); setReason(''); setView('queue'); setMessage('Soumission rejetée avec son motif.'); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function loadPreview() {
    if (!classPeriodId) return;
    try {
      const result = await resultsApi.preview(classPeriodId);
      if (classPeriodId !== activeClassPeriod.current) return;
      setPreview(result);
      setView('preview');
      setMessage('');
    } catch (error) {
      if (classPeriodId === activeClassPeriod.current) setMessage(errorMessage(error));
    }
  }
  async function closePeriod() {
    if (!preview?.readyToClose || preview.classPeriod.id !== classPeriodId || !confirmed || pendingDecision) return;
    setPendingDecision(true);
    try {
      await resultsApi.close(preview.classPeriod.id);
      await loadPeriodData(periodId);
      await loadFinal();
      setConfirmed(false);
      setMessage('Période clôturée : les résultats sont désormais figés.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setPendingDecision(false); }
  }
  async function publishResults() {
    const context = finalResults?.classPeriod;
    if (!context || context.id !== classPeriodId || context.status !== 'CLOSED' || pendingDecision ||
        !window.confirm(`Publier les résultats de ${context.classLabel} · ${context.periodLabel} ?`)) return;
    setPendingDecision(true);
    try {
      await resultsApi.publish(context.id);
      await loadPeriodData(periodId);
      await loadFinal();
      setMessage('Résultats publiés.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setPendingDecision(false); }
  }
  async function loadFinal() {
    if (!classPeriodId) return;
    try {
      const result = await resultsApi.finalResults(classPeriodId);
      if (classPeriodId !== activeClassPeriod.current) return;
      setFinalResults(result);
      setView('final');
      setMessage('');
    } catch (error) {
      if (classPeriodId === activeClassPeriod.current) setMessage(errorMessage(error));
    }
  }

  return <main className="leyisa-page results-module-page">
    <header className="leyisa-page-heading"><div><h1>{titleFor(view)}</h1><p>{descriptionFor(view)}</p></div><span className="leyisa-chip">DEMO-V1</span></header>
    <div className="results-toolbar">
      <label>Période<select aria-label="Période" value={periodId} disabled={pendingDecision} onChange={event => selectPeriod(event.target.value)}>{periods.map(period => <option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
      <button className="leyisa-button leyisa-button-secondary" disabled={!periodId} onClick={()=>void loadPeriodData(periodId)}>Actualiser la file</button>
    </div>
    <nav className="results-steps" aria-label="Parcours résultats"><button className={view === 'queue' ? 'is-current' : ''} onClick={() => setView('queue')}>Validation</button><button onClick={loadPreview}>Prévisualiser</button><button className={view === 'final' ? 'is-current' : ''} onClick={loadFinal}>Résultats</button></nav>
    {message && <p className="results-message">{message}</p>}
    {view === 'queue' && <Queue submissions={submissions} onOpen={openDetail} />}
    {(view==='detail'||view==='reject')&&!selected&&<Queue submissions={submissions} onOpen={openDetail}/>}
    {view === 'detail' && selected && <Detail submission={selected} onApprove={approve} onReject={() => setView('reject')} />}
    {view === 'reject' && selected && <Reject submission={selected} reason={reason} onReason={setReason} onCancel={() => setView('detail')} onConfirm={reject} />}
    {view === 'preview' && <PreviewScreen preview={preview} contexts={classPeriods} classPeriodId={classPeriodId} onSelect={selectClassPeriod} onLoad={loadPreview} onClose={() => setView('close')} />}
    {view==='close'&&!preview&&<PreviewScreen preview={preview} contexts={classPeriods} classPeriodId={classPeriodId} onSelect={selectClassPeriod} onLoad={loadPreview} onClose={()=>setView('close')}/>}
    {view === 'close' && <CloseScreen preview={preview} confirmed={confirmed} pending={pendingDecision} onConfirm={setConfirmed} onClose={closePeriod} />}
    {view === 'final' && <>
      <FinalScreen results={finalResults} contexts={classPeriods} classPeriodId={classPeriodId} onSelect={selectClassPeriod} onLoad={loadFinal} onPublish={publishResults} pending={pendingDecision} />
      {finalResults && <details className="leyisa-card result-deliberation">
        <summary>Délibération et repêchage</summary>
        <DeliberationPanel key={classPeriodId} students={finalResults.students}/>
      </details>}
    </>}
  </main>;
}

function Queue({ submissions, onOpen }: { submissions: Submission[]; onOpen: (submission: Submission) => void }) {
 const next = submissions[0];
 return <div className="leyisa-grid results-detail-grid">
  <section className="leyisa-card">
   <h2>Soumissions à examiner</h2>
   <div className="results-list">
    {submissions.length ? submissions.map(item => (
     <article key={item.id}>
      <div><strong>{item.evaluation.title}</strong><small>{item.author.label} · {item.schoolClass.label} · {item.subject}</small></div>
      <button className="leyisa-button leyisa-button-secondary" onClick={() => onOpen(item)}>Ouvrir</button>
     </article>
    )) : <p>Aucune soumission en attente pour cette période.</p>}
   </div>
  </section>
  <aside className="leyisa-card">
   <h2>Première soumission</h2>
   {next ? <>
    <dl><dt>Classe</dt><dd>{next.schoolClass.label}</dd><dt>Matière</dt><dd>{next.subject}</dd><dt>Tentative</dt><dd>{next.attempt}</dd></dl>
    <button className="leyisa-button" onClick={() => onOpen(next)}>Consulter le détail</button>
   </> : <p>Choisissez une autre période pour consulter sa file.</p>}
  </aside>
 </div>;
}
function Detail({ submission, onApprove, onReject }: { submission: Submission & { grades?: Array<{ matricule: string; student: string; score: string | number | null }> }; onApprove: () => void; onReject: () => void }) { return <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Détail d’une soumission</h2><p className="leyisa-description">Tentative {submission.attempt} · lecture seule.</p><ResultTable students={(submission.grades ?? []).map(grade => ({ label: `${grade.matricule} · ${grade.student}`, values: [grade.score === null ? 'Absente' : `${grade.score} / ${submission.evaluation.maxScore}`] }))} headings={['Élève', 'Note']} /><div className="preview-actions"><button className="leyisa-button" onClick={onApprove}>Accepter la soumission</button><button className="leyisa-button leyisa-button-secondary" onClick={onReject}>Rejeter avec motif</button></div></section><aside className="leyisa-card"><h2>Décision de la Direction</h2><p>Auteur : {submission.author.label}</p><p>Évaluation : {submission.evaluation.title}</p><p>Statut : {submission.status}</p><p className="leyisa-description">L’auteur ne peut jamais décider sur sa propre soumission.</p></aside></div>; }
function Reject({ submission, reason, onReason, onCancel, onConfirm }: { submission: Submission; reason: string; onReason: (value: string) => void; onCancel: () => void; onConfirm: () => void }) { return <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Rejeter la soumission</h2><p className="leyisa-description">Le motif est obligatoire et visible par l’enseignant.</p><label>Évaluation<input disabled value={submission.evaluation.title} /></label><label>Motif du rejet<textarea value={reason} onChange={event => onReason(event.target.value)} placeholder="Veuillez préciser la correction attendue…" /></label><div className="preview-actions"><button className="leyisa-button" disabled={!reason.trim()} onClick={onConfirm}>Confirmer le rejet</button><button className="leyisa-button leyisa-button-secondary" onClick={onCancel}>Annuler</button></div></section><aside className="leyisa-card"><h2>Traçabilité</h2><p>La version soumise est conservée.</p><p>État suivant : REJECTED</p><p>Après correction : nouvelle soumission obligatoire.</p></aside></div>; }
function PreviewScreen({ preview, contexts, classPeriodId, onSelect, onLoad, onClose }: { preview: Preview | null; contexts: ClassPeriod[]; classPeriodId: string; onSelect: (value: string) => void; onLoad: () => void; onClose: () => void }) { return <><section className="results-toolbar"><label>Classe-période<select aria-label="Classe-période" value={classPeriodId} onChange={event => onSelect(event.target.value)}>{contexts.map(context => <option key={context.id} value={context.id}>{context.classLabel} · {context.periodLabel} · {context.status}</option>)}</select></label><button className="leyisa-button" onClick={onLoad}>Vérifier</button></section>{preview && <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Aperçu des résultats</h2><p className="leyisa-description">Moyennes par matière uniquement ; aucune moyenne générale avant clôture.</p><StudentResults students={preview.students} /></section><aside className="leyisa-card"><h2>Contrôles avant clôture</h2>{preview.problems.length ? <ul>{preview.problems.map(problem => <li key={problem}>{problem}</li>)}</ul> : <p>Toutes les matières et soumissions sont validées.</p>}<button className="leyisa-button" disabled={!preview.readyToClose} onClick={onClose}>Continuer vers clôture</button></aside></div>}</>; }
function CloseScreen({ preview, confirmed, pending, onConfirm, onClose }: { preview: Preview | null; confirmed: boolean; pending: boolean; onConfirm: (value: boolean) => void; onClose: () => void }) { return <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Confirmer la clôture</h2><p className="results-warning">Cette opération est irréversible : les résultats sont figés et toute modification est refusée.</p><p>Classe / période : {preview?.classPeriod.classLabel} / {preview?.classPeriod.periodLabel}</p><label className="results-check"><input type="checkbox" checked={confirmed} onChange={event => onConfirm(event.target.checked)} /> Je confirme la clôture de la période.</label><button className="leyisa-button" disabled={!preview?.readyToClose || !confirmed || pending} onClick={onClose}>Confirmer la clôture</button></section><aside className="leyisa-card"><h2>Contrôle transactionnel</h2><ol><li>Vérifier les soumissions et les notes.</li><li>Calculer les résultats.</li><li>Créer les instantanés.</li><li>Passer OPEN à CLOSED.</li></ol></aside></div>; }
function FinalScreen({ results, contexts, classPeriodId, onSelect, onLoad, onPublish, pending }: {
 results: FinalResults | null;
 contexts: ClassPeriod[];
 classPeriodId: string;
 onSelect: (value: string) => void;
 onLoad: () => void;
 onPublish: () => void;
 pending: boolean;
}) {
 return <>
  <section className="results-toolbar">
   <label>Classe-période
    <select aria-label="Classe-période" value={classPeriodId} disabled={pending} onChange={event => onSelect(event.target.value)}>
     {contexts.map(context => <option key={context.id} value={context.id}>{context.classLabel} · {context.periodLabel} · {context.status}</option>)}
    </select>
   </label>
   <button className="leyisa-button" disabled={!classPeriodId || pending} onClick={onLoad}>Afficher</button>
  </section>
  {results && <div className="leyisa-grid results-detail-grid">
   <section className="leyisa-card"><h2>Résultats figés</h2><StudentResults students={results.students} final/></section>
   <aside className="leyisa-card">
    <h2>Clôture de la période</h2>
    <p>{results.classPeriod.classLabel} · {results.classPeriod.periodLabel}</p>
    <p>Statut : {results.classPeriod.status}</p>
    {results.classPeriod.status === 'CLOSED'
     ? <button className="leyisa-button" disabled={pending} onClick={onPublish}>Publier les résultats clôturés</button>
     : <a className="leyisa-button" href="#bulletin">Préparer un bulletin</a>}
   </aside>
  </div>}
 </>;
}
function StudentResults({ students, final = false }: { students: Preview['students']; final?: boolean }) { const subjects = students[0]?.subjectResults ?? []; return <ResultTable headings={['Élève', ...subjects.map(subject => subject.label), ...(final ? ['Total'] : [])]} students={students.map(student => ({ label: `${student.identity.matricule ?? ''} ${student.identity.firstName ?? ''} ${student.identity.lastName ?? ''}`.trim(), values: [...student.subjectResults.map(subject => subject.earned === null ? '—' : `${displayNumber.format(subject.earned)}/${subject.maximum}`), ...(final ? [`${displayNumber.format(student.totalEarned)}/${displayNumber.format(student.totalMaximum)}`] : [])] }))} />; }
function ResultTable({ headings, students }: { headings: string[]; students: Array<{ label: string; values: string[] }> }) { return <div className="leyisa-table-wrap"><table><thead><tr>{headings.map(heading => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{students.map(student => <tr key={student.label}><td>{student.label}</td>{student.values.map((value, index) => <td key={`${student.label}-${index}`}>{value}</td>)}</tr>)}</tbody></table></div>; }
function titleFor(view: View) { return ({ queue: 'Validation des notes', detail: 'Détail d’une soumission', reject: 'Rejeter avec motif', preview: 'Prévisualiser les résultats', close: 'Confirmer la clôture', final: 'Résultats et clôture' })[view]; }
function descriptionFor(view: View) { return ({ queue: 'Examiner les soumissions et décider sur la version envoyée.', detail: 'Consulter les notes transmises sans les modifier.', reject: 'Expliquer à l’enseignant ce qui doit être corrigé.', preview: 'Vérifier toutes les conditions avant de clôturer.', close: 'Clôturer une classe pour une période précise.', final: 'Consulter les résultats figés après la clôture.' })[view]; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'; }
